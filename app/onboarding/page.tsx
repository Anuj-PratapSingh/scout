import Link from 'next/link'

const STEPS = [
  {
    step: 'Step 1',
    title: 'Connect your channels',
    items: [
      { label: 'Email', desc: 'You\'re already set if you signed up with email. Scout will send alerts directly to your inbox.' },
      { label: 'Telegram', desc: 'Search @ScoutOpBot on Telegram → press Start → follow the 3-question setup. Takes 60 seconds.' },
      { label: 'Discord', desc: 'Invite the Scout bot to your server, then run /scout-subscribe. Scout will DM you directly.' },
    ],
  },
  {
    step: 'Step 2',
    title: 'Set your preferences',
    items: [
      { label: 'Categories', desc: 'Pick what you care about: hackathons, internships, bounties, swag, programs, contests.' },
      { label: 'Custom criteria', desc: 'Plain English, e.g. "remote only", "Python", "prizes over $1000". Scout matches against these.' },
      { label: 'Match threshold', desc: 'Set a minimum score (1–10). Scout only notifies you when enough criteria match — no noise.' },
      { label: 'Compulsory criteria', desc: 'Hard filters. e.g. "virtual" — Scout will never send you in-person opportunities.' },
    ],
  },
  {
    step: 'Step 3 (optional)',
    title: 'Add your own API keys',
    items: [
      { label: 'Reddit OAuth', desc: 'Get client ID + secret at reddit.com/prefs/apps → creates app. Unlocks higher rate limits.' },
      { label: 'Google Custom Search', desc: 'console.cloud.google.com → enable Custom Search JSON API → get key + CX ID. Finds LinkedIn posts.' },
      { label: 'Resend', desc: 'resend.com → create API key. Gives you your own email quota, isolated from other Scout users.' },
    ],
  },
]

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="text-xl font-bold tracking-tight">Scout</Link>
        <Link href="/preferences" className="text-sm text-white/60 hover:text-white transition">
          Set preferences →
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Getting started</h1>
        <p className="text-white/50 mb-12">Three steps. Most people are live in under 2 minutes.</p>

        <div className="space-y-16">
          {STEPS.map(section => (
            <div key={section.step}>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{section.step}</p>
              <h2 className="text-2xl font-semibold mb-6">{section.title}</h2>
              <div className="space-y-4">
                {section.items.map(item => (
                  <div key={item.label} className="border border-white/10 rounded-xl p-5 hover:border-white/20 transition">
                    <h3 className="font-medium mb-1">{item.label}</h3>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/preferences" className="bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition">
            Set my preferences →
          </Link>
        </div>
      </div>
    </main>
  )
}
