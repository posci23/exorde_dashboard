"use client";

import { useEffect, useState } from "react";

export type ProviderSummary = {
  id: string;
  label: string;
  configured: boolean;
  description: string;
};

/**
 * Which scoring options this deployment has. Asked once per page: the answer
 * comes from environment variables and cannot change while the page is open.
 */
export function useProviders(): ProviderSummary[] {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analysis/providers")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { data?: { providers?: ProviderSummary[] } } | null) => {
        if (!cancelled && body?.data?.providers) setProviders(body.data.providers);
      })
      .catch(() => {
        // The scoring section simply stays on "column" if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return providers;
}
