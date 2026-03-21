export interface Opportunity {
  id?: string
  title: string
  description: string
  url: string
  source: string
  tags: string[]
  deadline?: string | null
  is_flagged?: boolean
  fetched_at?: string
}

export interface Preferences {
  user_id: string
  categories: string[]
  custom_criteria: string[]
  compulsory_criteria: string[]
  match_threshold: number
  email_frequency: number  // 1–5 emails per day
}

export interface MatchResult {
  score: number        // 0–10
  matched: string[]   // which criteria matched
  blocked: boolean    // true if any compulsory criterion failed
}

export const CATEGORIES = [
  'hackathons',
  'internships',
  'bounties',
  'contests',
  'swag',
  'programs',  // YC, buildspace, etc.
  'jobs',
  'grants',
] as const

export type Category = typeof CATEGORIES[number]
