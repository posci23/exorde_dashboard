# Sentinel — Hybrid Atlantic

Signal collection and export console. Build a query against the signal index,
preview it for free, then run it as a full export and download the file.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set SENTINEL_API_KEY=...
npm run dev
```

The API key never reaches the browser. Server-side routes under
`/api/sentinel/*` read it from the environment and attach it, so the client
only ever talks to this app. There is no way to supply a key from the
browser — that is the point.

## Deploy

The app is a stock Next.js project, so Vercel needs no configuration beyond
the key:

```bash
npm i -g vercel
vercel link
vercel env add SENTINEL_API_KEY production   # paste exo_… when prompted
vercel deploy --prod
```

`SENTINEL_API_BASE_URL` is optional and only needed to point at a non-production
index. Environment changes apply on the next deployment, so redeploy after
adding or rotating a key. To run the production build locally against the same
variables, use `vercel env pull .env.local`.

## Pages

| Page | What it does |
| --- | --- |
| **Overview** | Service health, shared queue capacity, and your plan usage against quota. |
| **Query** | One form. Preview is free and instant; export runs the same filters in full. |
| **Jobs** | Track a running export through its phases, then download. Links expire after 48h; Sync mints a fresh one. |
| **Analyze** | Drop a downloaded export (CSV, JSON, JSONL, XLSX, gzipped or not, any size) and read its sentiment: positive / neutral / negative, trend, breakdowns, emotions, keywords. Parsed in your browser — the file is never uploaded. |
| **Reference** | Every filter, output column, classification label, and limit, searchable. |
| **Settings** | Language, default export format, and local data. Credentials live in the deployment environment, not here. |

## Language

The interface ships in English and Spanish. The toggle sits in the sidebar
header; the choice persists per browser and seeds from the browser's own
language on a first visit.

## Analysis

The **Analyze** page reads the file locally in a Web Worker, streaming it in
4 MB slices, so a multi-gigabyte export works on an ordinary laptop. It reports
every row it drops and why, detects the column layout (with per-role
overrides), and keeps the sentiment bands adjustable without re-reading the
file. The whole dashboard can be exported as one summary CSV.

## Notes

- Preview never consumes quota. Only exports do.
- Date filters are UTC, and the maximum span is 30 days — 90 with a per-day
  row cap.
- The default field preset returns post content without the AI analysis
  columns. Everything else is one click away under "What goes in the file?".

## Scripts

```bash
npm run dev     # local development
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit  # typecheck
```
