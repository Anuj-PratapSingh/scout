import { Telegraf, Scenes, session } from 'telegraf'
import { supabaseAdmin } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import type { Opportunity } from '@/lib/types'

type ScoutWizardContext = Scenes.WizardContext & {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: { categories?: string[]; criteria?: string[] }
  }
}

// --- Onboarding wizard scene ---
const onboardingScene = new Scenes.WizardScene<ScoutWizardContext>(
  'onboarding',

  // Step 1: ask categories
  async ctx => {
    await ctx.reply(
      "Hey! I'm Scout 🎯\n\n" +
      "I scan the internet for hackathons, internships, bounties, swag drops, programs like YC — and ping you when something matches.\n\n" +
      "What types of opportunities do you want?\n\n" +
      CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nReply with numbers (e.g. "1 3 5") or just say "all"'
    )
    return ctx.wizard.next()
  },

  // Step 2: ask custom criteria
  async ctx => {
    const text = (ctx.message && 'text' in ctx.message ? ctx.message.text : '').toLowerCase()
    ctx.wizard.state.categories = text === 'all'
      ? [...CATEGORIES]
      : CATEGORIES.filter((_, i) => text.includes(String(i + 1)))

    await ctx.reply(
      'Any specific criteria?\n\nExamples: "remote only", "Python", "prizes over $1000"\n\nComma-separated, or type "skip"'
    )
    return ctx.wizard.next()
  },

  // Step 3: ask threshold then save
  async ctx => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : ''
    ctx.wizard.state.criteria = text.toLowerCase() === 'skip'
      ? []
      : text.split(',').map(s => s.trim()).filter(Boolean)

    await ctx.reply(
      'Last one: minimum match score? (1–10)\n\nDefault is 5 — reply with a number or "default"'
    )
    return ctx.wizard.next()
  },

  // Done — save to DB
  async ctx => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : ''
    const threshold = text.toLowerCase() === 'default' ? 5 : Math.min(10, Math.max(1, parseInt(text) || 5))
    const { categories = [], criteria = [] } = ctx.wizard.state

    const telegramId = String(ctx.from!.id)
    const { data: user } = await supabaseAdmin
      .from('users')
      .upsert({ telegram_id: telegramId }, { onConflict: 'telegram_id' })
      .select()
      .single()

    if (user) {
      await supabaseAdmin.from('preferences').upsert({
        user_id: user.id,
        categories,
        custom_criteria: criteria,
        compulsory_criteria: [],
        match_threshold: threshold,
      }, { onConflict: 'user_id' })
    }

    await ctx.reply(
      `You're live 🚀\n\n` +
      `Categories: ${categories.join(', ') || 'all'}\n` +
      `Criteria: ${criteria.length ? criteria.join(', ') : 'none'}\n` +
      `Min match score: ${threshold}/10\n\n` +
      `I'll ping you when I find something.\n\nCommands: /latest /pause /help`
    )
    return ctx.scene.leave()
  }
)

const bot = new Telegraf<ScoutWizardContext>(process.env.TELEGRAM_BOT_TOKEN!)
const stage = new Scenes.Stage<ScoutWizardContext>([onboardingScene])

bot.use(session())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
bot.use(stage.middleware() as any)

bot.start(ctx => ctx.scene.enter('onboarding'))

bot.help(ctx => ctx.reply(
  'Scout commands:\n\n' +
  '/start — set up or reset preferences\n' +
  '/latest — show last 5 opportunities\n' +
  '/pause — pause notifications\n' +
  '/resume — resume notifications\n' +
  '/help — show this message'
))

bot.command('latest', async ctx => {
  const { data: opps } = await supabaseAdmin
    .from('opportunities')
    .select('title, url, source')
    .eq('is_flagged', false)
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .order('fetched_at', { ascending: false })
    .limit(5)

  if (!opps?.length) {
    await ctx.reply('Nothing yet — Scout is warming up. Check back soon!')
    return
  }

  const msg = (opps as Partial<Opportunity>[]).map((o, i) =>
    `${i + 1}. *${o.title}*\nSource: ${o.source}\n[View →](${o.url})`
  ).join('\n\n')

  await ctx.reply(msg, { parse_mode: 'Markdown' })
})

bot.command('pause', async ctx => {
  await supabaseAdmin.from('users').update({ is_active: false }).eq('telegram_id', String(ctx.from.id))
  await ctx.reply("Notifications paused. Send /resume when you're ready.")
})

bot.command('resume', async ctx => {
  await supabaseAdmin.from('users').update({ is_active: true }).eq('telegram_id', String(ctx.from.id))
  await ctx.reply("You're back on the radar 🎯")
})

bot.command('preferences', ctx =>
  ctx.reply(`Update your preferences: ${process.env.NEXT_PUBLIC_APP_URL}/preferences`)
)

export default bot
export const webhookHandler = bot.webhookCallback('/api/telegram/webhook')
