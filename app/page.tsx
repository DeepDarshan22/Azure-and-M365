'use client'

import { useState, useEffect } from 'react'

type Category = 'critical' | 'deprecation' | 'feature' | 'news'
type Filter = 'all' | Category

interface UpdateItem {
  category: Category
  title: string
  summary: string
  date?: string
  deadline?: string
  source?: string
  url?: string
}

const CATEGORY_META: Record<Category, { label: string; icon: string; badge: string; hover: string; stat: string }> = {
  critical: {
    label: 'Critical / action needed',
    icon: '!',
    badge: 'bg-red-500/15 text-red-400 border border-red-500/25',
    hover: 'hover:border-red-500/20',
    stat: 'text-red-400 bg-red-500/8 border-red-500/15',
  },
  deprecation: {
    label: 'Upcoming deprecations',
    icon: '↓',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    hover: 'hover:border-amber-500/20',
    stat: 'text-amber-400 bg-amber-500/8 border-amber-500/15',
  },
  feature: {
    label: 'New features',
    icon: '+',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    hover: 'hover:border-emerald-500/20',
    stat: 'text-emerald-400 bg-emerald-500/8 border-emerald-500/15',
  },
  news: {
    label: 'Latest news',
    icon: 'i',
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    hover: 'hover:border-blue-500/20',
    stat: 'text-blue-400 bg-blue-500/8 border-blue-500/15',
  },
}

function ItemCard({ item }: { item: UpdateItem }) {
  const meta = CATEGORY_META[item.category]
  return (
    <div className={`bg-[#131b27] border border-white/[0.06] ${meta.hover} rounded-xl p-4 transition-colors duration-150`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${meta.badge}`}>
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-sm font-medium text-[#e2e8f0] leading-snug">{item.title}</p>
            {item.deadline && (
              <span className="flex-shrink-0 text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                {item.deadline}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748b] leading-relaxed mb-2">{item.summary}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {item.date && (
              <span className="text-[11px] text-[#334155]">{item.date}</span>
            )}
            {item.source && item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#3b82f6] hover:text-blue-300 transition-colors"
              >
                {item.source} ↗
              </a>
            ) : item.source ? (
              <span className="text-[11px] text-[#334155]">{item.source}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="h-24 bg-[#131b27] border border-white/[0.04] rounded-xl animate-pulse" />
  )
}

export default function Dashboard() {
  const [items, setItems] = useState<UpdateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  // Email state
  const [showEmail, setShowEmail] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  useEffect(() => {
    fetchUpdates()
  }, [])

  async function fetchUpdates() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/fetch-updates', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch updates')
      setItems(data.items || [])
      setLastUpdated(new Date().toLocaleString())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function sendDigest() {
    if (!emailTo || !emailTo.includes('@')) {
      setEmailMsg('Enter a valid email address')
      return
    }
    if (items.length === 0) {
      setEmailMsg('Fetch updates first before sending the digest')
      return
    }
    setEmailSending(true)
    setEmailMsg('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, to: emailTo }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send')
      setEmailMsg('✓ Digest sent successfully!')
      setTimeout(() => {
        setShowEmail(false)
        setEmailMsg('')
      }, 2500)
    } catch (e: unknown) {
      setEmailMsg(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }

  const counts: Record<Category, number> = {
    critical: items.filter(i => i.category === 'critical').length,
    deprecation: items.filter(i => i.category === 'deprecation').length,
    feature: items.filter(i => i.category === 'feature').length,
    news: items.filter(i => i.category === 'news').length,
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const grouped = (Object.keys(CATEGORY_META) as Category[]).reduce(
    (acc, cat) => ({ ...acc, [cat]: filtered.filter(i => i.category === cat) }),
    {} as Record<Category, UpdateItem[]>
  )

  return (
    <main className="min-h-screen bg-[#0c1017] font-sans">
      {/* Top nav */}
      <nav className="border-b border-white/[0.07] px-5 py-3.5 sticky top-0 bg-[#0c1017]/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-semibold text-[#f1f5f9] tracking-tight leading-none mb-1">
                Azure &amp; M365 intelligence
              </h1>
              <p className="text-[11px] text-[#475569] leading-none">
                {lastUpdated ? `Last updated ${lastUpdated}` : 'AI-powered live cloud updates'}
              </p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 hidden sm:inline">Azure</span>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 hidden sm:inline">M365</span>
          </div>

          <div className="flex items-center gap-2">
            {showEmail ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendDigest()}
                  className="bg-[#1a2235] border border-white/10 focus:border-blue-500/40 text-[#e2e8f0] placeholder:text-[#334155] text-sm rounded-lg px-3 py-1.5 w-52 outline-none transition-colors"
                  autoFocus
                />
                <button
                  onClick={sendDigest}
                  disabled={emailSending}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors font-medium"
                >
                  {emailSending ? 'Sending…' : 'Send'}
                </button>
                <button
                  onClick={() => { setShowEmail(false); setEmailMsg('') }}
                  className="text-[#475569] hover:text-[#94a3b8] text-sm px-1.5 py-1.5 transition-colors"
                >
                  ✕
                </button>
                {emailMsg && (
                  <span className={`text-xs ${emailMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {emailMsg}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowEmail(true)}
                disabled={items.length === 0 && !loading}
                className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] border border-white/[0.08] hover:border-white/15 bg-[#131b27] hover:bg-[#1a2235] rounded-lg px-3 py-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Email digest
              </button>
            )}

            <button
              onClick={fetchUpdates}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] border border-white/[0.08] hover:border-white/15 bg-[#131b27] hover:bg-[#1a2235] rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border border-white/20 border-t-white/70 rounded-full animate-spin" />
                  Fetching…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(Object.keys(CATEGORY_META) as Category[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? 'all' : cat)}
              className={`border rounded-xl p-4 text-center transition-all cursor-pointer ${
                filter === cat ? CATEGORY_META[cat].stat + ' border-opacity-40' : 'border-white/[0.06] bg-[#131b27] hover:border-white/10'
              }`}
            >
              <div className={`text-2xl font-semibold ${filter === cat ? '' : 'text-[#94a3b8]'}`}
                style={filter === cat ? {} : undefined}>
                <span className={filter === cat ? CATEGORY_META[cat].stat.split(' ')[0].replace('bg-', 'text-').replace('/8', '/100') : ''}>
                  {loading ? '–' : counts[cat]}
                </span>
              </div>
              <div className="text-[11px] text-[#475569] mt-1">{CATEGORY_META[cat].label}</div>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {([
            { id: 'all', label: 'All updates' },
            { id: 'critical', label: '! Critical' },
            { id: 'deprecation', label: '↓ Deprecations' },
            { id: 'feature', label: '+ Features' },
            { id: 'news', label: 'i News' },
          ] as { id: Filter; label: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filter === f.id
                  ? 'bg-[#1a2235] border-white/[0.15] text-[#e2e8f0]'
                  : 'border-white/[0.05] text-[#475569] hover:text-[#94a3b8] hover:border-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
          {filter !== 'all' && (
            <span className="text-xs text-[#334155] py-1.5 ml-1">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && !error && (
          <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-xl">
            <p className="text-[#334155] text-sm">Press "Refresh" to load live Azure &amp; M365 updates</p>
          </div>
        )}

        {/* Feed */}
        {!loading && items.length > 0 && (
          filter === 'all' ? (
            <div className="space-y-6">
              {(Object.keys(CATEGORY_META) as Category[]).map(cat => {
                const catItems = grouped[cat]
                if (!catItems.length) return null
                return (
                  <section key={cat}>
                    <h2 className="text-[11px] font-medium text-[#334155] uppercase tracking-widest mb-3">
                      {CATEGORY_META[cat].label}
                    </h2>
                    <div className="space-y-2">
                      {catItems.map((item, i) => <ItemCard key={i} item={item} />)}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-xl">
                  <p className="text-[#334155] text-sm">No items in this category</p>
                </div>
              ) : (
                filtered.map((item, i) => <ItemCard key={i} item={item} />)
              )}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] mt-10 px-5 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-white">DD</span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#64748b]">
                Created by{' '}
                <span className="text-[#94a3b8] font-semibold">Deep Darshan Singrodia</span>
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[#334155]">
            Powered by Anthropic AI · Resend · Next.js
          </p>
        </div>
      </footer>
    </main>
  )
}
