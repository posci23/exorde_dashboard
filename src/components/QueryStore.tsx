"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createEmptyQueryForm, type QueryFormState } from "@/lib/query-form";
import type { ExportJobResponse, PreviewResponse } from "@/lib/types";

const FORM_KEY = "exorde.queryForm.v1";
const JOBS_KEY = "exorde.trackedJobs.v1";

type Store = {
  form: QueryFormState;
  setForm: (form: QueryFormState) => void;
  lastPreview: PreviewResponse | null;
  setLastPreview: (preview: PreviewResponse | null) => void;
  trackedJobs: ExportJobResponse[];
  upsertJob: (job: ExportJobResponse) => void;
  clearJobs: () => void;
  ready: boolean;
};

const Ctx = createContext<Store | null>(null);

export function QueryStoreProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<QueryFormState>(createEmptyQueryForm);
  const [lastPreview, setLastPreview] = useState<PreviewResponse | null>(null);
  const [trackedJobs, setTrackedJobs] = useState<ExportJobResponse[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_KEY);
      if (raw) setFormState({ ...createEmptyQueryForm(), ...JSON.parse(raw) });
      const jobs = localStorage.getItem(JOBS_KEY);
      if (jobs) setTrackedJobs(JSON.parse(jobs));
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  const setForm = useCallback((next: QueryFormState) => {
    setFormState(next);
    localStorage.setItem(FORM_KEY, JSON.stringify(next));
  }, []);

  const upsertJob = useCallback((job: ExportJobResponse) => {
    setTrackedJobs((prev) => {
      const next = [job, ...prev.filter((j) => j.job_id !== job.job_id)].slice(0, 50);
      localStorage.setItem(JOBS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearJobs = useCallback(() => {
    setTrackedJobs([]);
    localStorage.removeItem(JOBS_KEY);
  }, []);

  const value = useMemo(
    () => ({
      form,
      setForm,
      lastPreview,
      setLastPreview,
      trackedJobs,
      upsertJob,
      clearJobs,
      ready,
    }),
    [form, setForm, lastPreview, trackedJobs, upsertJob, clearJobs, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQueryStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQueryStore must be used within QueryStoreProvider");
  return ctx;
}
