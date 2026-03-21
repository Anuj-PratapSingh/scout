import nodemailer from 'nodemailer'
import type { Opportunity } from '../types'

export async function sendEmailNotification(
  to: string,
  opp: Opportunity,
  matched: string[],
  _apiKey?: string
) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: `Scout <${process.env.GMAIL_USER}>`,
    to,
    subject: `Scout found something for you — ${opp.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#111">${opp.title}</h2>
        <p style="color:#555">${opp.description}</p>
        <p><strong>Source:</strong> ${opp.source}</p>
        ${matched.length ? `<p><strong>Matched your criteria:</strong> ${matched.join(', ')}</p>` : ''}
        ${opp.deadline ? `<p><strong>Deadline:</strong> ${new Date(opp.deadline).toDateString()}</p>` : ''}
        <a href="${opp.url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
          View Opportunity →
        </a>
        <p style="margin-top:32px;color:#999;font-size:12px">
          You're receiving this because you subscribed to Scout.
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/preferences">Manage preferences</a>
        </p>
      </div>
    `,
  })
}
