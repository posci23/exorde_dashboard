import { LIMITS } from "./constants";

/**
 * Everything the API accepts, described once. The Reference page renders this,
 * and the builder's "?" buttons deep-link into it, so there is a single source
 * of truth for what your options are.
 */
export type FilterRef = {
  apiField: string;
  label: string;
  /** Matches a builder Section title, so help links land in the right place. */
  section: string;
  type: string;
  limit: string;
  description: string;
  example?: string;
};

export const FILTER_REFERENCE: FilterRef[] = [
  {
    apiField: "keyword_groups",
    label: "Keyword groups",
    section: "Keywords",
    type: "array of { terms, operator }",
    limit: `${LIMITS.maxKeywordGroups} groups × ${LIMITS.maxTermsPerGroup} terms`,
    description:
      "The main text filter. Each group holds terms joined by OR or AND; groups are then joined by group_operator. Optional if you supply a selective filter instead.",
    example: '{ "terms": ["bitcoin", "ethereum"], "operator": "OR" }',
  },
  {
    apiField: "group_operator",
    label: "Between groups",
    section: "Keywords",
    type: '"AND" | "OR"',
    limit: "default AND",
    description: "How separate keyword groups combine. AND narrows, OR widens.",
  },
  {
    apiField: "full_string_scan",
    label: "Search mode",
    section: "Keywords",
    type: "boolean",
    limit: "default false",
    description:
      "False uses the fast token/Bloom index and matches whole words. True falls back to a substring scan that finds partial words and short codes, at 5–10× the cost.",
  },
  {
    apiField: "start_date",
    label: "Posted after",
    section: "Time range",
    type: "string",
    limit: `span ≤ ${LIMITS.maxDateRangeDays}d (${LIMITS.maxPerDaySpanDays}d with per_day_limit)`,
    description: "Inclusive lower bound on when the post was published. UTC.",
    example: "2026-08-01 00:00:00",
  },
  {
    apiField: "end_date",
    label: "Posted before",
    section: "Time range",
    type: "string",
    limit: "see start_date",
    description: "Upper bound on publication time. UTC.",
    example: "2026-08-08 00:00:00",
  },
  {
    apiField: "collected_at_start_date",
    label: "Collected after",
    section: "Time range",
    type: "string",
    limit: "requires both post dates",
    description:
      "Inclusive lower bound on when Exorde ingested the post — useful for picking up backfilled data separately from when it was written.",
  },
  {
    apiField: "collected_at_end_date",
    label: "Collected before",
    section: "Time range",
    type: "string",
    limit: "requires both post dates",
    description: "Exclusive upper bound on ingestion time.",
  },
  {
    apiField: "domains",
    label: "Platforms",
    section: "Sources",
    type: "string[]",
    limit: `max ${LIMITS.maxDomains}`,
    description:
      "Exact match on the source domain, OR'd together. Leave empty for every platform. Exorde indexes 200+ sources, so anything not in the picker can be typed in.",
    example: '["x.com", "reddit.com"]',
  },
  {
    apiField: "languages",
    label: "Languages",
    section: "Sources",
    type: "string[]",
    limit: `max ${LIMITS.maxLanguages}`,
    description: "ISO 639-1/639-2 codes, OR'd. 176+ codes are accepted.",
    example: '["en", "fr"]',
  },
  {
    apiField: "locations",
    label: "Author location",
    section: "Sources",
    type: "string[]",
    limit: `max ${LIMITS.maxLocations}`,
    description:
      "Case-insensitive substring match on the user-declared location field, OR'd. Self-reported, so treat it as a hint rather than ground truth.",
    example: '["Paris", "New York"]',
  },
  {
    apiField: "usernames",
    label: "Authors",
    section: "People & IDs",
    type: "string[]",
    limit: `max ${LIMITS.maxUsernames}`,
    description: "Selective filter — supplying it means keywords are optional.",
    example: '["elonmusk"]',
  },
  {
    apiField: "case_sensitive_usernames",
    label: "Name matching",
    section: "People & IDs",
    type: "boolean",
    limit: "default false",
    description: "Whether username matching respects capitalization.",
  },
  {
    apiField: "external_ids",
    label: "Specific post IDs",
    section: "People & IDs",
    type: "string[]",
    limit: `max ${LIMITS.maxExternalIds}`,
    description: "Re-fetch exact posts by platform ID. Selective filter.",
    example: '["1234567890"]',
  },
  {
    apiField: "external_parent_ids",
    label: "Replies to post IDs",
    section: "People & IDs",
    type: "string[]",
    limit: `max ${LIMITS.maxExternalParentIds}`,
    description: "Pull the replies and thread beneath given posts. Selective filter.",
  },
  {
    apiField: "url_patterns",
    label: "URL contains",
    section: "People & IDs",
    type: "string[]",
    limit: `max ${LIMITS.maxUrlPatterns}`,
    description:
      "Case-insensitive substring of the post URL. The reliable way to target a subreddit, channel, or section. Selective filter.",
    example: '["reddit.com/r/france"]',
  },
  {
    apiField: "exclude_keyword_groups",
    label: "Exclude posts containing",
    section: "Advanced",
    type: "array of { terms, operator }",
    limit: `max ${LIMITS.maxExcludeKeywordGroups} groups`,
    description: "Applied after the inclusion filter. Good for stripping spam and off-topic senses of a word.",
  },
  {
    apiField: "proximity_groups",
    label: "Terms near each other",
    section: "Advanced",
    type: "array of { term_a, term_b, distance }",
    limit: `max ${LIMITS.maxProximityGroups} · distance ${LIMITS.proximityDistanceMin}–${LIMITS.proximityDistanceMax}`,
    description:
      "Requires the two terms within N words of one another. Needs keyword_groups as well, for index acceleration.",
    example: '{ "term_a": "trump", "term_b": "tariff", "distance": 5 }',
  },
  {
    apiField: "profile_filters",
    label: "Author profile",
    section: "Advanced",
    type: "object of string[]",
    limit: `max ${LIMITS.maxProfileFilterFields} fields × ${LIMITS.maxProfileFilterValues} values`,
    description:
      "Filters on author metadata. x.com only — no other platform carries these fields. Fields AND together; values within a field OR.",
    example: '{ "user_verified": ["true"] }',
  },
  {
    apiField: "output_format",
    label: "File format",
    section: "Output",
    type: '"jsonl" | "csv"',
    limit: "default jsonl",
    description: "Export only; previews ignore it.",
  },
  {
    apiField: "result_limit",
    label: "Total row cap",
    section: "Output",
    type: "integer",
    limit: `${LIMITS.resultLimitMin}–${LIMITS.resultLimitMax.toLocaleString()}`,
    description: "Maximum rows across the whole export. Omit to take every matching row.",
  },
  {
    apiField: "per_day_limit",
    label: "Per-day row cap",
    section: "Output",
    type: "integer",
    limit: `${LIMITS.perDayLimitMin}–${LIMITS.perDayLimitMax.toLocaleString()}`,
    description:
      `Caps rows per UTC day, sampling evenly across the range, and raises the maximum span to ${LIMITS.maxPerDaySpanDays} days. Requires both dates.`,
  },
  {
    apiField: "exclude_fields",
    label: "Fields in the output",
    section: "Output",
    type: "string[]",
    limit: "—",
    description:
      "Columns to leave out of each row. Omit the key to get the API default (everything except analysis_embedding), or pass an empty array to include everything. The dashboard's field presets set this for you.",
  },
];

export const SEARCH_SYNTAX = [
  {
    syntax: "bitcoin",
    name: "Plain term",
    effect: "Matches the whole word, case-insensitively.",
  },
  {
    syntax: '"climate change"',
    name: "Exact phrase",
    effect: "Double quotes require the words adjacent and in that order.",
  },
  {
    syntax: "regulat*",
    name: "Wildcard",
    effect: "A trailing asterisk matches any continuation — regulation, regulatory, regulate.",
  },
  {
    syntax: "OR within a group",
    name: "Any of these",
    effect: "The default. Widens the result set.",
  },
  {
    syntax: "AND within a group",
    name: "All of these",
    effect: "Every term must appear somewhere in the post.",
  },
  {
    syntax: "Safe mode",
    name: "Partial words",
    effect:
      "Needed for short codes like BTC or fragments inside longer words, since fast mode only sees whole tokens.",
  },
  {
    syntax: "@ _ - # .",
    name: "Special characters",
    effect: "Fall back to substring matching automatically, even in fast mode.",
  },
];

export const WORKFLOW_STEPS = [
  {
    title: "Check the system",
    where: "Overview",
    detail:
      "Confirm the API is healthy, the queue is accepting jobs, and you have quota left. Exports fail fast when any of those is off.",
  },
  {
    title: "Build the query",
    where: "Query",
    detail:
      "Set filters section by section. Each header summarizes what's set, and the toolbar pill tells you whether the query is valid before you spend anything.",
  },
  {
    title: "Preview it",
    where: "Query",
    detail:
      "Free and synchronous. Returns an exact count, an estimated file size, and ~100 sample rows. No quota is consumed, so iterate here until the count looks right.",
  },
  {
    title: "Export it",
    where: "Query",
    detail:
      "Submits an async job against the same filters and consumes quota. The dashboard checks queue capacity first and handles duplicate, rate-limit, and saturation responses.",
  },
  {
    title: "Monitor",
    where: "Jobs",
    detail:
      "Polls every 10s, easing toward 30s, through seven phases until the job is completed, failed, or rejected.",
  },
  {
    title: "Download",
    where: "Jobs",
    detail: `A presigned link valid ${LIMITS.downloadsExpiryHours}h, needing no auth. Sync a job to mint a fresh link later.`,
  },
];

export const PLAN_HISTORY = [
  { plan: "Free", history: "~90 days back", burst: "3 / min", sustained: "30 / hour" },
  { plan: "Pro", history: "~365 days back", burst: "30 / min", sustained: "600 / hour" },
  { plan: "Enterprise", history: "Unlimited, incl. back_posts", burst: "120 / min", sustained: "3000 / hour" },
];

export const OUTPUT_FORMATS = [
  {
    format: "JSONL",
    value: "jsonl",
    best: "Programmatic use, streaming, large sets",
    detail: "One JSON object per line. Nested fields stay structured JSON.",
  },
  {
    format: "CSV",
    value: "csv",
    best: "Excel, Sheets, BI tools",
    detail: "RFC 4180 with a UTF-8 BOM so spreadsheets open it correctly. Arrays are serialized as JSON strings inside cells.",
  },
];
