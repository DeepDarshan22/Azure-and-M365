import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 })
  }

  const today = new Date().toDateString()

  const prompt = `You are an expert Microsoft Cloud technology analyst. Today is ${today}.

Use web search to find the LATEST real news about Azure and Microsoft 365. Prioritize items published in the last 30–60 days.

You MUST respond with ONLY a valid JSON array. No markdown, no backticks, no explanation text. Just the raw JSON array starting with [ and ending with ].

Find 14–18 items spread across these four categories:

- "critical": Urgent actions IT admins MUST take. Examples: TLS/SSL version retirements, authentication protocol changes, MFA enforcement deadlines, required license upgrades, security patch mandates, breaking API changes.
- "deprecation": Features, services, or APIs being retired or end-of-life'd, with specific deadlines where known.
- "feature": New features or capabilities announced as GA or Public Preview in Azure or M365.
- "news": Important general news about Azure, M365, Copilot, Entra, Intune, Exchange, Teams, SharePoint, etc.

Include at least 3 critical items and 3 deprecation items with real deadlines.

Each item MUST exactly match this JSON shape:
{
  "category": "critical" | "deprecation" | "feature" | "news",
  "title": "concise title under 12 words",
  "summary": "2-3 sentences explaining what this means for IT admins and what action to take if applicable",
  "date": "e.g. Apr 2025",
  "deadline": "e.g. Sep 30 2025 or null if not applicable",
  "source": "e.g. Microsoft Tech Community, Azure Blog, M365 Message Center",
  "url": "direct URL string or null"
}

Respond with ONLY the JSON array. Nothing before or after it.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 500 })
    }

    const data = await response.json()

    // Extract all text blocks from the response
    const textContent = (data.content as { type: string; text?: string }[])
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('')

    // Find the JSON array in the response
    const arrayMatch = textContent.match(/\[[\s\S]*\]/)
    if (!arrayMatch) {
      return NextResponse.json({ error: 'Could not parse response from AI. Try again.' }, { status: 500 })
    }

    const items = JSON.parse(arrayMatch[0])

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid response format from AI.' }, { status: 500 })
    }

    return NextResponse.json({ items })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
