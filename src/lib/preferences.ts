const PREFS_KEY = "sentinel.preferences.v1";

export type DefaultFormat = "jsonl" | "csv";

export type Preferences = {
  defaultFormat: DefaultFormat;
};

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Preferences>;
      if (parsed.defaultFormat === "jsonl" || parsed.defaultFormat === "csv") {
        return { defaultFormat: parsed.defaultFormat };
      }
    }
  } catch {
    // ignore
  }
  return { defaultFormat: "jsonl" };
}

export function savePreferences(prefs: Preferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
