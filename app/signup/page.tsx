'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Check your inbox</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)' }}>
          Magic link sent to <strong>{email}</strong>.<br />Click it to sign in — no password needed.
        </p>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav">
        <Link href="/" style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '2px 10px', borderRadius: '1px' }}>Scout</span>
        </Link>
      </nav>

      <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '0 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', marginBottom: '0.5rem' }}>Join Scout</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', marginBottom: '2rem' }}>
          Enter your email. We'll send a magic link — no password needed.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="sketch-input"
          />
          {error && <p style={{ fontFamily: 'var(--font-body)', color: '#c00', fontSize: '0.9rem', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-filled" style={{ fontSize: '1rem', padding: '0.6rem', justifyContent: 'center' }}>
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem', marginTop: '1.5rem', textAlign: 'center' }}>
          Prefer Telegram? Find <strong>@scout_theautomation_bot</strong> and send /start
        </p>
      </div>
    </main>
  )
}
