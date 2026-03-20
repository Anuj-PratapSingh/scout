import Link from 'next/link'

const FEATURES = [
  { emoji: '🏆', label: 'Hackathons' },
  { emoji: '💼', label: 'Internships' },
  { emoji: '💰', label: 'Bounties' },
  { emoji: '🎁', label: 'Swag drops' },
  { emoji: '🚀', label: 'Programs (YC, etc.)' },
  { emoji: '🔍', label: 'Contests & grants' },
]

const STEPS = [
  { n: '1', title: 'Sign up', desc: 'Drop your email or start the Telegram bot. Done in 30 seconds.' },
  { n: '2', title: 'Set preferences', desc: 'Tell Scout what you care about. Hackathons only? Remote only? You decide.' },
  { n: '3', title: 'Get notified', desc: 'Scout monitors the internet 24/7 and pings you when something matches.' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Scout</span>
        <Link href="/signup" className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-white/90 transition">
          Get started
        </Link>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-sm text-white/50 uppercase tracking-widest mb-4">Opportunity radar</p>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Stop missing the opportunities<br />everyone else already knew about.
        </h1>
        <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
          Scout monitors HackerNews, Reddit, Devpost, Twitter and more — and pings you via email,
          Telegram, or Discord the moment something matches your criteria.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className="bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition">
            Start for free
          </Link>
          <Link href="/onboarding" className="text-white/60 hover:text-white text-sm transition">
            How it works →
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <p className="text-white/40 text-sm uppercase tracking-widest text-center mb-8">What Scout finds</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.label} className="border border-white/10 rounded-xl p-4 text-center hover:border-white/30 transition">
              <span className="text-2xl">{f.emoji}</span>
              <p className="mt-2 text-sm font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24">
        <p className="text-white/40 text-sm uppercase tracking-widest text-center mb-8">How it works</p>
        <div className="space-y-6">
          {STEPS.map(s => (
            <div key={s.n} className="flex gap-5 items-start">
              <span className="text-white/20 text-4xl font-bold w-10 shrink-0">{s.n}</span>
              <div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-white/50 text-sm mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-white/30 text-sm">
        Scout is free, forever. No ads, no upsells.
      </footer>
    </main>
  )
}
