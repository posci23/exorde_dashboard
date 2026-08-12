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
`/api/sentinel/*` attach it, so the client only ever talks to this app.

You can also paste a key on the Settings page; it is stored in an httpOnly
cookie for that browser and takes precedence over the environment variable.

## Pages

| Page | What it does |
| --- | --- |
| **Overview** | Service health, shared queue capacity, and your plan usage against quota. |
| **Query** | One form. Preview is free and instant; export runs the same filters in full. |
| **Jobs** | Track a running export through its phases, then download. Links expire after 48h; Sync mints a fresh one. |
| **Reference** | Every filter, output column, classification label, and limit, searchable. |
| **Settings** | API key configuration. |

## Language

The interface ships in English and Spanish. The toggle sits in the sidebar
header; the choice persists per browser and seeds from the browser's own
language on a first visit.

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
