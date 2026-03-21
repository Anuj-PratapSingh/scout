import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { unsubscribeToken } from '@/lib/crypto'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('id')
  const token = searchParams.get('token')

  if (!userId || !token) {
    return new Response('Invalid unsubscribe link.', { status: 400 })
  }

  const expected = unsubscribeToken(userId)
  if (token !== expected) {
    return new Response('Invalid unsubscribe link.', { status: 400 })
  }

  const db = getSupabaseAdmin()
  await db.from('users').update({ is_active: false }).eq('id', userId)

  return new Response(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#000;color:#fff">
      <h2>You've been unsubscribed</h2>
      <p style="color:#888">You won't receive any more Scout notifications.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/preferences" style="color:#fff">Re-enable notifications</a></p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
