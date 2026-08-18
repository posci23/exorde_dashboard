"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FilterChip,
  Panel,
  SegmentedControl,
  Select,
  Stat,
} from "@/components/ui";
import { formatCount, formatPercent, formatScore } from "@/lib/analysis/format";
import type { EdgeKind } from "@/lib/analysis/network";
import {
  buildGraph,
  threadStats,
  topAccounts,
  type GraphMode,
} from "@/lib/analysis/network-derive";
import { downloadEdgeListCsv } from "@/lib/analysis/summary";
import type { Aggregate, Bands } from "@/lib/analysis/types";
import { useT } from "@/lib/i18n/locale";
import { BandLegend } from "../BandBar";
import { COMMUNITY_COLORS } from "../palette";
import { ForceGraph, type ColorBy } from "./ForceGraph";

const NODE_CHOICES = [40, 80, 120, 200, 300];

/**
 * The network view.
 *
 * Same export, same pass, different question: not "how does this feel" but
 * "who is driving it". Everything is derived on the fly from the edges the
 * collector kept, so the controls are instant.
 */
export function NetworkView({ aggregate, bands }: { aggregate: Aggregate; bands: Bands }) {
  const t = useT();
  const network = aggregate.network;

  const [mode, setMode] = useState<GraphMode>("accounts");
  const [colorBy, setColorBy] = useState<ColorBy>("sentiment");
  const [kinds, setKinds] = useState<EdgeKind[]>(["retweet", "mention", "reply"]);
  const [maxNodes, setMaxNodes] = useState(120);
  const [minWeight, setMinWeight] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<"received" | "sent" | "posts">("received");

  const graph = useMemo(
    () => buildGraph(network, { mode, kinds, maxNodes, minWeight }),
    [network, mode, kinds, maxNodes, minWeight],
  );
  const accounts = useMemo(() => topAccounts(network, kinds, sort, 15), [network, kinds, sort]);
  const threads = useMemo(() => threadStats(network), [network]);

  const hasEdges = network.edges.length > 0 || network.keywordEdges.length > 0;
  if (!hasEdges) {
    return (
      <Panel title={t.analyze.network.title} description={t.analyze.network.description}>
        <EmptyState>{t.analyze.network.empty}</EmptyState>
      </Panel>
    );
  }

  const toggleKind = (kind: EdgeKind) => {
    setKinds((current) =>
      current.includes(kind)
        ? current.length > 1
          ? current.filter((value) => value !== kind)
          : current
        : [...current, kind],
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.analyze.network.statAccounts} value={formatCount(graph.metrics.nodes)} />
        <Stat label={t.analyze.network.statConnections} value={formatCount(graph.metrics.edges)} />
        <Stat
          label={t.analyze.network.statReciprocity}
          value={`${Math.round(graph.metrics.reciprocity * 100)}%`}
          hint={t.analyze.network.statReciprocityHint}
        />
        <Stat
          label={t.analyze.network.statConcentration}
          value={`${Math.round(graph.metrics.concentration * 100)}%`}
          hint={t.analyze.network.statConcentrationHint}
        />
      </div>

      <Panel
        title={mode === "accounts" ? t.analyze.network.graphTitle : t.analyze.network.graphKeywords}
        description={
          mode === "accounts"
            ? t.analyze.network.graphDescription
            : t.analyze.network.keywordDescription
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={mode}
              onChange={(value) => {
                setMode(value);
                setSelected(null);
              }}
              options={[
                { value: "accounts" as const, label: t.analyze.network.modeAccounts },
                { value: "keywords" as const, label: t.analyze.network.modeKeywords },
              ]}
            />
            <SegmentedControl
              value={colorBy}
              onChange={setColorBy}
              options={[
                { value: "sentiment" as const, label: t.analyze.network.colorSentiment },
                { value: "community" as const, label: t.analyze.network.colorCommunity },
              ]}
            />
          </div>
        }
      >
        <div className="space-y-4">
          {mode === "accounts" && (
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip selected={kinds.includes("retweet")} onClick={() => toggleKind("retweet")}>
                {t.analyze.network.kindRetweet} · {formatCount(network.stats.retweetEdges)}
              </FilterChip>
              <FilterChip selected={kinds.includes("mention")} onClick={() => toggleKind("mention")}>
                {t.analyze.network.kindMention} · {formatCount(network.stats.mentionEdges)}
              </FilterChip>
              <FilterChip selected={kinds.includes("reply")} onClick={() => toggleKind("reply")}>
                {t.analyze.network.kindReply} · {formatCount(network.stats.replyEdges)}
              </FilterChip>
            </div>
          )}

          <div className="rounded-xl border border-outline-variant/40 bg-surface">
            <ForceGraph
              graph={graph}
              colorBy={colorBy}
              bands={bands}
              selected={selected}
              onSelect={setSelected}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Legend colorBy={colorBy} communities={graph.communitySizes.length} />
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-muted">
                {t.analyze.network.nodes}
                <Select
                  value={String(maxNodes)}
                  onChange={(event) => setMaxNodes(Number(event.target.value))}
                  className="w-auto px-2 py-1.5 text-xs"
                >
                  {NODE_CHOICES.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 whitespace-nowrap text-xs text-text-muted">
                {t.analyze.network.minWeight}
                <Select
                  value={String(minWeight)}
                  onChange={(event) => setMinWeight(Number(event.target.value))}
                  className="w-auto px-2 py-1.5 text-xs"
                >
                  {[1, 2, 3, 5].map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </div>

          {graph.trimmed && (
            <p className="text-xs text-text-subtle">
              {t.analyze.network.trimmed(
                formatCount(graph.metrics.nodes),
                formatCount(graph.totalNodes),
              )}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={t.analyze.network.statCommunities}
              value={formatCount(graph.communitySizes.length)}
              hint={t.analyze.network.statCommunitiesHint}
            />
            <Stat
              label={t.analyze.network.statLargest}
              value={`${Math.round(graph.metrics.largestComponentShare * 100)}%`}
              hint={t.analyze.network.statLargestHint}
            />
            <Stat
              label={t.analyze.network.statDensity}
              value={graph.metrics.density.toFixed(3)}
              hint={t.analyze.network.statDensityHint}
            />
          </div>

          {network.stats.nodesTruncated && <Alert tone="warning">{t.analyze.network.truncatedNodes}</Alert>}
          {network.stats.edgesTruncated && <Alert tone="warning">{t.analyze.network.truncatedEdges}</Alert>}
          {network.stats.indexTruncated && <Alert tone="warning">{t.analyze.network.truncatedIndex}</Alert>}
        </div>
      </Panel>

      <Panel
        title={t.analyze.network.accountsTitle}
        description={t.analyze.network.accountsDescription}
        actions={
          <SegmentedControl
            value={sort}
            onChange={setSort}
            options={[
              { value: "received" as const, label: t.analyze.network.sortReceived },
              { value: "sent" as const, label: t.analyze.network.sortSent },
              { value: "posts" as const, label: t.analyze.network.sortPosts },
            ]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant/60">
                {[
                  t.analyze.network.colAccount,
                  t.analyze.network.colReceived,
                  t.analyze.network.colSent,
                  t.analyze.network.colPosts,
                  t.analyze.network.colSentiment,
                ].map((heading) => (
                  <th key={heading} scope="col" className="label-caps px-2 pb-2 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-outline-variant/40 ${
                    row.key === selected ? "bg-surface-container-high" : ""
                  }`}
                >
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="font-mono text-text hover:underline"
                      onClick={() => setSelected(row.key === selected ? null : row.key)}
                    >
                      {row.key}
                    </button>
                  </td>
                  <td className="tnum px-2 py-2">{formatCount(row.received)}</td>
                  <td className="tnum px-2 py-2">{formatCount(row.sent)}</td>
                  <td className="tnum px-2 py-2">{formatCount(row.posts)}</td>
                  <td className="tnum px-2 py-2">
                    {row.mean == null ? (
                      <span className="text-text-subtle">{t.analyze.network.noSentiment}</span>
                    ) : (
                      formatScore(row.mean)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title={t.analyze.network.threadsTitle}
        description={t.analyze.network.threadsDescription}
        actions={
          network.edges.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              title={t.analyze.network.downloadEdgesHint}
              onClick={() => downloadEdgeListCsv(aggregate)}
            >
              {t.analyze.network.downloadEdges}
            </Button>
          )
        }
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t.analyze.network.threadsResolved} value={formatCount(threads.resolved)} />
            <Stat
              label={t.analyze.network.threadsSelf}
              value={formatCount(threads.selfReplies)}
              hint={t.analyze.network.threadsSelfHint}
            />
            <Stat
              label={t.analyze.network.threadsUnresolved}
              value={formatCount(threads.unresolved)}
              hint={t.analyze.network.threadsUnresolvedHint}
            />
            <Stat
              label={t.analyze.network.threadsConversations}
              value={formatCount(threads.conversations)}
              hint={t.analyze.network.threadsLargest + ": " + formatCount(threads.largestConversation)}
            />
          </div>

          {threads.mostReplied.length > 0 && (
            <div>
              <h3 className="label-caps">{t.analyze.network.mostReplied}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {threads.mostReplied.map((row) => (
                  <li
                    key={row.key}
                    className="rounded-md border border-outline-variant/60 bg-surface px-2 py-1 font-mono text-xs text-text"
                  >
                    {row.key}{" "}
                    <span className="tnum text-text-muted">
                      {t.analyze.network.replies(formatCount(row.replies))} · {formatScore(row.mean)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="label-caps">{t.analyze.network.edgeMix}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>
                {t.analyze.network.kindRetweet}: {formatCount(network.stats.retweetEdges)}
              </Badge>
              <Badge>
                {t.analyze.network.kindMention}: {formatCount(network.stats.mentionEdges)}
              </Badge>
              <Badge>
                {t.analyze.network.kindReply}: {formatCount(network.stats.replyEdges)}
              </Badge>
              <Badge>
                {t.analyze.network.posts}:{" "}
                {formatPercent(network.stats.postsWithMentions, aggregate.stats.rowsKept, 0)}
              </Badge>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/** Colour means one of two things here, so the legend always says which. */
function Legend({ colorBy, communities }: { colorBy: ColorBy; communities: number }) {
  const t = useT();

  if (colorBy === "community") {
    const shown = Math.min(communities, COMMUNITY_COLORS.length);
    return (
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COMMUNITY_COLORS[i] }}
            />
            {t.analyze.network.legendCommunity(i)}
          </span>
        ))}
        {communities > shown && (
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full border border-[#7c8794] bg-surface"
            />
            {t.analyze.network.legendOther}
          </span>
        )}
      </div>
    );
  }

  // Reuses the sentiment legend so both views name the bands identically.
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BandLegend />
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-[#7c8794] bg-surface" />
        {t.analyze.network.legendNoPosts}
      </span>
    </div>
  );
}
