import { NextResponse } from 'next/server'

export const maxDuration = 60

type Category = 'critical' | 'deprecation' | 'feature' | 'news'

interface FeedItem {
  category: Category
  title: string
  summary: string
  date: string
  deadline: string | null
  source: string
  url: string | null
}

const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash']

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastError = ''
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tools: [{ google_search: {} }],
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        lastError = `${model}: ${err?.error?.message || res.statusText}`
        continue
      }

      const data = await res.json()
      const text: string = (data.candidates?.[0]?.content?.parts || [])
        .map((p: { text?: string }) => p.text || '')
        .join('')

      if (text) return text
      lastError = `${model}: empty response`
    } catch (e) {
      lastError = `${model}: ${e instanceof Error ? e.message : 'unknown error'}`
    }
  }
  throw new Error(`All models failed. Last error: ${lastError}`)
}

function extractJson(text: string): FeedItem[] {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  // Try to find a JSON array
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return []

  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Try to fix truncated JSON by closing the array
    try {
      const partial = match[0].replace(/,\s*$/, '') + ']'
      const parsed = JSON.parse(partial)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}

async function searchCategory(apiKey: string, monthName: string, year: string, category: Category): Promise<FeedItem[]> {
  const monthYear = `${monthName} ${year}`

  const prompts: Record<Category, string> = {
    critical: `Search the web for Microsoft Azure and Microsoft 365 MANDATORY ACTION REQUIRED items for ${monthYear}.
Look for: TLS/SSL retirement deadlines, Basic Auth deprecation, MFA enforcement, mandatory security patches, breaking API changes, required license upgrades.
Return ONLY a JSON array (no markdown, no explanation) with 4-6 items in this exact format:
[{"category":"critical","title":"short title","summary":"2-3 sentences for IT admins with specific details","date":"${monthYear}","deadline":"date or null","source":"source name","url":"url or null"}]`,

    deprecation: `Search the web for Microsoft Azure and Microsoft 365 SERVICE RETIREMENTS and DEPRECATIONS for ${monthYear}.
Look for: Azure services being retired, M365 features removed, APIs shut down, classic portals retired, VM sizes discontinued. Include exact retirement dates.
Return ONLY a JSON array (no markdown, no explanation) with 4-6 items in this exact format:
[{"category":"deprecation","title":"short title","summary":"2-3 sentences with specific service names and dates","date":"${monthYear}","deadline":"retirement date or null","source":"source name","url":"url or null"}]`,

    feature: `Search the web for NEW Microsoft Azure and Microsoft 365 features that became Generally Available or entered Public Preview in ${monthYear}.
Look for: new Azure services, new M365/Teams/SharePoint/Entra/Intune features, new Copilot capabilities, new integrations.
Return ONLY a JSON array (no markdown, no explanation) with 4-6 items in this exact format:
[{"category":"feature","title":"short title","summary":"2-3 sentences describing the feature and its benefit","date":"${monthYear}","deadline":null,"source":"source name","url":"url or null"}]`,

    news: `Search the web for important Microsoft Azure and Microsoft 365 NEWS from ${monthYear}.
Look for: pricing changes, new regions, security advisories, CVEs, compliance updates, major policy changes, product announcements.
Return ONLY a JSON array (no markdown, no explanation) with 4-6 items in this exact format:
[{"category":"news","title":"short title","summary":"2-3 sentences summarizing the news and its impact","date":"${monthYear}","deadline":null,"source":"source name","url":"url or null"}]`,
  }

  try {
    const text = await callGemini(apiKey, prompts[category])
    const items = extractJson(text)
    return items.map(i => ({ ...i, category }))
  } catch (e) {
    console.error(`Category ${category} failed:`, e)
    return []
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.' },
      { status: 500 }
    )
  }

  let body: { month?: string; year?: string } = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { year, month } = body
  if (!year || !month) {
    return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
  }

  const monthName = new Date(`${year}-${month.padStart(2, '0')}-01`)
    .toLocaleString('en-US', { month: 'long' })

  try {
    const [critical, deprecation, feature, news] = await Promise.all([
      searchCategory(apiKey, monthName, year, 'critical'),
      searchCategory(apiKey, monthName, year, 'deprecation'),
      searchCategory(apiKey, monthName, year, 'feature'),
      searchCategory(apiKey, monthName, year, 'news'),
    ])

    const items = [...critical, ...deprecation, ...feature, ...news]
    const deduped = items.filter((item, idx, arr) =>
      arr.findIndex(o => o.title === item.title) === idx
    )

    if (deduped.length === 0) {
      return NextResponse.json({
        error: `No updates found for ${monthName} ${year}. The Gemini API may have returned unexpected data. Check that GEMINI_API_KEY is valid in Vercel.`,
        items: []
      })
    }

    return NextResponse.json({ items: deduped })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch updates' },
      { status: 500 }
    )
  }
}
