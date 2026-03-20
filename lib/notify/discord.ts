import type { Opportunity } from '../types'

export async function sendDiscordNotification(
  discordId: string,
  opp: Opportunity,
  matched: string[]
) {
  const token = process.env.DISCORD_BOT_TOKEN!

  // Open a DM channel first
  const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: discordId }),
  })

  if (!dmRes.ok) throw new Error('Failed to open Discord DM channel')
  const dm = await dmRes.json()

  const embed = {
    title: opp.title,
    url: opp.url,
    description: opp.description?.slice(0, 300) || undefined,
    color: 0x5865f2,
    fields: [
      { name: 'Source', value: opp.source, inline: true },
      ...(matched.length ? [{ name: 'Matched criteria', value: matched.join(', '), inline: false }] : []),
      ...(opp.deadline ? [{ name: 'Deadline', value: new Date(opp.deadline).toDateString(), inline: true }] : []),
    ],
    footer: { text: 'Scout — opportunity radar' },
    timestamp: new Date().toISOString(),
  }

  const msgRes = await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  })

  if (!msgRes.ok) {
    const err = await msgRes.json()
    throw new Error(`Discord send failed: ${JSON.stringify(err)}`)
  }
}
