import { NextResponse } from 'next/server'
import { Resend } from 'resend'

interface UpdateItem {
  category: 'critical' | 'deprecation' | 'feature' | 'news'
  title: string
  summary: string
  date?: string
  deadline?: string
  source?: string
  url?: string
}

const CATEGORY_META = {
  critical: { label: 'Critical / Action Needed', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '⚠' },
  deprecation: { label: 'Upcoming Deprecations', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '↓' },
  feature: { label: 'New Features', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', icon: '+' },
  news: { label: 'Latest News', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ' },
}

function generateEmailHtml(items: UpdateItem[]): string {
  const grouped: Record<string, UpdateItem[]> = {
    critical: items.filter(i => i.category === 'critical'),
    deprecation: items.filter(i => i.category === 'deprecation'),
    feature: items.filter(i => i.category === 'feature'),
    news: items.filter(i => i.category === 'news'),
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  let sectionsHtml = ''

  for (const cat of ['critical', 'deprecation', 'feature', 'news'] as const) {
    const catItems = grouped[cat]
    if (!catItems.length) continue
    const meta = CATEGORY_META[cat]

    const itemsHtml = catItems.map(item => `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin-bottom: 10px; border-left: 3px solid ${meta.color};">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; gap: 12px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${escHtml(item.title)}</p>
          ${item.deadline ? `<span style="flex-shrink: 0; font-size: 11px; font-weight: 600; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 20px; white-space: nowrap;">${escHtml(item.deadline)}</span>` : ''}
        </div>
        <p style="margin: 0 0 8px; font-size: 13px; color: #475569; line-height: 1.6;">${escHtml(item.summary)}</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.date ? `<span style="font-size: 11px; color: #94a3b8;">${escHtml(item.date)}</span>` : ''}
          ${item.source && item.url ? `<a href="${item.url}" style="font-size: 11px; color: #2563eb; text-decoration: none;" target="_blank">${escHtml(item.source)} ↗</a>` : item.source ? `<span style="font-size: 11px; color: #94a3b8;">${escHtml(item.source)}</span>` : ''}
        </div>
      </div>
    `).join('')

    sectionsHtml += `
      <div style="margin-bottom: 28px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
          <span style="width: 22px; height: 22px; background: ${meta.bg}; border: 1px solid ${meta.border}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: ${meta.color};">${meta.icon}</span>
          <h2 style="margin: 0; font-size: 13px; font-weight: 700; color: ${meta.color}; text-transform: uppercase; letter-spacing: 0.05em;">${meta.label}</h2>
          <span style="font-size: 11px; color: #94a3b8;">(${catItems.length})</span>
        </div>
        ${itemsHtml}
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure & M365 Digest</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: #0f172a; border-radius: 14px; padding: 24px 28px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em;">Azure &amp; M365 Intelligence</h1>
      </div>
      <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">${dateStr}</p>
      <div style="display: flex; gap: 8px;">
        <span style="font-size: 11px; font-weight: 600; background: rgba(59,130,246,0.15); color: #93c5fd; border: 1px solid rgba(59,130,246,0.25); padding: 3px 10px; border-radius: 20px;">Azure</span>
        <span style="font-size: 11px; font-weight: 600; background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.25); padding: 3px 10px; border-radius: 20px;">Microsoft 365</span>
      </div>
    </div>

    <!-- Summary bar -->
    <div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
      ${grouped.critical.length ? `<span style="font-size: 12px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${grouped.critical.length} Critical</span>` : ''}
      ${grouped.deprecation.length ? `<span style="font-size: 12px; background: #fffbeb; color: #d97706; border: 1px solid #fde68a; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${grouped.deprecation.length} Deprecation${grouped.deprecation.length > 1 ? 's' : ''}</span>` : ''}
      ${grouped.feature.length ? `<span style="font-size: 12px; background: #f0fdf4; color: #059669; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${grouped.feature.length} New Feature${grouped.feature.length > 1 ? 's' : ''}</span>` : ''}
      ${grouped.news.length ? `<span style="font-size: 12px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${grouped.news.length} News Item${grouped.news.length > 1 ? 's' : ''}</span>` : ''}
    </div>

    <!-- Sections -->
    ${sectionsHtml}

    <!-- Footer -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 8px; text-align: center;">
      <p style="margin: 0 0 6px; font-size: 12px; color: #334155;">
        Created by <strong style="color: #0f172a;">Deep Darshan Singrodia</strong>
      </p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">Azure &amp; M365 Intelligence • Powered by Anthropic AI + Web Search</p>
    </div>

  </div>
</body>
</html>`
}

function escHtml(str: string | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req: Request) {
  const resendKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev'

  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set. See README for setup instructions.' }, { status: 500 })
  }

  let body: { items: UpdateItem[]; to: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { items, to } = body

  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Invalid recipient email address' }, { status: 400 })
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items to send' }, { status: 400 })
  }

  const resend = new Resend(resendKey)

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject: `Azure & M365 Digest — ${dateStr} (${items.length} updates)`,
      html: generateEmailHtml(items),
    })

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to send email'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
