import { NextResponse } from 'next/server'
import { runAllScrapers } from '@/lib/scrapers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { score, shouldNotify } from '@/lib/matcher'
import { sendEmailNotification, sendDigestEmail } from '@/lib/notify/email'
import { sendTelegramNotification } from '@/lib/notify/telegram'
import { decryptKey } from '@/lib/crypto'
import type { Opportunity, Preferences } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getSupabaseAdmin()

    // --- Step 1: Scrape ---
    const { data: keys } = await db
      .from('user_keys')
      .select('google_cse_key, google_cse_id, reddit_client_id, reddit_client_secret')
      .not('google_cse_key', 'is', null)
      .limit(1)

    const uk = keys?.[0]
    const scraperOpts = uk ? {
      googleCseKey: uk.google_cse_key ? decryptKey(uk.google_cse_key) : undefined,
      googleCseId: uk.google_cse_id ? decryptKey(uk.google_cse_id) : undefined,
      redditClientId: uk.reddit_client_id ? decryptKey(uk.reddit_client_id) : undefined,
      redditClientSecret: uk.reddit_client_secret ? decryptKey(uk.reddit_client_secret) : undefined,
    } : {}

    const inserted = await runAllScrapers(scraperOpts)

    // --- Cleanup: delete expired opps older than 7 days ---
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await db.from('opportunities').delete()
      .lt('fetched_at', cutoff7d)
      .lt('deadline', new Date().toISOString())

    // --- Step 2: Match & Notify (only opps from last 25h) ---
    const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const { data: opps } = await db
      .from('opportunities')
      .select('*')
      .eq('is_flagged', false)
      .gte('fetched_at', since)
      .or('deadline.is.null,deadline.gt.' + new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(500)

    if (!opps?.length) return NextResponse.json({ ok: true, inserted, notified: 0 })

    const { data: users } = await db
      .from('users')
      .select('id, email, telegram_id, preferences(*), user_keys(*)')
      .eq('is_active', true)

    if (!users?.length) return NextResponse.json({ ok: true, inserted, notified: 0 })

    let notified = 0

    for (const user of users) {
      const prefsRaw = user.preferences as unknown
      const prefs = (Array.isArray(prefsRaw) ? prefsRaw[0] : prefsRaw) as Preferences | undefined
      if (!prefs) continue

      const allCriteria = [...(prefs.categories ?? []), ...(prefs.custom_criteria ?? [])]

      // Collect new matches for this user, split by perfect vs good
      const perfectEmail: Array<{ opp: Opportunity; matched: string[] }> = []
      const digestEmail: Array<{ opp: Opportunity; matched: string[] }> = []
      const telegramMatches: Array<{ opp: Opportunity; matched: string[] }> = []
      const newOpps: Opportunity[] = []

      for (const opp of opps as Opportunity[]) {
        const result = score(opp, prefs)
        if (!shouldNotify(result, prefs.match_threshold)) continue

        // Skip already-notified
        const { data: existing } = await db
          .from('notification_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('opportunity_id', opp.id)
          .maybeSingle()
        if (existing) continue

        newOpps.push(opp)

        const isPerfect = allCriteria.length > 0 && result.score === 10 && !result.blocked
        if (user.email) {
          isPerfect
            ? perfectEmail.push({ opp, matched: result.matched })
            : digestEmail.push({ opp, matched: result.matched })
        }
        if (user.telegram_id) telegramMatches.push({ opp, matched: result.matched })
      }

      if (!newOpps.length) continue

      // Log all new opps for this user
      const logRows = newOpps.flatMap(opp => {
        const channels: string[] = []
        if (user.email) channels.push('email')
        if (user.telegram_id) channels.push('telegram')
        return channels.map(channel => ({ user_id: user.id, opportunity_id: opp.id, channel }))
      })
      await db.from('notification_log').insert(logRows)

      // Email: individual for perfect matches, one digest for the rest
      try {
        for (const { opp, matched } of perfectEmail) {
          await sendEmailNotification(user.email!, opp, matched, undefined, user.id)
          notified++
        }
        if (digestEmail.length > 0) {
          await sendDigestEmail(user.email!, digestEmail, user.id)
          notified++
        }
      } catch (err) {
        console.error(`[cron] email to ${user.id} failed:`, err)
      }

      // Telegram: one message per opp (Telegram is chat, not email)
      for (const { opp, matched } of telegramMatches) {
        try {
          await sendTelegramNotification(user.telegram_id!, opp, matched)
          notified++
        } catch (err) {
          console.error(`[cron] telegram to ${user.id} failed:`, err)
        }
      }

    }

    return NextResponse.json({ ok: true, inserted, notified })
  } catch (err) {
    console.error('[cron/scout]', err)
    await alertAdmin(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function alertAdmin(err: unknown) {
  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    await transporter.sendMail({
      from: `Scout <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: '[Scout] Cron job failed',
      text: `The Scout cron job failed at ${new Date().toISOString()}:\n\n${String(err)}`,
    })
  } catch {
    console.error('[cron] Failed to send admin alert')
  }
}
