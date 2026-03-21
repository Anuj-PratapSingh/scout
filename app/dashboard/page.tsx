import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

async function getUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

async function getDashboardData(userId: string) {
  const [oppsRes, logsRes, prefsRes] = await Promise.all([
    supabaseAdmin.from('opportunities').select('id, source, tags, fetched_at', { count: 'exact' }).limit(1),
    supabaseAdmin
      .from('notification_log')
      .select('id, channel, created_at, opportunity_id, opportunities(title, url, source, tags)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('preferences')
      .select('categories, email_frequency, match_threshold')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const totalOpps = oppsRes.count ?? 0
  const logs = logsRes.data ?? []
  const prefs = prefsRes.data

  // Category breakdown from notification logs
  const catCounts: Record<string, number> = {}
  for (const log of logs) {
    const tags: string[] = (log.opportunities as { tags?: string[] } | null)?.tags ?? []
    const cat = tags[0] || 'other'
    catCounts[cat] = (catCounts[cat] ?? 0) + 1
  }

  // Source breakdown
  const srcCounts: Record<string, number> = {}
  for (const log of logs) {
    const src = (log.opportunities as { source?: string } | null)?.source ?? 'other'
    srcCounts[src] = (srcCounts[src] ?? 0) + 1
  }

  // Day active: date of first notification
  const firstLog = [...logs].reverse()[0]
  const daysActive = firstLog
    ? Math.ceil((Date.now() - new Date(firstLog.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return { totalOpps, logs, prefs, catCounts, srcCounts, daysActive }
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/signup')

  const { totalOpps, logs, prefs, catCounts, srcCounts, daysActive } = await getDashboardData(user.id)

  const totalMatches = logs.length
  const emailLogs = logs.filter(l => l.channel === 'email').length
  const telegramLogs = logs.filter(l => l.channel === 'telegram').length

  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const topSrcs = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCat = topCats[0]?.[1] ?? 1
  const maxSrc = topSrcs[0]?.[1] ?? 1

  const catColors: Record<string, string> = {
    hackathon: '#dcf76c', contest: '#98ffd9', internship: '#dfccfe',
    job: '#fde5c8', bounty: '#fde5c8', swag: '#fde5c8',
    trending: '#dcf76c', 'cool-project': '#98ffd9',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav">
        <Link href="/" style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '2px 10px', borderRadius: '1px' }}>Scout</span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/preferences" style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--ink-faint)', textDecoration: 'none' }}>Preferences</Link>
          <Link href="/" style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--ink-faint)', textDecoration: 'none' }}>← Browse</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>
          {user.email}
        </p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '2.2rem', marginBottom: '0.3rem' }}>Your Scout dashboard</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', marginBottom: '2.5rem' }}>
          Everything Scout has found and sent you.
        </p>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Opps in DB', value: totalOpps.toLocaleString() },
            { label: 'Your matches', value: totalMatches },
            { label: 'Emails sent', value: emailLogs },
            { label: 'Days active', value: daysActive },
          ].map(s => (
            <div key={s.label} className="neo-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '1.8rem', margin: 0, color: 'var(--ink)' }}>{s.value}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {/* Category breakdown */}
          <div className="neo-card" style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 1rem' }}>
              Matches by type
            </p>
            {topCats.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem' }}>No matches yet — set your preferences to get started.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {topCats.map(([cat, count]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', textTransform: 'capitalize' }}>{cat.replace(/-/g, ' ')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mid)' }}>{count}</span>
                    </div>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / maxCat) * 100}%`, background: catColors[cat] ?? 'var(--primary-bg)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top sources */}
          <div className="neo-card" style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 1rem' }}>
              Top sources
            </p>
            {topSrcs.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', fontSize: '0.85rem' }}>No matches yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {topSrcs.map(([src, count]) => (
                  <div key={src}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', textTransform: 'capitalize' }}>{src.replace(/-/g, ' ')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mid)' }}>{count}</span>
                    </div>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / maxSrc) * 100}%`, background: 'var(--tertiary-bg)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings summary */}
        {prefs && (
          <div className="neo-card" style={{ padding: '1.25rem', marginBottom: '2.5rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 0.75rem' }}>
              Your settings
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)' }}>Match threshold</span>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', margin: '2px 0 0' }}>{prefs.match_threshold ?? 5}/10</p>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)' }}>Email frequency</span>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', margin: '2px 0 0' }}>{prefs.email_frequency ?? 1}×/day</p>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)' }}>Categories</span>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', margin: '2px 0 0' }}>{(prefs.categories ?? []).join(', ') || 'All'}</p>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <Link href="/preferences" className="btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.9rem' }}>Edit preferences →</Link>
            </div>
          </div>
        )}

        {/* Recent matches */}
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 1rem' }}>
            Recent matches
          </p>
          {logs.length === 0 ? (
            <div className="neo-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mid)', marginBottom: '0.75rem' }}>
                No matches yet. Scout runs 3× daily — check back soon.
              </p>
              <Link href="/preferences" className="btn btn-filled" style={{ fontSize: '0.85rem' }}>
                Set preferences →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {logs.map((log, i) => {
                const opp = log.opportunities as { title?: string; url?: string; source?: string } | null
                return (
                  <a key={i} href={opp?.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="neo-card" style={{ padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-head)', fontStyle: 'italic', fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opp?.title ?? 'Opportunity'}
                        </p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', margin: '3px 0 0' }}>
                          {opp?.source} · via {log.channel} · {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', flexShrink: 0 }}>↗</span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Notifications split */}
        {totalMatches > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            {telegramLogs > 0 && (
              <div className="neo-card" style={{ padding: '0.75rem 1rem', flex: 1, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', margin: 0 }}>{telegramLogs}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', margin: '2px 0 0', textTransform: 'uppercase' }}>Telegram</p>
              </div>
            )}
            {emailLogs > 0 && (
              <div className="neo-card" style={{ padding: '0.75rem 1rem', flex: 1, textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', margin: 0 }}>{emailLogs}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-faint)', margin: '2px 0 0', textTransform: 'uppercase' }}>Email</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
