# Azure & M365 Intelligence Dashboard

A live, AI-powered dashboard that automatically fetches the latest **Azure** and **Microsoft 365** updates — critical alerts, upcoming deprecations, new features, and news — with one-click email digest delivery.

Built with **Next.js 14**, **Anthropic AI + web search**, and **Resend** for email.

---

## Features

- **Auto-fetch** latest Azure & M365 updates powered by Claude AI with live web search
- **4 categories**: Critical / Action Needed · Deprecations · New Features · News
- **Deadline badges** on deprecation and action items
- **Email digest** — send a beautifully formatted HTML email to any address
- **Filter by category** with live counts
- **Vercel-ready** — deploys in under 5 minutes

---

## Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in your keys (see below)

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com) |
| `RESEND_API_KEY` | Yes (for email) | From [resend.com](https://resend.com) — free tier is 3,000 emails/month |
| `EMAIL_FROM` | No | Sender address (default: `onboarding@resend.dev` for testing) |

### Getting your Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to **API Keys** → **Create Key**
4. Copy the key into `.env.local`

### Getting your Resend API Key (5 min setup)
1. Go to [resend.com](https://resend.com) and create a free account
2. From the dashboard click **API Keys** → **Create API Key**
3. Copy it into `.env.local`
4. For testing, leave `EMAIL_FROM=onboarding@resend.dev` (only sends to your verified Resend email)
5. For production, add and verify your own domain in Resend → set `EMAIL_FROM=digest@yourdomain.com`

---

## Deploy to Vercel

### Option A — GitHub (recommended)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo
3. In the **Environment Variables** section, add:
   - `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
4. Click **Deploy** — done!

### Option B — Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the project folder
vercel

# Add environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM

# Redeploy with env vars
vercel --prod
```

---

## Project Structure

```
azure-m365-news/
├── app/
│   ├── layout.tsx                  # Root layout (DM Sans font)
│   ├── globals.css                 # Tailwind base styles
│   ├── page.tsx                    # Main dashboard (client component)
│   └── api/
│       ├── fetch-updates/
│       │   └── route.ts            # Anthropic API proxy (web search)
│       └── send-email/
│           └── route.ts            # Resend email sender
├── .env.example                    # Environment variable template
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## How It Works

1. **Fetch updates** — The dashboard calls `/api/fetch-updates` which proxies to the Anthropic API with the `web_search` tool enabled. Claude searches the web in real time and returns structured JSON with the latest Azure & M365 updates.

2. **Email digest** — Clicking "Email digest" and entering an email calls `/api/send-email`, which generates a full HTML email template and sends it via the Resend API.

3. **API key security** — All API keys stay server-side in Next.js API routes. They are never exposed to the browser.

---

## Customisation

- **Auto-refresh**: Add a `setInterval` in `page.tsx` `useEffect` to auto-fetch on a schedule
- **More categories**: Extend the `CATEGORY_META` object and update the AI prompt
- **Scheduled digests**: Add a Vercel Cron Job (`vercel.json` with `crons`) that hits `/api/send-email` on a schedule
- **Filtering by product**: Update the prompt in `fetch-updates/route.ts` to focus on specific services (e.g. only Entra ID, only Azure Kubernetes)

---

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic API](https://docs.anthropic.com) with web search
- [Resend](https://resend.com) for transactional email
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) via next/font
