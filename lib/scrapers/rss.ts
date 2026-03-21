import { XMLParser } from 'fast-xml-parser'
import type { Opportunity } from '../types'

const parser = new XMLParser({ ignoreAttributes: false })

const RSS_FEEDS = [
  // Hackathons & competitions
  { url: 'https://devpost.com/hackathons.atom', source: 'devpost' },
  // Remote jobs & internships
  { url: 'https://remotive.com/remote-jobs/feed/', source: 'remotive' },
  { url: 'https://weworkremotely.com/remote-programming-jobs.rss', source: 'weworkremotely' },
  { url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss', source: 'weworkremotely' },
  // Dev.to tags
  { url: 'https://dev.to/feed/tag/hacktoberfest', source: 'devto' },
  { url: 'https://dev.to/feed/tag/opensource', source: 'devto' },
  { url: 'https://dev.to/feed/tag/hiring', source: 'devto' },
  { url: 'https://dev.to/feed/tag/career', source: 'devto' },
  { url: 'https://dev.to/feed/tag/showdev', source: 'devto' },
  // GitHub blog (bounties, programs, grants)
  { url: 'https://github.blog/feed/', source: 'github-blog' },
  // Hacker News top stories (articles/discussions, not job board)
  { url: 'https://news.ycombinator.com/rss', source: 'hackernews' },
  // IndieHackers
  { url: 'https://www.indiehackers.com/feed.xml', source: 'indiehackers' },
  // EU startup & grant news
  { url: 'https://ec.europa.eu/newsroom/dae/rss.cfm?page=2226&lg=EN', source: 'eu-grants' },
  // Google Developers blog
  { url: 'https://developers.googleblog.com/atom.xml', source: 'google-developers' },
  // AWS open source blog (bounties, programs)
  { url: 'https://aws.amazon.com/blogs/opensource/feed/', source: 'aws-opensource' },
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

// Source-specific default tags so the getKind fallback works for mixed sources
const SOURCE_DEFAULT_TAGS: Record<string, string[]> = {
  'hn-jobs': ['job', 'startup'],
  weworkremotely: ['job', 'remote'],
  remotive: ['job', 'remote'],
  internshala: ['internship', 'india'],
  wellfound: ['job', 'startup'],
  devpost: ['hackathon', 'contest'],
  mlh: ['hackathon'],
  devfolio: ['hackathon'],
  unstop: ['hackathon', 'contest'],
  ctftime: ['contest', 'security'],
  hackerearth: ['hackathon', 'coding'],
  kaggle: ['competition', 'ml'],
  ethglobal: ['hackathon', 'web3'],
  swag: ['swag', 'free'],
}

function parseEntries(xml: string, source: string): Opportunity[] {
  try {
    const parsed = parser.parse(xml)
    const channel = parsed?.rss?.channel ?? parsed?.feed
    const items = channel?.item ?? channel?.entry ?? []
    const arr = Array.isArray(items) ? items : [items]

    const defaultTags = SOURCE_DEFAULT_TAGS[source] ?? []

    return arr.map((item: Record<string, string>) => {
      const description = (item.description ?? item.summary ?? item.content ?? '').slice(0, 500)
      return {
        title: item.title ?? '',
        description,
        url: item.link ?? item.url ?? item.id ?? '',
        source,
        tags: defaultTags,
      }
    }).filter((o: Opportunity) => {
      if (!o.url || !o.title) return false
      // Quality gate for blog sources: require meaningful description
      const blogSources = ['devto', 'indiehackers', 'hackernews', 'github-blog', 'google-developers', 'aws-opensource']
      if (blogSources.includes(source) && o.description.length < 30) return false
      return true
    })
  } catch {
    return []
  }
}

export async function scrapeRSS(): Promise<Opportunity[]> {
  const results: Opportunity[] = []

  await Promise.all(RSS_FEEDS.map(async ({ url, source }) => {
    const xml = await fetchFeed(url)
    if (xml) results.push(...parseEntries(xml, source))
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
