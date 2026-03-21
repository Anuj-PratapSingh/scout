import type { Opportunity } from './types'

const BLOCKLIST = [
  // Scams & spam
  'invest now', 'guaranteed income', 'mlm', 'pyramid scheme',
  'dm for details', 'earn $', 'click here to claim',
  'limited time offer', 'make money fast', 'no experience needed earn',
  'passive income', 'work from home earn', 'get rich',
  'financial freedom', 'crypto signals', 'forex signals',
  'binary options', '100% profit', 'risk free investment',
  // Noise
  'deleted', '[removed]', '[deleted]',
  'subscribe to unlock', 'paywalled',
]

export function isFlagged(opp: Partial<Opportunity>): boolean {
  if (!opp.url) return true
  if (!opp.title || opp.title.length < 10) return true

  const text = `${opp.title ?? ''} ${opp.description ?? ''}`.toLowerCase()
  return BLOCKLIST.some(term => text.includes(term))
}
