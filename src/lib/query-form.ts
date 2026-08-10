import {
  DATE_RANGE_PRESETS,
  DEFAULT_FIELD_PRESET,
  FIELD_PRESETS,
  PLATFORMS,
} from "./constants";
import type { QueryBody } from "./types";

export type QueryFormState = {
  keywordGroups: Array<{ termsText: string; operator: "OR" | "AND" }>;
  groupOperator: "AND" | "OR";
  startDate: string;
  endDate: string;
  collectedAtStartDate: string;
  collectedAtEndDate: string;
  domainsText: string;
  languagesText: string;
  usernamesText: string;
  caseSensitiveUsernames: boolean;
  fullStringScan: boolean;
  /** An id from FIELD_PRESETS. "custom" defers to `excludeFieldsText`. */
  fieldPreset: string;
  excludeFieldsText: string;
  externalIdsText: string;
  externalParentIdsText: string;
  excludeKeywordGroups: Array<{ termsText: string; operator: "OR" | "AND" }>;
  locationsText: string;
  urlPatternsText: string;
  proximityGroups: Array<{ term_a: string; term_b: string; distance: number }>;
  profileFilters: Array<{ field: string; valuesText: string }>;
  outputFormat: "jsonl" | "csv";
  resultLimit: string;
  perDayLimit: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** API wire format: `YYYY-MM-DD HH:MM:SS`, always UTC. */
export function formatApiDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** `<input type="datetime-local">` wants `YYYY-MM-DDTHH:MM`. */
export function apiDateToInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const [date, time = "00:00:00"] = trimmed.split(/[ T]/);
  return `${date}T${time.slice(0, 5)}`;
}

export function inputDateToApi(value: string): string {
  if (!value) return "";
  const [date, time = "00:00"] = value.split("T");
  return `${date} ${time.length === 5 ? `${time}:00` : time}`;
}

export function parseApiDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Explicit Z so a bare `YYYY-MM-DD HH:MM:SS` is read as UTC, matching the API.
  const d = new Date(`${trimmed.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days between start and end, or null if either date is missing/unparseable. */
export function getSpanDays(startDate: string, endDate: string): number | null {
  const start = parseApiDate(startDate);
  const end = parseApiDate(endDate);
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / 86_400_000;
}

/** Absolute start/end for a "last N days" window, ending now. */
export function relativeDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  return { startDate: formatApiDate(start), endDate: formatApiDate(end) };
}

/** Which preset (if any) the current range matches, within a 5-minute tolerance. */
export function matchDatePreset(form: QueryFormState): string | null {
  const span = getSpanDays(form.startDate, form.endDate);
  if (span == null) return null;
  const preset = DATE_RANGE_PRESETS.find((p) => Math.abs(span - p.days) < 5 / 1440);
  return preset?.id ?? null;
}

const defaults = relativeDateRange(1);

export function createEmptyQueryForm(): QueryFormState {
  return {
    keywordGroups: [{ termsText: "bitcoin, ethereum", operator: "OR" }],
    groupOperator: "AND",
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    collectedAtStartDate: "",
    collectedAtEndDate: "",
    domainsText: "",
    languagesText: "",
    usernamesText: "",
    caseSensitiveUsernames: false,
    fullStringScan: false,
    fieldPreset: DEFAULT_FIELD_PRESET,
    excludeFieldsText: "",
    externalIdsText: "",
    externalParentIdsText: "",
    excludeKeywordGroups: [],
    locationsText: "",
    urlPatternsText: "",
    proximityGroups: [],
    profileFilters: [],
    outputFormat: "jsonl",
    resultLimit: "",
    perDayLimit: "",
  };
}

/** Split a comma/newline separated textarea value into trimmed, non-empty entries. */
export function splitList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}


export function parseDomainList(text: string): string[] {
  return [...new Set(splitList(text))];
}

/**
 * The `exclude_fields` value for the selected preset, or null to omit the key
 * and let the API apply its own default.
 */
export function resolveExcludedFields(form: QueryFormState): string[] | null {
  // Custom always sends the list, empty included: ticking nothing means "keep
  // every column", which is not the same as letting the API drop embeddings.
  if (form.fieldPreset === "custom") return splitList(form.excludeFieldsText);
  const preset = FIELD_PRESETS.find((p) => p.id === form.fieldPreset);
  // An unknown id (stale localStorage) falls back to the API default.
  if (!preset || preset.exclude === null) return null;
  return [...preset.exclude];
}

function parseKeywordGroups(groups: QueryFormState["keywordGroups"]) {
  return groups
    .map((g) => ({
      terms: splitList(g.termsText),
      operator: g.operator,
    }))
    .filter((g) => g.terms.length > 0);
}

export function buildQueryBody(form: QueryFormState, mode: "preview" | "export"): QueryBody {
  const body: QueryBody = {};

  const keywordGroups = parseKeywordGroups(form.keywordGroups);
  if (keywordGroups.length > 0) {
    body.keyword_groups = keywordGroups;
  }

  if (form.groupOperator !== "AND") {
    body.group_operator = form.groupOperator;
  }

  if (form.startDate.trim()) body.start_date = form.startDate.trim();
  if (form.endDate.trim()) body.end_date = form.endDate.trim();
  if (form.collectedAtStartDate.trim()) body.collected_at_start_date = form.collectedAtStartDate.trim();
  if (form.collectedAtEndDate.trim()) body.collected_at_end_date = form.collectedAtEndDate.trim();

  const domains = splitList(form.domainsText);
  if (domains.length) body.domains = domains;

  const languages = splitList(form.languagesText);
  if (languages.length) body.languages = languages;

  const usernames = splitList(form.usernamesText);
  if (usernames.length) body.usernames = usernames;

  if (form.caseSensitiveUsernames) body.case_sensitive_usernames = true;
  if (form.fullStringScan) body.full_string_scan = true;

  const excluded = resolveExcludedFields(form);
  if (excluded !== null) body.exclude_fields = excluded;

  const externalIds = splitList(form.externalIdsText);
  if (externalIds.length) body.external_ids = externalIds;

  const externalParentIds = splitList(form.externalParentIdsText);
  if (externalParentIds.length) body.external_parent_ids = externalParentIds;

  const excludeGroups = parseKeywordGroups(form.excludeKeywordGroups);
  if (excludeGroups.length) body.exclude_keyword_groups = excludeGroups;

  const locations = splitList(form.locationsText);
  if (locations.length) body.locations = locations;

  const urlPatterns = splitList(form.urlPatternsText);
  if (urlPatterns.length) body.url_patterns = urlPatterns;

  const proximity = form.proximityGroups.filter((g) => g.term_a.trim() && g.term_b.trim());
  if (proximity.length) {
    body.proximity_groups = proximity.map((g) => ({
      term_a: g.term_a.trim(),
      term_b: g.term_b.trim(),
      distance: g.distance,
    }));
  }

  const profileEntries = form.profileFilters
    .map((f) => [f.field, splitList(f.valuesText)] as const)
    .filter(([field, values]) => field && values.length > 0);

  if (profileEntries.length) {
    body.profile_filters = Object.fromEntries(profileEntries);
  }

  if (mode === "export") {
    body.output_format = form.outputFormat;
    if (form.resultLimit.trim()) {
      body.result_limit = Number(form.resultLimit);
    }
    if (form.perDayLimit.trim()) {
      body.per_day_limit = Number(form.perDayLimit);
    }
  }

  return body;
}

export function buildCurl(body: QueryBody, endpoint: "preview" | "export") {
  const path = endpoint === "preview" ? "/api/v1/preview" : "/api/v1/export";
  return `curl -X POST https://export-api.exorde.io${path} \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`;
}

/** Per-section header state: how many filters are set, and a plain-English summary. */
export type SectionSummary = { count: number; summary: string };

function summarize(parts: Array<[number, string]>, empty: string): SectionSummary {
  const active = parts.filter(([n]) => n > 0);
  const count = active.reduce((sum, [n]) => sum + n, 0);
  return { count, summary: active.length ? active.map(([, text]) => text).join(" · ") : empty };
}

export function summarizeKeywords(form: QueryFormState): SectionSummary {
  const groups = form.keywordGroups.filter((g) => splitList(g.termsText).length > 0);
  const terms = groups.reduce((sum, g) => sum + splitList(g.termsText).length, 0);
  if (!groups.length) return { count: 0, summary: "No keywords — needs a selective filter" };
  const joiner = groups.length > 1 ? ` ${form.groupOperator} between groups` : "";
  return {
    count: groups.length,
    summary: `${groups.length} group${groups.length > 1 ? "s" : ""} · ${terms} term${terms > 1 ? "s" : ""}${joiner}${form.fullStringScan ? " · safe mode" : ""}`,
  };
}

export function summarizeTimeRange(form: QueryFormState): SectionSummary {
  const span = getSpanDays(form.startDate, form.endDate);
  const presetId = matchDatePreset(form);
  const preset = DATE_RANGE_PRESETS.find((p) => p.id === presetId);
  const base = preset
    ? preset.label
    : span != null
      ? `${form.startDate} → ${form.endDate} (${span.toFixed(1)}d)`
      : "No date range set";
  const collected = form.collectedAtStartDate || form.collectedAtEndDate ? " · collected-at set" : "";
  return { count: form.startDate || form.endDate ? 1 : 0, summary: `${base}${collected}` };
}

export function summarizeSources(form: QueryFormState): SectionSummary {
  const domains = parseDomainList(form.domainsText);
  const languages = splitList(form.languagesText);
  const locations = splitList(form.locationsText);
  const domainLabel = domains
    .map((d) => PLATFORMS.find((p) => p.domain === d)?.label ?? d)
    .join(", ");
  return summarize(
    [
      [domains.length, `Platforms: ${domainLabel}`],
      [languages.length, `Languages: ${languages.join(", ")}`],
      [locations.length, `${locations.length} location${locations.length > 1 ? "s" : ""}`],
    ],
    "All platforms, all languages, anywhere",
  );
}

export function summarizePeople(form: QueryFormState): SectionSummary {
  const usernames = splitList(form.usernamesText);
  const ids = splitList(form.externalIdsText);
  const parentIds = splitList(form.externalParentIdsText);
  const urls = splitList(form.urlPatternsText);
  return summarize(
    [
      [usernames.length, `${usernames.length} username${usernames.length > 1 ? "s" : ""}`],
      [ids.length, `${ids.length} post ID${ids.length > 1 ? "s" : ""}`],
      [parentIds.length, `${parentIds.length} parent ID${parentIds.length > 1 ? "s" : ""}`],
      [urls.length, `${urls.length} URL pattern${urls.length > 1 ? "s" : ""}`],
    ],
    "Not filtered by author or URL",
  );
}

export function summarizeAdvanced(form: QueryFormState): SectionSummary {
  const excludes = form.excludeKeywordGroups.filter((g) => splitList(g.termsText).length > 0);
  const proximity = form.proximityGroups.filter((g) => g.term_a.trim() && g.term_b.trim());
  const profiles = form.profileFilters.filter((f) => splitList(f.valuesText).length > 0);
  return summarize(
    [
      [excludes.length, `${excludes.length} exclusion group${excludes.length > 1 ? "s" : ""}`],
      [proximity.length, `${proximity.length} proximity rule${proximity.length > 1 ? "s" : ""}`],
      [profiles.length, `${profiles.length} profile filter${profiles.length > 1 ? "s" : ""}`],
    ],
    "No exclusions, proximity, or profile filters",
  );
}

export function summarizeOutput(form: QueryFormState): SectionSummary {
  const excluded = splitList(form.excludeFieldsText).length;
  const fieldMode =
    form.fieldPreset === "custom"
      ? `${excluded} field${excluded === 1 ? "" : "s"} excluded`
      : (FIELD_PRESETS.find((p) => p.id === form.fieldPreset)?.label ?? "default fields");
  const caps = [
    form.resultLimit.trim() && `max ${Number(form.resultLimit).toLocaleString()} rows`,
    form.perDayLimit.trim() && `${Number(form.perDayLimit).toLocaleString()}/day`,
  ].filter(Boolean);
  return {
    count: caps.length,
    summary: [form.outputFormat.toUpperCase(), fieldMode, ...caps].join(" · "),
  };
}

export type QueryPreset = {
  id: string;
  label: string;
  category: string;
  description: string;
  apply: (form: QueryFormState) => QueryFormState;
};

/**
 * Starting points, named for what you get rather than which API feature they
 * demonstrate. Loading one overwrites only the fields it names.
 */
export const QUERY_PRESETS: QueryPreset[] = [
  {
    id: "clean-posts",
    label: "A clean set of posts on a topic",
    category: "Start here",
    description:
      "One topic, English, spam words removed, no AI scores in the file. The usual starting point.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "climate change, global warming", operator: "OR" }],
      groupOperator: "AND",
      languagesText: "en",
      excludeKeywordGroups: [{ termsText: "giveaway, airdrop, follow me", operator: "OR" }],
      fieldPreset: "raw",
      proximityGroups: [],
      profileFilters: [],
      urlPatternsText: "",
    }),
  },
  {
    id: "one-community",
    label: "Everything from one community",
    category: "Start here",
    description: "No keywords at all — pulls whole subreddits by their URL.",
    apply: (form) => ({
      ...form,
      keywordGroups: [],
      urlPatternsText: "reddit.com/r/france, reddit.com/r/paris",
      fieldPreset: "raw",
    }),
  },
  {
    id: "one-author",
    label: "Everything one account posted",
    category: "Start here",
    description: "Filters by handle instead of by words.",
    apply: (form) => ({
      ...form,
      keywordGroups: [],
      usernamesText: "elonmusk",
      fieldPreset: "raw",
    }),
  },
  {
    id: "sentiment-study",
    label: "Sentiment over time",
    category: "Start here",
    description: "Keeps the sentiment score and samples evenly per day across a long window.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "inflation, cost of living", operator: "OR" }],
      languagesText: "en",
      fieldPreset: "sentiment",
      perDayLimit: "5000",
      ...relativeDateRange(60),
    }),
  },

  {
    id: "two-topics",
    label: "Posts that mention two topics at once",
    category: "Narrow the results",
    description: "Two groups joined by AND — a post must hit both to qualify.",
    apply: (form) => ({
      ...form,
      keywordGroups: [
        { termsText: "crypto, cryptocurrency, blockchain", operator: "OR" },
        { termsText: "regulation, law, legal", operator: "OR" },
      ],
      groupOperator: "AND",
    }),
  },
  {
    id: "related-terms",
    label: "Terms that actually relate to each other",
    category: "Narrow the results",
    description: "Proximity: the two words have to sit within 5 words, not just both appear.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "trump, tariff", operator: "OR" }],
      proximityGroups: [{ term_a: "trump", term_b: "tariff", distance: 5 }],
    }),
  },
  {
    id: "verified-only",
    label: "Only verified X accounts",
    category: "Narrow the results",
    description: "Profile filter on x.com — drops every other platform.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "election", operator: "OR" }],
      domainsText: "x.com",
      profileFilters: [{ field: "user_verified", valuesText: "true" }],
    }),
  },
  {
    id: "minus-noise",
    label: "A topic minus the noise around it",
    category: "Narrow the results",
    description: "Inclusion terms with two exclusion groups layered on top.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "electric vehicle, EV", operator: "OR" }],
      languagesText: "en",
      excludeKeywordGroups: [
        { termsText: "crypto, bitcoin", operator: "OR" },
        { termsText: "spam, giveaway, follow", operator: "OR" },
      ],
    }),
  },

  {
    id: "phrase",
    label: "An exact phrase, in order",
    category: "How matching works",
    description: 'Quotes make "climate change" match the phrase, not the two words separately.',
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: '"climate change", "machine learning"', operator: "OR" }],
    }),
  },
  {
    id: "wildcard",
    label: "Every word starting with a stem",
    category: "How matching works",
    description: "A trailing * expands: regulat* covers regulation, regulatory, regulators.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "regulat*, legislat*", operator: "OR" }],
    }),
  },
  {
    id: "safe-mode",
    label: "Short codes like BTC or $TSLA",
    category: "How matching works",
    description: "Safe mode scans raw text so tickers inside hashtags still match.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "BTC, ETH", operator: "OR" }],
      fullStringScan: true,
    }),
  },
  {
    id: "either-topic",
    label: "Either of two unrelated topics",
    category: "How matching works",
    description: "Groups joined by OR — a post matching either one qualifies.",
    apply: (form) => ({
      ...form,
      keywordGroups: [
        { termsText: "bitcoin, ethereum", operator: "OR" },
        { termsText: "gold, silver", operator: "OR" },
      ],
      groupOperator: "OR",
    }),
  },
];
