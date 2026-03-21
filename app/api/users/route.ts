import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/users — create user at signup
export async function POST(req: Request) {
  const { email, telegram_id } = await req.json()

  if (!email && !telegram_id) {
    return NextResponse.json({ error: 'At least one contact method required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert({ email, telegram_id }, { onConflict: 'email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}

// DELETE /api/users — delete own account
export async function DELETE(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin.from('users').delete().eq('id', user.id)
  return NextResponse.json({ ok: true })
}
