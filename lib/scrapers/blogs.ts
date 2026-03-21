import type { Opportunity } from '../types'

interface DevToArticle {
  id: number
  title: string
  description: string
  url: string
  published_at: string
  tag_list: string[]
  public_reactions_count: number
  reading_time_minutes: number
  user: { name: string; username: string }
}

interface HNHit {
  title: string
  url?: string
  objectID: string
  points: number
  author: string
}

// ─── Dev.to API — community-voted articles, not RSS ──────────────────────────
// Criteria:
//   legendary  = reactions > 300 (all-time community favorites)
//   trending   = reactions > 50  (hot this week)
//   beginner-friendly = tag:beginners or tag:tutorial, reactions > 20
export async function scrapeDevTo(): Promise<Opportunity[]> {
  const results: Opportunity[] = []
  const seen = new Set<string>()

  const queries: Array<{ params: string; extraTags: string[] }> = [
    // Top articles across all Dev.to in the last 7 days
    { params: 'top=7&per_page=20', extraTags: [] },
    // Trending AI articles
    { params: 'top=14&per_page=10&tag=ai', extraTags: ['ai', 'ml'] },
    // Trending web dev
    { params: 'top=14&per_page=8&tag=webdev', extraTags: ['webdev'] },
    // Beginner-friendly tutorials
    { params: 'top=30&per_page=10&tag=beginners', extraTags: ['beginner-friendly'] },
    // Show dev — people showcasing projects
    { params: 'top=7&per_page=8&tag=showdev', extraTags: ['cool-project'] },
    // Open source
    { params: 'top=14&per_page=8&tag=opensource', extraTags: ['open-source'] },
  ]

  await Promise.all(queries.map(async ({ params, extraTags }) => {
    try {
      const res = await fetch(
        `https://dev.to/api/articles?${params}`,
        { headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return
      const articles: DevToArticle[] = await res.json()

      for (const a of articles) {
        if (!a.url || !a.title) continue
        if (seen.has(a.url)) continue
        // Quality gate: must have description and meaningful reactions
        if (!a.description || a.description.length < 20) continue
        if (a.public_reactions_count < 10) continue
        seen.add(a.url)

        // Classify by reaction threshold
        const qualityTag = a.public_reactions_count >= 300
          ? 'legendary'
          : a.public_reactions_count >= 50
          ? 'trending'
          : 'community-pick'

        const tags = [
          ...new Set([
            qualityTag,
            ...extraTags,
            ...(a.tag_list ?? []),
          ])
        ]

        results.push({
          title: a.title,
          description: `${a.description.slice(0, 300)} — ${a.public_reactions_count} reactions`,
          url: a.url,
          source: 'devto',
          tags,
        })
      }
    } catch { /* skip */ }
  }))

  return results
}

// ─── Hacker News top stories — Algolia API ────────────────────────────────────
// Criteria:
//   legendary  = points > 300
//   trending   = points > 100
//   beginner-friendly = title contains learn/guide/beginner/tutorial/intro
export async function scrapeHNTop(): Promise<Opportunity[]> {
  const results: Opportunity[] = []

  const queries = [
    // Top stories (all-time legendary content on HN)
    `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=points%3E100&hitsPerPage=20&attributesToRetrieve=title,url,points,objectID,author`,
    // Recent high-quality stories (last 3 days)
    `https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E50,created_at_i%3E${Math.floor(Date.now() / 1000) - 3 * 86400}&hitsPerPage=15&attributesToRetrieve=title,url,points,objectID,author`,
  ]

  const seen = new Set<string>()

  await Promise.all(queries.map(async (url) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return
      const data = await res.json()
      const hits: HNHit[] = data.hits ?? []

      for (const h of hits) {
        const link = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`
        if (!h.title || !link) continue
        if (seen.has(link)) continue
        seen.add(link)

        const titleLower = h.title.toLowerCase()
        const isBeginnerFriendly = ['learn', 'guide', 'beginner', 'tutorial', 'intro', 'getting started', 'explain', 'how to'].some(k => titleLower.includes(k))

        const qualityTag = h.points >= 300 ? 'legendary' : h.points >= 100 ? 'trending' : 'community-pick'
        const tags = [qualityTag, ...(isBeginnerFriendly ? ['beginner-friendly'] : [])]

        results.push({
          title: `${h.title}`,
          description: `${h.points} points on Hacker News`,
          url: link,
          source: 'hackernews',
          tags,
        })
      }
    } catch { /* skip */ }
  }))

  return results
}
