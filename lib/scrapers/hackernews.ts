import type { Opportunity } from '../types'

const BASE = 'https://hacker-news.firebaseio.com/v0'
const KEYWORDS = ['hackathon', 'hiring', 'bounty', 'internship', 'grant', 'fellowship', 'apply', 'yc ', 'stipend', 'contest', 'prize', 'swag']

async function fetchItem(id: number): Promise<Opportunity | null> {
  try {
    const res = await fetch(`${BASE}/item/${id}.json`)
    const item = await res.json()
    if (!item || item.type !== 'story' || !item.url) return null

    const text = `${item.title ?? ''} ${item.text ?? ''}`.toLowerCase()
    if (!KEYWORDS.some(k => text.includes(k))) return null

    return {
      title: item.title,
      description: item.text ?? '',
      url: item.url,
      source: 'hackernews',
      tags: KEYWORDS.filter(k => text.includes(k)),
    }
  } catch {
    return null
  }
}

export async function scrapeHackerNews(): Promise<Opportunity[]> {
  const res = await fetch(`${BASE}/newstories.json`)
  const ids: number[] = await res.json()
  const top200 = ids.slice(0, 200)

  const results: Opportunity[] = []
  // Batch in groups of 10 to be polite
  for (let i = 0; i < top200.length; i += 10) {
    const batch = top200.slice(i, i + 10)
    const items = await Promise.all(batch.map(fetchItem))
    results.push(...items.filter(Boolean) as Opportunity[])
    await new Promise(r => setTimeout(r, 100))
  }

  return results
}
