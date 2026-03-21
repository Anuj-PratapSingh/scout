import { scrapeHackerNews } from './hackernews'
import { scrapeReddit } from './reddit'
import { scrapeRSS, scrapeGoogleCSE } from './rss'
import { scrapeCTFtime, scrapeMLH, scrapeGitHub, scrapeDevfolio, scrapeUnstop } from './apis'
import { isFlagged } from '../filter'
import { supabaseAdmin } from '../supabase'
import type { Opportunity } from '../types'

interface ScrapeOptions {
  redditClientId?: string
  redditClientSecret?: string
  googleCseKey?: string
  googleCseId?: string
}

export async function runAllScrapers(opts: ScrapeOptions = {}): Promise<number> {
  const [hn, reddit, rss, ctf, mlh, github, devfolio, unstop] = await Promise.all([
    scrapeHackerNews(),
    scrapeReddit(opts.redditClientId, opts.redditClientSecret),
    scrapeRSS(),
    scrapeCTFtime(),
    scrapeMLH(),
    scrapeGitHub(),
    scrapeDevfolio(),
    scrapeUnstop(),
  ])

  let google: Opportunity[] = []
  if (opts.googleCseKey && opts.googleCseId) {
    google = await scrapeGoogleCSE(opts.googleCseKey, opts.googleCseId)
  }

  const all = [...hn, ...reddit, ...rss, ...ctf, ...mlh, ...github, ...devfolio, ...unstop, ...google]
  const clean = all.filter(o => !isFlagged(o))

  if (clean.length === 0) return 0

  // Upsert — url is unique, so duplicates are silently ignored
  const { error } = await supabaseAdmin
    .from('opportunities')
    .upsert(clean, { onConflict: 'url', ignoreDuplicates: true })

  if (error) throw new Error(`DB upsert failed: ${error.message}`)

  return clean.length
}
