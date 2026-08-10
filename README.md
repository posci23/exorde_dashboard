# Exorde Data Export Dashboard

Operator console for the [Exorde Data Export API](https://exordelabs.com/developer-docs/data-export). Covers every documented endpoint, filter, and workflow.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set EXORDE_API_KEY=exo_...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You can also paste a key in **Settings** (stored as an httpOnly cookie). Env wins when both are present for server reads — cookie is used when the proxy reads request cookies and env is unset.

## What it covers

| Page | API |
|------|-----|
| Overview | `GET /health`, `GET /api/v1/queue/capacity`, `GET /api/v1/user/quota` |
| Query | `POST /api/v1/preview` and `POST /api/v1/export` from one filter builder, with 409/429/503 handling |
| Jobs | `GET /api/v1/export/{id}`, `GET /api/v1/user/exports`, `POST /api/v1/sync/export-job` |
| Fields | All 47 fields |
| Limits & errors | `GET /api/v1/user/info` plus documented caps, rate limits, idempotency, HTTP codes |

### Filters in the query builder

Keyword groups (AND/OR, phrases, wildcards), exclusions, domains, languages, usernames, locations,
external IDs / parent IDs, URL patterns, proximity, profile filters (x.com), search mode, post and
collection date ranges, field exclusion, plus export-only `output_format`, `result_limit`, and
`per_day_limit`.

Filters live in collapsible sections whose headers summarize what's set inside, and every fixed
option set is a picker rather than free text — multi-selects for platforms, languages, and fields;
segmented buttons for enums and booleans; date pickers with relative presets; preset dropdowns with
a custom fallback for row caps.

## Architecture

Browser → Next.js `/api/exorde/*` proxy → `https://export-api.exorde.io` with `X-API-Key`. The key never appears in browser calls to Exorde.
