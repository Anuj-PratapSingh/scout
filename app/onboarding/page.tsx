import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    title: 'Connect your channels',
    items: [
      { label: '📧 Email', desc: 'Already set if you signed up with email. Scout sends a daily digest — or instant alerts for perfect matches.' },
      { label: '✈️ Telegram', desc: 'Search @ScoutOpBot on Telegram → press Start → follow the 3-question setup. Takes 60 seconds.' },
      { label: '🎮 Discord', desc: 'Invite the Scout bot to your server, then run /scout-subscribe. Scout will DM you directly.' },
    ],
  },
  {
    n: '02',
    title: 'Set your preferences',
    items: [
      { label: 'Categories', desc: 'Pick what you care about: hackathons, internships, bounties, swag, programs, contests.' },
      { label: 'Custom criteria', desc: 'Plain English — e.g. "remote only", "Python", "prizes over $1000". Scout matches against these.' },
      { label: 'Match threshold', desc: 'Set a minimum score (1–10). Prevents noise — Scout only pings you when enough criteria match.' },
      { label: 'Compulsory criteria', desc: 'Hard filters. e.g. "virtual" — Scout will never send you in-person opportunities.' },
    ],
  },
  {
    n: '03',
    title: 'Add your own API keys (optional)',
    items: [
      { label: 'Reddit OAuth', desc: 'Client ID + secret from reddit.com/prefs/apps. Unlocks higher rate limits.' },
      { label: 'Google Custom Search', desc: 'Enables LinkedIn post scraping. console.cloud.google.com → enable Custom Search API.' },
    ],
  },
]

export default function OnboardingPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav">
        <Link href="/" style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '2px 10px', borderRadius: '1px' }}>Scout</span>
        </Link>
        <Link href="/preferences" className="btn" style={{ fontSize: '0.85rem' }}>Set preferences →</Link>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>
          Getting started
        </p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '2.2rem', marginBottom: '0.5rem' }}>You're in.</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', marginBottom: '3rem' }}>
          Three steps. Most people are live in under 2 minutes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {STEPS.map(section => (
            <div key={section.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', border: 'var(--border)', padding: '1px 6px', borderRadius: '2px' }}>{section.n}</span>
                <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.25rem', margin: 0 }}>{section.title}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {section.items.map(item => (
                  <div key={item.label} style={{ border: 'var(--border)', boxShadow: 'var(--shadow-sm)', padding: '0.9rem 1rem', borderRadius: '2px', background: 'var(--bg)' }}>
                    <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '0.95rem', margin: '0 0 0.3rem' }}>{item.label}</h3>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '0.88rem', margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <Link href="/preferences" className="btn btn-filled" style={{ fontSize: '1rem', padding: '0.65rem 1.75rem' }}>
            Set my preferences →
          </Link>
        </div>
      </div>
    </main>
  )
}
