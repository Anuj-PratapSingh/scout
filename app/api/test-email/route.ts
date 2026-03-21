import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const key = process.env.SENDGRID_API_KEY
  const from = process.env.SENDGRID_FROM_EMAIL ?? 'panuj8909@gmail.com'

  if (!key) return NextResponse.json({ error: 'SENDGRID_API_KEY not set' })

  sgMail.setApiKey(key)

  try {
    await sgMail.send({
      from,
      to: 'anujpratapsingh00000@gmail.com',
      subject: 'Scout test email',
      html: '<p>This is a test from Scout. If you see this, email is working!</p>',
    })
    return NextResponse.json({ ok: true, from })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
