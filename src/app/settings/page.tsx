"use client";

import { useEffect, useState } from "react";
import { Alert, Button, PageHeader, PageShell, Panel, TextInput } from "@/components/ui";
import { apiFetch, formatError } from "@/lib/browser-api";
import { useT } from "@/lib/i18n/locale";

type SettingsInfo = {
  envConfigured: boolean;
  cookieConfigured: boolean;
  keyAvailable: boolean;
  baseUrl: string;
};

export default function SettingsPage() {
  const t = useT();
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<SettingsInfo>("/api/sentinel/settings");
      if (res.ok && res.data) setInfo(res.data);
    })();
  }, []);

  async function saveKey() {
    setError(null);
    setMessage(null);
    const res = await apiFetch("/api/sentinel/settings", {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) {
      setError(formatError(res.error));
      return;
    }
    setApiKey("");
    setMessage(t.settings.saved);
    const refreshed = await apiFetch<SettingsInfo>("/api/sentinel/settings");
    if (refreshed.ok && refreshed.data) setInfo(refreshed.data);
  }

  async function clearKey() {
    await apiFetch("/api/sentinel/settings", {
      method: "POST",
      body: JSON.stringify({ clear: true }),
    });
    setMessage(t.settings.cleared);
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}

      <Panel title={t.settings.connection}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="label-caps">{t.settings.envKey}</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.envConfigured ? t.settings.configured : t.settings.missing}</dd>
          </div>
          <div>
            <dt className="label-caps">{t.settings.cookieKey}</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.cookieConfigured ? t.settings.set : t.settings.notSet}</dd>
          </div>
          <div>
            <dt className="label-caps">{t.settings.readyToCall}</dt>
            <dd className="mt-1 font-mono text-xs text-text">{info?.keyAvailable ? t.common.yes : t.common.no}</dd>
          </div>
        </dl>
      </Panel>

      <Panel
        title={t.settings.recommendedTitle}
        description={t.settings.recommendedDescription}
      >
        <pre className="overflow-auto rounded-xl bg-surface p-3 font-mono text-xs text-text-muted">
{`SENTINEL_API_KEY=your_key_here`}
        </pre>
      </Panel>

      <Panel title={t.settings.pasteTitle} description={t.settings.pasteDescription}>
        <TextInput
          type="password"
          autoComplete="off"
          placeholder="exo_…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={() => void saveKey()} disabled={!apiKey.trim()}>
            {t.settings.saveKey}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void clearKey()}>
            {t.settings.clearCookieKey}
          </Button>
        </div>
      </Panel>

      <Panel title={t.settings.authHeader}>
        <pre className="font-mono text-xs text-text-muted">X-API-Key: YOUR_API_KEY_HERE</pre>
        <p className="mt-2 text-xs text-text-muted">
          {t.settings.keysLookLike} <span className="font-mono text-text">exo_AbCd1234…</span>{" "}
          {t.settings.keysCannotRetrieve}
        </p>
      </Panel>
    </PageShell>
  );
}
