import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { score, shouldNotify } from '@/lib/matcher'
import { sendEmailNotification } from '@/lib/notify/email'
import { sendTelegramNotification } from '@/lib/notify/telegram'
import type { Opportunity, Preferences } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// 5 notification slots across the day (UTC hours → slot number 1–5)
// Slots: 5h=1, 8h=2, 14h=3, 17h=4, 20h=5
// This route runs at slots 1 (5h) and 4 (17h) — scout cron covers 2,3,5
function currentSlot(): number {
  const h = new Date().getUTCHours()
  if (h < 6) return 1
  if (h < 11) return 2
  if (h < 15) return 3
  if (h < 18) return 4
  return 5
}

// Which slots are active for a given email_frequency
const FREQ_SLOTS: Record<number, number[]> = {
  1: [3],             // once at 14h
  2: [2, 5],          // 8h and 20h
  3: [2, 3, 5],       // 8h, 14h, 20h
  4: [1, 2, 4, 5],    // 5h, 8h, 17h, 20h
  5: [1, 2, 3, 4, 5], // all 5 slots
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const slot = currentSlot()

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

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, telegram_id, preferences(*), user_keys(*)')
      .eq('is_active', true)

    if (!users?.length) return NextResponse.json({ ok: true, notified: 0 })

    let notified = 0

    for (const user of users) {
      const prefs = (user.preferences as unknown as Preferences[])?.[0]
      if (!prefs) continue

      // Check if this user wants notifications at this slot
      const freq = prefs.email_frequency ?? 1
      const activeSlots = FREQ_SLOTS[freq] ?? FREQ_SLOTS[1]
      if (!activeSlots.includes(slot)) continue

      for (const opp of opps as Opportunity[]) {
        const result = score(opp, prefs)
        if (!shouldNotify(result, prefs.match_threshold)) continue

        const channels: Array<'email' | 'telegram'> = []
        if (user.email) channels.push('email')
        if (user.telegram_id) channels.push('telegram')

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

    return NextResponse.json({ ok: true, slot, notified })
  } catch (err) {
    console.error('[cron/notify]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
