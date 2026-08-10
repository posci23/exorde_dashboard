"use client";

import { useMemo, useState } from "react";
import { ChipMultiSelect, type ChipOption } from "./ChipMultiSelect";
import {
  ALL_LANGUAGES,
  DATE_RANGE_PRESETS,
  FIELD_PRESETS,
  FIELD_REFERENCE,
  LIMITS,
  PER_DAY_LIMIT_PRESETS,
  PLATFORMS,
  PROFILE_FILTER_FIELDS,
  RESULT_LIMIT_PRESETS,
  URL_PATTERN_EXAMPLES,
} from "@/lib/constants";
import {
  buildCurl,
  buildQueryBody,
  createEmptyQueryForm,
  effectiveExcludedFields,
  getSpanDays,
  matchDatePreset,
  relativeDateRange,
  splitList,
  summarizeAdvanced,
  summarizeKeywords,
  summarizeOutput,
  summarizePeople,
  summarizeSources,
  summarizeTimeRange,
  type QueryFormState,
} from "@/lib/query-form";
import {
  Alert,
  Button,
  DateTimeField,
  FieldLabel,
  NumberChoice,
  RadioCards,
  Section,
  SegmentedControl,
  Select,
  TextArea,
  TextInput,
} from "./ui";

type Props = {
  form: QueryFormState;
  onChange: (next: QueryFormState) => void;
};

const OPERATOR_OPTIONS = [
  { value: "OR" as const, label: "OR", hint: "Match any term in this group" },
  { value: "AND" as const, label: "AND", hint: "Match every term in this group" },
];

const PLATFORM_OPTIONS: ChipOption[] = PLATFORMS.map((p) => ({
  value: p.domain,
  label: p.label,
  note: p.note ?? undefined,
  group: p.group,
}));

const LANGUAGE_OPTIONS: ChipOption[] = ALL_LANGUAGES.map((l) => ({
  value: l.code,
  label: l.label,
  group: l.tier,
}));

/** Columns you can actually choose — the API always strips the other three. */
const SELECTABLE_FIELDS = FIELD_REFERENCE.filter((f) => f.category !== "Always Excluded");

const FIELD_OPTIONS: ChipOption[] = SELECTABLE_FIELDS.map((f) => ({
  value: f.name,
  label: f.name,
  note: f.description,
  group: f.category,
}));

/**
 * Columns a preset leaves in the file. Derived from the same resolver that
 * builds the request body, so the count on each card can't drift from what the
 * export actually contains.
 */
function keptFields(form: QueryFormState, presetId: string): string[] {
  const excluded = new Set(effectiveExcludedFields({ ...form, fieldPreset: presetId }));
  return SELECTABLE_FIELDS.filter((f) => !excluded.has(f.name)).map((f) => f.name);
}

/** Comma-separated form field ⇄ the string[] that ChipMultiSelect works with. */
function listProps(
  value: string,
  onCommit: (text: string) => void,
): { selected: string[]; onChange: (next: string[]) => void } {
  return {
    selected: splitList(value),
    onChange: (next) => onCommit([...new Set(next)].join(", ")),
  };
}

export function QueryBuilder({ form, onChange }: Props) {
  const [payloadMode, setPayloadMode] = useState<"preview" | "export">("preview");
  const empty = useMemo(createEmptyQueryForm, []);
  const set = (patch: Partial<QueryFormState>) => onChange({ ...form, ...patch });

  const body = buildQueryBody(form, payloadMode);
  const spanDays = getSpanDays(form.startDate, form.endDate);
  const activePreset = matchDatePreset(form);
  const hasDates = Boolean(form.startDate.trim() && form.endDate.trim());
  const spanOverLimit = spanDays != null && spanDays > LIMITS.maxDateRangeDays;
  const perDaySet = Boolean(form.perDayLimit.trim());

  const keptFieldNames = keptFields(form, form.fieldPreset);

  return (
    <div className="space-y-3">
      <Section
        title="What words must appear?"
        helpHref="/reference?tab=filters&section=Keywords"
        helpLabel="keywords"
        summary={summarizeKeywords(form).summary}
        count={summarizeKeywords(form).count}
        defaultOpen
        help={`Up to ${LIMITS.maxKeywordGroups} groups of ${LIMITS.maxTermsPerGroup} terms. Wrap in "double quotes" for an exact phrase; end with * to match a prefix.`}
        onClear={() => set({ keywordGroups: [], fullStringScan: false })}
      >
        {form.keywordGroups.length > 1 && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <FieldLabel
              hint="group_operator"
              help="AND is stricter: a post has to satisfy every group. Use it to cross two topics, e.g. group 1 = crypto terms, group 2 = regulation terms."
            >
              Must a post match every group?
            </FieldLabel>
            <SegmentedControl
              value={form.groupOperator}
              options={[
                { value: "AND" as const, label: "AND", hint: "Post must match every group" },
                { value: "OR" as const, label: "OR", hint: "Post may match any group" },
              ]}
              onChange={(groupOperator) => set({ groupOperator })}
            />
          </div>
        )}

        <div className="space-y-3">
          {form.keywordGroups.map((group, index) => (
            <div key={index} className="rounded-md border border-border bg-surface-raised p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-text-muted">Group {index + 1} · match</span>
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    value={group.operator}
                    options={OPERATOR_OPTIONS}
                    onChange={(operator) => {
                      const next = [...form.keywordGroups];
                      next[index] = { ...group, operator };
                      set({ keywordGroups: next });
                    }}
                  />
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
              <p className="mt-1 text-xs text-text-muted">
                {splitList(group.termsText).length} / {LIMITS.maxTermsPerGroup} terms
              </p>
            </div>
          ))}
          {!form.keywordGroups.length && (
            <p className="text-xs text-text-muted">
              No keyword groups. That&apos;s allowed only when you set a selective filter under
              “People &amp; IDs”.
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={form.keywordGroups.length >= LIMITS.maxKeywordGroups}
            onClick={() => set({ keywordGroups: [...form.keywordGroups, { termsText: "", operator: "OR" }] })}
          >
            Add keyword group
          </Button>
          <span className="text-xs text-text-muted">
            {form.keywordGroups.length} / {LIMITS.maxKeywordGroups}
          </span>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <FieldLabel
            hint="full_string_scan"
            help="Fast matches whole words only, so “BTC” won’t be found inside “#BTCUSD”. Safe scans the raw text character by character and catches those, at 5–10× the cost."
          >
            How closely should terms be matched?
          </FieldLabel>
          <SegmentedControl
            value={form.fullStringScan ? "safe" : "fast"}
            options={[
              { value: "fast", label: "Fast", hint: "Token/Bloom index match — 10–20× faster" },
              { value: "safe", label: "Safe", hint: "Substring scan for partial words and short codes" },
            ]}
            onChange={(v) => set({ fullStringScan: v === "safe" })}
          />
          <p className="mt-2 text-xs text-text-muted">
            {form.fullStringScan
              ? "Safe mode finds partial words and short codes like BTC, but runs 5–10× slower."
              : "Fast mode matches whole words. Switch to Safe if your terms are short codes or fragments."}
          </p>
        </div>
      </Section>

      <Section
        title="When were the posts written?"
        helpHref="/reference?tab=filters&section=Time+range"
        helpLabel="the time range"
        summary={summarizeTimeRange(form).summary}
        count={summarizeTimeRange(form).count}
        defaultOpen
        help={`Dates are UTC. Max span is ${LIMITS.maxDateRangeDays} days, or ${LIMITS.maxPerDaySpanDays} days when a per-day cap is set.`}
      >
        <div className="flex flex-wrap gap-2">
          {DATE_RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant={activePreset === preset.id ? "primary" : "secondary"}
              onClick={() => set(relativeDateRange(preset.days))}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel
              hint="start_date · UTC"
              help="Times are UTC, not your local clock. A post written at 23:00 in Madrid counts as 21:00 or 22:00 here depending on the season."
            >
              Not before
            </FieldLabel>
            <DateTimeField value={form.startDate} onChange={(startDate) => set({ startDate })} />
          </div>
          <div>
            <FieldLabel
              hint="end_date · UTC"
              help="Leave this at “now” for a rolling window. Exorde indexes posts within minutes, so the last hour may still be filling in."
            >
              Not after
            </FieldLabel>
            <DateTimeField value={form.endDate} onChange={(endDate) => set({ endDate })} />
          </div>
        </div>

        {spanDays != null && (
          <p className="mt-2 text-xs text-text-muted">
            Span: <span className="font-mono text-text">{spanDays.toFixed(1)} days</span>
          </p>
        )}
        {spanOverLimit && !perDaySet && (
          <Alert tone="warning">
            {spanDays!.toFixed(1)}-day span exceeds the {LIMITS.maxDateRangeDays}-day limit. Set a per-day
            row cap under “Output” to allow up to {LIMITS.maxPerDaySpanDays} days.
          </Alert>
        )}
        {spanDays != null && spanDays < 0 && (
          <Alert tone="danger">End date is before start date.</Alert>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <FieldLabel
            hint="collected_at_* · optional"
            help="Two different clocks: above is when the author posted, this is when Exorde saw it. They differ when older posts get backfilled — most people can ignore this."
          >
            When did Exorde collect it?
          </FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateTimeField
              value={form.collectedAtStartDate}
              disabled={!hasDates}
              onChange={(collectedAtStartDate) => set({ collectedAtStartDate })}
            />
            <DateTimeField
              value={form.collectedAtEndDate}
              disabled={!hasDates}
              onChange={(collectedAtEndDate) => set({ collectedAtEndDate })}
            />
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            {hasDates
              ? "Narrows to posts ingested in this window — useful for catching backfilled data. Requires both dates above."
              : "Set both dates above to enable collection-time filtering."}
          </p>
          {(form.collectedAtStartDate || form.collectedAtEndDate) && (
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => set({ collectedAtStartDate: "", collectedAtEndDate: "" })}
            >
              Clear collection window
            </Button>
          )}
        </div>
      </Section>

      <Section
        title="Where should posts come from?"
        helpHref="/reference?tab=filters&section=Sources"
        helpLabel="platforms and languages"
        summary={summarizeSources(form).summary}
        count={summarizeSources(form).count}
        defaultOpen
        help="Leave any of these empty to place no restriction on that dimension."
        onClear={() => set({ domainsText: "", languagesText: "", locationsText: "" })}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <ChipMultiSelect
            label="Which platforms?"
            hint="domains · exact match"
            help="Matches the post's domain exactly, so “reddit.com” covers every subreddit. To narrow to one subreddit or channel, use the URL field below instead."
            options={PLATFORM_OPTIONS}
            max={LIMITS.maxDomains}
            emptyLabel="All platforms (no domain filter)"
            searchPlaceholder="Search platforms…"
            customPlaceholder="Other domain, e.g. example-forum.com"
            footnote="Exorde covers 200+ sources. For subreddits or channels, URL patterns usually work better than domains."
            {...listProps(form.domainsText, (domainsText) => set({ domainsText }))}
          />
          <ChipMultiSelect
            label="Which languages?"
            hint="ISO 639 codes"
            help="Detected per post, not per author. Detection on very short posts is unreliable, so a strict language filter can drop real matches."
            options={LANGUAGE_OPTIONS}
            max={LIMITS.maxLanguages}
            emptyLabel="All languages"
            searchPlaceholder="Search languages…"
            customPlaceholder="Other ISO code, e.g. sw"
            footnote="176+ codes are supported; the list shows the most common. Add any other code directly."
            {...listProps(form.languagesText, (languagesText) => set({ languagesText }))}
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <FieldLabel
            hint={`locations · max ${LIMITS.maxLocations}`}
            help="This is the free-text location people type on their profile, not a verified GPS location. “Paris” also matches “Paris, Texas” and “Parisian at heart”."
          >
            Where is the author from?
          </FieldLabel>
          <TextArea
            rows={2}
            placeholder="Paris, New York, London"
            value={form.locationsText}
            onChange={(e) => set({ locationsText: e.target.value })}
          />
          <p className="mt-1 text-xs text-text-muted">
            {splitList(form.locationsText).length} / {LIMITS.maxLocations} · matches the user-declared
            location field, case-insensitively.
          </p>
        </div>
      </Section>

      <Section
        title="Which authors or specific posts?"
        helpHref="/reference?tab=filters&section=People+%26+IDs"
        helpLabel="authors and post IDs"
        summary={summarizePeople(form).summary}
        count={summarizePeople(form).count}
        help="These are selective filters — any one of them lets you run a query with no keywords at all."
        onClear={() =>
          set({
            usernamesText: "",
            externalIdsText: "",
            externalParentIdsText: "",
            urlPatternsText: "",
            caseSensitiveUsernames: false,
          })
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <FieldLabel
              hint={`usernames · max ${LIMITS.maxUsernames}`}
              help="Handles without the @, comma-separated. Setting this alone is enough to run a query — you don't also need keywords."
            >
              Who wrote the post?
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="elonmusk, BillGates"
              value={form.usernamesText}
              onChange={(e) => set({ usernamesText: e.target.value })}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-muted">Name matching</span>
              <SegmentedControl
                value={form.caseSensitiveUsernames ? "exact" : "insensitive"}
                options={[
                  { value: "insensitive", label: "Ignore case", hint: "Default" },
                  { value: "exact", label: "Exact case" },
                ]}
                onChange={(v) => set({ caseSensitiveUsernames: v === "exact" })}
              />
            </div>
          </div>
          <div>
            <FieldLabel
              hint={`url_patterns · max ${LIMITS.maxUrlPatterns}`}
              help="A plain substring of the post's link — no wildcards needed. This is how you target one subreddit or one YouTube channel, which the platform filter can't do."
            >
              What should the link contain?
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="reddit.com/r/france"
              value={form.urlPatternsText}
              onChange={(e) => set({ urlPatternsText: e.target.value })}
            />
            <p className="mt-1 text-xs text-text-muted">
              Case-insensitive substring of the post URL — the reliable way to target a subreddit or channel.
            </p>
            <div className="mt-2">
              <span className="label-caps">Insert an example</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {URL_PATTERN_EXAMPLES.map((example) => (
                  <button
                    key={example.value}
                    type="button"
                    title={example.note ?? example.label}
                    onClick={() =>
                      set({
                        urlPatternsText: [...new Set([...splitList(form.urlPatternsText), example.value])].join(
                          ", ",
                        ),
                      })
                    }
                    className="rounded-full bg-surface-hover px-2.5 py-1 font-mono text-xs text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                  >
                    + {example.value}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <FieldLabel
              hint={`external_ids · max ${LIMITS.maxExternalIds}`}
              help="The platform's own ID for a post — the number at the end of an X link, or a t1_… code on Reddit. Use it to re-fetch posts you already know about."
            >
              Any exact posts to fetch?
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="1234567890, t1_abcdef"
              value={form.externalIdsText}
              onChange={(e) => set({ externalIdsText: e.target.value })}
            />
            <p className="mt-1 text-xs text-text-muted">Re-fetch exact posts by their platform ID.</p>
          </div>
          <div>
            <FieldLabel
              hint={`external_parent_ids · max ${LIMITS.maxExternalParentIds}`}
              help="Give a post's ID and you get the replies underneath it instead of the post itself — useful for pulling a whole discussion thread."
            >
              Replies under which posts?
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="1234567890"
              value={form.externalParentIdsText}
              onChange={(e) => set({ externalParentIdsText: e.target.value })}
            />
            <p className="mt-1 text-xs text-text-muted">Pull the replies and thread under a given post.</p>
          </div>
        </div>
      </Section>

      <Section
        title="What should be filtered out?"
        helpHref="/reference?tab=filters&section=Advanced"
        helpLabel="exclusions and advanced filters"
        summary={summarizeAdvanced(form).summary}
        count={summarizeAdvanced(form).count}
        onClear={() => set({ excludeKeywordGroups: [], proximityGroups: [], profileFilters: [] })}
      >
        <div className="space-y-6">
          <div>
            <FieldLabel
              hint={`exclude_keyword_groups · max ${LIMITS.maxExcludeKeywordGroups}`}
              help="Drops any post containing these words. The usual use is spam: “giveaway, airdrop, follow me”. Exclusions always win over keyword matches."
            >
              Which words disqualify a post?
            </FieldLabel>
            <div className="space-y-3">
              {form.excludeKeywordGroups.map((group, index) => (
                <div key={index} className="rounded-md border border-border bg-surface-raised p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <SegmentedControl
                      value={group.operator}
                      options={OPERATOR_OPTIONS}
                      onChange={(operator) => {
                        const next = [...form.excludeKeywordGroups];
                        next[index] = { ...group, operator };
                        set({ excludeKeywordGroups: next });
                      }}
                    />
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
                    placeholder="spam, giveaway, follow"
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
                set({ excludeKeywordGroups: [...form.excludeKeywordGroups, { termsText: "", operator: "OR" }] })
              }
            >
              Add exclusion group
            </Button>
          </div>

          <div className="border-t border-border pt-5">
            <FieldLabel
              hint={`proximity_groups · max ${LIMITS.maxProximityGroups}`}
              help="Requires two words to sit close together, which usually means they're actually related. “bitcoin” within 5 words of “ban” finds real discussion; the same two words 200 words apart usually don't."
            >
              Which terms must sit close together?
            </FieldLabel>
            <div className="space-y-3">
              {form.proximityGroups.map((group, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-raised p-3"
                >
                  <TextInput
                    className="w-40"
                    placeholder="first term"
                    value={group.term_a}
                    onChange={(e) => {
                      const next = [...form.proximityGroups];
                      next[index] = { ...group, term_a: e.target.value };
                      set({ proximityGroups: next });
                    }}
                  />
                  <span className="text-xs text-text-muted">within</span>
                  <Select
                    className="w-20"
                    value={group.distance}
                    onChange={(e) => {
                      const next = [...form.proximityGroups];
                      next[index] = { ...group, distance: Number(e.target.value) };
                      set({ proximityGroups: next });
                    }}
                  >
                    {Array.from(
                      { length: LIMITS.proximityDistanceMax - LIMITS.proximityDistanceMin + 1 },
                      (_, i) => i + LIMITS.proximityDistanceMin,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                  <span className="text-xs text-text-muted">words of</span>
                  <TextInput
                    className="w-40"
                    placeholder="second term"
                    value={group.term_b}
                    onChange={(e) => {
                      const next = [...form.proximityGroups];
                      next[index] = { ...group, term_b: e.target.value };
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
                set({ proximityGroups: [...form.proximityGroups, { term_a: "", term_b: "", distance: 5 }] })
              }
            >
              Add proximity rule
            </Button>
          </div>

          <div className="border-t border-border pt-5">
            <FieldLabel
              hint={`profile_filters · x.com only · max ${LIMITS.maxProfileFilterFields}`}
              help="Filters on the author's X profile — bio text, follower count, verified status. Posts from every other platform are dropped when you use this, because only X carries the metadata."
            >
              What must be true of the author?
            </FieldLabel>
            <div className="space-y-3">
              {form.profileFilters.map((row, index) => {
                const field = PROFILE_FILTER_FIELDS.find((f) => f.name === row.field);
                const update = (patch: Partial<(typeof form.profileFilters)[number]>) => {
                  const next = [...form.profileFilters];
                  next[index] = { ...row, ...patch };
                  set({ profileFilters: next });
                };
                return (
                  <div
                    key={index}
                    className="grid gap-2 rounded-md border border-border bg-surface-raised p-3 sm:grid-cols-[1fr_2fr_auto]"
                  >
                    <Select
                      value={row.field}
                      onChange={(e) => {
                        const nextField = PROFILE_FILTER_FIELDS.find((f) => f.name === e.target.value);
                        update({
                          field: e.target.value,
                          valuesText: nextField?.values ? nextField.values[0] : "",
                        });
                      }}
                    >
                      {PROFILE_FILTER_FIELDS.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label} ({f.match})
                        </option>
                      ))}
                    </Select>
                    {field?.values ? (
                      <SegmentedControl
                        value={row.valuesText}
                        options={field.values.map((v) => ({ value: v, label: v }))}
                        onChange={(valuesText) => update({ valuesText })}
                      />
                    ) : (
                      <TextInput
                        placeholder={field?.placeholder ?? "values (comma-separated)"}
                        value={row.valuesText}
                        onChange={(e) => update({ valuesText: e.target.value })}
                      />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => set({ profileFilters: form.profileFilters.filter((_, i) => i !== index) })}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              disabled={form.profileFilters.length >= LIMITS.maxProfileFilterFields}
              onClick={() =>
                set({ profileFilters: [...form.profileFilters, { field: "user_verified", valuesText: "true" }] })
              }
            >
              Add profile filter
            </Button>
            <p className="mt-2 text-xs text-text-muted">
              Fields combine with AND; up to {LIMITS.maxProfileFilterValues} values each (OR within a field).
              Only x.com posts carry this metadata.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="What goes in the file?"
        helpHref="/reference?tab=filters&section=Output"
        helpLabel="output fields and formats"
        defaultOpen
        summary={summarizeOutput(form).summary}
        count={summarizeOutput(form).count}
        help="Format and row caps apply to exports only — previews ignore them and always return ~100 sample rows."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <FieldLabel
              hint="output_format"
              help="Pick CSV if you're opening this in Excel or Sheets. Pick JSONL if you're loading it with pandas, a script, or anything that reads line by line."
            >
              Which file format?
            </FieldLabel>
            <SegmentedControl
              value={form.outputFormat}
              options={[
                { value: "jsonl" as const, label: "JSONL", hint: "Default — streaming-friendly, nested fields stay JSON" },
                { value: "csv" as const, label: "CSV", hint: "Excel/Sheets — UTF-8 BOM, arrays serialized as JSON strings" },
              ]}
              onChange={(outputFormat) => set({ outputFormat })}
            />
            <p className="mt-2 text-xs text-text-muted">
              {form.outputFormat === "jsonl"
                ? "One JSON object per line. Best for large sets and programmatic use."
                : "RFC 4180 with a UTF-8 BOM so Excel opens it correctly."}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <FieldLabel
                hint={`result_limit · max ${LIMITS.resultLimitMax.toLocaleString()}`}
                help="A hard stop on total rows. Leave it empty to get every match. Rows count against your plan quota, so a cap is a cheap safety net on a broad query."
              >
                How many rows at most?
              </FieldLabel>
              <NumberChoice
                value={form.resultLimit}
                presets={RESULT_LIMIT_PRESETS}
                min={LIMITS.resultLimitMin}
                max={LIMITS.resultLimitMax}
                placeholder="rows"
                onChange={(resultLimit) => set({ resultLimit })}
              />
            </div>
            <div>
              <FieldLabel
                hint={`per_day_limit · max ${LIMITS.perDayLimitMax.toLocaleString()}`}
                help="Takes an even sample from each UTC day instead of letting one busy day dominate. Setting it also raises the maximum date range from 30 to 90 days."
              >
                How many rows per day?
              </FieldLabel>
              <NumberChoice
                value={form.perDayLimit}
                presets={PER_DAY_LIMIT_PRESETS}
                min={LIMITS.perDayLimitMin}
                max={LIMITS.perDayLimitMax}
                placeholder="rows per UTC day"
                onChange={(perDayLimit) => set({ perDayLimit })}
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Samples evenly across days and raises the max span to {LIMITS.maxPerDaySpanDays} days. Requires
                both dates.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <FieldLabel
            hint="exclude_fields"
            help={`Every row can carry up to ${SELECTABLE_FIELDS.length} columns, and most of them are AI-generated scores. Picking a preset here sets the API's exclude_fields list for you.`}
          >
            What should each row contain?
          </FieldLabel>
          <RadioCards
            label="What should each row contain?"
            value={form.fieldPreset}
            options={FIELD_PRESETS.map((p) => ({
              value: p.id,
              label: p.label,
              description: p.description,
              badge: `${keptFields(form, p.id).length} cols`,
            }))}
            onChange={(fieldPreset) => set({ fieldPreset })}
          />

          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            {keptFieldNames.length === 0 ? (
              <span className="text-warning">
                Every column is excluded — the export would have no data.
              </span>
            ) : (
              <>
                Keeping{" "}
                <span className="font-mono text-text">
                  {keptFieldNames.slice(0, 12).join(", ")}
                  {keptFieldNames.length > 12 && ` +${keptFieldNames.length - 12} more`}
                </span>
              </>
            )}
          </p>

          {form.fieldPreset === "custom" && (
            <div className="mt-4">
              <ChipMultiSelect
                label="Which columns should be left out?"
                help={`Anything you tick here is dropped from every row. Leave it empty to keep all ${SELECTABLE_FIELDS.length}.`}
                options={FIELD_OPTIONS}
                emptyLabel={`Nothing excluded — all ${SELECTABLE_FIELDS.length} columns`}
                searchPlaceholder="Search columns…"
                footnote="analysis_source_type, collection_module and collection_client_version are always excluded by the API."
                {...listProps(form.excludeFieldsText, (excludeFieldsText) => set({ excludeFieldsText }))}
              />
            </div>
          )}
        </div>
      </Section>

      <Section
        title="What gets sent to the API?"
        summary="The exact JSON this dashboard will send"
        help="Use this to reproduce the query outside the dashboard."
      >
        <SegmentedControl
          value={payloadMode}
          options={[
            { value: "preview" as const, label: "Preview body" },
            { value: "export" as const, label: "Export body" },
          ]}
          onChange={setPayloadMode}
        />
        <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-text">
          {JSON.stringify(body, null, 2)}
        </pre>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-accent">Copy as curl</summary>
          <pre className="mt-2 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-text-muted">
            {buildCurl(body, payloadMode)}
          </pre>
        </details>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => onChange({ ...empty, startDate: form.startDate, endDate: form.endDate })}
        >
          Reset all filters
        </Button>
      </Section>
    </div>
  );
}
