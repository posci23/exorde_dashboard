"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryStore } from "./QueryStore";
import { apiFetch, formatError } from "@/lib/browser-api";
import { describeIssues, submitExport, validateQuery } from "@/lib/export-actions";
import { buildQueryBody, type QueryFormState } from "@/lib/query-form";
import { useT } from "@/lib/i18n/locale";
import type { PreviewResponse } from "@/lib/types";

export function useQueryActions() {
  const router = useRouter();
  const t = useT();
  const { form, setForm, lastPreview, setLastPreview, upsertJob } = useQueryStore();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);

  const previewIssues = describeIssues(validateQuery(buildQueryBody(form, "preview")));
  const exportIssues = describeIssues(validateQuery(buildQueryBody(form, "export")));
  const issues = [...new Set([...exportIssues, ...previewIssues])];
  const busy = previewLoading || exportLoading;

  function updateForm(next: QueryFormState) {
    setForm(next);
    setError(null);
    setNotice(null);
  }

  async function runPreview() {
    const parsed = validateQuery(buildQueryBody(form, "preview"));
    if (!parsed.success) {
      setError(t.query.cantPreview(describeIssues(parsed).join("; ")));
      setShowIssues(true);
      return;
    }

    setPreviewLoading(true);
    setError(null);
    setNotice(null);
    const res = await apiFetch<PreviewResponse>("/api/sentinel/preview", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    setPreviewLoading(false);

    if (!res.ok || !res.data) {
      setError(formatError(res.error));
      return;
    }
    setLastPreview(res.data);
  }

  async function startExport() {
    const parsed = validateQuery(buildQueryBody(form, "export"));
    if (!parsed.success) {
      setError(t.query.cantExport(describeIssues(parsed).join("; ")));
      setShowIssues(true);
      return;
    }

    setExportLoading(true);
    setError(null);
    setNotice(null);
    const result = await submitExport(parsed.data);
    setExportLoading(false);

    if (result.kind === "error") {
      setError(result.message);
      return;
    }

    if (result.kind === "created") {
      upsertJob({
        job_id: result.jobId,
        status: "pending",
        job_type: "export",
      });
    }
    router.push(`/jobs?job=${encodeURIComponent(result.jobId)}`);
  }

  return {
    form,
    lastPreview,
    setLastPreview,
    updateForm,
    runPreview,
    startExport,
    previewIssues,
    exportIssues,
    issues,
    busy,
    previewLoading,
    exportLoading,
    error,
    notice,
    setNotice,
    showIssues,
    setShowIssues,
  };
}
