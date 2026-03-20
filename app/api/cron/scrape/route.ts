import { NextResponse } from 'next/server'
import { runAllScrapers } from '@/lib/scrapers'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptKey } from '@/lib/crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  // Verify cron secret (Vercel sets this header automatically)
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Collect any user-provided Google CSE keys (use first valid one for shared scrape)
    const { data: keys } = await supabaseAdmin
      .from('user_keys')
      .select('google_cse_key, google_cse_id, reddit_client_id, reddit_client_secret')
      .not('google_cse_key', 'is', null)
      .limit(1)

    const userKeys = keys?.[0]
    const opts = userKeys ? {
      googleCseKey: userKeys.google_cse_key ? decryptKey(userKeys.google_cse_key) : undefined,
      googleCseId: userKeys.google_cse_id ? decryptKey(userKeys.google_cse_id) : undefined,
      redditClientId: userKeys.reddit_client_id ? decryptKey(userKeys.reddit_client_id) : undefined,
      redditClientSecret: userKeys.reddit_client_secret ? decryptKey(userKeys.reddit_client_secret) : undefined,
    } : {}

    const count = await runAllScrapers(opts)
    return NextResponse.json({ ok: true, inserted: count })
  } catch (err) {
    console.error('[cron/scrape]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
