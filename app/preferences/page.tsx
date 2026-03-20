'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/types'

export default function PreferencesPage() {
  const [categories, setCategories] = useState<string[]>([])
  const [criteria, setCriteria] = useState<string[]>([])
  const [compulsory, setCompulsory] = useState<string[]>([])
  const [threshold, setThreshold] = useState(5)
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
      body: JSON.stringify({ categories, custom_criteria: criteria, compulsory_criteria: compulsory, match_threshold: threshold, keys: apiKeys }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Scout</span>
        <a href="/" className="text-sm text-white/60 hover:text-white transition">← Home</a>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-1">Your preferences</h1>
          <p className="text-white/50 text-sm">Scout only pings you when something matches what you care about.</p>
        </div>

        {/* Categories */}
        <section>
          <h2 className="font-semibold mb-3">Opportunity types</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  categories.includes(cat)
                    ? 'bg-white text-black border-white'
                    : 'border-white/20 text-white/60 hover:border-white/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Custom criteria */}
        <section>
          <h2 className="font-semibold mb-1">Custom criteria</h2>
          <p className="text-white/40 text-sm mb-3">e.g. &quot;remote only&quot;, &quot;Python&quot;, &quot;prizes over $1000&quot;</p>
          <div className="flex gap-2 mb-3">
            <input
              value={criteriaInput}
              onChange={e => setCriteriaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCriterion()}
              placeholder="Add a criterion..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
            />
            <button onClick={addCriterion} className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-sm transition">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {criteria.map(c => (
              <div key={c} className="flex items-center justify-between border border-white/10 rounded-xl px-4 py-2">
                <span className="text-sm">{c}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compulsory.includes(c)}
                      onChange={() => toggleCompulsory(c)}
                      className="accent-white"
                    />
                    must match
                  </label>
                  <button onClick={() => removeCriterion(c)} className="text-white/30 hover:text-white/70 text-xs transition">✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Match threshold */}
        <section>
          <h2 className="font-semibold mb-1">Match threshold: <span className="text-white/60">{threshold}/10</span></h2>
          <p className="text-white/40 text-sm mb-3">Scout notifies you only when at least this many criteria match.</p>
          <input
            type="range"
            min={1} max={10}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>1 — notify often</span>
            <span>10 — notify rarely</span>
          </div>
        </section>

        {/* BYOK API Keys */}
        <section>
          <h2 className="font-semibold mb-1">API Keys <span className="text-white/30 font-normal text-sm">(optional)</span></h2>
          <p className="text-white/40 text-sm mb-4">
            Scout works without these. Add your own keys to unlock higher limits and more sources.
            Keys are encrypted and never shared.
          </p>
          <div className="space-y-3">
            {[
              { field: 'reddit_client_id', label: 'Reddit Client ID', placeholder: '••••••••a1b2', hint: 'reddit.com/prefs/apps' },
              { field: 'reddit_client_secret', label: 'Reddit Client Secret', placeholder: '••••••••a1b2', hint: '' },
              { field: 'google_cse_key', label: 'Google CSE API Key', placeholder: '••••••••a1b2', hint: 'console.cloud.google.com' },
              { field: 'google_cse_id', label: 'Google CSE ID', placeholder: '••••••••a1b2', hint: 'cse.google.com' },
              { field: 'resend_api_key', label: 'Resend API Key', placeholder: '••••••••a1b2', hint: 'resend.com/api-keys' },
            ].map(({ field, label, placeholder, hint }) => (
              <div key={field}>
                <label className="text-xs text-white/50 block mb-1">
                  {label}{hint && <span className="ml-2 text-white/30">— {hint}</span>}
                </label>
                <input
                  type="password"
                  placeholder={placeholder}
                  onChange={e => setApiKeys((prev: Record<string, string>) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                />
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-white/90 transition disabled:opacity-50"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </main>
  )
}
