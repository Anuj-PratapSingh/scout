import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (code) {
    await supabaseAdmin.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
