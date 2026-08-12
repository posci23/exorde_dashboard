export const EXORDE_DEFAULT_BASE_URL = "https://export-api.exorde.io";

export const LIMITS = {
  maxKeywordGroups: 5,
  maxTermsPerGroup: 20,
  maxTermLength: 500,
  maxDomains: 50,
  maxLanguages: 10,
  maxUsernames: 50,
  maxExternalIds: 50,
  maxExternalParentIds: 50,
  maxExcludeKeywordGroups: 3,
  maxProximityGroups: 3,
  proximityDistanceMin: 1,
  proximityDistanceMax: 10,
  maxLocations: 20,
  maxLocationLength: 500,
  maxUrlPatterns: 20,
  maxPatternLength: 500,
  maxProfileFilterFields: 5,
  maxProfileFilterValues: 10,
  maxIdLength: 255,
  maxDateRangeDays: 30,
  maxPerDaySpanDays: 90,
  resultLimitMin: 1,
  resultLimitMax: 200_000_000,
  perDayLimitMin: 1,
  perDayLimitMax: 100_000,
  downloadsExpiryHours: 48,
  exportTimeoutSeconds: 7200,
  historyLimitDefault: 20,
  historyLimitMax: 100,
  concurrentGlobal: 8,
  concurrentPerCustomer: 4,
  inFlightPerCustomer: 50,
} as const;

/**
 * Sources for the `domains` filter (exact match on `domain`).
 *
 * The social list is the 11 platforms named in the April 2026 data dictionary,
 * plus Instagram — which the dictionary omits but which does appear in exports
 * (1,001 rows in a 150k sample). Share figures are measured from that sample,
 * so they show what actually dominates rather than what is merely supported.
 *
 * News is 7,000+ domains and only ~0.04% of volume, so it gets examples rather
 * than a list; any other domain can be typed in directly.
 */
export const PLATFORMS = [
  { domain: "x.com", label: "X (Twitter)", group: "Social", note: "29% of volume · the only platform with profile filters" },
  { domain: "tiktok.com", label: "TikTok", group: "Social", note: "39% of volume · engagement counts in summary" },
  { domain: "youtube.com", label: "YouTube", group: "Social", note: "19% of volume · comments, with title populated" },
  { domain: "reddit.com", label: "Reddit", group: "Social", note: "6% of volume · use a URL pattern for one subreddit" },
  { domain: "threads.net", label: "Threads", group: "Social", note: "5% of volume" },
  { domain: "bsky.app", label: "Bluesky", group: "Social", note: "0.7% of volume · note the domain is bsky.app" },
  { domain: "instagram.com", label: "Instagram", group: "Social", note: "0.7% of volume · absent from the official schema" },
  { domain: "4channel.org", label: "4chan", group: "Forums & decentralized", note: "Rare · appears as 4channel.org" },
  { domain: "lemmy.world", label: "Lemmy", group: "Forums & decentralized", note: "Rare" },
  { domain: "mastodon.social", label: "Mastodon", group: "Forums & decentralized", note: "Rare · other instances via custom domain" },
  { domain: "truthsocial.com", label: "Truth Social", group: "Forums & decentralized", note: "Listed in the schema; none seen in sampling" },
  { domain: "nostr.com", label: "Nostr", group: "Forums & decentralized", note: "Listed in the schema; none seen in sampling" },
  { domain: "bbc.com", label: "BBC", group: "News (7,000+ domains)", note: "News is ~0.04% of volume; type any other outlet directly" },
  { domain: "reuters.com", label: "Reuters", group: "News (7,000+ domains)", note: null },
  { domain: "nytimes.com", label: "New York Times", group: "News (7,000+ domains)", note: null },
] as const;

/** Ready-made `url_patterns` so the syntax is discoverable rather than guessed. */
export const URL_PATTERN_EXAMPLES = [
  { value: "reddit.com/r/", label: "Any subreddit", note: "Append the name, e.g. reddit.com/r/france" },
  { value: "reddit.com/r/cryptocurrency", label: "One subreddit", note: "r/cryptocurrency" },
  { value: "youtube.com/watch", label: "YouTube videos", note: "Video watch pages" },
  { value: "youtube.com/@", label: "A YouTube channel", note: "Append the handle" },
  { value: "x.com/i/status", label: "X status pages", note: null },
  { value: "tiktok.com/@", label: "A TikTok creator", note: "Append the handle" },
  { value: "bsky.app/profile/", label: "A Bluesky profile", note: "Append the handle" },
  { value: "threads.net/@", label: "A Threads account", note: "Append the handle" },
] as const;

export type ProfileFilterField = {
  name: string;
  label: string;
  match: "substring" | "exact";
  /** Fixed option set — renders as a picker instead of free text. */
  values?: readonly string[];
  placeholder?: string;
};

export const PROFILE_FILTER_FIELDS: readonly ProfileFilterField[] = [
  { name: "user_description", label: "Bio contains", match: "substring", placeholder: "journalist, founder" },
  { name: "profile_image_url", label: "Avatar URL contains", match: "substring", placeholder: "pbs.twimg.com" },
  { name: "user_followers_count", label: "Follower count", match: "exact", placeholder: "10000" },
  { name: "user_following_count", label: "Following count", match: "exact", placeholder: "500" },
  { name: "user_created_at", label: "Account created", match: "exact", placeholder: "2011-03-14" },
  { name: "user_verified", label: "Verified", match: "exact", values: ["true", "false"] },
  { name: "user_blue_verified", label: "Blue verified", match: "exact", values: ["true", "false"] },
];

export type LanguageOption = { code: string; label: string; tier: "Most used" | "All languages" };

/**
 * ISO 639-1 in full. The API accepts 176+ codes, so listing only a handful hid
 * most of what you can ask for; the common ones are pinned to the top.
 */
const TOP_LANGUAGES = [
  ["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"],
  ["pt", "Portuguese"], ["it", "Italian"], ["ru", "Russian"], ["ja", "Japanese"],
  ["zh", "Chinese"], ["ar", "Arabic"], ["hi", "Hindi"], ["ko", "Korean"],
  ["nl", "Dutch"], ["tr", "Turkish"], ["pl", "Polish"], ["id", "Indonesian"],
  ["uk", "Ukrainian"], ["vi", "Vietnamese"], ["th", "Thai"], ["sv", "Swedish"],
] as ReadonlyArray<readonly [string, string]>;

const OTHER_LANGUAGES = [
  ["ab", "Abkhazian"], ["aa", "Afar"], ["af", "Afrikaans"], ["ak", "Akan"], ["sq", "Albanian"],
  ["am", "Amharic"], ["an", "Aragonese"], ["hy", "Armenian"], ["as", "Assamese"], ["av", "Avaric"],
  ["ae", "Avestan"], ["ay", "Aymara"], ["az", "Azerbaijani"], ["bm", "Bambara"], ["ba", "Bashkir"],
  ["eu", "Basque"], ["be", "Belarusian"], ["bn", "Bengali"], ["bi", "Bislama"], ["bs", "Bosnian"],
  ["br", "Breton"], ["bg", "Bulgarian"], ["my", "Burmese"], ["ca", "Catalan"], ["ch", "Chamorro"],
  ["ce", "Chechen"], ["ny", "Chichewa"], ["cv", "Chuvash"], ["kw", "Cornish"], ["co", "Corsican"],
  ["cr", "Cree"], ["hr", "Croatian"], ["cs", "Czech"], ["da", "Danish"], ["dv", "Divehi"],
  ["dz", "Dzongkha"], ["eo", "Esperanto"], ["et", "Estonian"], ["ee", "Ewe"], ["fo", "Faroese"],
  ["fj", "Fijian"], ["fi", "Finnish"], ["ff", "Fulah"], ["gl", "Galician"], ["ka", "Georgian"],
  ["el", "Greek"], ["gn", "Guarani"], ["gu", "Gujarati"], ["ht", "Haitian Creole"], ["ha", "Hausa"],
  ["he", "Hebrew"], ["hz", "Herero"], ["ho", "Hiri Motu"], ["hu", "Hungarian"], ["ia", "Interlingua"],
  ["ie", "Interlingue"], ["ga", "Irish"], ["ig", "Igbo"], ["ik", "Inupiaq"], ["io", "Ido"],
  ["is", "Icelandic"], ["iu", "Inuktitut"], ["jv", "Javanese"], ["kl", "Kalaallisut"], ["kn", "Kannada"],
  ["kr", "Kanuri"], ["ks", "Kashmiri"], ["kk", "Kazakh"], ["km", "Khmer"], ["ki", "Kikuyu"],
  ["rw", "Kinyarwanda"], ["ky", "Kyrgyz"], ["kv", "Komi"], ["kg", "Kongo"], ["kj", "Kuanyama"],
  ["la", "Latin"], ["lb", "Luxembourgish"], ["lg", "Ganda"], ["li", "Limburgish"], ["ln", "Lingala"],
  ["lo", "Lao"], ["lt", "Lithuanian"], ["lu", "Luba-Katanga"], ["lv", "Latvian"], ["gv", "Manx"],
  ["mk", "Macedonian"], ["mg", "Malagasy"], ["ms", "Malay"], ["ml", "Malayalam"], ["mt", "Maltese"],
  ["mi", "Maori"], ["mr", "Marathi"], ["mh", "Marshallese"], ["mn", "Mongolian"], ["na", "Nauru"],
  ["nv", "Navajo"], ["nb", "Norwegian Bokmål"], ["nd", "North Ndebele"], ["ne", "Nepali"], ["ng", "Ndonga"],
  ["nn", "Norwegian Nynorsk"], ["no", "Norwegian"], ["ii", "Sichuan Yi"], ["nr", "South Ndebele"], ["oc", "Occitan"],
  ["oj", "Ojibwe"], ["cu", "Church Slavonic"], ["om", "Oromo"], ["or", "Odia"], ["os", "Ossetian"],
  ["pa", "Punjabi"], ["pi", "Pali"], ["fa", "Persian"], ["ps", "Pashto"], ["qu", "Quechua"],
  ["rm", "Romansh"], ["rn", "Rundi"], ["ro", "Romanian"], ["sa", "Sanskrit"], ["sc", "Sardinian"],
  ["sd", "Sindhi"], ["se", "Northern Sami"], ["sm", "Samoan"], ["sg", "Sango"], ["sr", "Serbian"],
  ["gd", "Scottish Gaelic"], ["sn", "Shona"], ["si", "Sinhala"], ["sk", "Slovak"], ["sl", "Slovenian"],
  ["so", "Somali"], ["st", "Southern Sotho"], ["su", "Sundanese"], ["sw", "Swahili"], ["ss", "Swati"],
  ["ta", "Tamil"], ["te", "Telugu"], ["tg", "Tajik"], ["ti", "Tigrinya"], ["bo", "Tibetan"],
  ["tk", "Turkmen"], ["tl", "Tagalog"], ["tn", "Tswana"], ["to", "Tongan"], ["ts", "Tsonga"],
  ["tt", "Tatar"], ["tw", "Twi"], ["ty", "Tahitian"], ["ug", "Uyghur"], ["ur", "Urdu"],
  ["uz", "Uzbek"], ["ve", "Venda"], ["vo", "Volapük"], ["wa", "Walloon"], ["cy", "Welsh"],
  ["wo", "Wolof"], ["fy", "Western Frisian"], ["xh", "Xhosa"], ["yi", "Yiddish"], ["yo", "Yoruba"],
  ["za", "Zhuang"], ["zu", "Zulu"],
] as ReadonlyArray<readonly [string, string]>;

export const ALL_LANGUAGES: LanguageOption[] = [
  ...TOP_LANGUAGES.map(([code, label]) => ({ code, label, tier: "Most used" as const })),
  ...OTHER_LANGUAGES.filter(([code]) => !TOP_LANGUAGES.some(([t]) => t === code))
    .map(([code, label]) => ({ code, label, tier: "All languages" as const }))
    .sort((a, b) => a.label.localeCompare(b.label)),
];


/** Relative windows offered as one-click buttons on the time-range section. */
export const DATE_RANGE_PRESETS = [
  { id: "24h", label: "Last 24h", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90, needsPerDayLimit: true },
] as const;

export const RESULT_LIMIT_PRESETS = [
  { value: "", label: "All matching rows (no cap)" },
  { value: "1000", label: "1,000 rows" },
  { value: "10000", label: "10,000 rows" },
  { value: "100000", label: "100,000 rows" },
  { value: "1000000", label: "1,000,000 rows" },
] as const;

export const PER_DAY_LIMIT_PRESETS = [
  { value: "", label: "No per-day cap" },
  { value: "100", label: "100 / day" },
  { value: "1000", label: "1,000 / day" },
  { value: "5000", label: "5,000 / day" },
  { value: "100000", label: "100,000 / day (max)" },
] as const;

export const ALWAYS_EXCLUDED_FIELDS = [
  "analysis_source_type",
  "collection_module",
  "collection_client_version",
] as const;

export const EMOTION_FIELDS = [
  "analysis_emotion_love",
  "analysis_emotion_admiration",
  "analysis_emotion_joy",
  "analysis_emotion_approval",
  "analysis_emotion_caring",
  "analysis_emotion_excitement",
  "analysis_emotion_gratitude",
  "analysis_emotion_desire",
  "analysis_emotion_anger",
  "analysis_emotion_optimism",
  "analysis_emotion_disapproval",
  "analysis_emotion_grief",
  "analysis_emotion_annoyance",
  "analysis_emotion_pride",
  "analysis_emotion_curiosity",
  "analysis_emotion_neutral",
  "analysis_emotion_disgust",
  "analysis_emotion_disappointment",
  "analysis_emotion_realization",
  "analysis_emotion_fear",
  "analysis_emotion_relief",
  "analysis_emotion_confusion",
  "analysis_emotion_remorse",
  "analysis_emotion_embarrassment",
  "analysis_emotion_surprise",
  "analysis_emotion_sadness",
  "analysis_emotion_nervousness",
] as const;

/**
 * Named answers to "what should each row contain?", ordered by how often people
 * want them. The whole point is that the common case — post text without the
 * analysis columns — is one click and needs no knowledge of field names.
 */
export type FieldPreset = {
  id: string;
  label: string;
  /** One line under the option, in plain language. */
  description: string;
  /** null means "let the API decide" (omit exclude_fields entirely). */
  exclude: readonly string[] | null;
};

const CORE_ANALYSIS_FIELDS = [
  "analysis_classification_label",
  "analysis_classification_score",
  "analysis_language_score",
  "analysis_sentiment",
  "analysis_top_keywords",
] as const;

export const FIELD_PRESETS: readonly FieldPreset[] = [
  {
    id: "raw",
    label: "Just the posts",
    description: "Text, author, link, time, language. No AI scores.",
    exclude: ["analysis_embedding", ...CORE_ANALYSIS_FIELDS, ...EMOTION_FIELDS],
  },
  {
    id: "sentiment",
    label: "Posts + sentiment",
    description: "Adds one sentiment score per post, no emotion breakdown.",
    exclude: [
      "analysis_embedding",
      "analysis_classification_label",
      "analysis_classification_score",
      "analysis_language_score",
      "analysis_top_keywords",
      ...EMOTION_FIELDS,
    ],
  },
  {
    id: "default",
    label: "Everything but embeddings",
    description: "The API default: all analysis columns except the 384-number vector.",
    exclude: null,
  },
  {
    id: "full",
    label: "Everything",
    description: "Includes analysis_embedding — files get roughly 10× larger.",
    exclude: [],
  },
  {
    id: "custom",
    label: "Pick fields myself",
    description: "Choose exactly which columns to leave out.",
    exclude: null,
  },
] as const;

export const DEFAULT_FIELD_PRESET = "raw";

export type FieldCategory =
  | "Post Metadata"
  | "Author Information"
  | "Source Information"
  | "Analysis - Core"
  | "Analysis - Emotions"
  | "Always Excluded";

export type FieldRef = {
  name: string;
  type: string;
  description: string;
  category: FieldCategory;
};

export const FIELD_REFERENCE: FieldRef[] = [
  { name: "created_at", type: "string", description: "Post timestamp (ISO 8601)", category: "Post Metadata" },
  { name: "title", type: "string?", description: "Post title — only populated on YouTube and Reddit, null elsewhere", category: "Post Metadata" },
  { name: "summary", type: "json string?", description: "Platform metadata as JSON, NOT a summary: X profile info, TikTok engagement counts. Schema varies by platform — parse defensively", category: "Post Metadata" },
  { name: "raw_content", type: "string", description: "Original unaltered text; may have media URLs appended, which are not stripped", category: "Post Metadata" },
  { name: "translated_content", type: "string?", description: "ArgoTranslate English translation; mirrors raw_content when already English", category: "Post Metadata" },
  { name: "picture", type: "string?", description: "Image URL (if present)", category: "Post Metadata" },
  { name: "collected_at", type: "string", description: "Collection timestamp", category: "Post Metadata" },
  { name: "author", type: "string?", description: "SHA1 hash of the author identity (40 hex chars) — stable, so usable for dedup without PII", category: "Author Information" },
  { name: "username", type: "string?", description: "Public username (e.g., @user123)", category: "Author Information" },
  { name: "userprofile_url", type: "string?", description: "User profile link", category: "Author Information" },
  { name: "location", type: "string?", description: "Free text from the profile, X only. Not normalized, not geocoded", category: "Author Information" },
  { name: "external_id", type: "string", description: "Platform post ID", category: "Source Information" },
  { name: "external_parent_id", type: "string?", description: "Parent post ID (replies/threads)", category: "Source Information" },
  { name: "domain", type: "string", description: "Source platform", category: "Source Information" },
  { name: "url", type: "string", description: "Direct link to post", category: "Source Information" },
  { name: "language", type: "string", description: "ISO 639-1/639-2 language code", category: "Source Information" },
  { name: "analysis_classification_label", type: "string", description: "Content category", category: "Analysis - Core" },
  { name: "analysis_classification_score", type: "float", description: "Classification confidence (0-1)", category: "Analysis - Core" },
  { name: "analysis_language_score", type: "float", description: "Deprecated — not actively populated; slated for replacement", category: "Analysis - Core" },
  { name: "analysis_sentiment", type: "float", description: "Sentiment -1.0 to 1.0", category: "Analysis - Core" },
  { name: "analysis_embedding", type: "float[384]", description: "384-dim MiniLM v2 vector for clustering and semantic search (excluded by default)", category: "Analysis - Core" },
  { name: "analysis_top_keywords", type: "string[]", description: "AI-extracted top keywords", category: "Analysis - Core" },
  ...EMOTION_FIELDS.map((name) => ({
    name,
    type: "float",
    description: "Emotion score 0-1",
    category: "Analysis - Emotions" as const,
  })),
  ...ALWAYS_EXCLUDED_FIELDS.map((name) => ({
    name,
    type: "—",
    description: "Always excluded due to UNION type mismatches",
    category: "Always Excluded" as const,
  })),
];

/** The fixed set assigned to analysis_classification_label (data dictionary, April 2026). */
export const CLASSIFICATION_LABELS = [
  "Technology", "Entertainment", "Sports", "Politics", "Business", "Health", "Science",
  "People", "Cryptocurrency", "Finance", "Environment", "Economy", "Law", "Investing",
] as const;

/** external_id shapes, so a pasted ID can be matched to its platform. */
export const EXTERNAL_ID_FORMATS = [
  { platform: "X", format: "Numeric tweet ID", example: "2047264620533129609" },
  { platform: "Reddit (post)", format: "t3_ + base36", example: "t3_1r8ue30" },
  { platform: "Reddit (comment)", format: "t1_ + base36", example: "t1_m5abc12" },
  { platform: "Threads", format: "{post_id}_{user_id}", example: "3833269525982314775_67011193166" },
  { platform: "YouTube", format: "Video ID", example: "dQw4w9WgXcQ" },
  { platform: "TikTok (comment)", format: "Numeric; parent is the video", example: "7628378578404543762" },
  { platform: "Bluesky", format: "AT URI or record key", example: "varies" },
] as const;

export const EXPORT_PHASES = [
  "Validation",
  "Client Init",
  "COUNT Query",
  "Quota Check",
  "S3 Init",
  "Streaming",
  "Complete",
] as const;

export const HTTP_ERRORS = [
  { code: 200, scenario: "Success", tip: "Job created or data returned." },
  { code: 400, scenario: "Bad request / validation", tip: "Check date range, array caps, and required selective/keyword rules." },
  { code: 401, scenario: "Unauthorized", tip: "Missing or invalid API key." },
  { code: 403, scenario: "Forbidden / history_too_old", tip: "Job ownership or plan history cap exceeded." },
  { code: 404, scenario: "Not found", tip: "Job ID does not exist." },
  { code: 409, scenario: "Duplicate export", tip: "Poll existing_job_id instead of resubmitting (5-min window)." },
  { code: 429, scenario: "Rate-limited or quota", tip: "Honor Retry-After; weight = ceil(span_days / 7)." },
  { code: 503, scenario: "Queue saturated", tip: "Backoff and check queue capacity before retry." },
  { code: 500, scenario: "Server error", tip: "Transient backend failure — retry with backoff." },
] as const;
