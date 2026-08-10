"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ALL_LANGUAGES,
  EXPORT_PHASES,
  FIELD_REFERENCE,
  HTTP_ERRORS,
  LIMITS,
  PLATFORMS,
  URL_PATTERN_EXAMPLES,
  type FieldCategory,
} from "@/lib/constants";
import {
  FILTER_REFERENCE,
  OUTPUT_FORMATS,
  PLAN_HISTORY,
  SEARCH_SYNTAX,
  WORKFLOW_STEPS,
} from "@/lib/reference";
import { QUERY_PRESETS } from "@/lib/query-form";
import { Badge, EmptyState, PageHeader, Panel, TextInput } from "@/components/ui";

const TABS = [
  { id: "workflow", label: "How it works" },
  { id: "filters", label: "Filters" },
  { id: "syntax", label: "Search syntax" },
  { id: "fields", label: "Output fields" },
  { id: "limits", label: "Limits & errors" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FIELD_CATEGORIES: FieldCategory[] = [
  "Post Metadata",
  "Author Information",
  "Source Information",
  "Analysis - Core",
  "Analysis - Emotions",
  "Always Excluded",
];

/** Case-insensitive "does any of this text mention the search term". */
function matches(query: string, ...text: (string | undefined)[]) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return text.some((t) => t?.toLowerCase().includes(needle));
}

export default function ReferencePage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <ReferenceView />
    </Suspense>
  );
}

function ReferenceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("workflow");
  const [query, setQuery] = useState("");

  // ?tab= drives the view so the builder's "?" buttons can deep-link here.
  useEffect(() => {
    const requested = searchParams.get("tab");
    if (TABS.some((t) => t.id === requested)) setTab(requested as TabId);
    const section = searchParams.get("section");
    if (section) setQuery(section);
  }, [searchParams]);

  function selectTab(next: TabId) {
    setTab(next);
    router.replace(next === "workflow" ? "/reference" : `/reference?tab=${next}`, { scroll: false });
  }

  const filters = useMemo(
    () =>
      FILTER_REFERENCE.filter((f) =>
        matches(query, f.apiField, f.label, f.description, f.section, f.limit),
      ),
    [query],
  );
  const fields = useMemo(
    () => FIELD_REFERENCE.filter((f) => matches(query, f.name, f.description, f.category)),
    [query],
  );
  const syntax = useMemo(
    () => SEARCH_SYNTAX.filter((s) => matches(query, s.syntax, s.name, s.effect)),
    [query],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reference"
        description="Every filter, option, output field, and limit the Data Export API exposes — and how the pieces fit together."
      />

      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1 rounded-md border border-border bg-bg p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-current={tab === t.id}
              className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-accent-solid text-accent-fg"
                  : "text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-[220px] flex-1">
          <TextInput
            placeholder="Search the reference…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {tab === "workflow" && (
        <div className="space-y-4">
          <Panel title="The two-phase model" description="Preview is free and instant; export is metered and async">
            <ol className="space-y-3">
              {WORKFLOW_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">{step.title}</span>
                      <Badge>{step.where}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Export processing phases" description="What the job monitor is stepping through">
              <ol className="space-y-2">
                {EXPORT_PHASES.map((phase, i) => (
                  <li key={phase} className="flex items-center gap-3 text-sm text-text-muted">
                    <span className="tnum label-caps w-4 shrink-0">{i + 1}</span>
                    <span className="text-text">{phase}</span>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel title="Output formats">
              <div className="space-y-4">
                {OUTPUT_FORMATS.map((f) => (
                  <div key={f.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{f.format}</span>
                      <code className="font-mono text-xs text-text-subtle">{f.value}</code>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">Best for: {f.best}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{f.detail}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Example queries" description="Loadable from the dropdown at the top of the Query page">
            <div className="space-y-2">
              {QUERY_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/50 py-2 last:border-0"
                >
                  <span className="text-sm font-medium text-text">{preset.label}</span>
                  <Badge>{preset.category}</Badge>
                  <span className="text-xs text-text-muted">{preset.description}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "filters" && (
        <div className="space-y-4">
          <Panel
            title={`Every request field (${filters.length})`}
            description="Each one maps to a control on the Query page, grouped by the same section names"
          >
            {filters.length === 0 ? (
              <EmptyState>Nothing matches “{query}”.</EmptyState>
            ) : (
              <div className="space-y-3">
                {filters.map((f) => (
                  <div key={f.apiField} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-text">{f.label}</span>
                      <code className="font-mono text-xs text-accent">{f.apiField}</code>
                      <Badge>{f.section}</Badge>
                      <span className="text-xs text-text-subtle">{f.limit}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{f.description}</p>
                    <p className="mt-1 font-mono text-xs text-text-subtle">{f.type}</p>
                    {f.example && (
                      <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-text-muted">
                        {f.example}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Keywords are optional — sometimes"
            description="The one validation rule worth memorizing"
          >
            <p className="text-sm leading-relaxed text-text-muted">
              You must supply <strong className="text-text">either</strong> keyword groups{" "}
              <strong className="text-text">or</strong> at least one selective filter:{" "}
              <code className="font-mono text-xs text-accent">usernames</code>,{" "}
              <code className="font-mono text-xs text-accent">external_ids</code>,{" "}
              <code className="font-mono text-xs text-accent">external_parent_ids</code>, or{" "}
              <code className="font-mono text-xs text-accent">url_patterns</code>. Proximity rules always
              need keywords too. The Query page enforces this before you can run anything.
            </p>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={`Platforms in the picker (${PLATFORMS.length})`} description="Exorde indexes 200+ sources — add any other domain directly">
              <div className="space-y-1.5">
                {[...new Set(PLATFORMS.map((p) => p.group))].map((group) => (
                  <div key={group}>
                    <div className="label-caps pb-1 pt-2">{group}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.filter((p) => p.group === group).map((p) => (
                        <span
                          key={p.domain}
                          title={p.note ?? undefined}
                          className="rounded-full bg-surface-hover px-2.5 py-1 font-mono text-xs text-text-muted"
                        >
                          {p.domain}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="URL pattern examples" description="Substring matched against the post URL">
              <div className="space-y-2">
                {URL_PATTERN_EXAMPLES.map((p) => (
                  <div key={p.value} className="border-b border-border/50 pb-2 last:border-0">
                    <code className="font-mono text-xs text-accent">{p.value}</code>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {p.label}
                      {p.note ? ` — ${p.note}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel
            title={`Languages accepted (${ALL_LANGUAGES.length} listed, 176+ supported)`}
            description={`Max ${LIMITS.maxLanguages} per query`}
          >
            <div className="flex flex-wrap gap-1.5">
              {ALL_LANGUAGES.filter((l) => matches(query, l.code, l.label)).map((l) => (
                <span
                  key={l.code}
                  title={l.label}
                  className="rounded-full bg-surface-hover px-2.5 py-1 text-xs text-text-muted"
                >
                  <span className="font-mono text-text">{l.code}</span> {l.label}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "syntax" && (
        <div className="space-y-4">
          <Panel title="Writing keyword terms">
            {syntax.length === 0 ? (
              <EmptyState>Nothing matches “{query}”.</EmptyState>
            ) : (
              <div className="space-y-3">
                {syntax.map((s) => (
                  <div key={s.syntax} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <code className="rounded-md bg-bg px-2 py-1 font-mono text-xs text-accent">
                        {s.syntax}
                      </code>
                      <span className="text-sm font-medium text-text">{s.name}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{s.effect}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Fast vs safe mode" description="The single biggest lever on query cost">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-bg p-4">
                <div className="text-sm font-medium text-text">Fast (default)</div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  Word-boundary matching against a token/Bloom index. 10–20× faster. Use it unless your terms
                  are fragments.
                </p>
              </div>
              <div className="rounded-md border border-border bg-bg p-4">
                <div className="text-sm font-medium text-text">Safe</div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  Full substring scan. Finds short codes like BTC and partial words, at 5–10× the cost. Narrow
                  your date range to compensate.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "fields" && (
        <div className="space-y-4">
          <Panel
            title={`Output fields (${fields.length} of ${FIELD_REFERENCE.length})`}
            description="44 are exported by default. Embeddings are excluded unless you pass exclude_fields: []."
          >
            {fields.length === 0 && <EmptyState>Nothing matches “{query}”.</EmptyState>}
          </Panel>
          {FIELD_CATEGORIES.map((category) => {
            const rows = fields.filter((f) => f.category === category);
            if (!rows.length) return null;
            return (
              <Panel key={category} title={`${category} (${rows.length})`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="label-caps pb-2 pr-4 font-medium">Field</th>
                        <th className="label-caps pb-2 pr-4 font-medium">Type</th>
                        <th className="label-caps pb-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((f) => (
                        <tr key={f.name} className="border-b border-border/40 last:border-0">
                          <td className="py-2 pr-4 font-mono text-accent">{f.name}</td>
                          <td className="py-2 pr-4 font-mono text-text-subtle">{f.type}</td>
                          <td className="py-2 text-text-muted">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {tab === "limits" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Request caps" description="Enforced client-side before you can submit">
              <dl className="space-y-1.5 text-sm">
                {[
                  ["Date range", `${LIMITS.maxDateRangeDays}d (${LIMITS.maxPerDaySpanDays}d with per_day_limit)`],
                  ["Keyword groups", `${LIMITS.maxKeywordGroups} × ${LIMITS.maxTermsPerGroup} terms`],
                  ["Domains", LIMITS.maxDomains],
                  ["Languages", LIMITS.maxLanguages],
                  ["Usernames", LIMITS.maxUsernames],
                  ["Post / parent IDs", `${LIMITS.maxExternalIds} each`],
                  ["Locations", LIMITS.maxLocations],
                  ["URL patterns", LIMITS.maxUrlPatterns],
                  ["Exclusion groups", LIMITS.maxExcludeKeywordGroups],
                  ["Proximity rules", LIMITS.maxProximityGroups],
                  ["Profile filters", `${LIMITS.maxProfileFilterFields} fields × ${LIMITS.maxProfileFilterValues}`],
                  ["result_limit", LIMITS.resultLimitMax.toLocaleString()],
                  ["per_day_limit", LIMITS.perDayLimitMax.toLocaleString()],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between gap-4 border-b border-border/40 py-1">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="tnum font-mono text-xs text-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <div className="space-y-4">
              <Panel title="Plans" description="History depth and rate limits by tier">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="label-caps pb-2 pr-4 font-medium">Plan</th>
                        <th className="label-caps pb-2 pr-4 font-medium">History</th>
                        <th className="label-caps pb-2 pr-4 font-medium">Burst</th>
                        <th className="label-caps pb-2 font-medium">Sustained</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PLAN_HISTORY.map((p) => (
                        <tr key={p.plan} className="border-b border-border/40 last:border-0">
                          <td className="py-2 pr-4 text-text">{p.plan}</td>
                          <td className="py-2 pr-4 text-text-muted">{p.history}</td>
                          <td className="tnum py-2 pr-4 text-text-muted">{p.burst}</td>
                          <td className="tnum py-2 text-text-muted">{p.sustained}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-text-muted">
                  Request weight = ceil(span_days / 7). Preview and export consume weight; health, history,
                  queue capacity, and job status do not. Exceeding history depth returns 403 history_too_old.
                </p>
              </Panel>

              <Panel title="Concurrency & idempotency">
                <ul className="space-y-1.5 text-sm text-text-muted">
                  <li>Global running cap: {LIMITS.concurrentGlobal}</li>
                  <li>Per-customer running: {LIMITS.concurrentPerCustomer}</li>
                  <li>Per-customer in-flight: {LIMITS.inFlightPerCustomer}</li>
                  <li>Identical export within 5 minutes returns 409 with existing_job_id</li>
                  <li>Failed or rejected jobs can be resubmitted immediately</li>
                  <li>Download URLs expire after {LIMITS.downloadsExpiryHours}h</li>
                  <li>Export timeout: {LIMITS.exportTimeoutSeconds}s</li>
                </ul>
              </Panel>
            </div>
          </div>

          <Panel title="HTTP responses" description="What each status means and what to do about it">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="label-caps pb-2 pr-4 font-medium">Code</th>
                    <th className="label-caps pb-2 pr-4 font-medium">Meaning</th>
                    <th className="label-caps pb-2 font-medium">What to do</th>
                  </tr>
                </thead>
                <tbody>
                  {HTTP_ERRORS.filter((r) => matches(query, String(r.code), r.scenario, r.tip)).map((row) => (
                    <tr key={row.code} className="border-b border-border/40 last:border-0">
                      <td className="tnum py-2.5 pr-4 font-mono text-accent">{row.code}</td>
                      <td className="py-2.5 pr-4 text-text">{row.scenario}</td>
                      <td className="py-2.5 text-text-muted">{row.tip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
