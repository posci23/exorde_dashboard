import { PLATFORM_DOMAINS } from "./constants";
import type { QueryBody } from "./types";

export type QueryFormState = {
  keywordGroups: Array<{ termsText: string; operator: "OR" | "AND" }>;
  groupOperator: "AND" | "OR";
  startDate: string;
  endDate: string;
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

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  };
  return { startDate: fmt(start), endDate: fmt(end) };
}

const defaults = defaultDateRange();

export function createEmptyQueryForm(): QueryFormState {
  return {
    keywordGroups: [{ termsText: "bitcoin, ethereum", operator: "OR" }],
    groupOperator: "AND",
    startDate: defaults.startDate,
    endDate: defaults.endDate,
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

function splitList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseDomainList(text: string): string[] {
  return [...new Set(splitList(text))];
}

export function formatDomainList(domains: string[]): string {
  return domains.join(", ");
}

export function getSelectedPlatformDomains(domainsText: string): string[] {
  return parseDomainList(domainsText).filter((d) => PLATFORM_DOMAINS.has(d));
}

export function getCustomDomains(domainsText: string): string[] {
  return parseDomainList(domainsText).filter((d) => !PLATFORM_DOMAINS.has(d));
}

export function setPlatformSelection(
  domainsText: string,
  domain: string,
  selected: boolean,
): string {
  const current = parseDomainList(domainsText);
  const next = selected
    ? current.includes(domain)
      ? current
      : [...current, domain]
    : current.filter((d) => d !== domain);
  return formatDomainList(next);
}

export function setCustomDomainsText(domainsText: string, customText: string): string {
  const selectedPlatforms = parseDomainList(domainsText).filter((d) => PLATFORM_DOMAINS.has(d));
  const custom = parseDomainList(customText).filter((d) => !PLATFORM_DOMAINS.has(d));
  return formatDomainList([...selectedPlatforms, ...custom]);
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

export const QUERY_PRESETS: Array<{ id: string; label: string; apply: (form: QueryFormState) => QueryFormState }> = [
  {
    id: "simple-or",
    label: "Simple OR (crypto)",
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
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: '"climate change", "machine learning"', operator: "OR" }],
    }),
  },
  {
    id: "wildcard",
    label: "Wildcard prefix",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "regulat*, legislat*", operator: "OR" }],
    }),
  },
  {
    id: "or-groups",
    label: "OR between groups",
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
    apply: (form) => ({
      ...form,
      keywordGroups: [],
      urlPatternsText: "reddit.com/r/france, reddit.com/r/paris",
    }),
  },
  {
    id: "proximity-profile",
    label: "Proximity + verified x.com",
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
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "BTC, ETH", operator: "OR" }],
      fullStringScan: true,
    }),
  },
  {
    id: "per-day",
    label: "Per-day sampling export",
    apply: (form) => ({
      ...form,
      keywordGroups: [{ termsText: "trump", operator: "OR" }],
      perDayLimit: "5000",
      outputFormat: "csv",
    }),
  },
];
