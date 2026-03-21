import type { Opportunity, Preferences, MatchResult } from './types'

export function score(opp: Opportunity, prefs: Preferences): MatchResult {
  const text = [opp.title, opp.description, ...opp.tags].join(' ').toLowerCase()
  const allCriteria = [...prefs.categories, ...prefs.custom_criteria]

  if (allCriteria.length === 0) {
    return { score: 10, matched: [], blocked: false }
  }

  const matched = allCriteria.filter(c => {
    const lc = c.toLowerCase()
    // match plural/singular: "hackathons" matches "hackathon" and vice versa
    return text.includes(lc) || text.includes(lc.replace(/s$/, '')) || text.includes(lc + 's')
  })
  const scoreVal = Math.round((matched.length / allCriteria.length) * 10)
  const blocked = prefs.compulsory_criteria.some(c => {
    const lc = c.toLowerCase()
    return !text.includes(lc) && !text.includes(lc.replace(/s$/, '')) && !text.includes(lc + 's')
  })

  return { score: scoreVal, matched, blocked }
}

export function shouldNotify(result: MatchResult, threshold: number): boolean {
  return result.score >= threshold && !result.blocked
}
