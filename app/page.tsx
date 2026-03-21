'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Opp {
  id: string; title: string; description: string; url: string
  source: string; tags: string[]; deadline?: string | null; fetched_at: string
}
type Kind = 'events' | 'jobs' | 'blogs' | 'repos' | 'swag'

// ─── Source metadata ──────────────────────────────────────────────────────────
const SOURCE_LABEL: Record<string, string> = {
  hackernews: 'HN', reddit: 'Reddit', devpost: 'Devpost', devto: 'Dev.to',
  remotive: 'Remotive', weworkremotely: 'WWR', github: 'GitHub',
  'github-blog': 'GitHub Blog',
  ctftime: 'CTFtime', mlh: 'MLH', devfolio: 'Devfolio', unstop: 'Unstop',
  indiehackers: 'IndieHackers', linkedin: 'LinkedIn',
  'google-developers': 'Google Dev', 'aws-opensource': 'AWS OSS',
  'eu-grants': 'EU Grants', 'hn-jobs': 'HN Jobs', internshala: 'Internshala',
  wellfound: 'Wellfound', hackerearth: 'HackerEarth', kaggle: 'Kaggle',
  ethglobal: 'ETHGlobal', swag: 'Swag',
}

// Source color pairs [background, text]
const SOURCE_COLOR: Record<string, [string, string]> = {
  devpost: ['#526200', '#dcf76c'],
  mlh: ['#63547e', '#dfccfe'],
  ctftime: ['#2d2f2c', '#f7f7f2'],
  github: ['#2d2f2c', '#f7f7f2'],
  'github-blog': ['#2d2f2c', '#f7f7f2'],
  remotive: ['#00684f', '#98ffd9'],
  weworkremotely: ['#00684f', '#98ffd9'],
  'hn-jobs': ['#b35000', '#fde5c8'],
  internshala: ['#00684f', '#98ffd9'],
  wellfound: ['#63547e', '#dfccfe'],
  devto: ['#526200', '#dcf76c'],
  hackernews: ['#b35000', '#fde5c8'],
  indiehackers: ['#526200', '#dcf76c'],
  devfolio: ['#63547e', '#dfccfe'],
  unstop: ['#00684f', '#98ffd9'],
  hackerearth: ['#63547e', '#dfccfe'],
  kaggle: ['#00684f', '#98ffd9'],
  ethglobal: ['#2d2f2c', '#f7f7f2'],
  swag: ['#b35000', '#fde5c8'],
  reddit: ['#b35000', '#fde5c8'],
}
function srcColor(source: string): [string, string] {
  return SOURCE_COLOR[source] ?? ['#526200', '#dcf76c']
}

// Source-authoritative categorization — strict, no guessing
const SOURCE_KIND: Record<string, Kind> = {
  devpost: 'events', mlh: 'events', devfolio: 'events', unstop: 'events',
  ctftime: 'events', hackerearth: 'events', kaggle: 'events', ethglobal: 'events',
  remotive: 'jobs', weworkremotely: 'jobs', 'hn-jobs': 'jobs',
  internshala: 'jobs', wellfound: 'jobs',
  devto: 'blogs', indiehackers: 'blogs', 'google-developers': 'blogs',
  'aws-opensource': 'blogs', 'eu-grants': 'blogs', 'github-blog': 'blogs',
  hackernews: 'blogs',
  github: 'repos',
  swag: 'swag',
}

function getKind(opp: Opp): Kind {
  if (SOURCE_KIND[opp.source]) return SOURCE_KIND[opp.source]
  const tags = (opp.tags ?? []).join(' ').toLowerCase()
  if (['swag', 'free', 'giveaway', 'student-pack'].some(k => tags.includes(k))) return 'swag'
  if (['job', 'hiring', 'internship', 'salary', 'remote'].some(k => tags.includes(k))) return 'jobs'
  if (['hackathon', 'contest', 'competition', 'bounty', 'grant', 'fellowship'].some(k => tags.includes(k))) return 'events'
  return 'blogs'
}

function isNew(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() < 24 * 60 * 60 * 1000
}
function isClosingSoon(deadline?: string | null): boolean {
  if (!deadline) return false
  const ms = new Date(deadline).getTime() - Date.now()
  return ms > 0 && ms < 3 * 24 * 60 * 60 * 1000
}

// Strip any leftover HTML from description (safety net)
function cleanDesc(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

// ─── Sub-filter chips ─────────────────────────────────────────────────────────
const REPO_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: '🔥 Trending (AI/ML)' },
  { key: 'beginner-friendly', label: '🌱 Beginner' },
  { key: 'project-guide', label: '📚 Guides' },
  { key: 'cool-project', label: '✨ Cool' },
]
const BLOG_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: '🔥 Trending' },
  { key: 'legendary', label: '🌟 Legendary' },
  { key: 'beginner-friendly', label: '🌱 Beginner' },
]

// ─── Main tabs ────────────────────────────────────────────────────────────────
const TABS: { key: Kind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'events', label: '🏆 Events' },
  { key: 'jobs', label: '💼 Jobs' },
  { key: 'swag', label: '🎁 Swag' },
  { key: 'repos', label: '🛠 Projects' },
  { key: 'blogs', label: '📝 Blogs' },
]

// ─── Tutorial steps ───────────────────────────────────────────────────────────
const TUTORIAL = [
  { icon: '📡', title: 'Scout monitors 20+ sources', body: 'HackerNews, Reddit, Devpost, MLH, GitHub, CTFtime, Devfolio, Remotive and more — scraped 3× daily.' },
  { icon: '🎯', title: 'You set your criteria', body: 'Pick categories (hackathons, jobs, bounties…), add keywords, set a match threshold, and flag compulsory criteria.' },
  { icon: '📬', title: 'Digest or instant alert', body: 'Good matches → one digest email. Perfect matches (hits ALL criteria) → standalone alert sent immediately.' },
  { icon: '✈️', title: 'Telegram & Discord too', body: 'Set up via @scout_theautomation_bot on Telegram or the Scout bot on Discord. Matches arrive in seconds.' },
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
      <div className="modal sketch-in" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1.5rem' }}>
          {TUTORIAL.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: 28, height: 4, borderRadius: 2, cursor: 'pointer',
              background: i === step ? 'var(--primary)' : 'var(--surface-mid)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t.icon}</div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '1.5rem', margin: '0 0 0.75rem', color: 'var(--ink)' }}>{t.title}</h2>
        <p style={{ color: 'var(--ink-mid)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>{t.body}</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn">← Back</button>}
          {step < TUTORIAL.length - 1
            ? <button onClick={() => setStep(s => s + 1)} className="btn btn-primary">Next →</button>
            : <Link href="/signup" className="btn btn-primary" onClick={onClose}>Get started →</Link>
          }
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>
          skip tutorial
        </button>
      </div>
    </div>
  )
}

// ─── Opp detail modal ─────────────────────────────────────────────────────────
function OppModal({ opp, onClose }: { opp: Opp; onClose: () => void }) {
  const [bg, text] = srcColor(opp.source)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sketch-in" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: bg, color: text, border: `1px solid ${bg}`,
            padding: '3px 10px', borderRadius: 999,
          }}>{SOURCE_LABEL[opp.source] ?? opp.source}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--ink-faint)', padding: 0 }}>✕</button>
        </div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '1.4rem', marginTop: 0, marginBottom: '0.75rem', lineHeight: 1.3 }}>{opp.title}</h2>
        {opp.description && (
          <p style={{ color: 'var(--ink-mid)', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: 1.65 }}>
            {cleanDesc(opp.description)}
          </p>
        )}
        {opp.tags?.filter(t => !['trending','legendary','beginner-friendly','project-guide','cool-project','community-pick'].includes(t)).slice(0, 6).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
            {opp.tags.filter(t => !['trending','legendary','beginner-friendly','project-guide','cool-project','community-pick'].includes(t)).slice(0, 6).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
        {opp.deadline && (
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-faint)', marginBottom: '1.25rem' }}>
            ⏰ Deadline: {new Date(opp.deadline).toDateString()}
          </p>
        )}
        <a href={opp.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
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
  const [bg, text] = srcColor(opp.source)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const label = SOURCE_LABEL[opp.source] ?? opp.source
  const initial = label[0].toUpperCase()
  const badgeNew = isNew(opp.fetched_at)
  const badgeClose = isClosingSoon(opp.deadline)

  // Display tags — exclude internal category tags
  const displayTags = (opp.tags ?? [])
    .filter(t => !['trending','legendary','beginner-friendly','project-guide','cool-project','community-pick'].includes(t))
    .slice(0, 3)

  // Category quality badges
  const qualityTag = (opp.tags ?? []).find(t => ['trending','legendary','beginner-friendly','project-guide','cool-project'].includes(t))
  const qualityLabel: Record<string, string> = {
    trending: '🔥 Trending', legendary: '🌟 Legendary',
    'beginner-friendly': '🌱 Beginner', 'project-guide': '📚 Guide', 'cool-project': '✨ Cool',
  }

  return (
    <div ref={ref} className="neo-card" onClick={onClick}
      style={{
        padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '10px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.3s ease ${(index % 10) * 0.04}s, transform 0.3s ease ${(index % 10) * 0.04}s`,
      }}>
      {/* Header row: source icon + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Source initial circle */}
          <div style={{
            width: 34, height: 34, borderRadius: '8px',
            background: bg, color: text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-body)',
            border: 'var(--border)', flexShrink: 0,
          }}>{initial}</div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink-mid)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </span>
        </div>
        {/* Status badge */}
        {badgeClose ? (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fde5c8', color: '#b35000', border: '1px solid #b35000', padding: '2px 8px', borderRadius: 999 }}>
            Closing Soon
          </span>
        ) : badgeNew ? (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '2px 8px', borderRadius: 999 }}>
            New
          </span>
        ) : qualityTag ? (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--tertiary-bg)', color: 'var(--tertiary)', border: '1px solid var(--tertiary)', padding: '2px 8px', borderRadius: 999 }}>
            {qualityLabel[qualityTag] ?? qualityTag}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: 'var(--font-head)', fontStyle: 'italic',
        fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.3, color: 'var(--ink)',
      }}>
        {opp.title.length > 80 ? opp.title.slice(0, 80) + '…' : opp.title}
      </h3>

      {/* Description */}
      {opp.description && (
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-mid)', margin: 0, lineHeight: 1.55 }}>
          {cleanDesc(opp.description).slice(0, 120)}{cleanDesc(opp.description).length > 120 ? '…' : ''}
        </p>
      )}

      {/* Footer: tags + deadline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {displayTags.map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>
        {opp.deadline && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'var(--ink-faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ⏰ {new Date(opp.deadline).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Chip row ─────────────────────────────────────────────────────────────────
function ChipRow({ chips, active, onChange }: { chips: typeof REPO_CHIPS; active: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      {chips.map(chip => (
        <button key={chip.key} onClick={() => onChange(chip.key)}
          style={{
            fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600,
            padding: '5px 14px', border: '1.5px solid var(--ink)',
            borderRadius: 999, cursor: 'pointer',
            background: active === chip.key ? 'var(--ink)' : 'var(--surface)',
            color: active === chip.key ? 'var(--bg)' : 'var(--ink)',
            transition: 'all 0.12s',
          }}>
          {chip.label}
        </button>
      ))}
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [opps, setOpps] = useState<Opp[]>([])
  const [selected, setSelected] = useState<Opp | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Kind | 'all'>('all')
  const [repoChip, setRepoChip] = useState('all')
  const [blogChip, setBlogChip] = useState('all')
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    fetch('/api/opportunities?limit=120')
      .then(r => r.json())
      .then(d => { setOpps(d.opportunities ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categorized = {
    events: opps.filter(o => getKind(o) === 'events'),
    jobs:   opps.filter(o => getKind(o) === 'jobs'),
    blogs:  opps.filter(o => getKind(o) === 'blogs'),
    repos:  opps.filter(o => getKind(o) === 'repos'),
    swag:   opps.filter(o => getKind(o) === 'swag'),
  }

  const baseFiltered = activeTab === 'all' ? opps : categorized[activeTab as Kind]
  const filtered = (() => {
    if (activeTab === 'repos' && repoChip !== 'all')
      return baseFiltered.filter(o => (o.tags ?? []).includes(repoChip))
    if (activeTab === 'blogs' && blogChip !== 'all')
      return baseFiltered.filter(o => (o.tags ?? []).includes(blogChip))
    return baseFiltered
  })()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* ── Floating Navbar ── */}
      <nav className="nav">
        <span style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', letterSpacing: '-0.5px' }}>
          Scout
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setShowTutorial(true)} className="btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}>
            How it works
          </button>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.35rem 1rem' }}>
            Get started →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        maxWidth: '820px', margin: '0 auto',
        padding: 'clamp(7rem, 14vw, 9rem) 1.5rem 4rem',
        animation: 'fade-up 0.5s ease-out',
      }}>
        {/* Label pill */}
        <div className="sticker-left" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            background: 'var(--tertiary-bg)', color: 'var(--tertiary)',
            border: '1.5px solid var(--tertiary)', padding: '4px 14px', borderRadius: 999,
          }}>
            Live Radar · Updated 3× Daily
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-head)', fontStyle: 'italic', fontWeight: 800,
          fontSize: 'clamp(2.4rem, 7vw, 4.2rem)', lineHeight: 1.1,
          marginBottom: '1.25rem', color: 'var(--ink)',
        }}>
          Never miss a hackathon,{' '}
          <span style={{ color: 'var(--primary)', textDecoration: 'underline', textDecorationColor: 'var(--primary-bg)', textDecorationThickness: '6px' }}>
            internship
          </span>{' '}
          or bounty again.
        </h1>

        <p style={{ color: 'var(--ink-mid)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '560px', marginBottom: '2.25rem' }}>
          Scout monitors 20+ sources — Devpost, MLH, HackerNews, GitHub, Remotive, CTFtime and more —
          and notifies you the moment something matches your criteria.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.65rem 1.75rem', borderRadius: 'var(--radius)', fontWeight: 700 }}>
            Start for free
          </Link>
          <button onClick={() => setShowTutorial(true)} className="btn" style={{ fontSize: '1rem', padding: '0.65rem 1.5rem', borderRadius: 'var(--radius)' }}>
            How it works
          </button>
          <a href="#opportunities" className="btn" style={{ fontSize: '1rem', padding: '0.65rem 1.5rem', borderRadius: 'var(--radius)' }}>
            Browse live opps ↓
          </a>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)', background: 'var(--surface-low)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '0.75rem' }}>
          {[
            { n: '20+', label: 'Sources' },
            { n: '3×', label: 'Daily scrapes' },
            { n: loading ? '—' : opps.length, label: 'Live opps' },
            { n: loading ? '—' : categorized.events.length, label: 'Events' },
            { n: loading ? '—' : categorized.jobs.length, label: 'Jobs' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontWeight: 800, fontSize: '1.7rem', color: 'var(--ink)' }}>{s.n}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Opportunities ── */}
      <section id="opportunities" style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontWeight: 800, fontSize: '2rem', margin: 0, color: 'var(--ink)' }}>
              Live Radar
            </h2>
            <p style={{ color: 'var(--ink-faint)', fontSize: '0.8rem', margin: '4px 0 0', fontFamily: 'var(--font-body)' }}>
              Scraped 3× daily · click any card to open
            </p>
          </div>
          {!loading && (
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'var(--surface-high)', color: 'var(--ink-mid)',
              padding: '4px 12px', borderRadius: 999, border: '1px solid var(--surface-high)',
            }}>
              Active: {opps.length}
            </span>
          )}
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {TABS.map(tab => {
            const count = tab.key === 'all' ? opps.length : (categorized[tab.key as Kind]?.length ?? 0)
            const active = activeTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key); setRepoChip('all'); setBlogChip('all') }}
                style={{
                  fontFamily: 'var(--font-body)', fontWeight: 600,
                  fontSize: '0.82rem', padding: '0.45rem 1.1rem',
                  border: active ? 'var(--border)' : '1.5px solid var(--surface-high)',
                  borderRadius: 999, cursor: 'pointer',
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'var(--bg)' : 'var(--ink-mid)',
                  transition: 'all 0.12s', whiteSpace: 'nowrap',
                  boxShadow: active ? 'var(--neo-shadow-sm)' : 'none',
                }}>
                {tab.label}
                {!loading && <span style={{ fontSize: '0.62rem', marginLeft: '5px', opacity: 0.65 }}>({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Sub-chips for repos */}
        {activeTab === 'repos' && !loading && (
          <ChipRow chips={REPO_CHIPS} active={repoChip} onChange={setRepoChip} />
        )}

        {/* Sub-chips for blogs */}
        {activeTab === 'blogs' && !loading && (
          <ChipRow chips={BLOG_CHIPS} active={blogChip} onChange={setBlogChip} />
        )}

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--ink-faint)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulse 1.5s ease infinite' }}>📡</div>
            <p style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '1.1rem' }}>Scanning for opportunities…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--ink-faint)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔭</div>
            <p style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic' }}>
              Nothing here yet — check back after the next scrape.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.1rem' }}>
            {filtered.map((opp, i) => (
              <OppCard key={opp.id} opp={opp} onClick={() => setSelected(opp)} index={i} />
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem', borderRadius: 'var(--radius)', fontWeight: 700 }}>
            Get notified for matches →
          </Link>
        </div>
      </section>

      {/* ── Features bento ── */}
      <section style={{ background: 'var(--surface-low)', borderTop: 'var(--border)', borderBottom: 'var(--border)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {[
            { icon: '⚡', bg: 'var(--primary-bg)', color: 'var(--primary)', title: 'Tailored matching', body: 'Set keywords, categories and a match threshold. Score 10/10 → instant alert. Good match → digest.' },
            { icon: '📬', bg: 'var(--tertiary-bg)', color: 'var(--tertiary)', title: 'Email + Telegram', body: 'Standalone emails for perfect matches. Daily digest for good ones. Telegram bot sends in seconds.' },
            { icon: '🔒', bg: 'var(--secondary-bg)', color: 'var(--secondary)', title: 'No noise', body: 'Sources are quality-gated. GitHub repos need 50+ stars. Blogs need community reactions. Events from verified platforms only.' },
          ].map(f => (
            <div key={f.title} className="neo-card" style={{ padding: '1.75rem', cursor: 'default' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', background: f.bg, width: 52, height: 52, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${f.color}` }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--ink)' }}>{f.title}</h3>
              <p style={{ color: 'var(--ink-mid)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: '820px', margin: '0 auto', padding: '5rem 1.5rem 6rem', textAlign: 'center' }}>
        <div className="sticker-right" style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '0.1em', background: 'var(--primary-bg)', color: 'var(--primary)',
            border: '1.5px solid var(--primary)', padding: '4px 14px', borderRadius: 999,
          }}>
            Free · No credit card
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'var(--ink)', marginBottom: '1rem' }}>
          Ready to Scout?
        </h2>
        <p style={{ color: 'var(--ink-mid)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Set your criteria once. Get a digest for good matches, an instant alert for perfect ones.
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem', borderRadius: 'var(--radius)', fontWeight: 700, boxShadow: 'var(--neo-shadow)' }}>
          Get started free →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: 'var(--border)', background: 'var(--surface)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>Scout</span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[['Preferences', '/preferences'], ['Sign in', '/signup']].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', textDecoration: 'none' }}>
              {l}
            </Link>
          ))}
        </div>
      </footer>

      {selected && <OppModal opp={selected} onClose={() => setSelected(null)} />}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </main>
  )
}
