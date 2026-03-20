import type { Opportunity } from './types'

const BLOCKLIST = [
  'invest now', 'guaranteed income', 'mlm', 'pyramid scheme',
  'dm for details', 'earn $', 'click here to claim',
  'limited time offer', 'make money fast', 'no experience needed earn',
  'passive income', 'work from home earn', 'get rich',
]

export function isFlagged(opp: Partial<Opportunity>): boolean {
  if (!opp.url) return true
  if (!opp.title || opp.title.length < 10) return true

  const text = `${opp.title ?? ''} ${opp.description ?? ''}`.toLowerCase()
  return BLOCKLIST.some(term => text.includes(term))
}
