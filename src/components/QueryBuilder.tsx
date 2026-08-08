"use client";

import { LIMITS, PROFILE_FILTER_FIELDS } from "@/lib/constants";
import {
  QUERY_PRESETS,
  buildCurl,
  buildQueryBody,
  type QueryFormState,
} from "@/lib/query-form";
import { queryBodySchema } from "@/lib/types";
import { PlatformPicker } from "./PlatformPicker";
import { Alert, Button, FieldLabel, Panel, Select, TextArea, TextInput } from "./ui";

type Props = {
  form: QueryFormState;
  onChange: (next: QueryFormState) => void;
  mode: "preview" | "export";
};

export function QueryBuilder({ form, onChange, mode }: Props) {
  const set = (patch: Partial<QueryFormState>) => onChange({ ...form, ...patch });
  const body = buildQueryBody(form, mode);
  const validation = queryBodySchema.safeParse(body);

  return (
    <div className="space-y-4">
      <Panel
        title="Presets"
        description="Load common patterns from the Data Export docs"
        actions={
          <div className="flex flex-wrap gap-2">
            {QUERY_PRESETS.map((preset) => (
              <Button key={preset.id} variant="secondary" type="button" onClick={() => onChange(preset.apply(form))}>
                {preset.label}
              </Button>
            ))}
          </div>
        }
      >
        <p className="text-xs text-text-muted">
          Keyword groups optional when using selective filters: external_ids, external_parent_ids, usernames, or
          url_patterns. Proximity always requires keywords.
        </p>
      </Panel>

      <Panel title="Keyword groups" description={`Max ${LIMITS.maxKeywordGroups} groups · ${LIMITS.maxTermsPerGroup} terms each · phrase via "..." · wildcard via *`}>
        <div className="mb-3 flex items-center gap-3">
          <FieldLabel hint="between groups">Group operator</FieldLabel>
          <Select
            className="w-28"
            value={form.groupOperator}
            onChange={(e) => set({ groupOperator: e.target.value as "AND" | "OR" })}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </Select>
        </div>
        <div className="space-y-3">
          {form.keywordGroups.map((group, index) => (
            <div key={index} className="rounded-lg border border-border bg-bg-elevated p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-text-muted">Group {index + 1}</span>
                <div className="flex items-center gap-2">
                  <Select
                    className="w-24"
                    value={group.operator}
                    onChange={(e) => {
                      const next = [...form.keywordGroups];
                      next[index] = { ...group, operator: e.target.value as "OR" | "AND" };
                      set({ keywordGroups: next });
                    }}
                  >
                    <option value="OR">OR</option>
                    <option value="AND">AND</option>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => set({ keywordGroups: form.keywordGroups.filter((_, i) => i !== index) })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <TextArea
                rows={2}
                placeholder='bitcoin, ethereum, "exact phrase", regulat*'
                value={group.termsText}
                onChange={(e) => {
                  const next = [...form.keywordGroups];
                  next[index] = { ...group, termsText: e.target.value };
                  set({ keywordGroups: next });
                }}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={form.keywordGroups.length >= LIMITS.maxKeywordGroups}
          onClick={() =>
            set({ keywordGroups: [...form.keywordGroups, { termsText: "", operator: "OR" }] })
          }
        >
          Add keyword group
        </Button>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Date range" description="Default max 30 days · 90 days with per_day_limit">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Start date</FieldLabel>
              <TextInput value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              <TextInput value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </div>
          </div>
        </Panel>

        <Panel title="Search mode">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.fullStringScan}
              onChange={(e) => set({ fullStringScan: e.target.checked })}
            />
            <span>
              <span className="font-medium text-text">Safe mode (full_string_scan)</span>
              <span className="mt-1 block text-xs text-text-muted">
                Off = fast Bloom/token match. On = partial words / short codes (5–10× slower).
              </span>
            </span>
          </label>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Platforms" description={`Max ${LIMITS.maxDomains} · maps to domains[] · exact match · OR`}>
          <PlatformPicker domainsText={form.domainsText} onChange={(domainsText) => set({ domainsText })} />
        </Panel>
        <Panel title="Languages" description={`Max ${LIMITS.maxLanguages} ISO codes`}>
          <TextArea
            rows={3}
            placeholder="en, es, fr"
            value={form.languagesText}
            onChange={(e) => set({ languagesText: e.target.value })}
          />
        </Panel>
        <Panel title="Usernames" description={`Max ${LIMITS.maxUsernames}`}>
          <TextArea
            rows={3}
            placeholder="elonmusk, BillGates"
            value={form.usernamesText}
            onChange={(e) => set({ usernamesText: e.target.value })}
          />
          <label className="mt-3 flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={form.caseSensitiveUsernames}
              onChange={(e) => set({ caseSensitiveUsernames: e.target.checked })}
            />
            Case-sensitive usernames (default: insensitive)
          </label>
        </Panel>
        <Panel title="Locations" description={`Max ${LIMITS.maxLocations} · substring · OR`}>
          <TextArea
            rows={3}
            placeholder="Paris, New York, London"
            value={form.locationsText}
            onChange={(e) => set({ locationsText: e.target.value })}
          />
        </Panel>
      </div>

      <Panel title="Selective filters (keywords optional)" description="Fetch by identity / URL without keyword_groups">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <FieldLabel hint={`max ${LIMITS.maxExternalIds}`}>external_ids</FieldLabel>
            <TextArea
              rows={4}
              value={form.externalIdsText}
              onChange={(e) => set({ externalIdsText: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel hint={`max ${LIMITS.maxExternalParentIds}`}>external_parent_ids</FieldLabel>
            <TextArea
              rows={4}
              value={form.externalParentIdsText}
              onChange={(e) => set({ externalParentIdsText: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel hint={`max ${LIMITS.maxUrlPatterns}`}>url_patterns</FieldLabel>
            <TextArea
              rows={4}
              placeholder="reddit.com/r/france"
              value={form.urlPatternsText}
              onChange={(e) => set({ urlPatternsText: e.target.value })}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Exclusion keyword groups" description={`Max ${LIMITS.maxExcludeKeywordGroups} · applied after inclusion`}>
        <div className="space-y-3">
          {form.excludeKeywordGroups.map((group, index) => (
            <div key={index} className="rounded-lg border border-border bg-bg-elevated p-3">
              <div className="mb-2 flex justify-between">
                <Select
                  className="w-24"
                  value={group.operator}
                  onChange={(e) => {
                    const next = [...form.excludeKeywordGroups];
                    next[index] = { ...group, operator: e.target.value as "OR" | "AND" };
                    set({ excludeKeywordGroups: next });
                  }}
                >
                  <option value="OR">OR</option>
                  <option value="AND">AND</option>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    set({ excludeKeywordGroups: form.excludeKeywordGroups.filter((_, i) => i !== index) })
                  }
                >
                  Remove
                </Button>
              </div>
              <TextArea
                rows={2}
                value={group.termsText}
                onChange={(e) => {
                  const next = [...form.excludeKeywordGroups];
                  next[index] = { ...group, termsText: e.target.value };
                  set({ excludeKeywordGroups: next });
                }}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={form.excludeKeywordGroups.length >= LIMITS.maxExcludeKeywordGroups}
          onClick={() =>
            set({
              excludeKeywordGroups: [...form.excludeKeywordGroups, { termsText: "", operator: "OR" }],
            })
          }
        >
          Add exclusion group
        </Button>
      </Panel>

      <Panel title="Proximity groups (NEAR/N)" description={`Max ${LIMITS.maxProximityGroups} · distance ${LIMITS.proximityDistanceMin}–${LIMITS.proximityDistanceMax} · requires keywords`}>
        <div className="space-y-3">
          {form.proximityGroups.map((group, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-border bg-bg-elevated p-3 sm:grid-cols-4">
              <TextInput
                placeholder="term_a"
                value={group.term_a}
                onChange={(e) => {
                  const next = [...form.proximityGroups];
                  next[index] = { ...group, term_a: e.target.value };
                  set({ proximityGroups: next });
                }}
              />
              <TextInput
                placeholder="term_b"
                value={group.term_b}
                onChange={(e) => {
                  const next = [...form.proximityGroups];
                  next[index] = { ...group, term_b: e.target.value };
                  set({ proximityGroups: next });
                }}
              />
              <TextInput
                type="number"
                min={1}
                max={10}
                value={group.distance}
                onChange={(e) => {
                  const next = [...form.proximityGroups];
                  next[index] = { ...group, distance: Number(e.target.value) || 1 };
                  set({ proximityGroups: next });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => set({ proximityGroups: form.proximityGroups.filter((_, i) => i !== index) })}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={form.proximityGroups.length >= LIMITS.maxProximityGroups}
          onClick={() =>
            set({
              proximityGroups: [...form.proximityGroups, { term_a: "", term_b: "", distance: 5 }],
            })
          }
        >
          Add proximity group
        </Button>
      </Panel>

      <Panel title="Profile filters (x.com only)" description={`Max ${LIMITS.maxProfileFilterFields} fields · ${LIMITS.maxProfileFilterValues} values each · AND across fields`}>
        <div className="space-y-3">
          {form.profileFilters.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-border bg-bg-elevated p-3 sm:grid-cols-[1fr_2fr_auto]">
              <Select
                value={row.field}
                onChange={(e) => {
                  const next = [...form.profileFilters];
                  next[index] = { ...row, field: e.target.value };
                  set({ profileFilters: next });
                }}
              >
                {PROFILE_FILTER_FIELDS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.match})
                  </option>
                ))}
              </Select>
              <TextInput
                placeholder="values (comma-separated)"
                value={row.valuesText}
                onChange={(e) => {
                  const next = [...form.profileFilters];
                  next[index] = { ...row, valuesText: e.target.value };
                  set({ profileFilters: next });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => set({ profileFilters: form.profileFilters.filter((_, i) => i !== index) })}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={form.profileFilters.length >= LIMITS.maxProfileFilterFields}
          onClick={() =>
            set({
              profileFilters: [
                ...form.profileFilters,
                { field: "user_verified", valuesText: "true" },
              ],
            })
          }
        >
          Add profile filter
        </Button>
      </Panel>

      <Panel title="Field exclusion" description="Default excludes embeddings. Pass [] to include all fields.">
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["default", "Default (exclude embeddings)"],
              ["include_all", "Include all (exclude_fields: [])"],
              ["custom", "Custom exclude list"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="radio"
                name="excludeFieldsMode"
                checked={form.excludeFieldsMode === value}
                onChange={() => set({ excludeFieldsMode: value })}
              />
              {label}
            </label>
          ))}
        </div>
        {form.excludeFieldsMode === "custom" && (
          <TextArea
            className="mt-3"
            rows={2}
            placeholder="analysis_embedding, summary"
            value={form.excludeFieldsText}
            onChange={(e) => set({ excludeFieldsText: e.target.value })}
          />
        )}
      </Panel>

      {mode === "export" && (
        <Panel title="Export-only options" description="Not sent on preview">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>output_format</FieldLabel>
              <Select
                value={form.outputFormat}
                onChange={(e) => set({ outputFormat: e.target.value as "jsonl" | "csv" })}
              >
                <option value="jsonl">jsonl (default)</option>
                <option value="csv">csv</option>
              </Select>
            </div>
            <div>
              <FieldLabel hint="1 – 200M">result_limit</FieldLabel>
              <TextInput
                value={form.resultLimit}
                onChange={(e) => set({ resultLimit: e.target.value })}
                placeholder="optional total cap"
              />
            </div>
            <div>
              <FieldLabel hint="1 – 100k · needs dates · 90d span">per_day_limit</FieldLabel>
              <TextInput
                value={form.perDayLimit}
                onChange={(e) => set({ perDayLimit: e.target.value })}
                placeholder="optional per UTC day"
              />
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Request payload" description="Validated client-side against API limits">
        {!validation.success && (
          <Alert tone="warning">
            {validation.error.issues.map((i) => i.message).join(" · ")}
          </Alert>
        )}
        <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-text">
          {JSON.stringify(body, null, 2)}
        </pre>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-accent">Copy as curl</summary>
          <pre className="mt-2 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-[11px] text-text-muted">
            {buildCurl(body, mode)}
          </pre>
        </details>
      </Panel>
    </div>
  );
}
