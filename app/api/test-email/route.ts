import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) return NextResponse.json({ error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set' })

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  try {
    const info = await transporter.sendMail({
      from: `Scout <${user}>`,
      to: user,
      subject: 'Scout test email',
      html: '<p>This is a test from Scout. If you see this, email is working!</p>',
    })
    return NextResponse.json({ ok: true, from: user, messageId: info.messageId })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
