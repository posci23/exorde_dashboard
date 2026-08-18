"use client";

import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui";
import { ACCEPTED_EXTENSIONS, detectKind } from "@/lib/analysis/readers";
import { useT } from "@/lib/i18n/locale";

/**
 * The drop target. Nothing is uploaded — the File handle is passed straight to
 * the parser — so the copy says so plainly rather than leaving people to guess.
 */
export function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  function accept(file: File | undefined) {
    if (!file) return;
    // An unknown extension is not fatal — the reader sniffs the first bytes —
    // but a .pdf or .zip is worth catching before a pointless full read.
    if (!detectKind(file.name) && !/\.(txt|dat|gz)$/i.test(file.name)) {
      setRejected(t.analyze.drop.unsupported(file.name));
      return;
    }
    setRejected(null);
    onFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent-soft"
            : "border-accent/25 bg-surface/70 hover:border-accent/45"
        }`}
      >
        <p className="text-lg font-medium text-text">
          {dragging ? t.analyze.drop.release : t.analyze.drop.title}
        </p>
        <p className="mt-2 text-sm text-text-muted">{t.analyze.drop.formats}</p>
        <p className="mt-1 text-xs text-text-subtle">{t.analyze.drop.anySize}</p>

        <div className="mt-6 flex justify-center">
          <Button type="button" onClick={() => inputRef.current?.click()}>
            {t.analyze.drop.browse}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files?.[0]);
            // Reset, so picking the same file twice still fires a change.
            event.target.value = "";
          }}
        />

        <p className="mt-6 text-xs text-text-subtle">{t.analyze.drop.privacy}</p>
      </div>

      {rejected && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {rejected}
        </p>
      )}
      <p className="mt-3 text-center text-xs text-text-subtle">{t.analyze.drop.fromExport}</p>
    </div>
  );
}
