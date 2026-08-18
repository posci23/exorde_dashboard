"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, PageHeader, PageShell, Panel } from "@/components/ui";
import { startAnalysis, type Progress } from "@/lib/analysis/client";
import { splitOf } from "@/lib/analysis/derive";
import { formatBytes, formatCount } from "@/lib/analysis/format";
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
import { DropZone } from "./DropZone";
import { EmotionPanel } from "./EmotionPanel";
import { KeywordPanel } from "./KeywordPanel";
import { SamplePosts } from "./SamplePosts";
import { SentimentSummary } from "./SentimentSummary";
import { TrendChart } from "./TrendChart";

/**
 * The analyzer page.
 *
 * One file at a time: drop it, watch the pass, then read it. The parsed
 * aggregate stays in state so the band controls and every chart control are
 * instant; only the cleaning rules — which decide what counts as a row — send
 * the file back through the parser.
 */
export function AnalyzeView() {
  const t = useT();

  const [file, setFile] = useState<File | null>(null);
  const [applied, setApplied] = useState<CleanOptions>(DEFAULT_CLEAN_OPTIONS);
  const [draft, setDraft] = useState<CleanOptions>(DEFAULT_CLEAN_OPTIONS);
  const [bands, setBands] = useState<Bands>(DEFAULT_BANDS);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef<(() => void) | null>(null);
  const runIdRef = useRef(0);

  const run = useCallback((target: File, options: CleanOptions) => {
    cancelRef.current?.();
    const runId = ++runIdRef.current;

    setError(null);
    setAggregate(null);
    setProgress({ bytes: 0, bytesTotal: target.size, rowsRead: 0 });

    const { result, cancel } = startAnalysis(target, options, (update) => {
      if (runIdRef.current === runId) setProgress(update);
    });
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
  }, []);

  // A run outlives the page only if nobody stops it; unmounting should.
  useEffect(() => () => cancelRef.current?.(), []);

  const onFile = useCallback(
    (picked: File) => {
      setFile(picked);
      setApplied(draft);
      run(picked, draft);
    },
    [draft, run],
  );

  const reset = useCallback(() => {
    runIdRef.current++;
    cancelRef.current?.();
    cancelRef.current = null;
    setFile(null);
    setAggregate(null);
    setProgress(null);
    setError(null);
    setApplied(DEFAULT_CLEAN_OPTIONS);
    setDraft(DEFAULT_CLEAN_OPTIONS);
    setBands(DEFAULT_BANDS);
  }, []);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(applied), [draft, applied]);
  const split = useMemo(
    () => (aggregate ? splitOf(aggregate.total, bands) : null),
    [aggregate, bands],
  );

  const running = progress !== null;

  return (
    <PageShell className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t.analyze.title}
        description={t.analyze.description}
        actions={
          file && (
            <Button type="button" variant="secondary" onClick={reset}>
              {t.analyze.another}
            </Button>
          )
        }
      />

      {!file && <DropZone onFile={onFile} />}

      {running && progress && file && (
        <ReadingPanel file={file} progress={progress} onCancel={reset} />
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
          )}

          <AdvancedOptions
            bands={bands}
            onBands={setBands}
            draft={draft}
            onDraft={setDraft}
            dirty={dirty}
            disabled={running}
            labelMode={aggregate.scale === "label"}
            columns={aggregate.columns}
            onApply={() => {
              if (!file) return;
              setApplied(draft);
              run(file, draft);
            }}
          />

          <CleaningReport aggregate={aggregate} bands={bands} />
        </>
      )}
    </PageShell>
  );
}

function ReadingPanel({
  file,
  progress,
  onCancel,
}: {
  file: File;
  progress: Progress;
  onCancel: () => void;
}) {
  const t = useT();
  const percent = progress.bytesTotal
    ? Math.min(100, Math.round((progress.bytes / progress.bytesTotal) * 100))
    : 0;

  return (
    <Panel
      title={t.analyze.progress.reading(file.name)}
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
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-2 rounded-full bg-accent-solid transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="tnum flex flex-wrap justify-between gap-2 text-xs text-text-muted">
          <span>{t.analyze.progress.rows(formatCount(progress.rowsRead))}</span>
          <span>
            {formatBytes(progress.bytes)} / {formatBytes(progress.bytesTotal)} · {percent}%
          </span>
        </div>
      </div>
    </Panel>
  );
}
