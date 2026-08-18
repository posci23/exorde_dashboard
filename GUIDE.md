# Sentinel — Guide

## What this is

An **operator console** for the [signal index API](the provider documentation). It lets you query billions of social media posts with precision filters, preview results for free, run async exports to S3, monitor jobs, and download files — without writing curl/Python by hand.

**Repo:** [github.com/posci23/_dashboard](https://github.com/posci23/_dashboard)  
**Upstream API base:** `https://the upstream index`  
**Stack:** Next.js (App Router) · TypeScript · Tailwind · Zod · Recharts

This app covers **only the Data Export API** (not FullStream, Intel, Insights, or Custom Feed).

---

## What it does (end-to-end)

the signal index’s Data Export API uses a two-phase model. This dashboard walks you through all of it:

1. **Preview** (free, sync) — count + ~100 sample rows, no quota used  
2. **Refine** — adjust keywords, dates, domains, languages, etc.  
3. **Export** (async, consumes quota) — create a job, data streams to S3 in ~100MB chunks  
4. **Poll** — watch `pending → validated → running → completed` (or `failed` / `rejected`)  
5. **Download** — open the presigned S3 URL (valid 48 hours, no auth)  
6. **History / Sync** — list past jobs and re-fetch download URLs

Steps 1–3 all happen on **Query**; steps 4–6 on **Jobs**. Step 7 is optional:
drop the downloaded file on **Analyze** to chart its sentiment, entirely in the
browser.

Data sources under the hood: `.posts` ∪ `.back_posts` (ClickHouse), quotas/jobs in PostgreSQL, files on Scaleway S3.

---

## Architecture

```
Browser UI  →  Next.js /api/sentinel/* proxy  →  the upstream index
                     ↑
              X-API-Key from .env.local
              or httpOnly cookie (Settings)
```

- The browser **never** calls the signal index directly (avoids CORS; keeps the key off client network traces to the signal index).
- Query form state and tracked jobs are saved in **localStorage**.
- API key options:
  - `SENTINEL_API_KEY` in `.env.local` (recommended)
  - Paste in **Settings** → stored as httpOnly cookie for 30 days

---

## Quick start

```bash
npm install
cp .env.example .env.local
# set SENTINEL_API_KEY=exo_...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

---

## App pages (UI functions)

### 1. Overview (`/`)

System status, your quota, and the workflow entry point.

| Function | Description |
|----------|-------------|
| Health check | Calls `GET /health` — status, version, ClickHouse / Postgres / S3 connectivity |
| Your plan | Calls `GET /api/v1/user/quota` — plan tier, status, exports and rows used today/month against your real caps, next reset |
| Queue capacity | Calls `GET /api/v1/queue/capacity` — current jobs, max capacity (8), utilization %, `accepting_new_jobs` |
| Refresh | Re-fetch all three; each failure is reported separately |
| Workflow links | Build & preview → Export → Monitor → Download |

### 2. Query (`/query`)

**One** page builds the query; preview and export are two actions on the same filters.

| Function | Description |
|----------|-------------|
| Sticky toolbar | Example-query dropdown, time-range dropdown, live validity pill, **Run preview** + **Start export** |
| Validation | `queryBodySchema` runs on every keystroke; both buttons disable and the pill lists the issues |
| Run preview | `POST /api/v1/preview` — count, query time, estimated MB, 100 samples. Free, no quota |
| Preview results | Rendered *above* the builder: stat tiles, sentiment/domain/language/keyword charts, sample table with expandable JSON, and the API's echoed `filters_applied` |
| Start export | `POST /api/v1/export` after a queue pre-check; handles 409 / 429 / 503, then hands off to `/jobs?job=…` |
| Collapsible sections | Keywords · Time range · Sources · People & IDs · Advanced · Output · Request payload. Each header summarizes what's set inside and offers **Clear** |
| Payload + curl | Toggle between the preview body and the export body; copy either as curl |

### 3. Jobs (`/jobs`)

Monitor, download, and browse history in one place.

| Function | Description |
|----------|-------------|
| Monitor | Auto-polls `GET /api/v1/export/{job_id}` every ~10s, easing toward 30s until terminal |
| Track by ID | Paste any `job_id`, or arrive via `/jobs?job=…` from an export submit |
| Phase checklist | The 7 processing phases (Validation → Complete), lit by status |
| Download | When `completed`, open `download_url` (48h expiry shown) |
| Sync | `POST /api/v1/sync/export-job` — refresh status and mint a fresh download URL for a job you own |
| This browser | Jobs started or tracked from this browser (localStorage) |
| Server history | `GET /api/v1/user/exports?limit=` (10 / 20 / 50 / 100) |

### 4. Analyze (`/analyze`)

Read an export and chart its sentiment. Three ways in, picked at the top of the
page:

| Source | Who reads it | Notes |
|--------|--------------|-------|
| **Drop a file** | This browser, in a Web Worker | CSV, TSV, JSON, JSONL, XLSX, gzipped or not. Nothing is uploaded, so size is bounded by disk rather than by an upload limit |
| **From an export** | The server | A completed export job id. The server asks the index for the download link and streams it in place — you download nothing |
| **From a URL** | The server | Any https link to an export file. Streamed, never stored |

The two server paths answer in NDJSON so progress arrives while the pass is
still running; the dashboard that renders is identical either way, because both
run the same pipeline.

| Function | Description |
|----------|-------------|
| Streaming parse | 4 MB slices → decompress → decode → parse; a 1 GB CSV reads in ~30s at flat memory |
| Cleaning | Drops rows with no score, malformed rows, and duplicate ids; every discard is counted in the report |
| Column detection | `analysis_sentiment`, `created_at`, `raw_content` … matched by alias, and overridable per role |
| Headline | Positive / neutral / negative split, net sentiment, mean score |
| Charts | Trend over time (hour/day/week, count or share), score distribution, breakdown by domain / language / topic / author, emotion profile, keywords, sample posts |
| Advanced — bands | Where neutral starts and ends; re-cuts instantly from the same pass |
| Advanced — cleaning | Dedupe, minimum topic confidence, date range, language and domain filters, sentiment scale (-1…1, 0…1, or words), column mapping — these re-read the source |
| Advanced — scoring | Use the sentiment column in the data, or score the text column through a configured API, with a row ceiling |
| Summary CSV | The whole dashboard as one CSV: headline, trend, every breakdown, keyword table |

#### What it reads from an export

The roles below are detected from the header row, matched against this
product's own field names first and common aliases second, and every one of
them is overridable per column under **Advanced options → Column mapping**.

| Role | Export column | Used for |
|------|---------------|----------|
| Sentiment | `analysis_sentiment` (-1…1) | Every band, the trend, the distribution |
| Timestamp | `created_at`, else `collected_at` | Trend buckets, sample post times |
| Text | `raw_content`, else `translated_content` / `title` | Sample posts, and the text sent to a scoring API |
| Domain | `domain` | Breakdown by platform |
| Language | `language` | Breakdown by language, language filter |
| Topic | `analysis_classification_label` | Breakdown by topic |
| Topic score | `analysis_classification_score` | Minimum-confidence filter |
| Author | `username` (not the `author` hash) | Breakdown by author |
| Keywords | `analysis_top_keywords` | Keyword table |
| Row id | `external_id`, else `url` | Duplicate removal |
| Emotions | the 27 `analysis_emotion_*` columns | Emotion profile |

`summary` is deliberately never used as the text column: in these exports it
holds platform metadata as JSON, not prose, so it must not reach a scoring API.
`analysis_embedding` and `analysis_language_score` are ignored — the first is a
384-number vector, the second is deprecated.

Both export formats are handled as the API emits them: **CSV** with its UTF-8
BOM, RFC 4180 quoting, and arrays serialised as JSON strings inside cells; and
**JSONL**, where those same fields stay structured JSON. Timestamps in the
`YYYY-MM-DD HH:MM:SS.mmm` form are read as UTC, matching the index, and every
chart buckets in UTC for the same reason. A gzipped file is detected by its
magic bytes rather than its name.

An export made with the default **"Just the posts"** field preset has no
analysis columns at all. That is not an error state: the page says which column
it could not find, and the text can be scored through an API instead.

#### Scoring through an API

Exports carry `analysis_sentiment`, so the default is simply to read it. When
the data has no score — a file from somewhere else, or an export without the
analysis columns — the text column can be sent to a scoring API instead.

No vendor is hard-coded. A provider is described entirely by environment
variables (see `.env.example`): the endpoint, how to authenticate, the request
body's shape, where the score sits in the response, and what scale it is on.

```
SENTIMENT_API_URL=https://vendor.example/v1/sentiment
SENTIMENT_API_KEY=…
SENTIMENT_API_INPUT_FIELD=texts          # body: { "texts": ["…", "…"] }
SENTIMENT_API_SCORE_PATH=results[].score # dotted path; [] steps into an array
SENTIMENT_API_SCALE=unit                 # signed | unit | label | label_score
```

`label_score` covers the common `[{ "label": "POSITIVE", "score": 0.98 }]`
shape: the word gives the sign, the confidence gives the magnitude. If a
response is stranger than the paths can express, `buildProvider` in
`src/lib/analysis/providers.ts` is the single function to fork.

Two properties hold regardless of vendor:

- **The key never reaches the browser.** A dropped file is scored through this
  app's own `/api/analysis/score` route, which holds the credentials. The file
  still stays local — only the text being scored is sent, which is what scoring
  is.
- **Calls are capped.** Scoring is billed per request, so a row ceiling
  (5,000 by default) stops the pass from spending the whole file, and the
  cleaning report says how many rows went unscored.

If every batch fails, the analysis fails with the provider's own message rather
than rendering an empty dashboard.

**How it stays flat in memory.** The parser never keeps rows. It keeps a
201-bucket sentiment histogram per dimension (whole file, per hour, per domain,
per language, per topic, per author, per keyword) plus a 400-row reservoir
sample and the 25 strongest rows at each end. Band thresholds are applied to
those bins afterwards, which is why moving them is instant while a cleaning rule
needs a second pass.

### 5. Reference (`/reference`)

The in-app manual — everything the API accepts, in one searchable page with five tabs.

| Tab | Contents |
|-----|----------|
| How it works | The two-phase model end to end, the 7 export phases, output formats, and every built-in example query |
| Filters | All 22 request fields with API name, type, limit, description, and a JSON example · the 28 listed platforms · URL-pattern examples · all 182 language codes |
| Search syntax | Phrases, wildcards, operators, special characters, and fast vs safe mode |
| Output fields | All 52 output columns grouped by category |
| Limits & errors | Request caps, plan history and rate limits, concurrency, idempotency, and every HTTP status with remediation |

A free-text search filters all tabs at once, and each Query section's **?** button deep-links here.

The old `/fields` and `/limits` pages redirect here; 44 of the 52 columns are exported by default,
and `analysis_source_type`, `collection_module`, and `collection_client_version` are always excluded.

### 6. Settings (`/settings`)

| Function | Description |
|----------|-------------|
| Show connection | Base URL, whether env key / cookie key is set |
| Save API key | Store `exo_…` in httpOnly cookie (30 days) |
| Clear cookie key | Remove browser cookie (env key still applies if set) |
| `.env.local` instructions | Recommended permanent setup |

---

## Query builder — all filters

One builder on `/query`, used by both preview and export. Client-side validation mirrors API limits
(Zod). Filters are grouped into collapsible sections whose headers summarize what's set inside, so
nothing is hidden even when collapsed.

| Section | Covers |
|---------|--------|
| **Keywords** | Keyword groups, group operator, search mode |
| **Time range** | Post dates, collection dates, span warnings |
| **Sources** | Platforms, languages, locations |
| **People & IDs** | Usernames, post IDs, parent IDs, URL patterns (the selective filters) |
| **Advanced** | Exclusion groups, proximity, profile filters |
| **Output** | Format, row caps, field exclusion |
| **Request payload** | Live JSON + curl, toggleable between preview and export bodies |

Every fixed option set is a picker rather than free text: platforms, languages, and excludable
fields use a searchable multi-select with chips (`ChipMultiSelect`); enums like `AND`/`OR`,
`jsonl`/`csv`, and boolean profile fields use segmented buttons; dates use pickers with relative
presets; row caps use preset dropdowns with a custom numeric fallback.

### Keyword search

| Control | API field | Notes |
|---------|-----------|-------|
| Keyword groups (1–5) | `keyword_groups` | Each group: up to 20 terms, `OR` or `AND` within group |
| Group operator | `group_operator` | `AND` (default) or `OR` between groups |
| Exact phrases | term wrapped in `"..."` | Ordered whole-word phrase match |
| Wildcards | term ending in `*` | Prefix / substring match |
| Safe mode | `full_string_scan` | `true` = partial words / short codes (slower) |

**Keywords optional** when using selective filters: `external_ids`, `external_parent_ids`, `usernames`, or `url_patterns`.  
**Keywords required** when using `proximity_groups`.

### Date & scope

| Control | API field | Notes |
|---------|-----------|-------|
| Posted after / before | `start_date`, `end_date` | Max **30 days** normally; **90 days** with `per_day_limit`. Relative presets (24h / 7d / 30d / 90d) plus pickers; live span readout warns past the cap |
| Collection window | `collected_at_start_date`, `collected_at_end_date` | Optional — narrows to when the signal index ingested the post. Requires both post dates |
| Domains | `domains` | Max 50, exact match, OR |
| Languages | `languages` | Max 10 ISO codes (176+ supported) |
| Usernames | `usernames` | Max 50 |
| Case-sensitive usernames | `case_sensitive_usernames` | Default false |
| Locations | `locations` | Max 20, case-insensitive substring, OR |

### Selective filters (no keywords needed)

| Control | API field | Notes |
|---------|-----------|-------|
| External IDs | `external_ids` | Max 50 — re-fetch specific posts |
| Parent IDs | `external_parent_ids` | Max 50 — replies / threads |
| URL patterns | `url_patterns` | Max 20 — e.g. `reddit.com/r/france` |

### Exclusions & advanced

| Control | API field | Notes |
|---------|-----------|-------|
| Exclusion groups (max 3) | `exclude_keyword_groups` | Applied after inclusion |
| Proximity (max 3) | `proximity_groups` | `term_a`, `term_b`, distance 1–10 words; requires keywords |
| Profile filters | `profile_filters` | **x.com only** — max 5 fields × 10 values |

**Profile fields:** `user_description`, `profile_image_url` (substring); `user_followers_count`, `user_following_count`, `user_created_at`, `user_verified`, `user_blue_verified` (exact).

### Field exclusion

| Mode | Behavior |
|------|----------|
| Default | Embeddings excluded (API default) |
| Include all | Sends `exclude_fields: []` |
| Custom | Comma/newline list of fields to exclude |

### Export-only options (not sent on preview)

| Control | API field | Notes |
|---------|-----------|-------|
| Format | `output_format` | `jsonl` (default) or `csv` |
| Total row cap | `result_limit` | 1 – 200,000,000 |
| Per-day sampling | `per_day_limit` | 1 – 100,000; requires both dates; allows 90-day span |

### Built-in presets

| Preset | What it loads |
|--------|----------------|
| Simple OR (crypto) | Single OR keyword group |
| Multi-topic AND | Two OR groups, AND between them |
| Exact phrase | Quoted multi-word terms |
| Wildcard prefix | `regulat*`, `legislat*` |
| OR between groups | `group_operator: OR` |
| URL patterns only | No keywords |
| Proximity + verified x.com | Near terms + `user_verified` + `x.com` |
| With exclusions | Domains/languages + exclude groups |
| Safe mode | Short codes + `full_string_scan` |
| Per-day sampling export | `per_day_limit` + CSV |

---

## Analysis API routes

| Route | Method | What it does |
|-------|--------|--------------|
| `/api/analysis/ingest` | POST | Streams an analysis as NDJSON: `{type:"opened"}`, then `{type:"progress"}` lines, then `{type:"done", aggregate}` (or `{type:"error"}`). Body: `{ source: {kind:"job",jobId} \| {kind:"url",url}, options, scoring }` |
| `/api/analysis/score` | POST | `{ texts: string[], provider? }` → `{ scores: (number\|null)[] }`. The browser's route to the scoring API, so the key stays server-side |
| `/api/analysis/providers` | GET | Which scoring options this deployment has, and whether they are configured. Names only — never the endpoint or key |

The aggregate crosses the wire as sparse histograms (`[bin, count, …]`) rather
than typed arrays, which JSON cannot carry, and the server folds time buckets
and trims group tables first — see `src/lib/analysis/wire.ts`.

**Fetching a URL a user typed is an SSRF risk**, so `src/lib/analysis/ingest.ts`
checks every hop: http(s) only, an optional host allowlist
(`ANALYZE_URL_ALLOWED_HOSTS`), and DNS resolution refused when it lands on a
private, loopback, link-local or carrier-NAT address. Redirects are followed by
hand, re-checked each time, three at most. Self-hosted deployments whose storage
sits on the same private network can set `ANALYZE_URL_ALLOW_PRIVATE=true`.

Long ingests are bounded by the platform's function timeout (`maxDuration` is
set to 300s; a Hobby-tier Vercel deployment caps lower). A file too big for that
window is what the in-browser path is for.

---

## Proxy API routes (this app)

All under `/api/sentinel/*`. They attach `X-API-Key` and forward to the signal index.

| Dashboard route | Method | the signal index endpoint | Auth |
|-----------------|--------|-----------------|------|
| `/api/sentinel/health` | GET | `/health` | No |
| `/api/sentinel/queue-capacity` | GET | `/api/v1/queue/capacity` | Yes |
| `/api/sentinel/preview` | POST | `/api/v1/preview` | Yes |
| `/api/sentinel/export` | POST | `/api/v1/export` | Yes |
| `/api/sentinel/export/[jobId]` | GET | `/api/v1/export/{job_id}` | Yes |
| `/api/sentinel/exports` | GET | `/api/v1/user/exports` | Yes |
| `/api/sentinel/user-info` | GET | `/api/v1/user/info` | Yes |
| `/api/sentinel/user-quota` | GET | `/api/v1/user/quota` | Yes |
| `/api/sentinel/sync` | POST | `/api/v1/sync/export-job` | Yes |
| `/api/sentinel/settings` | GET/POST | (local only) | Cookie / env status |

Envelope shape: `{ ok, data }` on success; `{ ok: false, status, error, retry_after_seconds? }` on failure.

---

## Server library functions

### `src/lib/-client.ts`

| Function | Purpose |
|----------|---------|
| `Fetch(path, options)` | Low-level fetch to the signal index with key + JSON parsing + `the signal indexApiError` |
| `getHealth()` | System health |
| `getQueueCapacity(apiKey?)` | Queue saturation |
| `previewQuery(body, apiKey?)` | Free preview |
| `createExport(body, apiKey?)` | Start export job |
| `getExportJob(jobId, apiKey?)` | Poll job status |
| `syncExportJob(jobId, apiKey?)` | Dashboard sync for owned job |
| `listUserExports(limit, apiKey?)` | Export history |
| `getUserInfo(apiKey?)` | Identity + configured caps |
| `getUserQuota(apiKey?)` | Caps plus live usage counters |

### `src/lib/api-helpers.ts`

| Function | Purpose |
|----------|---------|
| `getRequestApiKey(request)` | Header override, else httpOnly cookie |
| `jsonOk(data)` / `jsonError(error)` | Standard proxy responses |

### `src/lib/query-form.ts`

| Function | Purpose |
|----------|---------|
| `createEmptyQueryForm()` | Default form (last 24h UTC + sample keywords) |
| `buildQueryBody(form, mode)` | Form → API JSON (`preview` strips export-only; `export` includes them) |
| `buildCurl(body, endpoint)` | Generate curl example |
| `QUERY_PRESETS` | Preset loaders, grouped by category |
| `formatApiDate` / `apiDateToInput` / `inputDateToApi` | Convert between the API's `YYYY-MM-DD HH:MM:SS` UTC strings and the datetime picker |
| `parseApiDate(value)` | Parse an API date as UTC (bare dates included) |
| `getSpanDays(start, end)` | Day span, for the range warning |
| `relativeDateRange(days)` / `matchDatePreset(form)` | Apply and detect the relative range presets |
| `summarize*(form)` | Per-section count + plain-English summary for the collapsed headers |

### `src/lib/export-actions.ts`

| Function | Purpose |
|----------|---------|
| `validateQuery(body)` | Zod parse shared by preview and export |
| `describeIssues(result)` | Issue messages for the toolbar validity pill |
| `submitExport(body)` | Queue pre-check + submit, returning `created` / `duplicate` (409) / `error` (429, 503, …) |

### `src/lib/browser-api.ts`

| Function | Purpose |
|----------|---------|
| `apiFetch(path, init)` | Browser → local proxy |
| `formatError(error)` | Human-readable the signal index error / 409 / 429 detail |
| `getDuplicateJobId(error)` | Extract `existing_job_id` from 409 |

### `src/lib/types.ts`

Zod `queryBodySchema` + TypeScript types for all request/response shapes, plus `the signal indexApiError`.

---

## Export job lifecycle

```
pending → running → completed
                 ↘ failed
                 ↘ rejected
```

**Seven processing phases (docs):** Validation → Client Init → COUNT Query → Quota Check → S3 Init → Streaming → Complete.

**Constraints:** max 200M rows · timeout 7200s · date range 30d (90d with `per_day_limit`) · downloads expire in 48h.

---

## Error handling the UI understands

| Code | Meaning | Dashboard behavior |
|------|---------|-------------------|
| 400 / 422 | Validation | Show detail message |
| 401 | Bad/missing key | Prompt Settings / `.env.local` |
| 403 | Forbidden / history too old | Surface message |
| 404 | Job not found | Surface message |
| 409 | Duplicate export (5 min) | Switch to existing job and poll |
| 429 | Rate limit / quota | Show retry-after / reason |
| 503 | Queue full | Warn + capacity guidance |
| 500 | Server error | Surface message |

---

## Output formats

| Format | Use when |
|--------|----------|
| **JSONL** (default) | Programmatic / streaming / large sets; nested fields stay JSON |
| **CSV** | Excel / Sheets / BI; UTF-8 BOM; arrays serialized as JSON strings in cells |

---

## Security notes

- Do **not** commit `.env.local` (gitignored).
- Prefer env key over cookie for long-term use.
- Presigned download URLs are public for 48 hours — treat them as sensitive links.
- Only your own jobs can be synced (`POST /api/v1/sync/export-job`).

---

## Typical operator workflow

1. Open **Settings** (or set `SENTINEL_API_KEY`) and confirm “Ready to call API”.  
2. **Overview** → health is `healthy`, queue is accepting jobs, and you have quota left.  
3. **Query** → pick an example query or build filters. The toolbar pill must read **✓ Query valid**.  
4. **Run preview** (free) → check the count, estimated size, and sample quality above the builder.  
5. Refine, then open **Output** to set `jsonl`/`csv` and any row caps.  
6. **Start export** → you land on **Jobs** already polling the new job.  
7. Wait for **completed** → **Download file**.  
8. Later: **Jobs → Server history → Sync** to mint a fresh URL (within 48h of completion).

---

## Official docs

Full API reference: [the provider/developer-docs/data-export](the provider documentation)
