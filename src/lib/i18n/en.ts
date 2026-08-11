/**
 * English source strings. `es.ts` is typed as `Dict`, so TypeScript fails the
 * build if a translation is missing or a placeholder signature drifts.
 *
 * API identifiers — request fields (`exclude_fields`), output column names
 * (`analysis_sentiment`), domains, HTTP codes — stay in English everywhere.
 * They are literal wire values, not prose.
 */
export const en = {
  common: {
    refresh: "Refresh",
    refreshing: "Refreshing…",
    loading: "Loading…",
    save: "Save",
    clear: "Clear",
    remove: "Remove",
    dismiss: "Dismiss",
    yes: "yes",
    no: "no",
    none: "—",
    unlimited: "unlimited",
    optional: "optional",
    requiresApiKey: "Requires an API key",
    left: (n: string) => `${n} left`,
    language: "Language",
  },

  nav: {
    brand: "Exorde",
    product: "Data Export",
    proxiedTo: "Proxied to",
    overview: { label: "Overview", hint: "Health, queue, your quota" },
    query: { label: "Query", hint: "Build · preview · export" },
    jobs: { label: "Jobs", hint: "Monitor · download · history" },
    reference: { label: "Reference", hint: "Every option, field, and limit" },
    settings: { label: "Settings", hint: "API key" },
  },

  chips: {
    selectAll: "Select all",
    selectMatches: "Select matches",
    clearListed: "Clear listed",
    clearAll: "Clear all",
    noneSelected: "None selected",
    search: "Search…",
    addCustom: "Add",
    optionsAria: (label: string) => `${label} options`,
    noMatch: (q: string) => `No option matches “${q}”.`,
    addAsCustom: "Add it as a custom value below.",
    removeAria: (label: string) => `Remove ${label}`,
    maxReached: (max: number) => `Maximum of ${max} reached.`,
  },

  ui: {
    helpAria: (field: string) => `More about: ${field}`,
    helpAriaGeneric: "More about this field",
    readAbout: (topic: string) => `Read about ${topic} in the Reference`,
    customValue: "Custom value…",
    customValueAria: (unit: string) => `Custom value in ${unit}`,
    customValueAriaPlain: "Custom value",
  },

  overview: {
    title: "Overview",
    description:
      "Whether the API is up, whether the queue has room, and how much of your quota is left.",
    healthError: (msg: string) => `Health: ${msg}`,
    queueError: (msg: string) => `Queue: ${msg}`,
    quotaError: (msg: string) => `Quota: ${msg}`,
    needKeyPrefix: "Most of these need an API key — ",
    needKeyLink: "configure one in Settings",
    apiStatus: "API status",
    clickhouse: "ClickHouse",
    clickhouseHint: "Post storage",
    postgres: "PostgreSQL",
    postgresHint: "Jobs & quota",
    s3: "S3",
    s3Hint: "Export files",
    yourPlan: "Your plan",
    unknownPlan: "unknown plan",
    quotaResets: (when: string) => `Quota resets ${when}`,
    exportsToday: "Exports today",
    rowsToday: "Rows today",
    exportsMonth: "Exports this month",
    rowsMonth: "Rows this month",
    addKeyPrefix: "Add your key in ",
    addKeySuffix: " to see your plan, limits, and usage.",
    settings: "Settings",
    queueTitle: "Export queue",
    queueDescription: (slots: number) => `Shared across all customers · ${slots} slots`,
    runningNow: "Running now",
    capacity: "Capacity",
    utilization: "Utilization",
    acceptingJobs: "Accepting jobs",
    safeToSubmit: "Safe to submit",
    waitAndRetry: "Wait and retry",
    concurrencyNote: (running: number, inFlight: number) =>
      `You can also have at most ${running} running and ${inFlight} in-flight jobs. A 503 means the queue is full — back off and re-check here.`,
    queueNeedsKey: "Queue capacity requires an API key.",
    workflowTitle: "How the workflow runs",
    workflowDescription: "Preview is free; only exports consume quota",
    step1: "1 · Build & preview",
    step1Text: "Set filters, get an exact count and 100 sample rows. No quota used.",
    step2: "2 · Export",
    step2Text: "Same filters, run as an async job. This consumes quota.",
    step3: "3 · Monitor",
    step3Text: "Watch it move through 7 phases to completed.",
    step4: "4 · Download",
    step4Text: (hours: number) => `Presigned link, valid ${hours}h. Sync to refresh it.`,
  },

  query: {
    title: "Query",
    description:
      "Answer as many of the questions below as you need \u2014 every one is optional except a keyword or an author. Preview is free and instant; export runs the same query in full and lands in Jobs. Hover any ? for an explanation.",
    examples: "Example queries\u2026",
    loadedPreset: (label: string, desc: string) => `Loaded preset \u201c${label}\u201d \u2014 ${desc}`,
    issues: (n: number) => `${n} issue${n > 1 ? "s" : ""}`,
    valid: "\u2713 Valid",
    showIssues: "Show what needs fixing",
    queryReady: "This query is ready to run",
    previewOnly: "Preview only",
    exportOnly: "Export only",
    preview: "Preview (free)",
    previewing: "Previewing\u2026",
    previewHint: "Sample this query for free",
    startExport: "Start export",
    submitting: "Submitting\u2026",
    exportHint: "Run the full export",
    cantPreview: (msg: string) => `Can't preview this query: ${msg}`,
    cantExport: (msg: string) => `Can't export this query: ${msg}`,
    previewResult: "Preview result",
    matchingPosts: "Matching posts",
    matchingPostsHint: "Full export row count",
    queryTime: "Query time",
    estSize: "Est. export size",
    sampleRows: (n: number) => `Sample rows (${n})`,
    sampleRowsHint: "Free sample \u2014 the export returns all matching rows",
    colPosted: "Posted",
    colPlatform: "Platform",
    colLang: "Lang",
    colSentiment: "Sentiment",
    colContent: "Content",
    hide: "Hide",
    filtersApplied: "Filters the API applied",
  },

  builder: {
    keywordsTitle: "What words must appear?",
    keywordsLabel: "keywords",
    keywordsHelp: (groups: number, terms: number) =>
      `Up to ${groups} groups of ${terms} terms. Wrap in "double quotes" for an exact phrase; end with * to match a prefix.`,
    groupOperatorLabel: "Must a post match every group?",
    groupOperatorHelp:
      "AND is stricter: a post has to satisfy every group. Use it to cross two topics, e.g. group 1 = crypto terms, group 2 = regulation terms.",
    andHint: "Post must match every group",
    orHint: "Post may match any group",
    matchAny: "Match any term in this group",
    matchAll: "Match every term in this group",
    groupN: (n: number) => `Group ${n} \u00b7 match`,
    termsCount: (n: number, max: number) => `${n} / ${max} terms`,
    noGroups:
      "No keyword groups. That\u2019s allowed only when you set a selective filter under \u201cWhich authors or specific posts?\u201d.",
    addGroup: "Add keyword group",
    matchModeLabel: "How closely should terms be matched?",
    matchModeHelp:
      "Fast matches whole words only, so \u201cBTC\u201d won\u2019t be found inside \u201c#BTCUSD\u201d. Safe scans the raw text character by character and catches those, at 5\u201310\u00d7 the cost.",
    fast: "Fast",
    fastHint: "Token/Bloom index match \u2014 10\u201320\u00d7 faster",
    safe: "Safe",
    safeHint: "Substring scan for partial words and short codes",
    safeNote: "Safe mode finds partial words and short codes like BTC, but runs 5\u201310\u00d7 slower.",
    fastNote:
      "Fast mode matches whole words. Switch to Safe if your terms are short codes or fragments.",

    timeTitle: "When were the posts written?",
    timeLabel: "the time range",
    timeHelp: (max: number, perDay: number) =>
      `Dates are UTC. Max span is ${max} days, or ${perDay} days when a per-day cap is set.`,
    notBefore: "Not before",
    notBeforeHelp:
      "Times are UTC, not your local clock. A post written at 23:00 in Madrid counts as 21:00 or 22:00 here depending on the season.",
    notAfter: "Not after",
    notAfterHelp:
      "Leave this at \u201cnow\u201d for a rolling window. Exorde indexes posts within minutes, so the last hour may still be filling in.",
    span: "Span:",
    spanDays: (n: string) => `${n} days`,
    spanOverLimit: (span: string, max: number, perDay: number) =>
      `${span}-day span exceeds the ${max}-day limit. Set a per-day row cap under \u201cWhat goes in the file?\u201d to allow up to ${perDay} days.`,
    endBeforeStart: "End date is before start date.",
    collectedLabel: "When did Exorde collect it?",
    collectedHelp:
      "Two different clocks: above is when the author posted, this is when Exorde saw it. They differ when older posts get backfilled \u2014 most people can ignore this.",
    collectedOn:
      "Narrows to posts ingested in this window \u2014 useful for catching backfilled data. Requires both dates above.",
    collectedOff: "Set both dates above to enable collection-time filtering.",
    clearCollected: "Clear collection window",

    sourcesTitle: "Where should posts come from?",
    sourcesLabel: "platforms and languages",
    sourcesHelp: "Leave any of these empty to place no restriction on that dimension.",
    platforms: "Which platforms?",
    platformsHelp:
      "Matches the post\u2019s domain exactly, so \u201creddit.com\u201d covers every subreddit. To narrow to one subreddit or channel, use the URL field below instead.",
    platformsEmpty: "All platforms (no domain filter)",
    platformsSearch: "Search platforms\u2026",
    platformsCustom: "Other domain, e.g. example-forum.com",
    platformsFootnote:
      "Exorde covers 200+ sources. For subreddits or channels, URL patterns usually work better than domains.",
    languages: "Which languages?",
    languagesHelp:
      "Detected per post, not per author. Detection on very short posts is unreliable, so a strict language filter can drop real matches.",
    languagesEmpty: "All languages",
    languagesSearch: "Search languages\u2026",
    languagesCustom: "Other ISO code, e.g. sw",
    languagesFootnote:
      "176+ codes are supported; the list shows the most common. Add any other code directly.",
    locationLabel: "Where is the author from?",
    locationHelp:
      "This is the free-text location people type on their profile, not a verified GPS location. \u201cParis\u201d also matches \u201cParis, Texas\u201d and \u201cParisian at heart\u201d.",
    locationNote: (n: number, max: number) =>
      `${n} / ${max} \u00b7 matches the user-declared location field, case-insensitively.`,

    peopleTitle: "Which authors or specific posts?",
    peopleLabel: "authors and post IDs",
    peopleHelp:
      "These are selective filters \u2014 any one of them lets you run a query with no keywords at all.",
    authors: "Who wrote the post?",
    authorsHelp:
      "Handles without the @, comma-separated. Setting this alone is enough to run a query \u2014 you don\u2019t also need keywords.",
    nameMatching: "Name matching",
    ignoreCase: "Ignore case",
    ignoreCaseHint: "Default",
    exactCase: "Exact case",
    urlLabel: "What should the link contain?",
    urlHelp:
      "A plain substring of the post\u2019s link \u2014 no wildcards needed. This is how you target one subreddit or one YouTube channel, which the platform filter can\u2019t do.",
    urlNote:
      "Case-insensitive substring of the post URL \u2014 the reliable way to target a subreddit or channel.",
    insertExample: "Insert an example",
    postIds: "Any exact posts to fetch?",
    postIdsHelp:
      "The platform\u2019s own ID for a post \u2014 the number at the end of an X link, or a t1_\u2026 code on Reddit. Use it to re-fetch posts you already know about.",
    postIdsNote: "Re-fetch exact posts by their platform ID.",
    parentIds: "Replies under which posts?",
    parentIdsHelp:
      "Give a post\u2019s ID and you get the replies underneath it instead of the post itself \u2014 useful for pulling a whole discussion thread.",
    parentIdsNote: "Pull the replies and thread under a given post.",

    advancedTitle: "What should be filtered out?",
    advancedLabel: "exclusions and advanced filters",
    excludeWords: "Which words disqualify a post?",
    excludeWordsHelp:
      "Drops any post containing these words. The usual use is spam: \u201cgiveaway, airdrop, follow me\u201d. Exclusions always win over keyword matches.",
    addExclusion: "Add exclusion group",
    proximity: "Which terms must sit close together?",
    proximityHelp:
      "Requires two words to sit close together, which usually means they\u2019re actually related. \u201cbitcoin\u201d within 5 words of \u201cban\u201d finds real discussion; the same two words 200 words apart usually don\u2019t.",
    within: "within",
    wordsOf: "words of",
    firstTerm: "first term",
    secondTerm: "second term",
    addProximity: "Add proximity rule",
    profile: "What must be true of the author?",
    profileHelp:
      "Filters on the author\u2019s X profile \u2014 bio text, follower count, verified status. Posts from every other platform are dropped when you use this, because only X carries the metadata.",
    addProfile: "Add profile filter",
    profileNote: (values: number) =>
      `Fields combine with AND; up to ${values} values each (OR within a field). Only x.com posts carry this metadata.`,

    outputTitle: "What goes in the file?",
    outputLabel: "output fields and formats",
    outputHelp:
      "Format and row caps apply to exports only \u2014 previews ignore them and always return ~100 sample rows.",
    format: "Which file format?",
    formatHelp:
      "Pick CSV if you\u2019re opening this in Excel or Sheets. Pick JSONL if you\u2019re loading it with pandas, a script, or anything that reads line by line.",
    jsonlHint: "Default \u2014 streaming-friendly, nested fields stay JSON",
    csvHint: "Excel/Sheets \u2014 UTF-8 BOM, arrays serialized as JSON strings",
    jsonlNote: "One JSON object per line. Best for large sets and programmatic use.",
    csvNote: "RFC 4180 with a UTF-8 BOM so Excel opens it correctly.",
    rowCap: "How many rows at most?",
    rowCapHelp:
      "A hard stop on total rows. Leave it empty to get every match. Rows count against your plan quota, so a cap is a cheap safety net on a broad query.",
    rows: "rows",
    perDayCap: "How many rows per day?",
    perDayCapHelp:
      "Takes an even sample from each UTC day instead of letting one busy day dominate. Setting it also raises the maximum date range from 30 to 90 days.",
    rowsPerDay: "rows per UTC day",
    perDayNote: (max: number) =>
      `Samples evenly across days and raises the max span to ${max} days. Requires both dates.`,
    fieldsLabel: "What should each row contain?",
    fieldsHelp: (n: number) =>
      `Every row can carry up to ${n} columns, and most of them are AI-generated scores. Picking a preset here sets the API\u2019s exclude_fields list for you.`,
    cols: (n: number) => `${n} cols`,
    keeping: "Keeping",
    andMore: (n: number) => ` +${n} more`,
    allExcluded: "Every column is excluded \u2014 the export would have no data.",
    customFields: "Which columns should be left out?",
    customFieldsHelp: (n: number) =>
      `Anything you tick here is dropped from every row. Leave it empty to keep all ${n}.`,
    customFieldsEmpty: (n: number) => `Nothing excluded \u2014 all ${n} columns`,
    customFieldsSearch: "Search columns\u2026",
    customFieldsFootnote:
      "analysis_source_type, collection_module and collection_client_version are always excluded by the API.",

    payloadTitle: "What gets sent to the API?",
    payloadSummary: "The exact JSON this dashboard will send",
    payloadHelp: "Use this to reproduce the query outside the dashboard.",
    previewBody: "Preview body",
    exportBody: "Export body",
    copyCurl: "Copy as curl",
    resetAll: "Reset all filters",
  },

  settings: {
    title: "Settings",
    description:
      "Your Exorde API key. It is never exposed to the browser — the Next.js API routes attach it server-side.",
    saved:
      "API key saved in an httpOnly cookie for this browser (30 days). Prefer .env.local for permanence.",
    cleared: "Browser cookie key cleared. Env key (if any) still applies.",
    connection: "Connection",
    baseUrl: "Base URL",
    envKey: "EXORDE_API_KEY in env",
    configured: "configured",
    missing: "missing",
    cookieKey: "Cookie key",
    set: "set",
    notSet: "not set",
    readyToCall: "Ready to call API",
    recommendedTitle: "Recommended: .env.local",
    recommendedDescription: "Create this file in the project root, then restart npm run dev",
    pasteTitle: "Or paste key for this browser session",
    pasteDescription: "Stored as httpOnly cookie · not shown again",
    saveKey: "Save key",
    clearCookieKey: "Clear cookie key",
    authHeader: "Auth header (reference)",
    keysLookLike: "Keys look like",
    keysCannotRetrieve: "and cannot be retrieved after creation from Exorde.",
  },
};
// No `as const`: the values must widen to `string`, or a translation would have
// to equal the English literal to typecheck.
export type Dict = typeof en;
