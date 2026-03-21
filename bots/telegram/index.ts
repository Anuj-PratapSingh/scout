import { Telegraf, Scenes, session } from 'telegraf'
import { supabaseAdmin } from '@/lib/supabase'
import { score, shouldNotify } from '@/lib/matcher'
import { CATEGORIES } from '@/lib/types'
import type { Opportunity, Preferences } from '@/lib/types'

type ScoutWizardContext = Scenes.WizardContext & {
  wizard: Scenes.WizardContextWizard<Scenes.WizardContext> & {
    state: { categories?: string[]; criteria?: string[] }
  }
}

// After setup, immediately find and send matching opps from DB
async function sendInstantMatches(ctx: ScoutWizardContext, prefs: Preferences) {
  const { data: opps } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('is_flagged', false)
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .order('fetched_at', { ascending: false })
    .limit(200)

  const matches = (opps ?? [] as Opportunity[])
    .map(opp => ({ opp: opp as Opportunity, result: score(opp as Opportunity, prefs) }))
    .filter(({ result }) => shouldNotify(result, prefs.match_threshold))
    .slice(0, 5)

  if (!matches.length) {
    await ctx.reply("No matches in the DB yet — I'll ping you as soon as I find something! 📡")
    return
  }

  await ctx.reply(`🔥 Found ${matches.length} matching opportunit${matches.length === 1 ? 'y' : 'ies'} right now:`)

  for (const { opp, result } of matches) {
    const matchedText = result.matched.length ? `\n✅ Matched: ${result.matched.join(', ')}` : ''
    const deadlineText = opp.deadline ? `\n⏰ Deadline: ${new Date(opp.deadline).toDateString()}` : ''
    await ctx.reply(
      `🎯 *${escapeMarkdown(opp.title)}*\nSource: ${opp.source}${matchedText}${deadlineText}\n\n[View →](${opp.url})`,
      { parse_mode: 'Markdown' }
    )
  }
}

// --- Onboarding wizard scene ---
const onboardingScene = new Scenes.WizardScene<ScoutWizardContext>(
  'onboarding',

  // Step 1: ask categories
  async ctx => {
    await ctx.reply(
      "Hey! I'm Scout 🎯\n\n" +
      "I scan 20+ sources for hackathons, internships, bounties, swag drops, YC-style programs — and ping you when something matches.\n\n" +
      "What types of opportunities do you want?\n\n" +
      CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nReply with numbers separated by spaces (e.g. "1 3 5") or just say "all"'
    )
    return ctx.wizard.next()
  },

  // Step 2: ask custom criteria
  async ctx => {
    const text = (ctx.message && 'text' in ctx.message ? ctx.message.text : '').toLowerCase()
    ctx.wizard.state.categories = text.trim() === 'all'
      ? [...CATEGORIES]
      : CATEGORIES.filter((_, i) => text.includes(String(i + 1)))

    await ctx.reply(
      'Any specific criteria?\n\nExamples: "remote only", "Python", "prizes over $1000"\n\nSend comma-separated keywords, or type "skip"'
    )
    return ctx.wizard.next()
  },

  // Step 3: ask threshold
  async ctx => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : ''
    ctx.wizard.state.criteria = text.toLowerCase() === 'skip'
      ? []
      : text.split(',').map(s => s.trim()).filter(Boolean)

    await ctx.reply(
      'Last one: minimum match score? (1–10)\n\n' +
      '1 = notify me about almost everything\n' +
      '5 = balanced (recommended)\n' +
      '10 = only perfect matches\n\n' +
      'Reply with a number or "default" (5)'
    )
    return ctx.wizard.next()
  },

  // Done — save to DB then send instant matches
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
      `Searching the database for matches now…`
    )

    const prefs: Preferences = {
      user_id: user?.id ?? '',
      categories,
      custom_criteria: criteria,
      compulsory_criteria: [],
      match_threshold: threshold,
    }

    await sendInstantMatches(ctx, prefs)

    await ctx.reply('Commands: /latest /pause /help')
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
  '/latest — show last 5 matching opportunities\n' +
  '/pause — pause notifications\n' +
  '/resume — resume notifications\n' +
  '/help — show this message'
))

bot.command('latest', async ctx => {
  const telegramId = String(ctx.from.id)

  // Get user + prefs
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, preferences(*)')
    .eq('telegram_id', telegramId)
    .single()

  const prefs = user ? (Array.isArray(user.preferences) ? user.preferences[0] : user.preferences) as Preferences | undefined : undefined

  const { data: opps } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('is_flagged', false)
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .order('fetched_at', { ascending: false })
    .limit(200)

  if (!opps?.length) {
    await ctx.reply('Nothing in the DB yet — Scout is warming up. Check back soon!')
    return
  }

  const matches = prefs
    ? (opps as Opportunity[])
        .map(opp => ({ opp, result: score(opp, prefs) }))
        .filter(({ result }) => shouldNotify(result, prefs.match_threshold))
        .slice(0, 5)
    : (opps as Opportunity[]).slice(0, 5).map(opp => ({ opp, result: { score: 0, matched: [], blocked: false } }))

  if (!matches.length) {
    await ctx.reply("No matches with your current preferences. Try /start to adjust them.")
    return
  }

  for (const { opp, result } of matches) {
    const matchedText = result.matched.length ? `\n✅ Matched: ${result.matched.join(', ')}` : ''
    const deadlineText = opp.deadline ? `\n⏰ Deadline: ${new Date(opp.deadline).toDateString()}` : ''
    await ctx.reply(
      `🎯 *${escapeMarkdown(opp.title)}*\nSource: ${opp.source}${matchedText}${deadlineText}\n\n[View →](${opp.url})`,
      { parse_mode: 'Markdown' }
    )
  }
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

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

export default bot
export const webhookHandler = bot.webhookCallback('/api/telegram/webhook')
