import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')
  const limit = Math.min(Number(searchParams.get('limit') ?? '24'), 1000)

  const db = getSupabaseAdmin()
  let query = db
    .from('opportunities')
    .select('id, title, description, url, source, tags, deadline, fetched_at')
    .eq('is_flagged', false)
    .or('deadline.is.null,deadline.gt.' + new Date().toISOString())
    .order('fetched_at', { ascending: false })
    .limit(limit)

  if (source) query = query.eq('source', source)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ opportunities: data ?? [] })
}
