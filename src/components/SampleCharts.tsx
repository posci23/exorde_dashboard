"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SamplePost } from "@/lib/types";
import { Panel } from "./ui";

const COLORS = ["#1a1c1e", "#004aad", "#5f6368", "#9aa0a6", "#3c4043", "#80868b"];

function countBy(samples: SamplePost[], key: keyof SamplePost) {
  const map = new Map<string, number>();
  for (const s of samples) {
    const raw = s[key];
    const label = raw == null || raw === "" ? "(empty)" : String(raw);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function sentimentBuckets(samples: SamplePost[]) {
  const buckets = [
    { name: "neg", min: -1, max: -0.2, value: 0 },
    { name: "neu", min: -0.2, max: 0.2, value: 0 },
    { name: "pos", min: 0.2, max: 1.01, value: 0 },
  ];
  for (const s of samples) {
    const v = typeof s.analysis_sentiment === "number" ? s.analysis_sentiment : null;
    if (v == null) continue;
    const b = buckets.find((x) => v >= x.min && v < x.max);
    if (b) b.value += 1;
  }
  return buckets;
}

function topKeywords(samples: SamplePost[]) {
  const map = new Map<string, number>();
  for (const s of samples) {
    for (const kw of s.analysis_top_keywords ?? []) {
      map.set(kw, (map.get(kw) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function SampleCharts({ samples }: { samples: SamplePost[] }) {
  if (!samples.length) return null;
  const domains = countBy(samples, "domain");
  const languages = countBy(samples, "language");
  const sentiment = sentimentBuckets(samples);
  const keywords = topKeywords(samples);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Sentiment (sample)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sentiment}>
              <XAxis dataKey="name" stroke="#74777f" fontSize={11} />
              <YAxis stroke="#74777f" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #c4c7cf", borderRadius: 12, color: "#1a1c1e" }}
              />
              <Bar dataKey="value" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Domains (sample)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={domains} dataKey="value" nameKey="name" outerRadius={70} label>
                {domains.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #c4c7cf", borderRadius: 12, color: "#1a1c1e" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Languages (sample)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={languages}>
              <XAxis dataKey="name" stroke="#74777f" fontSize={11} />
              <YAxis stroke="#74777f" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #c4c7cf", borderRadius: 12, color: "#1a1c1e" }}
              />
              <Bar dataKey="value" fill="#1a1c1e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Top keywords (sample)">
        <div className="flex flex-wrap gap-2">
          {keywords.length === 0 && <span className="text-xs text-text-muted">No keywords in sample</span>}
          {keywords.map((k) => (
            <span
              key={k.name}
              className="rounded-md border border-border bg-surface-raised px-2 py-1 font-mono text-xs text-text"
            >
              {k.name} <span className="text-text-muted">×{k.value}</span>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
