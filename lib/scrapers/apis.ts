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

// GitHub search — trending CS repos useful for students
export async function scrapeGitHub(): Promise<Opportunity[]> {
  const queries = ['topic:computer-science', 'topic:algorithms', 'topic:interview-prep', 'topic:awesome']
  const results: Opportunity[] = []

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=10`,
        {
          headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(8000),
        }
      )
      if (!res.ok) continue
      const data = await res.json()
      const items: Array<{ full_name: string; description: string; html_url: string; topics: string[] }> = data.items ?? []
      results.push(...items.map(repo => ({
        title: repo.full_name,
        description: repo.description?.slice(0, 500) ?? '',
        url: repo.html_url,
        source: 'github',
        tags: repo.topics ?? [],
      })))
    } catch {
      // continue
    }
  }

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
