# AEO Hosted Checker

Hosted Agentic Engine Optimization workspace built on top of the original `agentic-seo` checker set.

## What’s here

- `packages/aeo-core`: reusable crawl, scoring, checker, CLI, provider, and remediation logic.
- `apps/web`: Next.js 15 hosted app with teams, projects, scans, shareable reports, and AI remediation drafts.

## Features

- Live URL crawling for root pages, `robots.txt`, `llms.txt`, `AGENTS.md`, `skill.md`, `agent-permissions.json`, and `sitemap.xml`
- Historical scan storage with Drizzle + Postgres
- Auth.js workspace auth with email magic-link configuration and a local demo fallback
- Inngest-backed scan and remediation jobs
- AI provider abstraction for `openai`, `anthropic`, `openai-compatible`, and `azure-openai`
- Draft generation for:
  - `llms.txt`
  - `skill.md`
  - `AGENTS.md`
  - `robots.txt`
  - Copy-for-AI snippets
  - Page rewrite briefs

## Quick Start

```bash
npm install
cp .env.example .env
```

Fill in at least:

- `DATABASE_URL`
- `AUTH_SECRET`
- SMTP settings if you want email magic links
- `AEO_PROVIDER_TYPE` and `AEO_PROVIDER_API_KEY` if you want AI remediation

Azure OpenAI configuration:

- `AEO_PROVIDER_TYPE=azure-openai`
- `AEO_PROVIDER_API_KEY=...`
- `AEO_PROVIDER_ENDPOINT=https://your-resource.openai.azure.com`
- `AEO_PROVIDER_API_VERSION=2024-10-01-preview` or your deployed Azure API version
- `AEO_ANALYSIS_MODEL` and `AEO_REMEDIATION_MODEL` should be your Azure deployment names
- `AEO_PROVIDER_DEPLOYMENT` is optional if you want one default Azure deployment at the client level

Run the hosted app:

```bash
npm run dev:web
```

Useful scripts:

```bash
npm run build
npm run test
npm run lint
npm run typecheck
npm run db:generate
```

## API Routes

- `POST /api/projects`
- `POST /api/scans`
- `GET /api/scans/:id`
- `GET /api/scans/:id/pages`
- `GET /api/scans/:id/findings`
- `POST /api/scans/:id/remediate`
- `GET /api/scans/:id/export`

## Notes

- The numeric AEO score remains deterministic and checker-driven.
- AI is used only for summaries, prioritization, and draft remediation content.
- The web workspace currently scaffolds web tests lightly; the existing core suite remains the strongest automated coverage.
