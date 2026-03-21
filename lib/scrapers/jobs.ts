import type { Opportunity } from '../types'

// ─── Remotive — remote jobs API (free, no auth) ───────────────────────────────
export async function scrapeRemotiveAPI(): Promise<Opportunity[]> {
  try {
    const categories = ['software-dev', 'devops-sysadmin', 'data', 'design']
    const results: Opportunity[] = []

    await Promise.all(categories.map(async cat => {
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?category=${cat}&limit=20`,
        { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return
      const data = await res.json()
      const jobs: Array<{ title: string; description: string; url: string; company_name: string; tags: string[]; candidate_required_location: string }> = data.jobs ?? []
      results.push(...jobs.map(j => ({
        title: `${j.title} — ${j.company_name}`,
        description: j.description?.replace(/<[^>]*>/g, '').slice(0, 500) ?? '',
        url: j.url,
        source: 'remotive',
        tags: [...(j.tags ?? []), j.candidate_required_location].filter(Boolean),
      })))
    }))

    return results
  } catch {
    return []
  }
}

// ─── HN "Who is Hiring" — YC / startup jobs ──────────────────────────────────
export async function scrapeHNJobs(): Promise<Opportunity[]> {
  try {
    // Find the latest "Ask HN: Who is hiring?" thread
    const searchRes = await fetch(
      'https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=story,ask_hn&hitsPerPage=1',
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const thread = searchData.hits?.[0]
    if (!thread?.objectID) return []

    // Get comments from that thread
    const threadRes = await fetch(
      `https://hn.algolia.com/api/v1/items/${thread.objectID}`,
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(10000) }
    )
    if (!threadRes.ok) return []
    const threadData = await threadRes.json()
    const comments: Array<{ text?: string; id: number; author?: string }> = threadData.children ?? []

    // Each top-level comment is a job posting
    return comments.slice(0, 30).filter(c => c.text && c.text.length > 50).map(c => {
      const plain = c.text!.replace(/<[^>]*>/g, '').slice(0, 500)
      // First line is usually the company/role
      const firstLine = plain.split('\n')[0].slice(0, 100)
      return {
        title: firstLine || `HN Jobs — ${c.author ?? 'Anonymous'}`,
        description: plain,
        url: `https://news.ycombinator.com/item?id=${c.id}`,
        source: 'hn-jobs',
        tags: ['job', 'startup', 'yc'],
      }
    })
  } catch {
    return []
  }
}

// ─── Internshala — India internships (HTML scrape) ───────────────────────────
export async function scrapeInternshala(): Promise<Opportunity[]> {
  try {
    const res = await fetch('https://internshala.com/internships/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const html = await res.text()

    const results: Opportunity[] = []

    // Parse internship cards from HTML
    const titleMatches = [...html.matchAll(/class="[^"]*heading_4_5[^"]*"[^>]*>([^<]+)<\/a>/g)]
    const companyMatches = [...html.matchAll(/class="[^"]*company[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g)]
    const linkMatches = [...html.matchAll(/href="(\/internship\/detail\/[^"]+)"/g)]
    const stipendMatches = [...html.matchAll(/class="[^"]*stipend[^"]*"[^>]*>([\s\S]*?)<\/span>/g)]

    titleMatches.slice(0, 15).forEach((m, i) => {
      const title = m[1]?.trim()
      const company = companyMatches[i]?.[1]?.trim() ?? ''
      const path = linkMatches[i]?.[1] ?? ''
      const stipend = stipendMatches[i]?.[1]?.replace(/<[^>]*>/g, '').trim() ?? ''
      if (title && path) {
        results.push({
          title: `${title}${company ? ` — ${company}` : ''}`,
          description: stipend ? `Stipend: ${stipend}` : 'Internship opportunity',
          url: `https://internshala.com${path}`,
          source: 'internshala',
          tags: ['internship', 'india'],
        })
      }
    })

    return results
  } catch {
    return []
  }
}

// ─── Wellfound (AngelList) — startup jobs ────────────────────────────────────
export async function scrapeWellfound(): Promise<Opportunity[]> {
  try {
    // Wellfound has a public GraphQL endpoint for listings
    const res = await fetch('https://wellfound.com/jobs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const html = await res.text()

    const results: Opportunity[] = []

    // Parse Next.js __NEXT_DATA__ JSON embedded in the page
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) return []

    const data = JSON.parse(match[1])
    const startups = data?.props?.pageProps?.algoliaResults?.hits
      ?? data?.props?.pageProps?.startups
      ?? []

    startups.slice(0, 20).forEach((s: { name?: string; high_concept?: string; slug?: string; job_roles?: Array<{ title?: string; slug?: string }> }) => {
      const name = s.name ?? ''
      const desc = s.high_concept ?? ''
      const slug = s.slug ?? ''
      const roles = s.job_roles ?? []

      if (roles.length > 0) {
        roles.slice(0, 2).forEach(role => {
          if (role.title) {
            results.push({
              title: `${role.title} — ${name}`,
              description: desc.slice(0, 500),
              url: `https://wellfound.com/company/${slug}/jobs`,
              source: 'wellfound',
              tags: ['job', 'startup'],
            })
          }
        })
      } else if (name) {
        results.push({
          title: `Jobs at ${name}`,
          description: desc.slice(0, 500),
          url: `https://wellfound.com/company/${slug}/jobs`,
          source: 'wellfound',
          tags: ['job', 'startup'],
        })
      }
    })

    return results
  } catch {
    return []
  }
}

// ─── HackerEarth — coding competitions ──────────────────────────────────────
export async function scrapeHackerEarth(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://www.hackerearth.com/api/v2/challenges/?type=hackathon&status=ongoing,upcoming&limit=20',
      { headers: { 'User-Agent': 'Scout/1.0', 'client-secret': '' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const challenges: Array<{ title: string; description: string; challenge_url: string; start_utc: string; end_utc: string }> = data.challenges ?? data.results ?? []
    return challenges.map(c => ({
      title: c.title,
      description: c.description?.replace(/<[^>]*>/g, '').slice(0, 500) ?? '',
      url: c.challenge_url,
      source: 'hackerearth',
      tags: ['hackathon', 'coding'],
      deadline: c.end_utc ?? null,
    }))
  } catch {
    return []
  }
}

// ─── Kaggle — ML competitions ────────────────────────────────────────────────
export async function scrapeKaggle(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://www.kaggle.com/api/v1/competitions/list?sortBy=deadline&pageSize=10',
      { headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const competitions: Array<{ title: string; description: string; slug: string; deadline: string; reward: string }> = await res.json()
    return competitions.map(c => ({
      title: c.title,
      description: `${c.description?.slice(0, 300) ?? ''}${c.reward ? ` | Prize: ${c.reward}` : ''}`,
      url: `https://www.kaggle.com/competitions/${c.slug}`,
      source: 'kaggle',
      tags: ['competition', 'ml', 'data-science'],
      deadline: c.deadline ?? null,
    }))
  } catch {
    return []
  }
}

// ─── Swag & bounties ────────────────────────────────────────────────────────
export async function scrapeSwag(): Promise<Opportunity[]> {
  const results: Opportunity[] = []

  // Hacktoberfest — annual open source swag event (Oct, but relevant year-round for prep)
  try {
    const res = await fetch('https://hacktoberfest.com/participation/', {
      headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      results.push({
        title: 'Hacktoberfest — Free swag for open source contributions',
        description: 'Contribute to open source in October and earn free t-shirts, stickers and digital swag. Register at hacktoberfest.com.',
        url: 'https://hacktoberfest.com',
        source: 'swag',
        tags: ['swag', 'open-source', 'hacktoberfest', 'free'],
      })
    }
  } catch { /* skip */ }

  // GitHub Student Developer Pack
  results.push({
    title: 'GitHub Student Developer Pack — $200k+ in free dev tools',
    description: 'Free access to GitHub Copilot, AWS credits, DigitalOcean, JetBrains, Namecheap, and 100+ other tools for students.',
    url: 'https://education.github.com/pack',
    source: 'swag',
    tags: ['swag', 'student', 'free', 'github', 'tools'],
  })

  // MLH Localhost / seasons swag
  results.push({
    title: 'MLH Season — Hackathon swag & prizes',
    description: 'Major League Hacking runs 200+ hackathons per season with swag, prizes, and sponsor perks.',
    url: 'https://mlh.io/seasons',
    source: 'swag',
    tags: ['swag', 'hackathon', 'mlh', 'prizes'],
  })

  // JetBrains student license
  results.push({
    title: 'JetBrains Free Student License — All IDEs free',
    description: 'Free access to all JetBrains IDEs (IntelliJ, PyCharm, WebStorm, etc.) for students with a .edu email.',
    url: 'https://www.jetbrains.com/community/education/',
    source: 'swag',
    tags: ['swag', 'student', 'free', 'ide'],
  })

  // Fetch bounties from Reddit r/slavelabour and r/forhire
  try {
    const res = await fetch('https://www.reddit.com/r/bounty+slavelabour/new.json?limit=15', {
      headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      const posts: Array<{ data: { title: string; selftext: string; url: string; permalink: string; link_flair_text: string | null } }> = data.data?.children ?? []
      results.push(...posts
        .filter(p => p.data.title.toLowerCase().includes('[task]') || p.data.title.toLowerCase().includes('[bounty]') || p.data.title.toLowerCase().includes('$'))
        .map(p => ({
          title: p.data.title,
          description: p.data.selftext?.slice(0, 400) ?? '',
          url: `https://reddit.com${p.data.permalink}`,
          source: 'swag',
          tags: ['bounty', 'paid-task', 'reddit'],
        }))
      )
    }
  } catch { /* skip */ }

  return results
}

// ─── EthGlobal — web3 hackathons ────────────────────────────────────────────
export async function scrapeEthGlobal(): Promise<Opportunity[]> {
  try {
    const res = await fetch('https://ethglobal.com/events', {
      headers: { 'User-Agent': 'Scout/1.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const html = await res.text()
    const results: Opportunity[] = []

    const matches = [...html.matchAll(/<h\d[^>]*>([^<]{10,80})<\/h\d>[\s\S]{0,300}?href="(\/events\/[^"]+)"/g)]
    matches.slice(0, 10).forEach(m => {
      results.push({
        title: m[1].trim(),
        description: 'ETHGlobal hackathon event',
        url: `https://ethglobal.com${m[2]}`,
        source: 'ethglobal',
        tags: ['hackathon', 'web3', 'ethereum'],
      })
    })

    return results
  } catch {
    return []
  }
}
