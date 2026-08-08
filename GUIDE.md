# Exorde Data Export Dashboard — Guide

## What this is

An **operator console** for the [Exorde Data Export API](https://exordelabs.com/developer-docs/data-export). It lets you query billions of social media posts with precision filters, preview results for free, run async exports to S3, monitor jobs, and download files — without writing curl/Python by hand.

**Repo:** [github.com/posci23/exorde_dashboard](https://github.com/posci23/exorde_dashboard)  
**Upstream API base:** `https://export-api.exorde.io`  
**Stack:** Next.js (App Router) · TypeScript · Tailwind · Zod · Recharts

This app covers **only the Data Export API** (not FullStream, Intel, Insights, or Custom Feed).

---

## What it does (end-to-end)

Exorde’s Data Export API uses a two-phase model. This dashboard walks you through all of it:

1. **Preview** (free, sync) — count + ~100 sample rows, no quota used  
2. **Refine** — adjust keywords, dates, domains, languages, etc.  
3. **Export** (async, consumes quota) — create a job, data streams to S3 in ~100MB chunks  
4. **Poll** — watch `pending → running → completed` (or `failed` / `rejected`)  
5. **Download** — open the presigned S3 URL (valid 48 hours, no auth)  
6. **History / Sync** — list past jobs and re-fetch download URLs

Data sources under the hood: `exorde.posts` ∪ `exorde.back_posts` (ClickHouse), quotas/jobs in PostgreSQL, files on Scaleway S3.

---

## Architecture

```
Browser UI  →  Next.js /api/exorde/* proxy  →  export-api.exorde.io
                     ↑
              X-API-Key from .env.local
              or httpOnly cookie (Settings)
```

- The browser **never** calls Exorde directly (avoids CORS; keeps the key off client network traces to Exorde).
- Query form state and tracked jobs are saved in **localStorage**.
- API key options:
  - `EXORDE_API_KEY` in `.env.local` (recommended)
  - Paste in **Settings** → stored as httpOnly cookie for 30 days

---

## Quick start

```bash
npm install
cp .env.example .env.local
# set EXORDE_API_KEY=exo_...
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

System status and workflow entry point.

| Function | Description |
|----------|-------------|
| Health check | Calls `GET /health` — status, version, ClickHouse / Postgres / S3 connectivity |
| Queue capacity | Calls `GET /api/v1/queue/capacity` — current jobs, max capacity (8), utilization %, `accepting_new_jobs` |
| Refresh | Re-fetch health + queue |
| Workflow links | Jump to Preview → Export → History |
| Limits at a glance | Date range, row caps, concurrency, table names |

### 2. Query / Preview (`/preview`)

Build any documented filter set and run a **free** preview.

| Function | Description |
|----------|-------------|
| Full query builder | All filters (see [Query builder](#query-builder--all-filters)) |
| Run preview | `POST /api/v1/preview` — count, query time, estimated MB, 100 samples |
| Sample analytics | Sentiment bars, domain pie, language bars, top keywords (from sample only) |
| Filters applied | Echo of what the API interpreted |
| Sample table | Rows with expandable raw JSON |
| Continue to export | Same filters carry over to Export |
| Presets | One-click doc patterns (crypto OR, multi-topic AND, phrases, wildcards, URL-only, proximity+profile, etc.) |
| Payload + curl | Live JSON body and copy-as-curl |

### 3. Export Jobs (`/export`)

Submit async exports and monitor them.

| Function | Description |
|----------|-------------|
| Start export | `POST /api/v1/export` with export-only options (`output_format`, `result_limit`, `per_day_limit`) |
| Pre-check queue | Reads capacity; warns if not accepting jobs |
| Handle **409** | Duplicate within 5 min → poll `existing_job_id` instead of resubmitting |
| Handle **429** | Show rate-limit / `Retry-After` |
| Handle **503** | Queue saturated — backoff guidance |
| Auto-poll | `GET /api/v1/export/{job_id}` every ~10s, backoff toward 30s |
| Track by ID | Paste any `job_id` to monitor |
| Download | When `completed`, open `download_url` (48h expiry shown) |
| Phase checklist | UI for the 7 processing phases (Validation → Complete) |
| Session job list | Jobs tracked this browser session (localStorage) |
| Same query builder | Shared filters with Preview |

### 4. History (`/history`)

| Function | Description |
|----------|-------------|
| List exports | `GET /api/v1/user/exports?limit=` (10 / 20 / 50 / 100) |
| Refresh | Reload history |
| Sync | `POST /api/v1/sync/export-job` — refresh status + download URL for a job you own |
| Open | Hand off `job_id` to Export Jobs monitor |

### 5. Field Reference (`/fields`)

| Function | Description |
|----------|-------------|
| Search fields | Filter the catalog by name/description |
| Browse categories | Post metadata, author, source, analysis core, 27 emotions, always-excluded |

**47 fields total** — 44 exported by default. Embeddings excluded unless `exclude_fields: []`. Always excluded: `analysis_source_type`, `collection_module`, `collection_client_version`.

### 6. Limits & Errors (`/limits`)

In-app reference for:

- Request caps (groups, terms, domains, languages, IDs, proximity, locations, URL patterns, profile filters, result/per-day limits)
- Plan history gates (Free 90d / Pro 365d / Enterprise unlimited)
- Rate limits (burst + sustained by plan; weight = `ceil(span_days / 7)`)
- Idempotency (5-minute duplicate window → 409)
- Concurrency (global 8 / per-customer 4 running / 50 in-flight)
- HTTP codes 200–503 with remediation tips
- Search modes (fast vs safe, `*`, `"phrases"`)
- Common language codes

### 7. Settings (`/settings`)

| Function | Description |
|----------|-------------|
| Show connection | Base URL, whether env key / cookie key is set |
| Save API key | Store `exo_…` in httpOnly cookie (30 days) |
| Clear cookie key | Remove browser cookie (env key still applies if set) |
| `.env.local` instructions | Recommended permanent setup |

---

## Query builder — all filters

Shared by Preview and Export. Client-side validation mirrors API limits (Zod).

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
| Start / end | `start_date`, `end_date` | Max **30 days** normally; **90 days** with `per_day_limit` |
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

All under `/api/exorde/*`. They attach `X-API-Key` and forward to Exorde.

| Dashboard route | Method | Exorde endpoint | Auth |
|-----------------|--------|-----------------|------|
| `/api/exorde/health` | GET | `/health` | No |
| `/api/exorde/queue-capacity` | GET | `/api/v1/queue/capacity` | Yes |
| `/api/exorde/preview` | POST | `/api/v1/preview` | Yes |
| `/api/exorde/export` | POST | `/api/v1/export` | Yes |
| `/api/exorde/export/[jobId]` | GET | `/api/v1/export/{job_id}` | Yes |
| `/api/exorde/exports` | GET | `/api/v1/user/exports` | Yes |
| `/api/exorde/sync` | POST | `/api/v1/sync/export-job` | Yes |
| `/api/exorde/settings` | GET/POST | (local only) | Cookie / env status |

Envelope shape: `{ ok, data }` on success; `{ ok: false, status, error, retry_after_seconds? }` on failure.

---

## Server library functions

### `src/lib/exorde-client.ts`

| Function | Purpose |
|----------|---------|
| `exordeFetch(path, options)` | Low-level fetch to Exorde with key + JSON parsing + `ExordeApiError` |
| `getHealth()` | System health |
| `getQueueCapacity(apiKey?)` | Queue saturation |
| `previewQuery(body, apiKey?)` | Free preview |
| `createExport(body, apiKey?)` | Start export job |
| `getExportJob(jobId, apiKey?)` | Poll job status |
| `syncExportJob(jobId, apiKey?)` | Dashboard sync for owned job |
| `listUserExports(limit, apiKey?)` | Export history |

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
| `QUERY_PRESETS` | Preset loaders |

### `src/lib/browser-api.ts`

| Function | Purpose |
|----------|---------|
| `apiFetch(path, init)` | Browser → local proxy |
| `formatError(error)` | Human-readable Exorde error / 409 / 429 detail |
| `getDuplicateJobId(error)` | Extract `existing_job_id` from 409 |

### `src/lib/types.ts`

Zod `queryBodySchema` + TypeScript types for all request/response shapes, plus `ExordeApiError`.

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

1. Open **Settings** (or set `.env.local`) and confirm “Ready to call API”.  
2. **Overview** → confirm health is `healthy` and queue is accepting jobs.  
3. **Query / Preview** → load a preset or build filters → **Run preview**.  
4. Inspect count, estimated size, and sample quality.  
5. **Export Jobs** → set `jsonl`/`csv`, optional limits → **Start export**.  
6. Wait for **completed** → **Download file**.  
7. Later: **History** → **Sync** if you need the URL again (within 48h of completion).

---

## Official docs

Full API reference: [exordelabs.com/developer-docs/data-export](https://exordelabs.com/developer-docs/data-export)
