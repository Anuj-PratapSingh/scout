const TRACKING_PARAMS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','referrer','fbclid','gclid']

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    TRACKING_PARAMS.forEach(p => u.searchParams.delete(p))
    u.hash = ''
    // Remove trailing slash for consistency
    u.pathname = u.pathname.replace(/\/$/, '') || '/'
    return u.toString().toLowerCase()
  } catch {
    return raw
  }
}

import { scrapeHackerNews } from './hackernews'
import { scrapeReddit } from './reddit'
import { scrapeRSS, scrapeGoogleCSE } from './rss'
import { scrapeCTFtime, scrapeMLH, scrapeGitHub, scrapeDevfolio, scrapeUnstop } from './apis'
import { scrapeRemotiveAPI, scrapeHNJobs, scrapeInternshala, scrapeWellfound, scrapeHackerEarth, scrapeKaggle, scrapeEthGlobal, scrapeSwag, scrapeRemoteOK, scrapeArbeitnow, scrapeJobicy, scrapeTheMuse, scrapeYCJobs } from './jobs'
import { scrapeDevTo, scrapeHNTop, scrapeHashnode } from './blogs'
import { scrapeCodeforces, scrapeCodeChef, scrapeAtCoder, scrapeHackerEarthChallenges, scrapeTopCoder } from './contests'
import { scrapeDoraHacks, scrapeIssueHunt, scrapeImmunefi, scrapeHackerOne, scrapeOpenBugBounty } from './bounties'
import { scrapeStaticDB } from './static'
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
  const [hn, reddit, rss, ctf, mlh, github, devfolio, unstop, remotiveApi, hnJobs, internshala, wellfound, hackerearth, kaggle, ethglobal, swag, devto, hnTop, hashnode, remoteok, arbeitnow, jobicy, themuse, ycjobs, codeforces, codechef, atcoder, heChallenge, topcoder, dorahacks, issuehunt, immunefi, hackerone, openbugbounty] = await Promise.all([
    scrapeHackerNews(),
    scrapeReddit(opts.redditClientId, opts.redditClientSecret),
    scrapeRSS(),
    scrapeCTFtime(),
    scrapeMLH(),
    scrapeGitHub(),
    scrapeDevfolio(),
    scrapeUnstop(),
    scrapeRemotiveAPI(),
    scrapeHNJobs(),
    scrapeInternshala(),
    scrapeWellfound(),
    scrapeHackerEarth(),
    scrapeKaggle(),
    scrapeEthGlobal(),
    scrapeSwag(),
    scrapeDevTo(),
    scrapeHNTop(),
    scrapeHashnode(),
    scrapeRemoteOK(),
    scrapeArbeitnow(),
    scrapeJobicy(),
    scrapeTheMuse(),
    scrapeYCJobs(),
    scrapeCodeforces(),
    scrapeCodeChef(),
    scrapeAtCoder(),
    scrapeHackerEarthChallenges(),
    scrapeTopCoder(),
    scrapeDoraHacks(),
    scrapeIssueHunt(),
    scrapeImmunefi(),
    scrapeHackerOne(),
    scrapeOpenBugBounty(),
  ])

  let google: Opportunity[] = []
  if (opts.googleCseKey && opts.googleCseId) {
    google = await scrapeGoogleCSE(opts.googleCseKey, opts.googleCseId)
  }

  const staticOpps = scrapeStaticDB()
  const all = [...hn, ...reddit, ...rss, ...ctf, ...mlh, ...github, ...devfolio, ...unstop, ...remotiveApi, ...hnJobs, ...internshala, ...wellfound, ...hackerearth, ...kaggle, ...ethglobal, ...swag, ...devto, ...hnTop, ...hashnode, ...remoteok, ...arbeitnow, ...jobicy, ...themuse, ...ycjobs, ...codeforces, ...codechef, ...atcoder, ...heChallenge, ...topcoder, ...dorahacks, ...issuehunt, ...immunefi, ...hackerone, ...openbugbounty, ...staticOpps, ...google]
  const clean = all.filter(o => !isFlagged(o))

  if (clean.length === 0) return 0

  // Normalize URLs, then deduplicate within the batch (same URL from two scrapers = keep first)
  const seen = new Set<string>()
  const normalized = clean
    .map(o => ({ ...o, url: normalizeUrl(o.url) }))
    .filter(o => { if (seen.has(o.url)) return false; seen.add(o.url); return true })

  // Upsert — url is unique; on conflict update so category tags stay fresh
  const { error } = await supabaseAdmin
    .from('opportunities')
    .upsert(normalized, { onConflict: 'url' })

  if (error) throw new Error(`DB upsert failed: ${error.message}`)

  return clean.length
}
