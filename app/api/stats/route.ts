import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
// Revalidate every 5 minutes — cheap cached response
export const revalidate = 300

export async function GET() {
  try {
    const [oppsRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('is_flagged', false)
        .or('deadline.is.null,deadline.gt.' + new Date().toISOString()),
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    return NextResponse.json({
      opps: oppsRes.count ?? 0,
      users: usersRes.count ?? 0,
      sources: 50, // hardcoded — update manually when we add more scrapers
    })
  } catch {
    return NextResponse.json({ opps: 0, users: 0, sources: 50 })
  }
}
