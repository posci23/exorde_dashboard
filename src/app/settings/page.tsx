"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryStore } from "@/components/QueryStore";
import {
  Alert,
  Button,
  PageHeader,
  PageShell,
  Panel,
  RadioCards,
  SegmentedControl,
} from "@/components/ui";
import { LOCALES, useLocale } from "@/lib/i18n/locale";
import { loadPreferences, savePreferences, type Preferences } from "@/lib/preferences";

const DEPLOYMENT_VARS = [
  { name: "SENTINEL_API_KEY", hintKey: "deploymentVarApiKey" },
  { name: "SENTINEL_API_BASE_URL", hintKey: "deploymentVarBaseUrl" },
] as const;

const VERCEL_CLI_COMMANDS = `vercel link
vercel env add SENTINEL_API_KEY production
vercel deploy --prod`;

export default function SettingsPage() {
  const { locale, setLocale, t } = useLocale();
  const { clearJobs, resetForm } = useQueryStore();
  const [prefs, setPrefs] = useState<Preferences>({ defaultFormat: "jsonl" });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadPreferences());
  }, []);

  function updatePrefs(next: Partial<Preferences>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    savePreferences(merged);
    setMessage(t.settings.savedPreferences);
  }

  function clearLocalData() {
    clearJobs();
    resetForm();
    setMessage(t.settings.clearedLocal);
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader title={t.settings.title} description={t.settings.description} />

      {message && <Alert tone="success">{message}</Alert>}

      <Panel title={t.settings.languageTitle} description={t.settings.languageDescription}>
        <SegmentedControl
          value={locale}
          options={LOCALES.map((option) => ({
            value: option.value,
            label: option.short,
            hint: option.label,
          }))}
          onChange={setLocale}
        />
      </Panel>

      <Panel title={t.settings.defaultsTitle} description={t.settings.defaultsDescription}>
        <RadioCards
          label={t.settings.defaultFormat}
          value={prefs.defaultFormat}
          columns={2}
          options={[
            {
              value: "jsonl",
              label: "JSONL",
              description: t.settings.defaultFormatJsonl,
            },
            {
              value: "csv",
              label: "CSV",
              description: t.settings.defaultFormatCsv,
            },
          ]}
          onChange={(defaultFormat) => updatePrefs({ defaultFormat })}
        />
      </Panel>

      <Panel title={t.settings.localDataTitle} description={t.settings.localDataDescription}>
        <p className="text-sm text-text-muted">{t.settings.localDataNote}</p>
        <Button type="button" variant="secondary" className="mt-4" onClick={clearLocalData}>
          {t.settings.clearLocalData}
        </Button>
      </Panel>

      <Panel title={t.settings.deploymentTitle} description={t.settings.deploymentDescription}>
        <p className="text-sm leading-relaxed text-text-muted">{t.settings.deploymentNote}</p>

        <dl className="mt-4 space-y-2">
          {DEPLOYMENT_VARS.map(({ name, hintKey }) => (
            <div key={name} className="text-sm">
              <dt className="font-mono text-xs text-text">{name}</dt>
              <dd className="text-text-muted">{t.settings[hintKey]}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-text-muted">{t.settings.deploymentCliNote}</p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-container-low p-3 font-mono text-xs text-text-muted">
          {VERCEL_CLI_COMMANDS}
        </pre>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {t.settings.deploymentCliRedeploy}
        </p>

        <Link
          href="/reference"
          className="mt-3 inline-flex text-sm font-medium text-accent hover:text-accent-hover"
        >
          {t.settings.viewReference}
        </Link>
      </Panel>
    </PageShell>
  );
}
