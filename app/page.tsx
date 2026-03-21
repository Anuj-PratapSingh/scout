'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Live counter component ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (target === 0 || started.current) return
    started.current = true
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.floor(eased * target))
      if (t < 1) requestAnimationFrame(step)
      else setVal(target)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

function DigitDisplay({ value, delay = 0 }: { value: number; label: string; delay?: number }) {
  const formatted = value.toLocaleString()
  return (
    <span className="clock-digit-box ticking" style={{ animationDelay: `${delay}s` }}>
      <span className="digital-stat" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}>
        {formatted}
      </span>
    </span>
  )
}

function LiveCounter() {
  const [stats, setStats] = useState({ opps: 0, users: 0, sources: 0 })
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])
  const opps    = useCountUp(stats.opps)
  const users   = useCountUp(stats.users)
  const sources = useCountUp(stats.sources)
  return (
    <div className="terminal-box" style={{ margin: '2.5rem 0', padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1.5rem, 5vw, 2.5rem)' }}>
      <div className="terminal-grid-bg" />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 'clamp(1.5rem, 5vw, 3rem)', alignItems: 'center' }}>
        {/* Active Scouts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <DigitDisplay value={users} label="Active Scouts" delay={0} />
          <span style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b6e67', fontWeight: 700 }}>
            Active Scouts
          </span>
        </div>
        <div style={{ width: 1, height: 56, background: '#2d2f2c', flexShrink: 0 }} />
        {/* Sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <DigitDisplay value={sources} label="Intelligence Sources" delay={0.2} />
          <span style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b6e67', fontWeight: 700 }}>
            Intelligence Sources
          </span>
        </div>
        <div style={{ width: 1, height: 56, background: '#2d2f2c', flexShrink: 0 }} />
        {/* Open Opps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <DigitDisplay value={opps} label="Open Opportunities" delay={0.4} />
          <span style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b6e67', fontWeight: 700 }}>
            Open Opportunities
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Opp {
  id: string; title: string; description: string; url: string
  source: string; tags: string[]; deadline?: string | null; fetched_at: string
}
type Kind = 'events' | 'jobs' | 'blogs' | 'repos' | 'swag' | 'projects'

// ─── Source metadata ──────────────────────────────────────────────────────────
const SOURCE_LABEL: Record<string, string> = {
  'radar-projects': 'Radar', 'radar-swag': 'Radar', 'radar-jobs': 'Radar',
  hashnode: 'Hashnode', 'papers-with-code': 'PwC',
  hackernews: 'HN', reddit: 'Reddit', devpost: 'Devpost', devto: 'Dev.to',
  remotive: 'Remotive', weworkremotely: 'WWR', github: 'GitHub',
  'github-blog': 'GitHub Blog',
  ctftime: 'CTFtime', mlh: 'MLH', devfolio: 'Devfolio', unstop: 'Unstop',
  indiehackers: 'IndieHackers', linkedin: 'LinkedIn',
  'google-developers': 'Google Dev', 'aws-opensource': 'AWS OSS',
  'eu-grants': 'EU Grants', 'hn-jobs': 'HN Jobs', internshala: 'Internshala',
  wellfound: 'Wellfound', hackerearth: 'HackerEarth', kaggle: 'Kaggle',
  ethglobal: 'ETHGlobal', swag: 'Swag',
  remoteok: 'RemoteOK', arbeitnow: 'Arbeitnow', jobicy: 'Jobicy',
  themuse: 'The Muse', 'yc-jobs': 'YC Jobs', 'yc-blog': 'YC Blog',
  codeforces: 'Codeforces', codechef: 'CodeChef', atcoder: 'AtCoder',
  topcoder: 'TopCoder', 'hackerearth-challenge': 'HE Challenge',
  dorahacks: 'DoraHacks', issuehunt: 'IssueHunt', immunefi: 'Immunefi',
  hackerone: 'HackerOne', openbugbounty: 'OpenBugBounty',
  smashing: 'Smashing', yourstory: 'YourStory', inc42: 'Inc42',
  'remote-co': 'Remote.co', 'authentic-jobs': 'Authentic Jobs',
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
  remoteok: ['#00684f', '#98ffd9'],
  arbeitnow: ['#00684f', '#98ffd9'],
  jobicy: ['#00684f', '#98ffd9'],
  themuse: ['#63547e', '#dfccfe'],
  'yc-jobs': ['#b35000', '#fde5c8'],
  'yc-blog': ['#b35000', '#fde5c8'],
  codeforces: ['#2d2f2c', '#f7f7f2'],
  codechef: ['#b35000', '#fde5c8'],
  atcoder: ['#2d2f2c', '#f7f7f2'],
  topcoder: ['#526200', '#dcf76c'],
  dorahacks: ['#63547e', '#dfccfe'],
  issuehunt: ['#526200', '#dcf76c'],
  immunefi: ['#2d2f2c', '#f7f7f2'],
  hackerone: ['#2d2f2c', '#f7f7f2'],
  openbugbounty: ['#b35000', '#fde5c8'],
  smashing: ['#b35000', '#fde5c8'],
  yourstory: ['#00684f', '#98ffd9'],
  inc42: ['#526200', '#dcf76c'],
  'remote-co': ['#00684f', '#98ffd9'],
  'authentic-jobs': ['#63547e', '#dfccfe'],
  'radar-projects': ['#526200', '#dcf76c'],
  'radar-swag': ['#b35000', '#fde5c8'],
  'radar-jobs': ['#00684f', '#98ffd9'],
  hashnode: ['#2d2f2c', '#f7f7f2'],
  'papers-with-code': ['#63547e', '#dfccfe'],
}
function srcColor(source: string): [string, string] {
  return SOURCE_COLOR[source] ?? ['#526200', '#dcf76c']
}

// Source-authoritative categorization — strict, no guessing
const SOURCE_KIND: Record<string, Kind> = {
  devpost: 'events', mlh: 'events', devfolio: 'events', unstop: 'events',
  ctftime: 'events', hackerearth: 'events', kaggle: 'events', ethglobal: 'events',
  dorahacks: 'events',
  codeforces: 'events', codechef: 'events', atcoder: 'events',
  topcoder: 'events', 'hackerearth-challenge': 'events',
  remotive: 'jobs', weworkremotely: 'jobs', 'hn-jobs': 'jobs',
  internshala: 'jobs', wellfound: 'jobs',
  remoteok: 'jobs', arbeitnow: 'jobs', jobicy: 'jobs', themuse: 'jobs',
  'yc-jobs': 'jobs', 'remote-co': 'jobs', 'authentic-jobs': 'jobs',
  devto: 'blogs', indiehackers: 'blogs', 'google-developers': 'blogs',
  'aws-opensource': 'blogs', 'eu-grants': 'blogs', 'github-blog': 'blogs',
  hackernews: 'blogs', smashing: 'blogs', yourstory: 'blogs',
  inc42: 'blogs', 'yc-blog': 'blogs',
  github: 'repos',
  swag: 'swag',
  issuehunt: 'swag', immunefi: 'swag', hackerone: 'swag', openbugbounty: 'swag',
  'radar-projects': 'projects',
  'radar-jobs': 'jobs',
  'radar-swag': 'swag',
  hashnode: 'blogs',
  'papers-with-code': 'projects',
}

function getKind(opp: Opp): Kind {
  if (SOURCE_KIND[opp.source]) return SOURCE_KIND[opp.source]
  const tags = (opp.tags ?? []).join(' ').toLowerCase()
  if (['project-idea'].some(k => tags.includes(k))) return 'projects'
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
const PROJECT_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'ai-ml', label: '🤖 AI / ML' },
  { key: 'web-dev', label: '🌐 Web Dev' },
  { key: 'mobile', label: '📱 Mobile' },
  { key: 'data-science', label: '📊 Data Science' },
  { key: 'cybersecurity', label: '🔐 Security' },
  { key: 'devops', label: '⚙️ DevOps' },
  { key: 'blockchain', label: '🔗 Blockchain' },
  { key: 'beginner', label: '🌱 Beginner' },
  { key: 'advanced', label: '🚀 Advanced' },
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
  { key: 'projects', label: '💡 Build Ideas' },
  { key: 'swag', label: '🎁 Swag' },
  { key: 'repos', label: '🛠 Repos' },
  { key: 'blogs', label: '📝 Blogs' },
]

// ─── Tutorial steps ───────────────────────────────────────────────────────────
const TUTORIAL = [
  { icon: '📡', title: 'Scout monitors 20+ sources', body: 'HackerNews, Reddit, Devpost, MLH, GitHub, CTFtime, Devfolio, Remotive and more — scraped 3× daily.' },
  { icon: '🎯', title: 'You set your criteria', body: 'Pick categories (hackathons, jobs, bounties…), add keywords, set a match threshold, and flag compulsory criteria.' },
  { icon: '📬', title: 'Digest or instant alert', body: 'Good matches → one digest email. Perfect matches (hits ALL criteria) → standalone alert sent immediately.' },
  { icon: '✈️', title: 'Works on Telegram too', body: 'Set up @scout_theautomation_bot on Telegram in 60 seconds. After setup, Scout sends matching opps right away.' },
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
function SourceIcon({ source, url, bg, text, initial }: { source: string; url: string; bg: string; text: string; initial: string }) {
  const [logoFailed, setLogoFailed] = useState(false)
  let domain = ''
  try { domain = new URL(url).hostname } catch { /* ignore */ }
  const logoUrl = domain && !logoFailed ? `https://logo.clearbit.com/${domain}` : null

  return (
    <div style={{
      width: 34, height: 34, borderRadius: '8px',
      background: bg, color: text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-body)',
      border: 'var(--border)', flexShrink: 0, overflow: 'hidden',
    }}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={source} width={28} height={28}
          style={{ objectFit: 'contain', borderRadius: 4 }}
          onError={() => setLogoFailed(true)} />
      ) : initial}
    </div>
  )
}

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
    .filter(t => !['trending','legendary','beginner-friendly','project-guide','cool-project','community-pick','project-idea','free','student','job','remote','onsite','full-time','internship'].includes(t))
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
          {/* Source initial circle with clearbit logo fallback */}
          <SourceIcon source={opp.source} url={opp.url} bg={bg} text={text} initial={initial} />
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
  const [projectChip, setProjectChip] = useState('all')
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    fetch('/api/opportunities?limit=800')
      .then(r => r.json())
      .then(d => { setOpps(d.opportunities ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categorized = {
    events:   opps.filter(o => getKind(o) === 'events'),
    jobs:     opps.filter(o => getKind(o) === 'jobs'),
    blogs:    opps.filter(o => getKind(o) === 'blogs'),
    repos:    opps.filter(o => getKind(o) === 'repos'),
    swag:     opps.filter(o => getKind(o) === 'swag'),
    projects: opps.filter(o => getKind(o) === 'projects'),
  } as Record<Kind, Opp[]>

  const baseFiltered = activeTab === 'all' ? opps : (categorized[activeTab as Kind] ?? [])
  const filtered = (() => {
    if (activeTab === 'repos' && repoChip !== 'all')
      return baseFiltered.filter((o: Opp) => (o.tags ?? []).includes(repoChip))
    if (activeTab === 'blogs' && blogChip !== 'all')
      return baseFiltered.filter((o: Opp) => (o.tags ?? []).includes(blogChip))
    if (activeTab === 'projects' && projectChip !== 'all')
      return baseFiltered.filter((o: Opp) => (o.tags ?? []).includes(projectChip))
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

        <p style={{ color: 'var(--ink-mid)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '560px', marginBottom: '0' }}>
          Scout monitors 50+ sources — Devpost, MLH, HackerNews, GitHub, Remotive, Codeforces, DoraHacks and more —
          and notifies you the moment something matches your criteria.
        </p>

        {/* ── Live clock counter ── */}
        <LiveCounter />

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

      {/* ── Quick stats strip (category counts) ── */}
      <div style={{ borderTop: 'var(--border)', borderBottom: 'var(--border)', background: 'var(--surface-low)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '0.75rem' }}>
          {[
            { n: loading ? '—' : categorized.events.length, label: 'Events' },
            { n: loading ? '—' : categorized.jobs.length, label: 'Jobs' },
            { n: loading ? '—' : categorized.projects.length, label: 'Build Ideas' },
            { n: loading ? '—' : categorized.swag.length, label: 'Swag' },
            { n: loading ? '—' : categorized.repos.length, label: 'Repos' },
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
                onClick={() => { setActiveTab(tab.key); setRepoChip('all'); setBlogChip('all'); setProjectChip('all') }}
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

        {/* Sub-chips for build ideas */}
        {activeTab === 'projects' && !loading && (
          <ChipRow chips={PROJECT_CHIPS} active={projectChip} onChange={setProjectChip} />
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
          {[['Dashboard', '/dashboard'], ['Preferences', '/preferences'], ['Sign in', '/signup']].map(([l, h]) => (
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
