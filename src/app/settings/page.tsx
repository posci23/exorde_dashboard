"use client";

import { useEffect, useState } from "react";
import { Alert, Button, PageHeader, Panel, TextInput } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";

type SettingsInfo = {
  envConfigured: boolean;
  cookieConfigured: boolean;
  keyAvailable: boolean;
  baseUrl: string;
};

export default function SettingsPage() {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<SettingsInfo>("/api/exorde/settings");
      if (res.ok && res.data) setInfo(res.data);
    })();
  }, []);

  async function saveKey() {
    setError(null);
    setMessage(null);
    const res = await apiFetch("/api/exorde/settings", {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) {
      setError(formatError(res.error));
      return;
    }
    setApiKey("");
    setMessage("API key saved in an httpOnly cookie for this browser (30 days). Prefer .env.local for permanence.");
    const refreshed = await apiFetch<SettingsInfo>("/api/exorde/settings");
    if (refreshed.ok && refreshed.data) setInfo(refreshed.data);
  }

  async function clearKey() {
    await apiFetch("/api/exorde/settings", {
      method: "POST",
      body: JSON.stringify({ clear: true }),
    });
    setMessage("Browser cookie key cleared. Env key (if any) still applies.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your Exorde API key. It is never exposed to the browser — the Next.js API routes attach it server-side."
      />

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      <Panel title="Connection">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="label-caps">Base URL</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.baseUrl ?? "…"}</dd>
          </div>
          <div>
            <dt className="label-caps">EXORDE_API_KEY in env</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.envConfigured ? "configured" : "missing"}</dd>
          </div>
          <div>
            <dt className="label-caps">Cookie key</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.cookieConfigured ? "set" : "not set"}</dd>
          </div>
          <div>
            <dt className="label-caps">Ready to call API</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.keyAvailable ? "yes" : "no"}</dd>
          </div>
        </dl>
      </Panel>

      <Panel
        title="Recommended: .env.local"
        description="Create this file in the project root, then restart npm run dev"
      >
        <pre className="overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-text-muted">
{`EXORDE_API_KEY=exo_your_key_here
EXORDE_API_BASE_URL=https://export-api.exorde.io`}
        </pre>
      </Panel>

      <Panel title="Or paste key for this browser session" description="Stored as httpOnly cookie · not shown again">
        <TextInput
          type="password"
          autoComplete="off"
          placeholder="exo_…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={() => void saveKey()} disabled={!apiKey.trim()}>
            Save key
          </Button>
          <Button type="button" variant="secondary" onClick={() => void clearKey()}>
            Clear cookie key
          </Button>
        </div>
      </Panel>

      <Panel title="Auth header (reference)">
        <pre className="font-mono text-xs text-text-muted">X-API-Key: YOUR_API_KEY_HERE</pre>
        <p className="mt-2 text-xs text-text-muted">
          Keys look like <span className="font-mono text-text">exo_AbCd1234…</span> and cannot be retrieved after
          creation from Exorde.
        </p>
      </Panel>
    </div>
  );
}
