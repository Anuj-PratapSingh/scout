import type { Opportunity, Preferences, MatchResult } from './types'

export function score(opp: Opportunity, prefs: Preferences): MatchResult {
  const text = [opp.title, opp.description, ...opp.tags].join(' ').toLowerCase()
  const allCriteria = [...prefs.categories, ...prefs.custom_criteria]

  if (allCriteria.length === 0) {
    return { score: 10, matched: [], blocked: false }
  }

  const matched = allCriteria.filter(c => text.includes(c.toLowerCase()))
  const scoreVal = Math.round((matched.length / allCriteria.length) * 10)
  const blocked = prefs.compulsory_criteria.some(c => !text.includes(c.toLowerCase()))

  return { score: scoreVal, matched, blocked }
}

export function shouldNotify(result: MatchResult, threshold: number): boolean {
  return result.score >= threshold && !result.blocked
}
