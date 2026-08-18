"use client";

import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, Panel, SegmentedControl } from "@/components/ui";
import { bandOf } from "@/lib/analysis/derive";
import { formatPostTime, formatScore } from "@/lib/analysis/format";
import type { Aggregate, Bands, BandKey, SamplePostRow } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { useBandLabels } from "./BandBar";
import { BAND_COLOR } from "./palette";

type Tab = "sample" | "top" | "bottom";

/** Posts are evidence, not the main event — a dozen at a time is plenty. */
const PAGE = 12;

/** The rows behind the numbers — a score is worth little without the post. */
export function SamplePosts({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const labels = useBandLabels();
  const [tab, setTab] = useState<Tab>("sample");
  const [band, setBand] = useState<BandKey | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const source =
      tab === "sample"
        ? [...aggregate.samples].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
        : tab === "top"
          ? aggregate.extremes.top
          : aggregate.extremes.bottom;
    return band === "all"
      ? source
      : source.filter((row) => bandOf(row.sentiment, bands) === band);
  }, [aggregate, bands, tab, band]);

  const shown = rows.slice(0, limit);

  if (!aggregate.stats.withText) {
    return (
      <Panel title={t.analyze.samples.title} description={t.analyze.samples.description}>
        <EmptyState>{t.analyze.samples.empty}</EmptyState>
      </Panel>
    );
  }

  return (
    <Panel
      title={t.analyze.samples.title}
      description={t.analyze.samples.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            value={tab}
            onChange={(value) => {
              setTab(value);
              setLimit(PAGE);
            }}
            options={[
              { value: "sample" as const, label: t.analyze.samples.tabSample },
              { value: "top" as const, label: t.analyze.samples.tabTop },
              { value: "bottom" as const, label: t.analyze.samples.tabBottom },
            ]}
          />
          <SegmentedControl
            value={band}
            onChange={(value) => {
              setBand(value);
              setLimit(PAGE);
            }}
            options={[
              { value: "all" as const, label: t.analyze.samples.all },
              { value: "positive" as const, label: labels.positive },
              { value: "neutral" as const, label: labels.neutral },
              { value: "negative" as const, label: labels.negative },
            ]}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>{t.analyze.samples.none}</EmptyState>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-outline-variant/50">
            {shown.map((row, index) => (
              <PostRow key={`${row.url || row.text}-${index}`} row={row} bands={bands} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="tnum text-xs text-text-subtle">
              {t.analyze.samples.showing(
                shown.length.toLocaleString(),
                rows.length.toLocaleString(),
              )}
            </span>
            {shown.length < rows.length && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setLimit((value) => value + PAGE)}
              >
                {t.analyze.samples.showMore}
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function PostRow({ row, bands }: { row: SamplePostRow; bands: Bands }) {
  const t = useT();
  const labels = useBandLabels();
  const band = bandOf(row.sentiment, bands);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-subtle">
        <span
          className="tnum inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ background: BAND_COLOR[band] }}
        >
          {labels[band]} {formatScore(row.sentiment)}
        </span>
        <span>{formatPostTime(row.t)}</span>
        {row.domain && <span>{row.domain}</span>}
        {row.language && <Badge>{row.language}</Badge>}
        {row.classification && <span>{row.classification}</span>}
        {row.author && <span className="truncate">@{row.author}</span>}
        {row.url && (
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full text-accent underline-offset-2 hover:underline pointer-coarse:min-h-10 pointer-coarse:bg-accent-soft pointer-coarse:px-3 pointer-coarse:no-underline"
          >
            {t.analyze.samples.open}
          </a>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-text">
        {row.text}
      </p>
    </li>
  );
}
