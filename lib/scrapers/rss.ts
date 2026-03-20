import { XMLParser } from 'fast-xml-parser'
import type { Opportunity } from '../types'

const parser = new XMLParser({ ignoreAttributes: false })

const RSS_FEEDS = [
  { url: 'https://devpost.com/hackathons.atom', source: 'devpost' },
  { url: 'https://dev.to/feed/tag/hacktoberfest', source: 'devto' },
  { url: 'https://dev.to/feed/tag/opensource', source: 'devto' },
]

// Curated Nitter accounts — Twitter via RSS, no API key needed
const NITTER_ACCOUNTS = [
  'MLHacks', 'devpost', 'ycombinator', 'github',
  'buildspace', 'hackclub', 'AngelHack', 'Replit',
  'Microsoft', 'Google', 'vercel',
]

const NITTER_INSTANCES = [
  'nitter.net',
  'nitter.privacydev.net',
  'nitter.catsarch.com',
]

async function fetchFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Scout/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseEntries(xml: string, source: string): Opportunity[] {
  try {
    const parsed = parser.parse(xml)
    const channel = parsed?.rss?.channel ?? parsed?.feed
    const items = channel?.item ?? channel?.entry ?? []
    const arr = Array.isArray(items) ? items : [items]

    return arr.map((item: Record<string, string>) => ({
      title: item.title ?? '',
      description: (item.description ?? item.summary ?? item.content ?? '').slice(0, 500),
      url: item.link ?? item.url ?? item.id ?? '',
      source,
      tags: [],
    })).filter((o: Opportunity) => o.url && o.title)
  } catch {
    return []
  }
}

async function scrapeNitter(account: string): Promise<Opportunity[]> {
  for (const instance of NITTER_INSTANCES) {
    const xml = await fetchFeed(`https://${instance}/${account}/rss`)
    if (xml) return parseEntries(xml, `twitter:${account}`)
  }
  return []
}

export async function scrapeRSS(): Promise<Opportunity[]> {
  const results: Opportunity[] = []

  // RSS feeds
  await Promise.all(RSS_FEEDS.map(async ({ url, source }) => {
    const xml = await fetchFeed(url)
    if (xml) results.push(...parseEntries(xml, source))
  }))

  // Nitter (Twitter RSS, no key needed)
  await Promise.all(NITTER_ACCOUNTS.map(async account => {
    const opps = await scrapeNitter(account)
    results.push(...opps)
  }))

  return results
}

export async function scrapeGoogleCSE(
  apiKey: string,
  cseId: string
): Promise<Opportunity[]> {
  const queries = [
    'site:linkedin.com/posts hackathon OR internship OR bounty',
    'site:linkedin.com/posts "open source" OR "apply now" OR "fellowship"',
  ]

  const results: Opportunity[] = []

  for (const q of queries) {
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1')
      url.searchParams.set('key', apiKey)
      url.searchParams.set('cx', cseId)
      url.searchParams.set('q', q)
      url.searchParams.set('dateRestrict', 'd1')

      const res = await fetch(url.toString())
      const data = await res.json()

      const items = data.items ?? []
      results.push(...items.map((item: { title: string; snippet: string; link: string }) => ({
        title: item.title,
        description: item.snippet ?? '',
        url: item.link,
        source: 'linkedin',
        tags: [],
      })))
    } catch {
      // continue
    }
  }

  return results
}
