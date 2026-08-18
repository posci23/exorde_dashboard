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
| **Analyze** | Read an export's sentiment: positive / neutral / negative, trend, breakdowns, emotions, keywords. Drop a file (parsed in your browser, any size), or have the server ingest an export job or URL directly. |
| **Reference** | Every filter, output column, classification label, and limit, searchable. |
| **Settings** | API key configuration. |

## Language

The interface ships in English and Spanish. The toggle sits in the sidebar
header; the choice persists per browser and seeds from the browser's own
language on a first visit.

## Analysis

The **Analyze** page takes three kinds of source:

- **A dropped file** — read locally in a Web Worker, streamed in 4 MB slices, so
  a multi-gigabyte export works on an ordinary laptop and nothing is uploaded.
- **An export job id** — the server asks the index for the download link and
  reads it in place. No download step.
- **A URL** — any https link to an export file, streamed and never stored.

All three run the same pipeline, so the numbers match. It reports every row it
drops and why, detects the column layout (with per-role overrides), and keeps
the sentiment bands adjustable without re-reading the source. The whole
dashboard exports as one summary CSV.

It reads the export as the API emits it — CSV with its BOM and JSON-string
arrays, or JSONL with those fields structured — and maps `analysis_sentiment`,
`created_at`, `raw_content`, `domain`, `language`,
`analysis_classification_label`, `analysis_top_keywords` and the 27
`analysis_emotion_*` columns to the charts. See the Analyze section of
`GUIDE.md` for the full table.

### Scoring

By default the sentiment column already in the data is used. Rows without one
can be scored through an API instead — no vendor is hard-coded, so pointing it
at yours is a matter of environment variables (endpoint, auth, request shape,
where the score sits, what scale it is on). See `.env.example` and the Analyze
section of `GUIDE.md`. The key stays on the server: a dropped file is scored
through this app's own route, and calls are capped by a row ceiling so a large
file cannot quietly run up a bill.

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
