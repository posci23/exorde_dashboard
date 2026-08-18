"use client";

import { useState } from "react";
import { Alert, Button, FieldLabel, Panel, SegmentedControl, TextInput } from "@/components/ui";
import type { SourceKind } from "@/lib/analysis/ingest-spec";
import { useT } from "@/lib/i18n/locale";
import { DropZone } from "./DropZone";

export type PickedSource =
  | { kind: "file"; file: File }
  | { kind: "job"; jobId: string }
  | { kind: "url"; url: string };

/**
 * Three ways in, one place.
 *
 * A dropped file is read in the browser; an export id or a URL is read by the
 * server, which streams the bytes straight from the index or the link. The
 * difference matters to anyone who cares where their data goes, so each tab
 * says plainly which one it is.
 */
export function SourcePicker({ onPick }: { onPick: (source: PickedSource) => void }) {
  const t = useT();
  const [kind, setKind] = useState<SourceKind>("file");
  const [jobId, setJobId] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (kind === "job") {
      if (!jobId.trim()) return setError(t.analyze.source.needsJob);
      return onPick({ kind: "job", jobId: jobId.trim() });
    }
    if (!url.trim()) return setError(t.analyze.source.needsUrl);
    onPick({ kind: "url", url: url.trim() });
  }

  return (
    <Panel
      title={t.analyze.source.title}
      actions={
        <SegmentedControl
          value={kind}
          onChange={(value) => {
            setKind(value);
            setError(null);
          }}
          options={[
            { value: "file" as const, label: t.analyze.source.file },
            { value: "job" as const, label: t.analyze.source.job },
            { value: "url" as const, label: t.analyze.source.url },
          ]}
        />
      }
    >
      {kind === "file" ? (
        <DropZone onFile={(file) => onPick({ kind: "file", file })} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {kind === "job" ? (
            <div>
              <FieldLabel htmlFor="ingest-job" help={t.analyze.source.jobHelp}>
                {t.analyze.source.jobLabel}
              </FieldLabel>
              <TextInput
                id="ingest-job"
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                placeholder={t.analyze.source.jobPlaceholder}
                className="font-mono text-xs"
              />
            </div>
          ) : (
            <div>
              <FieldLabel htmlFor="ingest-url" help={t.analyze.source.urlHelp}>
                {t.analyze.source.urlLabel}
              </FieldLabel>
              <TextInput
                id="ingest-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={t.analyze.source.urlPlaceholder}
                className="font-mono text-xs"
              />
            </div>
          )}

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">{t.analyze.source.run}</Button>
            <span className="text-xs text-text-subtle">{t.analyze.source.serverNote}</span>
          </div>
        </form>
      )}
    </Panel>
  );
}
