import type { Opportunity } from '../types'

// CTFtime — security competitions
export async function scrapeCTFtime(): Promise<Opportunity[]> {
  try {
    const now = Math.floor(Date.now() / 1000)
    const finish = now + 60 * 24 * 60 * 60 // 60 days ahead
    const res = await fetch(
      `https://ctftime.org/api/v1/events/?limit=20&start=${now}&finish=${finish}`,
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const events: Array<{ title: string; description: string; url: string; start: string; finish: string; format: string }> = await res.json()
    return events.map(e => ({
      title: e.title,
      description: e.description?.slice(0, 500) ?? '',
      url: e.url,
      source: 'ctftime',
      tags: ['contest', 'security', e.format?.toLowerCase()].filter(Boolean) as string[],
      deadline: e.finish ?? null,
    }))
  } catch {
    return []
  }
}

// MLH — Major League Hacking events
export async function scrapeMLH(): Promise<Opportunity[]> {
  try {
    const year = new Date().getFullYear()
    const res = await fetch(
      `https://mlh.io/seasons/${year}/events`,
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const html = await res.text()

    // Parse event names and links from MLH HTML
    const results: Opportunity[] = []
    const matches = [...html.matchAll(/<h3[^>]*class="[^"]*event-name[^"]*"[^>]*>([^<]+)<\/h3>/g)]
    const links = [...html.matchAll(/href="(https:\/\/[^"]+mlh\.io[^"]+)"/g)]

    matches.forEach((m, i) => {
      const title = m[1]?.trim()
      const url = links[i]?.[1] ?? `https://mlh.io/seasons/${year}/events`
      if (title) {
        results.push({
          title,
          description: 'MLH hackathon event',
          url,
          source: 'mlh',
          tags: ['hackathon'],
        })
      }
    })

    return results
  } catch {
    return []
  }
}

// GitHub search — quality CS repos for students & hackers
// 4 sub-categories stored as first tag:
//   trending        — AI/LLM/Claude/hackathon-starter, recently active
//   cool-project    — system-design, awesome-lists, novel CS repos
//   beginner-friendly — good-first-issue, learn-to-code, intro algorithms
//   project-guide   — roadmaps, project-based-learning, interview-prep
export async function scrapeGitHub(): Promise<Opportunity[]> {
  const buckets: Array<{ q: string; category: string; minStars: number }> = [
    // ── Trending: AI / LLM / Claude / hackathon tools ─────────────────────────
    { q: 'topic:llm stars:>200 pushed:>2024-01-01', category: 'trending', minStars: 200 },
    { q: 'topic:ai-tools stars:>200 pushed:>2024-01-01', category: 'trending', minStars: 200 },
    { q: 'anthropic OR claude-api stars:>50 pushed:>2024-06-01', category: 'trending', minStars: 50 },
    { q: 'topic:langchain stars:>500', category: 'trending', minStars: 500 },
    { q: 'hackathon starter template boilerplate stars:>100', category: 'trending', minStars: 100 },
    { q: 'topic:mcp-server stars:>30 pushed:>2025-01-01', category: 'trending', minStars: 30 },
    // ── Cool projects: system-design, awesome-lists, novel CS repos ────────────
    { q: 'topic:system-design stars:>1000', category: 'cool-project', minStars: 1000 },
    { q: 'topic:awesome topic:programming stars:>2000', category: 'cool-project', minStars: 2000 },
    { q: 'topic:computer-science stars:>500', category: 'cool-project', minStars: 500 },
    // ── Beginner-friendly: good-first-issue, learn-to-code, intro algos ────────
    { q: 'topic:beginner-friendly stars:>100', category: 'beginner-friendly', minStars: 100 },
    { q: 'topic:good-first-issue stars:>50', category: 'beginner-friendly', minStars: 50 },
    { q: 'topic:algorithms stars:>200', category: 'beginner-friendly', minStars: 200 },
    { q: 'topic:data-structures stars:>100', category: 'beginner-friendly', minStars: 100 },
    { q: 'topic:learn-programming stars:>100', category: 'beginner-friendly', minStars: 100 },
    // ── Project guides: roadmaps, project-based learning, interview prep ───────
    { q: 'topic:roadmap stars:>1000', category: 'project-guide', minStars: 1000 },
    { q: 'topic:project-based-learning stars:>200', category: 'project-guide', minStars: 200 },
    { q: 'topic:interview-prep stars:>300', category: 'project-guide', minStars: 300 },
    { q: 'build-your-own-x stars:>10000', category: 'project-guide', minStars: 10000 },
    { q: 'topic:competitive-programming stars:>100', category: 'project-guide', minStars: 100 },
  ]

  const results: Opportunity[] = []
  const seen = new Set<string>()

  await Promise.all(buckets.map(async ({ q, category, minStars }) => {
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=8`,
        {
          headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!res.ok) return
      const data = await res.json()
      const items: Array<{
        full_name: string; description: string | null; html_url: string
        topics: string[]; stargazers_count: number; archived: boolean; fork: boolean
      }> = data.items ?? []

      for (const repo of items) {
        if (!repo.description || repo.description.trim().length < 20) continue
        if (repo.stargazers_count < minStars) continue
        if (repo.archived) continue
        if (repo.fork) continue
        if (seen.has(repo.html_url)) continue
        seen.add(repo.html_url)

        results.push({
          title: repo.full_name,
          description: `⭐ ${repo.stargazers_count.toLocaleString()} stars — ${repo.description.slice(0, 400)}`,
          url: repo.html_url,
          source: 'github',
          // category tag first so UI chip filtering works, then repo's own topics
          tags: [category, ...(repo.topics ?? [])],
        })
      }
    } catch { /* skip */ }
  }))

  return results
}

// Devfolio — Indian hackathon platform
export async function scrapeDevfolio(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://devfolio.co/api/search/hackathons?page=0&per_page=20&status=upcoming',
      {
        headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const hackathons: Array<{ name: string; tagline: string; slug: string; ends_at: string }> = data.results ?? data.hackathons ?? []
    return hackathons.map(h => ({
      title: h.name,
      description: h.tagline?.slice(0, 500) ?? '',
      url: `https://devfolio.co/hackathons/${h.slug}`,
      source: 'devfolio',
      tags: ['hackathon'],
      deadline: h.ends_at ?? null,
    }))
  } catch {
    return []
  }
}

// Unstop — Indian competitions platform
export async function scrapeUnstop(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://unstop.com/api/public/opportunity/search-result?opportunity=hackathon&per_page=20&page=1',
      {
        headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const items: Array<{ title: string; description: string; seo_url: string; end_date: string }> = data.data?.data ?? []
    return items.map(i => ({
      title: i.title,
      description: i.description?.slice(0, 500) ?? '',
      url: `https://unstop.com/${i.seo_url}`,
      source: 'unstop',
      tags: ['hackathon', 'contest'],
      deadline: i.end_date ?? null,
    }))
  } catch {
    return []
  }
}
