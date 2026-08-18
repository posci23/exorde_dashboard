"use client";

import { Alert, Button, FieldLabel, Section, SegmentedControl, Select, TextInput } from "@/components/ui";
import type { ScoringOptions } from "@/lib/analysis/scoring";
import type { Bands, CleanOptions, ColumnMapping, SentimentScale } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import type { ProviderSummary } from "./useProviders";

type MappableRole = Exclude<keyof ColumnMapping, "emotions">;

const PRESETS: Record<"strict" | "balanced" | "sensitive", Bands> = {
  strict: { negative: -0.25, positive: 0.25 },
  balanced: { negative: -0.05, positive: 0.05 },
  sensitive: { negative: -0.01, positive: 0.01 },
};

function matchPreset(bands: Bands): keyof typeof PRESETS | "custom" {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (preset.negative === bands.negative && preset.positive === bands.positive) {
      return name as keyof typeof PRESETS;
    }
  }
  return "custom";
}

/**
 * Two kinds of control, kept visibly apart: band thresholds re-cut the numbers
 * already in memory and apply as you type, while cleaning rules and column
 * mapping change which rows exist at all and need the file read again.
 */
export function AdvancedOptions({
  bands,
  onBands,
  draft,
  onDraft,
  scoring,
  onScoring,
  providers,
  dirty,
  onApply,
  columns,
  disabled,
  labelMode,
}: {
  bands: Bands;
  onBands: (bands: Bands) => void;
  draft: CleanOptions;
  onDraft: (options: CleanOptions) => void;
  scoring: ScoringOptions;
  onScoring: (scoring: ScoringOptions) => void;
  providers: ProviderSummary[];
  dirty: boolean;
  onApply: () => void;
  columns: string[];
  disabled: boolean;
  labelMode: boolean;
}) {
  const t = useT();
  const preset = matchPreset(bands);
  const api = providers.find((provider) => provider.id !== "column");

  const roles: Array<{ role: MappableRole; label: string }> = [
    { role: "sentiment", label: t.analyze.cleaning.roleSentiment },
    { role: "createdAt", label: t.analyze.cleaning.roleTime },
    { role: "text", label: t.analyze.cleaning.roleText },
    { role: "domain", label: t.analyze.cleaning.roleDomain },
    { role: "language", label: t.analyze.cleaning.roleLanguage },
    { role: "classification", label: t.analyze.cleaning.roleTopic },
    { role: "classificationScore", label: t.analyze.cleaning.roleTopicScore },
    { role: "author", label: t.analyze.cleaning.roleAuthor },
    { role: "keywords", label: t.analyze.cleaning.roleKeywords },
    { role: "url", label: t.analyze.cleaning.roleUrl },
    { role: "id", label: t.analyze.cleaning.roleId },
  ];

  function setMapping(role: MappableRole, value: string) {
    const mapping = { ...draft.mapping };
    if (value === "__auto") delete mapping[role];
    else if (value === "__none") mapping[role] = null;
    else mapping[role] = value;
    onDraft({ ...draft, mapping });
  }

  function mappingValue(role: MappableRole): string {
    const value = draft.mapping[role];
    if (value === undefined) return "__auto";
    if (value === null) return "__none";
    return value;
  }

  return (
    <Section
      title={t.analyze.advanced.title}
      summary={t.analyze.advanced.summary}
      count={dirty ? 1 : 0}
    >
      <div className="space-y-6">
        <section>
          <FieldLabel help={t.analyze.advanced.bandsHelp}>{t.analyze.advanced.bands}</FieldLabel>
          {labelMode ? (
            <p className="text-xs text-text-muted">{t.analyze.summary.labelMode}</p>
          ) : (
            <div className="space-y-3">
              <SegmentedControl
                value={preset}
                onChange={(value) => {
                  if (value !== "custom") onBands(PRESETS[value]);
                }}
                options={[
                  { value: "strict" as const, label: t.analyze.advanced.presetStrict },
                  { value: "balanced" as const, label: t.analyze.advanced.presetBalanced },
                  { value: "sensitive" as const, label: t.analyze.advanced.presetSensitive },
                  { value: "custom" as const, label: t.analyze.advanced.presetCustom },
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="band-negative">{t.analyze.advanced.negativeAt}</FieldLabel>
                  <TextInput
                    id="band-negative"
                    type="number"
                    step={0.01}
                    min={-1}
                    max={0}
                    value={bands.negative}
                    onChange={(event) =>
                      onBands({
                        ...bands,
                        negative: clamp(Number(event.target.value), -1, bands.positive),
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="band-positive">{t.analyze.advanced.positiveAt}</FieldLabel>
                  <TextInput
                    id="band-positive"
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    value={bands.positive}
                    onChange={(event) =>
                      onBands({
                        ...bands,
                        positive: clamp(Number(event.target.value), bands.negative, 1),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="border-t border-outline-variant/50 pt-5">
          <FieldLabel help={t.analyze.scoring.help}>{t.analyze.scoring.title}</FieldLabel>
          <div className="space-y-3">
            <SegmentedControl
              value={scoring.mode}
              onChange={(mode) => onScoring({ ...scoring, mode, providerId: api?.id ?? null })}
              options={[
                { value: "column" as const, label: t.analyze.scoring.column },
                {
                  value: "api" as const,
                  label: t.analyze.scoring.api(api?.label ?? t.analyze.scoring.provider),
                },
              ]}
            />

            {scoring.mode === "api" &&
              (api?.configured ? (
                <>
                  <Alert tone="info">{t.analyze.scoring.warning}</Alert>
                  <div className="sm:max-w-xs">
                    <FieldLabel htmlFor="score-max" help={t.analyze.scoring.maxRowsHelp}>
                      {t.analyze.scoring.maxRows}
                    </FieldLabel>
                    <TextInput
                      id="score-max"
                      type="number"
                      min={1}
                      max={200_000}
                      step={500}
                      value={scoring.maxRows}
                      onChange={(event) =>
                        onScoring({
                          ...scoring,
                          maxRows: clamp(Math.round(Number(event.target.value)), 1, 200_000),
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <Alert tone="warning">{api?.description ?? t.analyze.scoring.unconfigured}</Alert>
              ))}
          </div>
        </section>

        <section className="border-t border-outline-variant/50 pt-5">
          <FieldLabel help={t.analyze.advanced.cleaningHelp}>
            {t.analyze.advanced.cleaning}
          </FieldLabel>

          <div className="space-y-4">
            <label className="-mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-xs text-text transition-colors hover:bg-surface-hover">
              <input
                type="checkbox"
                checked={draft.dedupe}
                onChange={(event) => onDraft({ ...draft, dedupe: event.target.checked })}
                className="mt-0.5 h-4.5 w-4.5 shrink-0 pointer-coarse:h-5 pointer-coarse:w-5"
              />
              <span>
                {t.analyze.advanced.dedupe}
                <span className="block text-text-muted">{t.analyze.advanced.dedupeHelp}</span>
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="min-score">{t.analyze.advanced.minScore}</FieldLabel>
                <TextInput
                  id="min-score"
                  type="number"
                  step={0.05}
                  min={0}
                  max={1}
                  value={draft.minClassificationScore}
                  onChange={(event) =>
                    onDraft({
                      ...draft,
                      minClassificationScore: clamp(Number(event.target.value), 0, 1),
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="scale">{t.analyze.advanced.scale}</FieldLabel>
                <Select
                  id="scale"
                  value={draft.scale}
                  onChange={(event) =>
                    onDraft({ ...draft, scale: event.target.value as SentimentScale })
                  }
                >
                  <option value="signed">{t.analyze.advanced.scaleSigned}</option>
                  <option value="unit">{t.analyze.advanced.scaleUnit}</option>
                  <option value="label">{t.analyze.advanced.scaleLabel}</option>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel>{t.analyze.advanced.dates}</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  type="date"
                  aria-label={t.analyze.advanced.from}
                  value={draft.from}
                  onChange={(event) => onDraft({ ...draft, from: event.target.value })}
                />
                <TextInput
                  type="date"
                  aria-label={t.analyze.advanced.to}
                  value={draft.to}
                  onChange={(event) => onDraft({ ...draft, to: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="languages" help={t.analyze.advanced.languagesHelp}>
                  {t.analyze.advanced.languages}
                </FieldLabel>
                <TextInput
                  id="languages"
                  value={draft.languages.join(", ")}
                  placeholder="en, es"
                  onChange={(event) =>
                    onDraft({ ...draft, languages: splitList(event.target.value) })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="domains" help={t.analyze.advanced.domainsHelp}>
                  {t.analyze.advanced.domains}
                </FieldLabel>
                <TextInput
                  id="domains"
                  value={draft.domains.join(", ")}
                  placeholder="x.com"
                  onChange={(event) => onDraft({ ...draft, domains: splitList(event.target.value) })}
                />
              </div>
            </div>
          </div>
        </section>

        {columns.length > 0 && (
          <section className="border-t border-outline-variant/50 pt-5">
            <FieldLabel help={t.analyze.advanced.columnsHelp}>
              {t.analyze.advanced.columns}
            </FieldLabel>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map(({ role, label }) => (
                <div key={role}>
                  <FieldLabel htmlFor={`map-${role}`}>{label}</FieldLabel>
                  <Select
                    id={`map-${role}`}
                    value={mappingValue(role)}
                    onChange={(event) => setMapping(role, event.target.value)}
                  >
                    <option value="__auto">{t.analyze.advanced.auto}</option>
                    <option value="__none">{t.analyze.advanced.none}</option>
                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/50 pt-5">
          <Button type="button" onClick={onApply} disabled={disabled || !dirty}>
            {t.analyze.advanced.apply}
          </Button>
          {dirty && (
            <span className="text-xs text-text-muted">{t.analyze.advanced.dirty}</span>
          )}
        </div>
      </div>
    </Section>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export { PRESETS as BAND_PRESETS };
