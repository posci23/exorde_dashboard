"use client";

import { useMemo, type ReactNode } from "react";
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
  FilterChip,
  NumberChoice,
  RadioCards,
  Section,
  SegmentedControl,
  Select,
  TextArea,
  TextInput,
} from "./ui";
import { useT } from "@/lib/i18n/locale";

type Props = {
  form: QueryFormState;
  onChange: (next: QueryFormState) => void;
};







/** Columns you can actually choose — the API always strips the other three. */
const SELECTABLE_FIELDS = FIELD_REFERENCE.filter((f) => f.category !== "Always Excluded");



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
  const t = useT();
  const OPERATOR_OPTIONS = [
    { value: "OR" as const, label: "OR", hint: t.builder.matchAny },
    { value: "AND" as const, label: "AND", hint: t.builder.matchAll },
  ];
  const empty = useMemo(createEmptyQueryForm, []);
  const set = (patch: Partial<QueryFormState>) => onChange({ ...form, ...patch });

  const spanDays = getSpanDays(form.startDate, form.endDate);
  const activePreset = matchDatePreset(form);
  const hasDates = Boolean(form.startDate.trim() && form.endDate.trim());
  const spanOverLimit = spanDays != null && spanDays > LIMITS.maxDateRangeDays;
  const perDaySet = Boolean(form.perDayLimit.trim());

  const keptFieldNames = keptFields(form, form.fieldPreset);

  // Catalog text lives in constants.ts; the dictionary only carries overrides,
  // so English never gets duplicated and a missing translation degrades to it.
  const PLATFORM_OPTIONS: ChipOption[] = PLATFORMS.map((p) => ({
    value: p.domain,
    label: p.label,
    group: t.catalog.platformGroup[p.group] ?? p.group,
  }));
  const LANGUAGE_OPTIONS: ChipOption[] = ALL_LANGUAGES.map((l) => ({
    value: l.code,
    label: l.label,
    group: t.catalog.languageTier[l.tier] ?? l.tier,
  }));
  const FIELD_OPTIONS: ChipOption[] = SELECTABLE_FIELDS.map((f) => ({
    value: f.name,
    label: f.name,
    group: t.catalog.fieldCategory[f.category] ?? f.category,
  }));

  const urlHelpContent = useMemo((): ReactNode => {
    return (
      <span>
        {t.builder.urlHelp}
        <span className="mt-2 block font-medium text-text">{t.builder.urlExamplesHeading}</span>
        <ul className="mt-1 space-y-0.5">
          {URL_PATTERN_EXAMPLES.map((example) => (
            <li key={example.value}>
              <span className="font-mono text-label-md">{example.value}</span>
              {(t.catalog.urlExample[example.value] ?? example.note) && (
                <span className="text-text-subtle">
                  {" "}
                  — {t.catalog.urlExample[example.value] ?? example.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      </span>
    );
  }, [t]);

  return (
    <div className="space-y-3">
      <Section
        title={t.builder.keywordsTitle}
        helpHref="/reference?tab=filters&section=Keywords"
        helpLabel={t.builder.keywordsLabel}
        summary={summarizeKeywords(form, t).summary}
        count={summarizeKeywords(form, t).count}
        defaultOpen
        help={t.builder.keywordsHelp(LIMITS.maxKeywordGroups, LIMITS.maxTermsPerGroup)}
        onClear={() => set({ keywordGroups: [], fullStringScan: false })}
      >
        {form.keywordGroups.length > 1 && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <FieldLabel
              hint="group_operator"
              help={t.builder.groupOperatorHelp}
            >
              {t.builder.groupOperatorLabel}
            </FieldLabel>
            <SegmentedControl
              value={form.groupOperator}
              options={[
                { value: "AND" as const, label: "AND", hint: t.builder.andHint },
                { value: "OR" as const, label: "OR", hint: t.builder.orHint },
              ]}
              onChange={(groupOperator) => set({ groupOperator })}
            />
          </div>
        )}

        <div className="space-y-3">
          {form.keywordGroups.map((group, index) => (
            <div key={index} className="rounded-xl bg-surface p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-text-muted">{t.builder.groupN(index + 1)}</span>
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
                    {t.common.remove}
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
                {t.builder.termsCount(splitList(group.termsText).length, LIMITS.maxTermsPerGroup)}
              </p>
            </div>
          ))}
          {!form.keywordGroups.length && (
            <p className="text-xs text-text-muted">
              {t.builder.noGroups}
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
            {t.builder.addGroup}
          </Button>
          <span className="text-xs text-text-muted">
            {form.keywordGroups.length} / {LIMITS.maxKeywordGroups}
          </span>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <FieldLabel
            hint="full_string_scan"
            help={t.builder.matchModeHelp}
          >
            {t.builder.matchModeLabel}
          </FieldLabel>
          <SegmentedControl
            value={form.fullStringScan ? "safe" : "fast"}
            options={[
              { value: "fast", label: t.builder.fast, hint: t.builder.fastHint },
              { value: "safe", label: t.builder.safe, hint: t.builder.safeHint },
            ]}
            onChange={(v) => set({ fullStringScan: v === "safe" })}
          />
          <p className="mt-2 text-xs text-text-muted">
            {form.fullStringScan
              ? t.builder.safeNote
              : t.builder.fastNote}
          </p>
        </div>
      </Section>

      <Section
        title={t.builder.timeTitle}
        helpHref="/reference?tab=filters&section=Time+range"
        helpLabel={t.builder.timeLabel}
        summary={summarizeTimeRange(form, t).summary}
        count={summarizeTimeRange(form, t).count}
        help={t.builder.timeHelp(LIMITS.maxDateRangeDays, LIMITS.maxPerDaySpanDays)}
      >
        <div className="flex flex-wrap gap-2">
          {DATE_RANGE_PRESETS.map((preset) => (
            <FilterChip
              key={preset.id}
              selected={activePreset === preset.id}
              onClick={() => set(relativeDateRange(preset.days))}
            >
              {t.datePresets[
                ({ "24h": "last24h", "7d": "last7d", "30d": "last30d", "90d": "last90d" } as const)[
                  preset.id
                ]
              ] ?? preset.label}
            </FilterChip>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel
              hint="start_date · UTC"
              help={t.builder.notBeforeHelp}
            >
              {t.builder.notBefore}
            </FieldLabel>
            <DateTimeField value={form.startDate} onChange={(startDate) => set({ startDate })} />
          </div>
          <div>
            <FieldLabel
              hint="end_date · UTC"
              help={t.builder.notAfterHelp}
            >
              {t.builder.notAfter}
            </FieldLabel>
            <DateTimeField value={form.endDate} onChange={(endDate) => set({ endDate })} />
          </div>
        </div>

        {spanDays != null && (
          <p className="mt-2 text-xs text-text-muted">
            {t.builder.span} <span className="font-mono text-text">{t.builder.spanDays(spanDays.toFixed(1))}</span>
          </p>
        )}
        {spanOverLimit && !perDaySet && (
          <Alert tone="warning">
            {t.builder.spanOverLimit(spanDays!.toFixed(1), LIMITS.maxDateRangeDays, LIMITS.maxPerDaySpanDays)}
          </Alert>
        )}
        {spanDays != null && spanDays < 0 && (
          <Alert tone="danger">{t.builder.endBeforeStart}</Alert>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <FieldLabel
            hint="collected_at_* · optional"
            help={t.builder.collectedHelp}
          >
            {t.builder.collectedLabel}
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
              ? t.builder.collectedOn
              : t.builder.collectedOff}
          </p>
          {(form.collectedAtStartDate || form.collectedAtEndDate) && (
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => set({ collectedAtStartDate: "", collectedAtEndDate: "" })}
            >
              {t.builder.clearCollected}
            </Button>
          )}
        </div>
      </Section>

      <Section
        title={t.builder.sourcesTitle}
        helpHref="/reference?tab=filters&section=Sources"
        helpLabel={t.builder.sourcesLabel}
        summary={summarizeSources(form, t).summary}
        count={summarizeSources(form, t).count}
        help={t.builder.sourcesHelp}
        onClear={() => set({ domainsText: "", languagesText: "", locationsText: "" })}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <ChipMultiSelect
            label={t.builder.platforms}
            hint="domains · exact match"
            help={t.builder.platformsHelp}
            options={PLATFORM_OPTIONS}
            max={LIMITS.maxDomains}
            emptyLabel={t.builder.platformsEmpty}
            searchPlaceholder={t.builder.platformsSearch}
            customPlaceholder={t.builder.platformsCustom}
            {...listProps(form.domainsText, (domainsText) => set({ domainsText }))}
          />
          <ChipMultiSelect
            label={t.builder.languages}
            hint="ISO 639 codes"
            help={t.builder.languagesHelp}
            options={LANGUAGE_OPTIONS}
            max={LIMITS.maxLanguages}
            emptyLabel={t.builder.languagesEmpty}
            searchPlaceholder={t.builder.languagesSearch}
            customPlaceholder={t.builder.languagesCustom}
            {...listProps(form.languagesText, (languagesText) => set({ languagesText }))}
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <FieldLabel
            hint={`locations · max ${LIMITS.maxLocations}`}
            help={t.builder.locationHelp}
          >
            {t.builder.locationLabel}
          </FieldLabel>
          <TextArea
            rows={2}
            placeholder="Paris, New York, London"
            value={form.locationsText}
            onChange={(e) => set({ locationsText: e.target.value })}
          />
          <p className="mt-1 text-xs text-text-muted">
            {t.builder.locationNote(splitList(form.locationsText).length, LIMITS.maxLocations)}
          </p>
        </div>
      </Section>

      <Section
        title={t.builder.peopleTitle}
        helpHref="/reference?tab=filters&section=People+%26+IDs"
        helpLabel={t.builder.peopleLabel}
        summary={summarizePeople(form, t).summary}
        count={summarizePeople(form, t).count}
        help={t.builder.peopleHelp}
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
              help={t.builder.authorsHelp}
            >
              {t.builder.authors}
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="elonmusk, BillGates"
              value={form.usernamesText}
              onChange={(e) => set({ usernamesText: e.target.value })}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-muted">{t.builder.nameMatching}</span>
              <SegmentedControl
                value={form.caseSensitiveUsernames ? "exact" : "insensitive"}
                options={[
                  { value: "insensitive", label: t.builder.ignoreCase, hint: t.builder.ignoreCaseHint },
                  { value: "exact", label: t.builder.exactCase },
                ]}
                onChange={(v) => set({ caseSensitiveUsernames: v === "exact" })}
              />
            </div>
          </div>
          <div>
            <FieldLabel
              hint={`url_patterns · max ${LIMITS.maxUrlPatterns}`}
              help={urlHelpContent}
            >
              {t.builder.urlLabel}
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="reddit.com/r/france"
              value={form.urlPatternsText}
              onChange={(e) => set({ urlPatternsText: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel
              hint={`external_ids · max ${LIMITS.maxExternalIds}`}
              help={t.builder.postIdsHelp}
            >
              {t.builder.postIds}
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="1234567890, t1_abcdef"
              value={form.externalIdsText}
              onChange={(e) => set({ externalIdsText: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel
              hint={`external_parent_ids · max ${LIMITS.maxExternalParentIds}`}
              help={t.builder.parentIdsHelp}
            >
              {t.builder.parentIds}
            </FieldLabel>
            <TextArea
              rows={3}
              placeholder="1234567890"
              value={form.externalParentIdsText}
              onChange={(e) => set({ externalParentIdsText: e.target.value })}
            />
          </div>
        </div>
      </Section>

      <Section
        title={t.builder.advancedTitle}
        helpHref="/reference?tab=filters&section=Advanced"
        helpLabel={t.builder.advancedLabel}
        summary={summarizeAdvanced(form, t).summary}
        count={summarizeAdvanced(form, t).count}
        onClear={() => set({ excludeKeywordGroups: [], proximityGroups: [], profileFilters: [] })}
      >
        <div className="space-y-6">
          <div>
            <FieldLabel
              hint={`exclude_keyword_groups · max ${LIMITS.maxExcludeKeywordGroups}`}
              help={t.builder.excludeWordsHelp}
            >
              {t.builder.excludeWords}
            </FieldLabel>
            <div className="space-y-3">
              {form.excludeKeywordGroups.map((group, index) => (
                <div key={index} className="rounded-xl bg-surface p-3">
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
                      {t.common.remove}
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
              {t.builder.addExclusion}
            </Button>
          </div>

          <div className="border-t border-border pt-5">
            <FieldLabel
              hint={`proximity_groups · max ${LIMITS.maxProximityGroups}`}
              help={t.builder.proximityHelp}
            >
              {t.builder.proximity}
            </FieldLabel>
            <div className="space-y-3">
              {form.proximityGroups.map((group, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3"
                >
                  <TextInput
                    className="w-40"
                    placeholder={t.builder.firstTerm}
                    value={group.term_a}
                    onChange={(e) => {
                      const next = [...form.proximityGroups];
                      next[index] = { ...group, term_a: e.target.value };
                      set({ proximityGroups: next });
                    }}
                  />
                  <span className="text-body-md text-text-muted">{t.builder.within}</span>
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
                  <span className="text-body-md text-text-muted">{t.builder.wordsOf}</span>
                  <TextInput
                    className="w-40"
                    placeholder={t.builder.secondTerm}
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
                    {t.common.remove}
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
              {t.builder.addProximity}
            </Button>
          </div>

          <div className="border-t border-border pt-5">
            <FieldLabel
              hint={`profile_filters · x.com only · max ${LIMITS.maxProfileFilterFields}`}
              help={t.builder.profileHelp}
            >
              {t.builder.profile}
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
                    className="grid gap-2 rounded-xl bg-surface p-3 sm:grid-cols-[1fr_2fr_auto]"
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
                          {t.catalog.profileLabel[f.name] ?? f.label} ({f.match})
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
                      {t.common.remove}
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
              {t.builder.addProfile}
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title={t.builder.outputTitle}
        helpHref="/reference?tab=filters&section=Output"
        helpLabel={t.builder.outputLabel}
        summary={summarizeOutput(form, t).summary}
        count={summarizeOutput(form, t).count}
        help={t.builder.outputHelp}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <FieldLabel
              hint="output_format"
              help={t.builder.formatHelp}
            >
              {t.builder.format}
            </FieldLabel>
            <SegmentedControl
              value={form.outputFormat}
              options={[
                { value: "jsonl" as const, label: "JSONL", hint: t.builder.jsonlHint },
                { value: "csv" as const, label: "CSV", hint: t.builder.csvHint },
              ]}
              onChange={(outputFormat) => set({ outputFormat })}
            />
            <p className="mt-2 text-xs text-text-muted">
              {form.outputFormat === "jsonl"
                ? t.builder.jsonlNote
                : t.builder.csvNote}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <FieldLabel
                hint={`result_limit · max ${LIMITS.resultLimitMax.toLocaleString()}`}
                help={t.builder.rowCapHelp}
              >
                {t.builder.rowCap}
              </FieldLabel>
              <NumberChoice
                value={form.resultLimit}
                presets={RESULT_LIMIT_PRESETS.map((p) => ({ ...p, label: t.catalog.limitLabel[p.label] ?? p.label }))}
                min={LIMITS.resultLimitMin}
                max={LIMITS.resultLimitMax}
                placeholder={t.builder.rows}
                onChange={(resultLimit) => set({ resultLimit })}
              />
            </div>
            <div>
              <FieldLabel
                hint={`per_day_limit · max ${LIMITS.perDayLimitMax.toLocaleString()}`}
                help={t.builder.perDayCapHelp}
              >
                {t.builder.perDayCap}
              </FieldLabel>
              <NumberChoice
                value={form.perDayLimit}
                presets={PER_DAY_LIMIT_PRESETS.map((p) => ({ ...p, label: t.catalog.limitLabel[p.label] ?? p.label }))}
                min={LIMITS.perDayLimitMin}
                max={LIMITS.perDayLimitMax}
                placeholder={t.builder.rowsPerDay}
                onChange={(perDayLimit) => set({ perDayLimit })}
              />
              <p className="mt-1.5 text-xs text-text-muted">
                {t.builder.perDayNote(LIMITS.maxPerDaySpanDays)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <FieldLabel
            hint="exclude_fields"
            help={t.builder.fieldsHelp(SELECTABLE_FIELDS.length)}
          >
            {t.builder.fieldsLabel}
          </FieldLabel>
          <RadioCards
            label={t.builder.fieldsLabel}
            value={form.fieldPreset}
            options={FIELD_PRESETS.map((p) => ({
              value: p.id,
              label: t.fieldPresets[p.id as keyof typeof t.fieldPresets].label,
              description: t.fieldPresets[p.id as keyof typeof t.fieldPresets].description,
              badge: t.builder.cols(keptFields(form, p.id).length),
            }))}
            onChange={(fieldPreset) => set({ fieldPreset })}
          />

          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            {keptFieldNames.length === 0 ? (
              <span className="text-warning">
                {t.builder.allExcluded}
              </span>
            ) : (
              <>
                {t.builder.keeping}{" "}
                <span className="font-mono text-text">
                  {keptFieldNames.slice(0, 12).join(", ")}
                  {keptFieldNames.length > 12 && t.builder.andMore(keptFieldNames.length - 12)}
                </span>
              </>
            )}
          </p>

          {form.fieldPreset === "custom" && (
            <div className="mt-4">
              <ChipMultiSelect
                label={t.builder.customFields}
                help={t.builder.customFieldsHelp(SELECTABLE_FIELDS.length)}
                options={FIELD_OPTIONS}
                emptyLabel={t.builder.customFieldsEmpty(SELECTABLE_FIELDS.length)}
                searchPlaceholder={t.builder.customFieldsSearch}
                {...listProps(form.excludeFieldsText, (excludeFieldsText) => set({ excludeFieldsText }))}
              />
            </div>
          )}
        </div>
      </Section>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange({ ...empty, startDate: form.startDate, endDate: form.endDate })}
        >
          {t.builder.resetAll}
        </Button>
      </div>
    </div>
  );
}
