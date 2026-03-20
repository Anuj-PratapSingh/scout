import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { supabaseAdmin } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import type { Opportunity } from '@/lib/types'

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] })

const commands = [
  new SlashCommandBuilder()
    .setName('scout-subscribe')
    .setDescription('Subscribe to Scout opportunity notifications')
    .addStringOption(o => o.setName('categories').setDescription('e.g. hackathons, internships, bounties').setRequired(true))
    .addStringOption(o => o.setName('criteria').setDescription('e.g. "remote only, Python, prizes over $1000"').setRequired(false))
    .addIntegerOption(o => o.setName('threshold').setDescription('Min match score 1-10 (default 5)').setMinValue(1).setMaxValue(10).setRequired(false)),

  new SlashCommandBuilder()
    .setName('scout-pause')
    .setDescription('Pause Scout notifications'),

  new SlashCommandBuilder()
    .setName('scout-resume')
    .setDescription('Resume Scout notifications'),

  new SlashCommandBuilder()
    .setName('scout-latest')
    .setDescription('Show the 5 most recent opportunities Scout found'),

  new SlashCommandBuilder()
    .setName('scout-help')
    .setDescription('How Scout works'),
].map(c => c.toJSON())

export async function registerCommands(clientId: string, guildId?: string) {
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!)
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId)
  await rest.put(route, { body: commands })
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return
  const i = interaction as ChatInputCommandInteraction

  if (i.commandName === 'scout-subscribe') {
    const discordId = i.user.id
    const categoriesRaw = i.options.getString('categories', true)
    const criteriaRaw = i.options.getString('criteria') ?? ''
    const threshold = i.options.getInteger('threshold') ?? 5

    const categories = categoriesRaw.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => (CATEGORIES as readonly string[]).includes(s))

    const custom_criteria = criteriaRaw
      ? criteriaRaw.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const { data: user } = await supabaseAdmin
      .from('users')
      .upsert({ discord_id: discordId }, { onConflict: 'discord_id' })
      .select()
      .single()

    if (user) {
      await supabaseAdmin.from('preferences').upsert({
        user_id: user.id,
        categories,
        custom_criteria,
        compulsory_criteria: [],
        match_threshold: threshold,
      }, { onConflict: 'user_id' })
    }

    await i.reply({
      content: `You're live 🎯\n**Categories:** ${categories.join(', ') || 'all'}\n**Criteria:** ${custom_criteria.join(', ') || 'none'}\n**Min score:** ${threshold}/10\n\nI'll DM you when I find something.`,
      ephemeral: true,
    })
  }

  if (i.commandName === 'scout-pause') {
    await supabaseAdmin.from('users').update({ is_active: false }).eq('discord_id', i.user.id)
    await i.reply({ content: 'Notifications paused. Run /scout-resume to turn them back on.', ephemeral: true })
  }

  if (i.commandName === 'scout-resume') {
    await supabaseAdmin.from('users').update({ is_active: true }).eq('discord_id', i.user.id)
    await i.reply({ content: "You're back on the radar 🎯", ephemeral: true })
  }

  if (i.commandName === 'scout-latest') {
    const { data: opps } = await supabaseAdmin
      .from('opportunities')
      .select('title, url, source, description')
      .eq('is_flagged', false)
      .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
      .order('fetched_at', { ascending: false })
      .limit(5)

    if (!opps?.length) {
      await i.reply({ content: 'Nothing yet — Scout is warming up. Check back soon!', ephemeral: true })
      return
    }

    const embeds = (opps as Partial<Opportunity>[]).map(o => new EmbedBuilder()
      .setTitle(o.title ?? 'Opportunity')
      .setURL(o.url ?? '')
      .setDescription(o.description?.slice(0, 200) ?? null)
      .setFooter({ text: `Source: ${o.source}` })
      .setColor(0x5865f2)
    )

    await i.reply({ embeds, ephemeral: true })
  }

  if (i.commandName === 'scout-help') {
    await i.reply({
      content: '**Scout** finds hackathons, internships, bounties and more — and notifies you when something matches.\n\n`/scout-subscribe` — set up notifications\n`/scout-latest` — see recent finds\n`/scout-pause` / `/scout-resume` — toggle notifications\n\nMore at: ' + process.env.NEXT_PUBLIC_APP_URL,
      ephemeral: true,
    })
  }
})

client.once('ready', () => console.log(`Scout Discord bot ready as ${client.user?.tag}`))

export default client
