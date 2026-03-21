import type { Opportunity } from '../types'

// ─── Codeforces — competitive programming contests (free JSON API) ─────────────
export async function scrapeCodeforces(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://codeforces.com/api/contest.list?gym=false',
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (data.status !== 'OK') return []
    const contests: Array<{ id: number; name: string; phase: string; startTimeSeconds: number; durationSeconds: number; type: string }> = data.result ?? []
    const now = Math.floor(Date.now() / 1000)
    const in60d = now + 60 * 24 * 60 * 60
    return contests
      .filter(c => ['BEFORE', 'CODING'].includes(c.phase) && c.startTimeSeconds < in60d)
      .slice(0, 20)
      .map(c => ({
        title: c.name,
        description: `Codeforces ${c.type} contest. Duration: ${Math.round(c.durationSeconds / 3600)}h. Phase: ${c.phase === 'BEFORE' ? 'Upcoming' : 'Live now'}.`,
        url: `https://codeforces.com/contest/${c.id}`,
        source: 'codeforces',
        tags: ['contest', 'competitive-programming', 'coding'],
        deadline: c.phase === 'CODING'
          ? new Date((c.startTimeSeconds + c.durationSeconds) * 1000).toISOString()
          : new Date(c.startTimeSeconds * 1000).toISOString(),
      }))
  } catch {
    return []
  }
}

// ─── CodeChef — coding competitions (free public API) ─────────────────────────
export async function scrapeCodeChef(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all',
      { headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const future: Array<{ code: string; name: string; start_date: string; end_date: string }> = data.future_contests ?? []
    const present: Array<{ code: string; name: string; start_date: string; end_date: string }> = data.present_contests ?? []
    return [...present, ...future].slice(0, 15).map(c => ({
      title: c.name,
      description: `CodeChef contest. ${c.code === c.code.toUpperCase() ? 'Rated contest.' : ''}`,
      url: `https://www.codechef.com/${c.code}`,
      source: 'codechef',
      tags: ['contest', 'competitive-programming', 'coding'],
      deadline: c.end_date ? new Date(c.end_date).toISOString() : null,
    }))
  } catch {
    return []
  }
}

// ─── AtCoder — Japanese competitive programming platform ───────────────────────
export async function scrapeAtCoder(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://kenkoooo.com/atcoder/resources/contests.json',
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const contests: Array<{ id: string; title: string; start_epoch_second: number; duration_second: number; rate_change: string }> = await res.json()
    const now = Math.floor(Date.now() / 1000)
    const in60d = now + 60 * 24 * 60 * 60
    return contests
      .filter(c => c.start_epoch_second > now && c.start_epoch_second < in60d)
      .sort((a, b) => a.start_epoch_second - b.start_epoch_second)
      .slice(0, 15)
      .map(c => ({
        title: c.title,
        description: `AtCoder contest. Rating change: ${c.rate_change || 'unrated'}. Starts ${new Date(c.start_epoch_second * 1000).toUTCString()}.`,
        url: `https://atcoder.jp/contests/${c.id}`,
        source: 'atcoder',
        tags: ['contest', 'competitive-programming', 'algorithms'],
        deadline: new Date((c.start_epoch_second + c.duration_second) * 1000).toISOString(),
      }))
  } catch {
    return []
  }
}

// ─── HackerEarth Challenges (separate from hackathons) ────────────────────────
export async function scrapeHackerEarthChallenges(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://www.hackerearth.com/api/v2/challenges/?type=code&status=ongoing,upcoming&limit=15',
      { headers: { 'User-Agent': 'Scout/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const challenges: Array<{ title: string; description: string; challenge_url: string; start_utc: string; end_utc: string }> = data.challenges ?? data.results ?? []
    return challenges.map(c => ({
      title: c.title,
      description: c.description?.replace(/<[^>]*>/g, '').slice(0, 500) ?? '',
      url: c.challenge_url,
      source: 'hackerearth-challenge',
      tags: ['contest', 'coding', 'challenge'],
      deadline: c.end_utc ?? null,
    }))
  } catch {
    return []
  }
}

// ─── TopCoder — Data Science / Marathon Matches ───────────────────────────────
export async function scrapeTopCoder(): Promise<Opportunity[]> {
  try {
    const res = await fetch(
      'https://api.topcoder.com/v5/challenges?status=Active&type=COMPETITIVE&perPage=15&sortBy=created&sortOrder=desc',
      { headers: { 'User-Agent': 'Scout/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const challenges: Array<{ name: string; overview?: { summaryText?: string }; url?: string; id: string; phases?: Array<{ name: string; scheduledEndDate?: string }> }> = await res.json()
    return challenges.slice(0, 15).map(c => {
      const submissionPhase = c.phases?.find(p => p.name === 'Submission')
      return {
        title: c.name,
        description: c.overview?.summaryText?.slice(0, 500) ?? 'TopCoder challenge.',
        url: c.url ?? `https://www.topcoder.com/challenges/${c.id}`,
        source: 'topcoder',
        tags: ['contest', 'competitive-programming', 'prizes'],
        deadline: submissionPhase?.scheduledEndDate ?? null,
      }
    })
  } catch {
    return []
  }
}
