import nodemailer from 'nodemailer'
import { unsubscribeToken } from '../crypto'
import type { Opportunity } from '../types'

function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

function footer(userId?: string) {
  const unsubLink = userId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?id=${userId}&token=${unsubscribeToken(userId)}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/preferences`
  return `<p style="margin-top:32px;color:#999;font-size:12px;font-family:sans-serif">
    You're receiving this because you subscribed to Scout.
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/preferences" style="color:#999">Manage preferences</a> ·
    <a href="${unsubLink}" style="color:#999">Unsubscribe</a>
  </p>`
}

// Single opportunity email — only used for perfect matches (score 10, hits ALL criteria)
export async function sendEmailNotification(
  to: string,
  opp: Opportunity,
  matched: string[],
  _apiKey?: string,
  userId?: string
) {
  await makeTransporter().sendMail({
    from: `Scout <${process.env.GMAIL_USER}>`,
    to,
    subject: `🎯 Perfect match: ${opp.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <p style="font-size:12px;color:#888;margin-bottom:4px">PERFECT MATCH — hits all your criteria</p>
        <h2 style="color:#111;margin-top:0">${opp.title}</h2>
        <p style="color:#555">${opp.description}</p>
        <p><strong>Source:</strong> ${opp.source}</p>
        ${matched.length ? `<p><strong>Matched:</strong> ${matched.join(', ')}</p>` : ''}
        ${opp.deadline ? `<p><strong>Deadline:</strong> ${new Date(opp.deadline).toDateString()}</p>` : ''}
        <a href="${opp.url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
          View Opportunity →
        </a>
        ${footer(userId)}
      </div>
    `,
  })
}

// Digest email — batches multiple good-match opportunities into one email
export async function sendDigestEmail(
  to: string,
  matches: Array<{ opp: Opportunity; matched: string[] }>,
  userId?: string
) {
  const oppRows = matches.map(({ opp, matched }) => `
    <div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin-bottom:12px">
      <h3 style="margin:0 0 6px;color:#111;font-size:16px">${opp.title}</h3>
      <p style="margin:0 0 8px;color:#555;font-size:14px">${opp.description?.slice(0, 200) ?? ''}${(opp.description?.length ?? 0) > 200 ? '…' : ''}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#888;margin-bottom:10px">
        <span>📡 ${opp.source}</span>
        ${opp.deadline ? `<span>⏰ ${new Date(opp.deadline).toDateString()}</span>` : ''}
        ${matched.length ? `<span>✓ ${matched.join(', ')}</span>` : ''}
      </div>
      <a href="${opp.url}" style="display:inline-block;padding:8px 18px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:13px">View →</a>
    </div>
  `).join('')

  await makeTransporter().sendMail({
    from: `Scout <${process.env.GMAIL_USER}>`,
    to,
    subject: `Scout digest — ${matches.length} new opportunit${matches.length === 1 ? 'y' : 'ies'} for you`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#111">Your Scout digest</h2>
        <p style="color:#888;font-size:14px">${matches.length} opportunit${matches.length === 1 ? 'y' : 'ies'} matching your preferences</p>
        ${oppRows}
        ${footer(userId)}
      </div>
    `,
  })
}
