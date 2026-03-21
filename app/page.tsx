'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Opp {
  id: string; title: string; description: string; url: string
  source: string; tags: string[]; deadline?: string | null; fetched_at: string
}
type Kind = 'events' | 'jobs' | 'blogs' | 'repos'

// ─── Source metadata ──────────────────────────────────────────────────────────
const SOURCE_LABEL: Record<string, string> = {
  hackernews: 'HN', reddit: 'Reddit', devpost: 'Devpost', devto: 'Dev.to',
  remotive: 'Remotive', weworkremotely: 'WWR', github: 'GitHub',
  ctftime: 'CTFtime', mlh: 'MLH', devfolio: 'Devfolio', unstop: 'Unstop',
  indiehackers: 'IndieHackers', linkedin: 'LinkedIn',
  'google-developers': 'Google Dev', 'aws-opensource': 'AWS OSS',
  'eu-grants': 'EU Grants', 'hn-jobs': 'HN Jobs', internshala: 'Internshala',
  wellfound: 'Wellfound', hackerearth: 'HackerEarth', kaggle: 'Kaggle',
  ethglobal: 'ETHGlobal',
}

function getKind(opp: Opp): Kind {
  const src = opp.source
  if (['devpost', 'mlh', 'devfolio', 'unstop', 'ctftime', 'hackerearth', 'kaggle', 'ethglobal'].includes(src)) return 'events'
  if (['remotive', 'weworkremotely', 'hn-jobs', 'internshala', 'wellfound'].includes(src)) return 'jobs'
  if (['devto', 'indiehackers', 'google-developers', 'aws-opensource', 'eu-grants'].includes(src)) return 'blogs'
  if (src === 'github') return 'repos'
  const text = [opp.title, ...(opp.tags ?? [])].join(' ').toLowerCase()
  if (['hackathon', 'contest', 'bounty', 'fellowship', 'grant', 'competition', 'kaggle', 'ctf'].some(k => text.includes(k))) return 'events'
  if (['internship', 'intern', 'hiring', 'job', 'career', 'salary', 'remote work', 'startup'].some(k => text.includes(k))) return 'jobs'
  return 'events'
}

// ─── Radar background ─────────────────────────────────────────────────────────
const BLIPS = [
  { top: '38%', left: '62%', delay: '0.8s' },
  { top: '55%', left: '35%', delay: '2.1s' },
  { top: '30%', left: '45%', delay: '3.4s' },
  { top: '65%', left: '58%', delay: '1.2s' },
  { top: '44%', left: '72%', delay: '2.9s' },
]

function RadarBackground() {
  return (
    <div className="radar-bg" aria-hidden="true">
      {[140, 210, 280, 350].map(r => (
        <div key={r} className="radar-circle" style={{ width: r, height: r }} />
      ))}
      {/* Crosshairs */}
      <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '1px', background: 'var(--ink)', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '10%', bottom: '10%', width: '1px', background: 'var(--ink)', transform: 'translateX(-50%)' }} />
      <div className="radar-sweep" />
      {BLIPS.map((b, i) => (
        <div key={i} className="radar-blip" style={{ top: b.top, left: b.left, animationDelay: b.delay }} />
      ))}
    </div>
  )
}

// ─── Tutorial steps ───────────────────────────────────────────────────────────
const TUTORIAL = [
  { icon: '📡', title: 'Scout monitors 20+ sources', body: 'HackerNews, Reddit, Devpost, MLH, GitHub, CTFtime, Devfolio, Unstop, Remotive and more — scraped 3× daily.' },
  { icon: '🎯', title: 'You set your criteria', body: 'Pick categories (hackathons, jobs, bounties…), add custom keywords, set a match threshold, and flag compulsory criteria.' },
  { icon: '📬', title: 'Get a digest or instant alert', body: 'Good matches → one digest email. Perfect matches (hits ALL your criteria) → standalone alert sent immediately.' },
  { icon: '✈️', title: 'Works on Telegram & Discord too', body: 'Set up via @ScoutOpBot on Telegram or the Scout bot on Discord. After setup, Scout sends matching opps right away.' },
]

// ─── Tutorial modal ───────────────────────────────────────────────────────────
function TutorialModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const t = TUTORIAL[step]

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sketch-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', textAlign: 'center' }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1.5rem' }}>
          {TUTORIAL.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: 28, height: 5, borderRadius: 2, cursor: 'pointer',
              background: i === step ? 'var(--ink)' : 'var(--bg-ruled)',
              border: '1px solid var(--ink)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t.icon}</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', margin: '0 0 0.75rem' }}>{t.title}</h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>{t.body}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn" style={{ padding: '0.4rem 1rem' }}>← Back</button>
          )}
          {step < TUTORIAL.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-filled" style={{ padding: '0.4rem 1.2rem' }}>Next →</button>
          ) : (
            <Link href="/signup" className="btn btn-filled" style={{ padding: '0.4rem 1.2rem' }} onClick={onClose}>Get started →</Link>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
          skip tutorial
        </button>
      </div>
    </div>
  )
}

// ─── Opp modal ────────────────────────────────────────────────────────────────
function OppModal({ opp, onClose }: { opp: Opp; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sketch-in" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="source-badge">{SOURCE_LABEL[opp.source] ?? opp.source}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-head)', fontSize: '1.2rem', color: 'var(--ink-faint)', padding: 0 }}>✕</button>
        </div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', marginTop: 0, marginBottom: '0.75rem', lineHeight: 1.35, color: 'var(--ink)' }}>{opp.title}</h2>
        {opp.description && (
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            {opp.description}
          </p>
        )}
        {opp.tags?.filter(Boolean).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
            {opp.tags.filter(Boolean).map(tag => <span key={tag} className="tag">{tag}</span>)}
          </div>
        )}
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

// ─── Opp card ─────────────────────────────────────────────────────────────────
function OppCard({ opp, onClick, index }: { opp: Opp; onClick: () => void; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="sketch-card" onClick={onClick}
      style={{
        padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '8px',
        background: 'var(--bg)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) rotate(0)' : 'translateY(16px) rotate(-0.5deg)',
        transition: `opacity 0.3s ease ${(index % 8) * 0.05}s, transform 0.3s ease ${(index % 8) * 0.05}s`,
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
        <span className="source-badge">{SOURCE_LABEL[opp.source] ?? opp.source}</span>
        {opp.deadline && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)' }}>
            ⏰ {new Date(opp.deadline).toDateString()}
          </span>
        )}
      </div>
      <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '0.95rem', margin: 0, lineHeight: 1.35, color: 'var(--ink)' }}>
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

// ─── Main page ────────────────────────────────────────────────────────────────
const TABS: { key: Kind | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🔭' },
  { key: 'events', label: 'Events & Hackathons', icon: '🏆' },
  { key: 'jobs', label: 'Jobs & Internships', icon: '💼' },
  { key: 'blogs', label: 'Blogs & Resources', icon: '📝' },
  { key: 'repos', label: 'Repos', icon: '🛠' },
]

export default function Home() {
  const [opps, setOpps] = useState<Opp[]>([])
  const [selected, setSelected] = useState<Opp | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Kind | 'all'>('all')
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    fetch('/api/opportunities?limit=96')
      .then(r => r.json())
      .then(d => { setOpps(d.opportunities ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categorized = {
    events: opps.filter(o => getKind(o) === 'events'),
    jobs: opps.filter(o => getKind(o) === 'jobs'),
    blogs: opps.filter(o => getKind(o) === 'blogs'),
    repos: opps.filter(o => getKind(o) === 'repos'),
  }
  const filtered = activeTab === 'all' ? opps : categorized[activeTab]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', position: 'relative' }}>
      <RadarBackground />

      {/* ── Nav ── */}
      <nav className="nav">
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', letterSpacing: '0.5px' }}>
          <span style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '2px 10px', borderRadius: '1px' }}>Scout</span>
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setShowTutorial(true)} className="btn" style={{ fontSize: '0.82rem', padding: '0.3rem 0.8rem' }}>
            ✏ How it works
          </button>
          <Link href="/signup" className="btn btn-filled" style={{ fontSize: '0.9rem' }}>Get started →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '5rem 1.5rem 3rem', textAlign: 'center', animation: 'sketch-in 0.4s ease-out', position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '1rem' }}>
          ✏ Opportunity radar
        </p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2rem, 6vw, 3.4rem)', lineHeight: 1.15, marginBottom: '1.25rem', color: 'var(--ink)' }}>
          Never miss a hackathon,<br />internship, or bounty again.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.7 }}>
          Scout monitors 20+ sources 3× daily — sending a digest for good matches<br />
          and an instant alert when something hits all your criteria.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-filled" style={{ fontSize: '1rem', padding: '0.6rem 1.6rem' }}>Start for free</Link>
          <button onClick={() => setShowTutorial(true)} className="btn" style={{ fontSize: '1rem', padding: '0.6rem 1.6rem' }}>
            ✏ See how it works
          </button>
          <a href="#opportunities" className="btn" style={{ fontSize: '1rem', padding: '0.6rem 1.6rem' }}>Browse live opps ↓</a>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)', background: 'var(--bg-warm)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { n: '20+', label: 'Sources' },
            { n: '3×', label: 'Daily scrapes' },
            { n: opps.length || '—', label: 'Live opportunities' },
            { n: categorized.events.length || '—', label: 'Events & hackathons' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', color: 'var(--ink)' }}>{s.n}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Opportunities ── */}
      <section id="opportunities" style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: 'var(--border)', overflowX: 'auto' }}>
          {TABS.map(tab => {
            const count = tab.key === 'all' ? opps.length : categorized[tab.key as Kind].length
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  fontFamily: 'var(--font-head)', fontSize: '0.85rem', padding: '0.6rem 1.1rem',
                  border: 'none', borderBottom: active ? '3px solid var(--ink)' : '3px solid transparent',
                  background: active ? 'var(--bg-warm)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-faint)',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  marginBottom: '-2px',
                }}>
                {tab.icon} {tab.label}
                {!loading && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', marginLeft: '5px', color: 'var(--ink-faint)' }}>({count})</span>}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--font-head)', color: 'var(--ink-faint)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s ease infinite' }}>📡</div>
            Loading opportunities…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--font-head)', color: 'var(--ink-faint)' }}>
            Nothing in this category yet — try another tab or check back after the next scrape.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filtered.map((opp, i) => <OppCard key={opp.id} opp={opp} onClick={() => setSelected(opp)} index={i} />)}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/signup" className="btn btn-filled" style={{ fontSize: '1rem', padding: '0.65rem 1.75rem' }}>
            Get notified for matches →
          </Link>
        </div>
      </section>

      {selected && <OppModal opp={selected} onClose={() => setSelected(null)} />}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </main>
  )
}
