import type { Opportunity } from '../types'

const SUBREDDITS = 'hackathons+forhire+cscareerquestions+programming+devops+freelance+startups+webdev+gamedev+datascience+MachineLearning+learnprogramming+entrepreneur+compsci+netsec'
const REDDIT_BASE = 'https://www.reddit.com'

interface RedditPost {
  title: string
  selftext: string
  url: string
  permalink: string
  link_flair_text: string | null
}

export async function scrapeReddit(clientId?: string, clientSecret?: string): Promise<Opportunity[]> {
  let accessToken: string | null = null

  // Use OAuth if credentials provided (higher rate limits)
  if (clientId && clientSecret) {
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Scout/1.0',
        },
        body: 'grant_type=client_credentials',
      })
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
    } catch {
      // Fall through to unauthenticated
    }
  }

  const base = accessToken ? 'https://oauth.reddit.com' : REDDIT_BASE
  const headers: Record<string, string> = {
    'User-Agent': 'Scout/1.0',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  try {
    const res = await fetch(`${base}/r/${SUBREDDITS}/new.json?limit=50`, { headers })
    const data = await res.json()
    const posts: RedditPost[] = data.data?.children?.map((c: { data: RedditPost }) => c.data) ?? []

    return posts.map(p => ({
      title: p.title,
      description: p.selftext?.slice(0, 500) ?? '',
      url: p.url.startsWith('http') ? p.url : `https://reddit.com${p.permalink}`,
      source: 'reddit',
      tags: p.link_flair_text ? [p.link_flair_text.toLowerCase()] : [],
    }))
  } catch {
    return []
  }
}
