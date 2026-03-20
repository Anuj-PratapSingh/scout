import type { Opportunity } from '../types'

export async function sendTelegramNotification(
  telegramId: string,
  opp: Opportunity,
  matched: string[]
) {
  const token = process.env.TELEGRAM_BOT_TOKEN!
  const matchedText = matched.length ? `\n✅ Matched: ${matched.join(', ')}` : ''
  const deadlineText = opp.deadline
    ? `\n⏰ Deadline: ${new Date(opp.deadline).toDateString()}`
    : ''

  const text = [
    `🎯 *${escapeMarkdown(opp.title)}*`,
    `Source: ${opp.source}`,
    matchedText,
    deadlineText,
    `\n[View →](${opp.url})`,
  ].filter(Boolean).join('\n')

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Telegram send failed: ${JSON.stringify(err)}`)
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}
