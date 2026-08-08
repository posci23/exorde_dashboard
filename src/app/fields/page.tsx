"use client";

import { useMemo, useState } from "react";
import { FIELD_REFERENCE, type FieldCategory } from "@/lib/constants";
import { Panel, TextInput } from "@/components/ui";

const CATEGORIES: FieldCategory[] = [
  "Post Metadata",
  "Author Information",
  "Source Information",
  "Analysis - Core",
  "Analysis - Emotions",
  "Always Excluded",
];

export default function FieldsPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return FIELD_REFERENCE;
    return FIELD_REFERENCE.filter(
      (f) =>
        f.name.toLowerCase().includes(needle) ||
        f.description.toLowerCase().includes(needle) ||
        f.category.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Field Reference</h1>
        <p className="mt-1 text-sm text-text-muted">
          47 fields total — 44 exported by default. Embeddings excluded unless{" "}
          <span className="font-mono text-text">exclude_fields: []</span>. Three fields always excluded due to
          UNION mismatches.
        </p>
      </header>

      <TextInput
        placeholder="Search fields…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {CATEGORIES.map((category) => {
        const rows = filtered.filter((f) => f.category === category);
        if (!rows.length) return null;
        return (
          <Panel key={category} title={`${category} (${rows.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-text-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Field</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr key={f.name} className="border-b border-border/40">
                      <td className="py-2 pr-3 font-mono text-accent">{f.name}</td>
                      <td className="py-2 pr-3 font-mono text-text-muted">{f.type}</td>
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
  );
}
