import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { score, shouldNotify } from '@/lib/matcher'
import { sendEmailNotification } from '@/lib/notify/email'
import { sendTelegramNotification } from '@/lib/notify/telegram'
import { sendDiscordNotification } from '@/lib/notify/discord'
import type { Opportunity, Preferences } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch fresh opportunities (last 25h only, not expired)
    const since = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const { data: opps } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('is_flagged', false)
      .gte('fetched_at', since)
      .or('deadline.is.null,deadline.gt.' + new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(500)

    if (!opps?.length) return NextResponse.json({ ok: true, notified: 0 })

    // Fetch all active users with preferences
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, telegram_id, discord_id, preferences(*), user_keys(*)')
      .eq('is_active', true)

    if (!users?.length) return NextResponse.json({ ok: true, notified: 0 })

    let notified = 0

    for (const user of users) {
      const prefs = (user.preferences as unknown as Preferences[])?.[0]
      if (!prefs) continue

      const userKey = (user.user_keys as unknown as Record<string, string>[])?.[0]

      for (const opp of opps as Opportunity[]) {
        const result = score(opp, prefs)
        if (!shouldNotify(result, prefs.match_threshold)) continue

        const channels: Array<'email' | 'telegram' | 'discord'> = []
        if (user.email) channels.push('email')
        if (user.telegram_id) channels.push('telegram')
        if (user.discord_id) channels.push('discord')

        for (const channel of channels) {
          // Check if already sent
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
              user_id: user.id,
              opportunity_id: opp.id,
              channel,
            })

            notified++
          } catch (err) {
            console.error(`[notify] Failed to send ${channel} to ${user.id}:`, err)
          }
        }
      }
    }

    return NextResponse.json({ ok: true, notified })
  } catch (err) {
    console.error('[cron/notify]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
