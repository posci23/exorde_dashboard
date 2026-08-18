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
              X-API-Key from the server environment
```

- The browser **never** calls the signal index directly (avoids CORS; keeps the key off client network traces to the signal index).
- Query form state and tracked jobs are saved in **localStorage**.
- The API key is read from the server environment only — `SENTINEL_API_KEY` in
  `.env.local` locally, or a Vercel environment variable in a deployment. The
  browser cannot supply one, and no route accepts a key from the request.

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

Drop a file you already downloaded — CSV, TSV, JSON, JSONL or XLSX, gzipped or
not — and it is cleaned and charted as a sentiment dashboard. Nothing is
uploaded: the file is read in a Web Worker on this machine, so file size is
bounded by disk, not by memory or by an upload limit.

| Function | Description |
|----------|-------------|
| Streaming parse | 4 MB slices → decompress → decode → parse; a 1 GB CSV reads in ~30s at flat memory |
| Cleaning | Drops rows with no score, malformed rows, and duplicate ids; every discard is counted in the report |
| Column detection | `analysis_sentiment`, `created_at`, `raw_content` … matched by alias, and overridable per role |
| Headline | Positive / neutral / negative split, net sentiment, mean score |
| Charts | Trend over time (hour/day/week, count or share), score distribution, breakdown by domain / language / topic / author, emotion profile, keywords, sample posts |
| Advanced — bands | Where neutral starts and ends; re-cuts instantly from the same pass |
| Advanced — cleaning | Dedupe, minimum topic confidence, date range, language and domain filters, sentiment scale (-1…1, 0…1, or words), column mapping — these re-read the file |
| Summary CSV | The whole dashboard as one CSV: headline, trend, every breakdown, keyword table |

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
| Language | Interface language, persisted per browser |
| Default export format | JSONL or CSV, seeded into new exports |
| Clear local data | Drop the saved filter draft and tracked jobs from localStorage |
| Deployment | The environment variables the server reads, and the Vercel CLI commands that set them |

Credentials are not editable here. `SENTINEL_API_KEY` (required) and
`SENTINEL_API_BASE_URL` (optional) are server environment variables:

```bash
vercel env add SENTINEL_API_KEY production
vercel deploy --prod
```

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

Envelope shape: `{ ok, data }` on success; `{ ok: false, status, error, retry_after_seconds? }` on failure.

---

## Server library functions

### `src/lib/-client.ts`

| Function | Purpose |
|----------|---------|
| `Fetch(path, options)` | Low-level fetch to the signal index with key + JSON parsing + `the signal indexApiError` |
| `getHealth()` | System health |
| `getQueueCapacity()` | Queue saturation |
| `previewQuery(body)` | Free preview |
| `createExport(body)` | Start export job |
| `getExportJob(jobId)` | Poll job status |
| `syncExportJob(jobId)` | Dashboard sync for owned job |
| `listUserExports(limit)` | Export history |
| `getUserInfo()` | Identity + configured caps |
| `getUserQuota()` | Caps plus live usage counters |

None of these take a key: `getApiKey()` reads the environment, so a caller
cannot pass one in from a request.

### `src/lib/api-helpers.ts`

| Function | Purpose |
|----------|---------|
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
- The key lives only in the server environment; no route reads one from a
  request header or cookie, so a browser cannot inject or exfiltrate it.
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
