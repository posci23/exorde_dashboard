"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, PageHeader, PageShell, Panel, SegmentedControl } from "@/components/ui";
import { startAnalysis, type Progress } from "@/lib/analysis/client";
import { splitOf } from "@/lib/analysis/derive";
import { formatBytes, formatCount } from "@/lib/analysis/format";
import { startIngest } from "@/lib/analysis/ingest-client";
import { DEFAULT_SCORING, type ScoringOptions } from "@/lib/analysis/scoring";
import {
  DEFAULT_BANDS,
  DEFAULT_CLEAN_OPTIONS,
  type Aggregate,
  type Bands,
  type CleanOptions,
} from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { AdvancedOptions } from "./AdvancedOptions";
import { BreakdownPanel } from "./BreakdownPanel";
import { CleaningReport } from "./CleaningReport";
import { DistributionChart } from "./DistributionChart";
import { EmotionPanel } from "./EmotionPanel";
import { KeywordPanel } from "./KeywordPanel";
import { SamplePosts } from "./SamplePosts";
import { SentimentSummary } from "./SentimentSummary";
import { SourcePicker, type PickedSource } from "./SourcePicker";
import { TrendChart } from "./TrendChart";
import { NetworkView } from "./network/NetworkView";
import { useProviders } from "./useProviders";

/**
 * The analyzer page.
 *
 * One source at a time — a dropped file read in this browser, or an export the
 * server pulls straight from the index — and one aggregate held in state. The
 * band controls and every chart control re-cut that aggregate instantly;
 * cleaning rules and the scoring choice decide what a row *is*, so they send
 * the source back through the pipeline.
 */
export function AnalyzeView() {
  const t = useT();
  const providers = useProviders();

  const [source, setSource] = useState<PickedSource | null>(null);
  const [applied, setApplied] = useState<CleanOptions>(DEFAULT_CLEAN_OPTIONS);
  const [draft, setDraft] = useState<CleanOptions>(DEFAULT_CLEAN_OPTIONS);
  const [appliedScoring, setAppliedScoring] = useState<ScoringOptions>(DEFAULT_SCORING);
  const [scoring, setScoring] = useState<ScoringOptions>(DEFAULT_SCORING);
  const [bands, setBands] = useState<Bands>(DEFAULT_BANDS);
  const [view, setView] = useState<"sentiment" | "network">("sentiment");
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0);

  const run = useCallback(
    (target: PickedSource, options: CleanOptions, scoringOptions: ScoringOptions) => {
      cancelRef.current?.();
      const runId = ++runIdRef.current;

      setError(null);
      setAggregate(null);
      setProgress({
        bytes: 0,
        bytesTotal: target.kind === "file" ? target.file.size : 0,
        rowsRead: 0,
      });

      const onProgress = (update: Progress) => {
        if (runIdRef.current === runId) setProgress(update);
      };

      const { result, cancel } =
        target.kind === "file"
          ? startAnalysis(target.file, options, scoringOptions, onProgress)
          : startIngest(
              {
                source:
                  target.kind === "job"
                    ? { kind: "job", jobId: target.jobId }
                    : { kind: "url", url: target.url },
                options,
                scoring: scoringOptions,
              },
              onProgress,
            );
      cancelRef.current = cancel;

      result
        .then((value) => {
          if (runIdRef.current !== runId) return;
          setAggregate(value);
          setProgress(null);
        })
        .catch((cause: unknown) => {
          if (runIdRef.current !== runId) return;
          setProgress(null);
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setError(cause instanceof Error ? cause.message : String(cause));
        });
    },
    [],
  );

  // A run outlives the page only if nobody stops it; unmounting should.
  useEffect(() => () => cancelRef.current?.(), []);

  const onPick = useCallback(
    (picked: PickedSource) => {
      setSource(picked);
      setApplied(draft);
      setAppliedScoring(scoring);
      run(picked, draft, scoring);
    },
    [draft, scoring, run],
  );

  const reset = useCallback(() => {
    runIdRef.current++;
    cancelRef.current?.();
    cancelRef.current = null;
    setSource(null);
    setAggregate(null);
    setProgress(null);
    setError(null);
    setApplied(DEFAULT_CLEAN_OPTIONS);
    setDraft(DEFAULT_CLEAN_OPTIONS);
    setAppliedScoring(DEFAULT_SCORING);
    setScoring(DEFAULT_SCORING);
    setBands(DEFAULT_BANDS);
  }, []);

  const dirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(applied) ||
      JSON.stringify(scoring) !== JSON.stringify(appliedScoring),
    [draft, applied, scoring, appliedScoring],
  );
  const split = useMemo(
    () => (aggregate ? splitOf(aggregate.total, bands) : null),
    [aggregate, bands],
  );

  const running = progress !== null;
  const sourceLabel = source ? describeSource(source) : "";

  return (
    <PageShell className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t.analyze.title}
        description={t.analyze.description}
        actions={
          source && (
            <Button type="button" variant="secondary" onClick={reset}>
              {t.analyze.another}
            </Button>
          )
        }
      />

      {!source && <SourcePicker onPick={onPick} />}

      {running && progress && (
        <ReadingPanel label={sourceLabel} progress={progress} onCancel={reset} />
      )}

      {error && (
        <Panel title={t.analyze.error.title}>
          <div className="space-y-3">
            <Alert tone="danger">{error}</Alert>
            <Button type="button" variant="secondary" onClick={reset}>
              {t.analyze.error.retry}
            </Button>
          </div>
        </Panel>
      )}

      {aggregate && split && (
        <>
          {split.count === 0 && (
            <Alert tone="warning">
              {aggregate.stats.rowsRead === 0
                ? t.analyze.error.noRows
                : t.analyze.error.noSentiment}
            </Alert>
          )}

          {split.count > 0 && (
            <>
              {/* One pass over the source, two readings of it. */}
              <SegmentedControl
                value={view}
                onChange={setView}
                options={[
                  { value: "sentiment" as const, label: t.analyze.views.sentiment },
                  { value: "network" as const, label: t.analyze.views.network },
                ]}
              />

              {view === "sentiment" ? (
                <>
                  <SentimentSummary aggregate={aggregate} split={split} bands={bands} />
                  <TrendChart aggregate={aggregate} bands={bands} />
                  <div className="grid gap-5 lg:grid-cols-2">
                    <DistributionChart aggregate={aggregate} bands={bands} />
                    <EmotionPanel aggregate={aggregate} bands={bands} />
                  </div>
                  <BreakdownPanel aggregate={aggregate} bands={bands} />
                  <KeywordPanel aggregate={aggregate} bands={bands} />
                  <SamplePosts aggregate={aggregate} bands={bands} />
                </>
              ) : (
                <NetworkView aggregate={aggregate} bands={bands} />
              )}
            </>
          )}

          <AdvancedOptions
            bands={bands}
            onBands={setBands}
            draft={draft}
            onDraft={setDraft}
            scoring={scoring}
            onScoring={setScoring}
            providers={providers}
            dirty={dirty}
            disabled={running}
            labelMode={aggregate.scale === "label"}
            columns={aggregate.columns}
            onApply={() => {
              if (!source) return;
              setApplied(draft);
              setAppliedScoring(scoring);
              run(source, draft, scoring);
            }}
          />

          <CleaningReport aggregate={aggregate} bands={bands} />
        </>
      )}
    </PageShell>
  );
}

function describeSource(source: PickedSource): string {
  if (source.kind === "file") return source.file.name;
  if (source.kind === "job") return source.jobId;
  try {
    const url = new URL(source.url);
    return url.pathname.split("/").filter(Boolean).pop() || url.host;
  } catch {
    return source.url;
  }
}

function ReadingPanel({
  label,
  progress,
  onCancel,
}: {
  label: string;
  progress: Progress;
  onCancel: () => void;
}) {
  const t = useT();
  const percent = progress.bytesTotal
    ? Math.min(100, Math.round((progress.bytes / progress.bytesTotal) * 100))
    : 0;

  return (
    <Panel
      title={t.analyze.source.reading(label)}
      description={t.analyze.progress.background}
      actions={
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.analyze.progress.cancel}
        </Button>
      }
    >
      <div className="space-y-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low"
          role="progressbar"
          aria-valuenow={progress.bytesTotal ? percent : undefined}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* A stream of unknown length still shows motion, just not a share. */}
          <div
            className={`h-2 rounded-full bg-accent-solid transition-[width] duration-200 ${
              progress.bytesTotal ? "" : "animate-pulse"
            }`}
            style={{ width: progress.bytesTotal ? `${percent}%` : "100%" }}
          />
        </div>
        <div className="tnum flex flex-wrap justify-between gap-2 text-xs text-text-muted">
          <span>{t.analyze.progress.rows(formatCount(progress.rowsRead))}</span>
          <span>
            {formatBytes(progress.bytes)}
            {progress.bytesTotal ? ` / ${formatBytes(progress.bytesTotal)} · ${percent}%` : ""}
          </span>
        </div>
      </div>
    </Panel>
  );
}
