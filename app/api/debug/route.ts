import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { score } from '@/lib/matcher'
import type { Opportunity, Preferences } from '@/lib/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdmin()

  const { data: users } = await db
    .from('users')
    .select('id, email, is_active, preferences(*)')

  const { data: opps } = await db
    .from('opportunities')
    .select('id, title, source, tags, is_flagged')
    .order('fetched_at', { ascending: false })
    .limit(10)

  // Run matcher for each user against each opp
  const matches = []
  for (const user of users ?? []) {
    const prefs = (user.preferences as unknown as Preferences[])?.[0]
    if (!prefs) continue
    for (const opp of (opps ?? []) as Opportunity[]) {
      const result = score(opp, prefs)
      matches.push({
        user: user.email,
        opp: opp.title,
        score: result.score,
        matched: result.matched,
        blocked: result.blocked,
        threshold: prefs.match_threshold,
        willNotify: result.score >= prefs.match_threshold && !result.blocked,
      })
    }
  }

  return NextResponse.json({ users, opps, matches })
}
