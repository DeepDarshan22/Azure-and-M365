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

async function searchCategory(monthName: string, year: string, category: Category): Promise<FeedItem[]> {
  const apiKey = process.env.GEMINI_API_KEY!
  const monthYear = `${monthName} ${year}`

  const prompts: Record<Category, string> = {
    critical: `Search for Microsoft Azure and Microsoft 365 ACTION REQUIRED and critical mandatory updates for ${monthYear}.
Find specific items like:
- TLS/SSL version retirements (e.g. TLS 1.0/1.1 end of support deadlines)
- Authentication changes admins MUST implement (Basic Auth deprecation, legacy auth blocks, Modern Auth enforcement)
- MFA enforcement deadlines from Microsoft
- Mandatory security patches or configuration changes
- Breaking API/SDK changes with hard deadlines
- License or subscription changes requiring action
Return 4-6 real specific items found via web search from official Microsoft sources.`,

    deprecation: `Search for Microsoft Azure and Microsoft 365 SERVICE RETIREMENTS and DEPRECATIONS for ${monthYear}.
Find specific items like:
- Azure services being retired or reaching end-of-life with exact dates
- M365 features being removed or deprecated
- APIs, SDKs, or endpoints being shut down
- Classic portals or legacy experiences being retired
- VM sizes, regions, or SKUs being discontinued
Include exact retirement dates wherever available.
Return 4-6 real specific items from official Microsoft sources like azure.microsoft.com/updates.`,

    feature: `Search for NEW features and capabilities announced or made Generally Available in Microsoft Azure and Microsoft 365 during ${monthYear}.
Find specific items like:
- New Azure services launched or reaching GA
- New M365 features rolling out (Teams, SharePoint, Exchange, Entra ID, Intune, Copilot)
- Public Preview announcements
- New AI/Copilot capabilities
- New integrations or connectors
Return 4-6 real specific items from official Microsoft blogs.`,

    news: `Search for important Microsoft Azure and Microsoft 365 NEWS and ANNOUNCEMENTS from ${monthYear}.
Find specific items like:
- Major pricing changes
- New region or availability zone launches
- Important security advisories or CVEs
- Compliance and certification updates
- Major policy or governance changes
- Product rebranding or restructuring
Return 4-6 real specific items from official Microsoft sources.`,
  }

  const systemInstruction = `You are a Microsoft cloud expert analyst. Search the web and return ONLY a raw JSON array — no markdown, no backticks, no explanation text before or after.

Each item must have this exact shape:
{
  "category": "${category}",
  "title": "concise title under 12 words",
  "summary": "2-3 sentences for IT admins. Be specific — include service names, version numbers, deadlines.",
  "date": "e.g. Apr 2025",
  "deadline": "specific deadline date if applicable, or null",
  "source": "e.g. Azure Updates, Microsoft Tech Community, Microsoft 365 Admin Center",
  "url": "direct URL to official Microsoft documentation or null"
}

Only return real items you found via search. Never fabricate. Start your response with [ and end with ].`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [{ google_search: {} }],
          contents: [{ parts: [{ text: prompts[category] }], role: 'user' }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
        }),
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    const text: string = (data.candidates?.[0]?.content?.parts || [])
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join('')

    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []

    const items = JSON.parse(match[0])
    return Array.isArray(items) ? items.map((i: FeedItem) => ({ ...i, category })) : []
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables' }, { status: 500 })

  let body: { month?: string; year?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { year, month } = body
  if (!year || !month) return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })

  const monthName = new Date(`${year}-${month.padStart(2, '0')}-01`).toLocaleString('en-US', { month: 'long' })

  try {
    const [critical, deprecation, feature, news] = await Promise.all([
      searchCategory(monthName, year, 'critical'),
      searchCategory(monthName, year, 'deprecation'),
      searchCategory(monthName, year, 'feature'),
      searchCategory(monthName, year, 'news'),
    ])

    const items = [...critical, ...deprecation, ...feature, ...news]
    const deduped = items.filter((item, idx, arr) =>
      arr.findIndex(o => o.title === item.title) === idx
    )

    return NextResponse.json({ items: deduped })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch updates' }, { status: 500 })
  }
}
