import { NextResponse } from 'next/server'
import { runAllScrapers } from '@/lib/scrapers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { score, shouldNotify } from '@/lib/matcher'
import { sendEmailNotification } from '@/lib/notify/email'
import { sendTelegramNotification } from '@/lib/notify/telegram'
import { sendDiscordNotification } from '@/lib/notify/discord'
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
  const supabaseAdmin = getSupabaseAdmin()

  // --- Step 1: Scrape ---
  const { data: keys } = await supabaseAdmin
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
  await supabaseAdmin
    .from('opportunities')
    .delete()
    .lt('fetched_at', cutoff7d)
    .lt('deadline', new Date().toISOString())

  // --- Step 2: Match & Notify (only opps from last 25h) ---
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  const { data: opps } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('is_flagged', false)
    .gte('fetched_at', since)
    .or('deadline.is.null,deadline.gt.' + new Date().toISOString())
    .order('fetched_at', { ascending: false })
    .limit(500)

  if (!opps?.length) return NextResponse.json({ ok: true, inserted, notified: 0 })

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, telegram_id, discord_id, preferences(*), user_keys(*)')
    .eq('is_active', true)

  if (!users?.length) return NextResponse.json({ ok: true, inserted, notified: 0 })

  let notified = 0

  for (const user of users) {
    const prefsRaw = user.preferences as unknown
    const prefs = (Array.isArray(prefsRaw) ? prefsRaw[0] : prefsRaw) as Preferences | undefined
    if (!prefs) continue
    const userKeysRaw = user.user_keys as unknown
    const userKey = (Array.isArray(userKeysRaw) ? userKeysRaw[0] : userKeysRaw) as Record<string, string> | undefined

    for (const opp of opps as Opportunity[]) {
      const result = score(opp, prefs)
      if (!shouldNotify(result, prefs.match_threshold)) continue

      const channels: Array<'email' | 'telegram' | 'discord'> = []
      if (user.email) channels.push('email')
      if (user.telegram_id) channels.push('telegram')
      if (user.discord_id) channels.push('discord')

      for (const channel of channels) {
        const { data: existing } = await supabaseAdmin
          .from('notification_log')
          .select('id')
          .eq('user_id', user.id)
          .eq('opportunity_id', opp.id)
          .eq('channel', channel)
          .maybeSingle()

        if (existing) continue

        try {
          if (channel === 'email') {
            await sendEmailNotification(user.email!, opp, result.matched, undefined, user.id)
          } else if (channel === 'telegram') {
            await sendTelegramNotification(user.telegram_id!, opp, result.matched)
          } else if (channel === 'discord') {
            await sendDiscordNotification(user.discord_id!, opp, result.matched)
          }

          await supabaseAdmin.from('notification_log').insert({
            user_id: user.id, opportunity_id: opp.id, channel,
          })
          notified++
        } catch (err) {
          console.error(`[cron] ${channel} to ${user.id} failed:`, err)
        }
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
