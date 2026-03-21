import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY not set' })

  const resend = new Resend(key)
  const result = await resend.emails.send({
    from: from ?? 'Scout <onboarding@resend.dev>',
    to: 'gamelivinn@gmail.com',
    subject: 'Scout test email',
    html: '<p>This is a test from Scout. If you see this, email is working!</p>',
  })

  return NextResponse.json({ key_prefix: key.slice(0, 6), from, result })
}
