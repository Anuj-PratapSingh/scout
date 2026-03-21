import type { Opportunity } from '../types'

// ─── DoraHacks — hackathon bounties & prizes ──────────────────────────────────
export async function scrapeDoraHacks(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://dorahacks.io/api/v2/hackathon/list/?status=open&limit=20&offset=0',
      { headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const hackathons: Array<{ title: string; description?: string; slug?: string; id?: number; total_prize?: number; end_time?: string }> = data.data ?? data.results ?? data ?? []
    if (!Array.isArray(hackathons)) return []
    return hackathons.slice(0, 20).map(h => ({
      title: h.title,
      description: `${h.description?.replace(/<[^>]*>/g, '').slice(0, 400) ?? ''}${h.total_prize ? ` | Prize pool: $${h.total_prize.toLocaleString()}` : ''}`.trim(),
      url: h.slug ? `https://dorahacks.io/hackathon/${h.slug}` : `https://dorahacks.io/hackathon/${h.id}`,
      source: 'dorahacks',
      tags: ['hackathon', 'bounty', 'prizes'],
      deadline: h.end_time ? new Date(h.end_time).toISOString() : null,
    }))
  } catch {
    return []
  }
}

// ─── IssueHunt — fund & claim issue bounties ──────────────────────────────────
export async function scrapeIssueHunt(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://issuehunt.io/repos?sort=funded&language=all',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const html = await res.text()
    const results: Opportunity[] = []

    // Extract repo names and issue counts from the page
    const matches = [...html.matchAll(/href="(\/repos\/[^"]+)"[^>]*>[\s\S]{0,500}?<h\d[^>]*>([^<]{5,100})<\/h/g)]
    matches.slice(0, 15).forEach(m => {
      const path = m[1]
      const title = m[2]?.trim()
      if (title && path) {
        results.push({
          title: `${title} — funded issues`,
          description: 'Open source repository with funded GitHub issues. Claim bounties by fixing bugs or implementing features.',
          url: `https://issuehunt.io${path}`,
          source: 'issuehunt',
          tags: ['bounty', 'open-source', 'github', 'paid'],
        })
      }
    })

    return results
  } catch {
    return []
  }
}

// ─── Immunefi — web3 / smart contract bug bounties ────────────────────────────
export async function scrapeImmunefi(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://immunefi.com/bug-bounty/',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const html = await res.text()
    const results: Opportunity[] = []

    // Extract programs from __NEXT_DATA__ or HTML
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextData) {
      try {
        const data = JSON.parse(nextData[1])
        const bounties = data?.props?.pageProps?.bounties ?? data?.props?.pageProps?.projects ?? []
        bounties.slice(0, 20).forEach((b: { project?: string; name?: string; maxBounty?: number; url?: string; slug?: string }) => {
          const name = b.project ?? b.name ?? ''
          if (!name) return
          results.push({
            title: `${name} Bug Bounty`,
            description: `Immunefi bug bounty program.${b.maxBounty ? ` Max reward: $${b.maxBounty.toLocaleString()}.` : ''} Report vulnerabilities in smart contracts and earn rewards.`,
            url: b.url ?? `https://immunefi.com/bounty/${b.slug ?? name.toLowerCase().replace(/\s+/g, '-')}`,
            source: 'immunefi',
            tags: ['bounty', 'bug-bounty', 'web3', 'security'],
          })
        })
      } catch { /* ignore parse error */ }
    }

    // Fallback: parse HTML directly if no Next.js data
    if (results.length === 0) {
      const titleMatches = [...html.matchAll(/<h\d[^>]*>([A-Z][^<]{2,60})<\/h\d>/g)]
      titleMatches.slice(0, 15).forEach(m => {
        const name = m[1]?.trim()
        if (name && !name.includes('Bug Bounty') && !name.includes('Immunefi')) {
          results.push({
            title: `${name} — Immunefi Bug Bounty`,
            description: 'Web3 bug bounty program on Immunefi. Find vulnerabilities in smart contracts and protocols for crypto rewards.',
            url: 'https://immunefi.com/bug-bounty/',
            source: 'immunefi',
            tags: ['bounty', 'bug-bounty', 'web3', 'security'],
          })
        }
      })
    }

    return results
  } catch {
    return []
  }
}

// ─── HackerOne public programs ─────────────────────────────────────────────────
export async function scrapeHackerOne(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://hackerone.com/programs.json?query%5Boffers_bounties%5D=true&query%5Bstate%5D=public_mode&query%5Bordered_by%5D=started_accepting_at&query%5Bsort_direction%5D=DESC&page=1',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
          'X-Auth-Token': '',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const programs: Array<{ name: string; handle: string; profile?: { name?: string; twitter_handle?: string }; attributes?: { name?: string; handle?: string; started_accepting_at?: string; maximum_bounty?: number } }> = data.results ?? data.programs ?? data ?? []
    if (!Array.isArray(programs)) return []
    return programs.slice(0, 15).map(p => {
      const name = p.attributes?.name ?? p.profile?.name ?? p.name ?? p.attributes?.handle ?? ''
      const handle = p.attributes?.handle ?? p.handle ?? ''
      return {
        title: `${name} — Bug Bounty (HackerOne)`,
        description: `HackerOne public bug bounty program.${p.attributes?.maximum_bounty ? ` Max bounty: $${p.attributes.maximum_bounty.toLocaleString()}.` : ''} Report security vulnerabilities and earn rewards.`,
        url: `https://hackerone.com/${handle}`,
        source: 'hackerone',
        tags: ['bounty', 'bug-bounty', 'security'],
      }
    }).filter(p => p.url !== 'https://hackerone.com/')
  } catch {
    return []
  }
}

// ─── Open Bug Bounty ───────────────────────────────────────────────────────────
// Coordinated disclosure bounty program
export async function scrapeOpenBugBounty(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://www.openbugbounty.org/rss/rss.php',
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const xml = await res.text()

    // Simple XML parse
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    return items.slice(0, 15).map(m => {
      const content = m[1]
      const title = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]?.trim()
        ?? content.match(/<title>(.*?)<\/title>/)?.[1]?.trim() ?? ''
      const link = content.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? ''
      const desc = content.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        ?.replace(/<[^>]+>/g, '').trim().slice(0, 400)
        ?? content.match(/<description>(.*?)<\/description>/)?.[1]?.trim() ?? ''
      return { title, description: desc, url: link, source: 'openbugbounty', tags: ['bounty', 'bug-bounty', 'security', 'disclosure'] }
    }).filter(o => o.title && o.url)
  } catch {
    return []
  }
}
