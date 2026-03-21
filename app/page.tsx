'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const FEATURES = [
  { emoji: '🏆', label: 'Hackathons' },
  { emoji: '💼', label: 'Internships' },
  { emoji: '💰', label: 'Bounties' },
  { emoji: '🎁', label: 'Swag drops' },
  { emoji: '🚀', label: 'Programs' },
  { emoji: '🔍', label: 'Contests & grants' },
]

const SOURCE_LABELS: Record<string, string> = {
  hackernews: 'HN', reddit: 'Reddit', devpost: 'Devpost', devto: 'Dev.to',
  remotive: 'Remotive', weworkremotely: 'WWR', github: 'GitHub',
  ctftime: 'CTFtime', mlh: 'MLH', devfolio: 'Devfolio', unstop: 'Unstop',
  indiehackers: 'IndieHackers', linkedin: 'LinkedIn',
}

interface Opportunity {
  id: string; title: string; description: string; url: string
  source: string; tags: string[]; deadline?: string | null; fetched_at: string
}

function OppModal({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sketch-in" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="source-badge">{SOURCE_LABELS[opp.source] ?? opp.source}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-head)', fontSize: '1.2rem', color: 'var(--ink-faint)' }}>✕</button>
        </div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', marginTop: 0, marginBottom: '0.75rem', lineHeight: 1.3 }}>{opp.title}</h2>
        {opp.description && (
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            {opp.description}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
          {opp.tags?.filter(Boolean).map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>
        {opp.deadline && (
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--ink-faint)', marginBottom: '1.25rem' }}>
            ⏰ Deadline: {new Date(opp.deadline).toDateString()}
          </p>
        )}
        <a href={opp.url} target="_blank" rel="noopener noreferrer" className="btn btn-filled">
          View opportunity →
        </a>
      </div>
    </div>
  )
}

function OppCard({ opp, onClick }: { opp: Opportunity; onClick: () => void }) {
  return (
    <div className="sketch-card sketch-in" onClick={onClick}
      style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
        <span className="source-badge">{SOURCE_LABELS[opp.source] ?? opp.source}</span>
        {opp.deadline && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)' }}>
            ⏰ {new Date(opp.deadline).toDateString()}
          </span>
        )}
      </div>
      <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '0.98rem', margin: 0, lineHeight: 1.35 }}>
        {opp.title.length > 80 ? opp.title.slice(0, 80) + '…' : opp.title}
      </h3>
      {opp.description && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mid)', margin: 0, lineHeight: 1.5 }}>
          {opp.description.slice(0, 110)}{opp.description.length > 110 ? '…' : ''}
        </p>
      )}
      {opp.tags?.filter(Boolean).slice(0, 3).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
          {opp.tags.filter(Boolean).slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/opportunities?limit=48')
      .then(r => r.json())
      .then(d => { setOpps(d.opportunities ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter ? opps.filter(o => o.source === filter) : opps
  const sources = [...new Set(opps.map(o => o.source))].sort()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="nav">
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', letterSpacing: '0.5px' }}>
          <span style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '2px 10px', borderRadius: '1px' }}>Scout</span>
        </span>
        <Link href="/signup" className="btn btn-filled">Get started →</Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '5rem 1.5rem 3rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '1rem' }}>
          ✏ Opportunity radar
        </p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2rem, 6vw, 3.4rem)', lineHeight: 1.15, marginBottom: '1.25rem' }}>
          Never miss a hackathon,<br />internship, or bounty again.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.7 }}>
          Scout monitors 20+ sources 24/7 and sends you a digest — or a standalone alert for perfect matches.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-filled" style={{ fontSize: '1rem', padding: '0.6rem 1.6rem' }}>Start for free</Link>
          <a href="#opportunities" className="btn" style={{ fontSize: '1rem', padding: '0.6rem 1.6rem' }}>Browse live opps ↓</a>
        </div>
      </section>

      {/* What Scout tracks */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>
        <div style={{ border: 'var(--border)', boxShadow: 'var(--shadow)', background: 'var(--bg-warm)', padding: '1.5rem', borderRadius: '2px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: 0, marginBottom: '1rem' }}>
            What Scout tracks
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {FEATURES.map(f => (
              <span key={f.label} style={{ fontFamily: 'var(--font-head)', border: 'var(--border)', boxShadow: 'var(--shadow-sm)', padding: '0.35rem 0.9rem', borderRadius: '2px', fontSize: '0.88rem' }}>
                {f.emoji} {f.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', marginBottom: '1.5rem' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { n: '01', title: 'Sign up', desc: 'Drop your email. Done in 30 seconds.' },
            { n: '02', title: 'Set preferences', desc: 'Pick categories, add custom criteria, set a match threshold.' },
            { n: '03', title: 'Get notified', desc: 'Scout sends a digest for good matches, a standalone alert for perfect ones.' },
          ].map(s => (
            <div key={s.n} style={{ border: 'var(--border)', boxShadow: 'var(--shadow)', padding: '1.25rem', borderRadius: '2px', background: 'var(--bg)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', marginTop: 0, marginBottom: '0.4rem' }}>{s.n}</p>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', margin: '0 0 0.4rem' }}>{s.title}</h3>
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '0.9rem', margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live opportunities */}
      <section id="opportunities" style={{ background: 'var(--bg-warm)', borderTop: 'var(--border)', padding: '3rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', margin: 0 }}>
              Live opportunities
              {!loading && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-faint)', marginLeft: '0.75rem' }}>{filtered.length}</span>}
            </h2>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button onClick={() => setFilter('')} className="btn" style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', background: !filter ? 'var(--ink)' : 'var(--bg)', color: !filter ? 'var(--bg)' : 'var(--ink)' }}>All</button>
              {sources.map(s => (
                <button key={s} onClick={() => setFilter(s)} className="btn" style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', background: filter === s ? 'var(--ink)' : 'var(--bg)', color: filter === s ? 'var(--bg)' : 'var(--ink)' }}>
                  {SOURCE_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--font-head)', color: 'var(--ink-faint)' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--font-head)', color: 'var(--ink-faint)' }}>No opportunities yet — check back soon.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filtered.map(opp => <OppCard key={opp.id} opp={opp} onClick={() => setSelected(opp)} />)}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/signup" className="btn btn-filled" style={{ fontSize: '1rem', padding: '0.65rem 1.75rem' }}>
              Get notified for matches →
            </Link>
          </div>
        </div>
      </section>

      {selected && <OppModal opp={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
