'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'
import Link from 'next/link'

export default function PreferencesPage() {
  const [categories, setCategories] = useState<string[]>([])
  const [criteria, setCriteria] = useState<string[]>([])
  const [compulsory, setCompulsory] = useState<string[]>([])
  const [threshold, setThreshold] = useState(5)
  const [emailFreq, setEmailFreq] = useState(1)
  const [criteriaInput, setCriteriaInput] = useState('')
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token
      if (!t) { window.location.href = '/signup'; return }
      setToken(t)
      fetch('/api/preferences', { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(({ preferences: p }) => {
          if (!p) return
          setCategories(p.categories ?? [])
          setCriteria(p.custom_criteria ?? [])
          setCompulsory(p.compulsory_criteria ?? [])
          setThreshold(p.match_threshold ?? 5)
          setEmailFreq(p.email_frequency ?? 1)
        })
    })
  }, [])

  function toggleCategory(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  function addCriterion() {
    const val = criteriaInput.trim()
    if (!val || criteria.includes(val)) return
    setCriteria(prev => [...prev, val])
    setCriteriaInput('')
  }

  function removeCriterion(c: string) {
    setCriteria(prev => prev.filter(x => x !== c))
    setCompulsory(prev => prev.filter(x => x !== c))
  }

  function toggleCompulsory(c: string) {
    setCompulsory(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function save() {
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories, custom_criteria: criteria, compulsory_criteria: compulsory, match_threshold: threshold, email_frequency: emailFreq, keys: apiKeys }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const label = (text: string) => (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 0.6rem' }}>{text}</p>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav">
        <Link href="/" style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '2px 10px', borderRadius: '1px' }}>Scout</span>
        </Link>
        <Link href="/" style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--ink-faint)', textDecoration: 'none' }}>← Home</Link>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', marginBottom: '0.3rem' }}>Your preferences</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', marginBottom: '2.5rem' }}>
          Scout only pings you when something matches what you care about.
        </p>

        {/* Categories */}
        <section style={{ marginBottom: '2rem' }}>
          {label('Opportunity types')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => toggleCategory(cat)}
                style={{
                  fontFamily: 'var(--font-head)', fontSize: '0.85rem', border: 'var(--border)',
                  boxShadow: categories.includes(cat) ? 'none' : 'var(--shadow-sm)',
                  padding: '0.3rem 0.9rem', borderRadius: '2px', cursor: 'pointer',
                  background: categories.includes(cat) ? 'var(--ink)' : 'var(--bg)',
                  color: categories.includes(cat) ? 'var(--bg)' : 'var(--ink)',
                  transform: categories.includes(cat) ? 'translate(2px, 2px)' : 'none',
                  transition: 'all 0.1s',
                }}>
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Custom criteria */}
        <section style={{ marginBottom: '2rem' }}>
          {label('Custom criteria')}
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem', marginBottom: '0.75rem', marginTop: 0 }}>
            e.g. "remote only", "Python", "prizes over $1000"
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              value={criteriaInput}
              onChange={e => setCriteriaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCriterion()}
              placeholder="Add a criterion…"
              className="sketch-input"
              style={{ flex: 1 }}
            />
            <button onClick={addCriterion} className="btn" style={{ flexShrink: 0 }}>Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {criteria.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'var(--border)', boxShadow: 'var(--shadow-sm)', padding: '0.5rem 0.9rem', borderRadius: '2px', background: 'var(--bg)' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>{c}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={compulsory.includes(c)} onChange={() => toggleCompulsory(c)} />
                    must match
                  </label>
                  <button onClick={() => removeCriterion(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-head)', color: 'var(--ink-faint)', fontSize: '0.9rem', padding: '0 4px' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Match threshold */}
        <section style={{ marginBottom: '2rem' }}>
          {label('Match threshold')}
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem', marginBottom: '0.75rem', marginTop: 0 }}>
            Scout notifies you when at least this many criteria match.
          </p>
          <div style={{ border: 'var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1rem 1.25rem', borderRadius: '2px', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Threshold</span>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: '1rem' }}>{threshold}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>/10</span></span>
            </div>
            <input type="range" min={1} max={10} value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: '0.25rem' }}>
              <span>1 — notify often</span><span>10 — notify rarely</span>
            </div>
          </div>
        </section>

        {/* Email frequency */}
        <section style={{ marginBottom: '2rem' }}>
          {label('Email frequency')}
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem', marginBottom: '0.75rem', marginTop: 0 }}>
            How many times per day Scout can email you. Sends are spaced equally from 5am to 9pm UTC.
          </p>
          <div style={{ border: 'var(--border)', boxShadow: 'var(--shadow-sm)', padding: '1rem 1.25rem', borderRadius: '2px', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Max emails / day</span>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: '1rem' }}>{emailFreq}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)' }}>/5</span></span>
            </div>
            <input type="range" min={1} max={5} value={emailFreq} onChange={e => setEmailFreq(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: '0.25rem' }}>
              <span>1 — once at noon</span><span>5 — every few hours</span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: '0.5rem', marginBottom: 0 }}>
              {emailFreq === 1 && 'Sends at ~2pm UTC'}
              {emailFreq === 2 && 'Sends at ~8am, 8pm UTC'}
              {emailFreq === 3 && 'Sends at ~8am, 2pm, 8pm UTC'}
              {emailFreq === 4 && 'Sends at ~5am, 8am, 5pm, 8pm UTC'}
              {emailFreq === 5 && 'Sends at ~5am, 8am, 2pm, 5pm, 8pm UTC'}
            </p>
          </div>
        </section>

        {/* BYOK — Scrapers */}
        <section style={{ marginBottom: '2rem' }}>
          {label('Scraper API Keys (optional)')}
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem', marginBottom: '0.75rem', marginTop: 0 }}>
            Scout works without these. Add your own keys to unlock higher rate limits.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { field: 'reddit_client_id', label: 'Reddit Client ID', hint: 'reddit.com/prefs/apps' },
              { field: 'reddit_client_secret', label: 'Reddit Client Secret', hint: '' },
              { field: 'google_cse_key', label: 'Google CSE API Key', hint: 'console.cloud.google.com' },
              { field: 'google_cse_id', label: 'Google CSE ID', hint: 'cse.google.com' },
            ].map(({ field, label: lbl, hint }) => (
              <div key={field}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', margin: '0 0 4px' }}>
                  {lbl}{hint && ` — ${hint}`}
                </p>
                <input type="password" placeholder="••••••••"
                  onChange={e => setApiKeys(prev => ({ ...prev, [field]: e.target.value }))}
                  className="sketch-input" />
              </div>
            ))}
          </div>
        </section>

        {/* BYOK — AI Keys */}
        <section style={{ marginBottom: '2.5rem' }}>
          {label('AI Keys (optional — for smarter matching)')}
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem', marginBottom: '0.75rem', marginTop: 0 }}>
            Used for AI-powered fake detection and quality filtering. Free tiers work great.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { field: 'gemini_api_key', label: 'Google Gemini API Key', hint: 'aistudio.google.com — free tier' },
              { field: 'together_api_key', label: 'Together.ai API Key', hint: 'together.ai — open source models, free credits' },
              { field: 'openai_api_key', label: 'OpenAI API Key', hint: 'platform.openai.com' },
              { field: 'anthropic_api_key', label: 'Anthropic API Key', hint: 'console.anthropic.com' },
            ].map(({ field, label: lbl, hint }) => (
              <div key={field}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', margin: '0 0 4px' }}>
                  {lbl}{hint && ` — ${hint}`}
                </p>
                <input type="password" placeholder="••••••••"
                  onChange={e => setApiKeys(prev => ({ ...prev, [field]: e.target.value }))}
                  className="sketch-input" />
              </div>
            ))}
          </div>
        </section>

        <button onClick={save} disabled={saving} className="btn btn-filled"
          style={{ width: '100%', fontSize: '1rem', padding: '0.7rem', justifyContent: 'center' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </main>
  )
}
