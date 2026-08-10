import { DATE_RANGE_PRESETS, PLATFORMS } from "./constants";
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
  excludeFieldsMode: "default" | "include_all" | "custom";
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
    excludeFieldsMode: "default",
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

  if (form.excludeFieldsMode === "include_all") {
    body.exclude_fields = [];
  } else if (form.excludeFieldsMode === "custom") {
    body.exclude_fields = splitList(form.excludeFieldsText);
  }

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
  const fieldMode =
    form.excludeFieldsMode === "include_all"
      ? "all fields"
      : form.excludeFieldsMode === "custom"
        ? `${splitList(form.excludeFieldsText).length} field(s) excluded`
        : "default fields";
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

export const QUERY_PRESETS: QueryPreset[] = [
  {
    id: "simple-or",
    label: "Simple OR (crypto)",
    category: "Keyword syntax",
    description: "One OR group — matches any of the listed terms.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "bitcoin, ethereum, crypto", operator: "OR" }],
      groupOperator: "AND",
      excludeKeywordGroups: [],
      proximityGroups: [],
      profileFilters: [],
      urlPatternsText: "",
    }),
  },
  {
    id: "multi-and",
    label: "Multi-topic AND",
    category: "Keyword syntax",
    description: "Two OR groups combined with AND — posts must hit both topics.",
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
    id: "phrase",
    label: "Exact phrase",
    category: "Keyword syntax",
    description: "Quoted terms match the exact ordered phrase.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: '"climate change", "machine learning"', operator: "OR" }],
    }),
  },
  {
    id: "wildcard",
    label: "Wildcard prefix",
    category: "Keyword syntax",
    description: "Trailing * matches any prefix, e.g. regulat* → regulation, regulatory.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "regulat*, legislat*", operator: "OR" }],
    }),
  },
  {
    id: "or-groups",
    label: "OR between groups",
    category: "Keyword syntax",
    description: "group_operator: OR — posts matching either group qualify.",
    apply: (form) => ({
      ...form,
      keywordGroups: [
        { termsText: "bitcoin, ethereum", operator: "OR" },
        { termsText: "gold, silver", operator: "OR" },
      ],
      groupOperator: "OR",
    }),
  },
  {
    id: "url-only",
    label: "URL patterns only",
    category: "Selective filters",
    description: "No keywords at all — filters purely by URL substring.",
    apply: (form) => ({
      ...form,
      keywordGroups: [],
      urlPatternsText: "reddit.com/r/france, reddit.com/r/paris",
    }),
  },
  {
    id: "proximity-profile",
    label: "Proximity + verified x.com",
    category: "Advanced",
    description: "Terms within 5 words of each other, from verified x.com accounts.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "trump, tariff", operator: "OR" }],
      proximityGroups: [{ term_a: "trump", term_b: "tariff", distance: 5 }],
      profileFilters: [{ field: "user_verified", valuesText: "true" }],
      domainsText: "x.com",
    }),
  },
  {
    id: "exclusions",
    label: "With exclusions",
    category: "Advanced",
    description: "Inclusion terms minus two exclusion groups, scoped by domain and language.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "electric vehicle, EV", operator: "OR" }],
      domainsText: "social.com, smth.com",
      languagesText: "en",
      excludeKeywordGroups: [
        { termsText: "crypto, bitcoin", operator: "OR" },
        { termsText: "spam, giveaway, follow", operator: "OR" },
      ],
    }),
  },
  {
    id: "safe-mode",
    label: "Safe mode (partial words)",
    category: "Advanced",
    description: "full_string_scan for short codes that token search would miss.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "BTC, ETH", operator: "OR" }],
      fullStringScan: true,
    }),
  },
  {
    id: "per-day",
    label: "Per-day sampling export",
    category: "Export options",
    description: "Caps rows per UTC day, which unlocks a 90-day span. Outputs CSV.",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "trump", operator: "OR" }],
      perDayLimit: "5000",
      outputFormat: "csv",
    }),
  },
];
