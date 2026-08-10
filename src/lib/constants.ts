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
 * Known platforms for the `domains` filter (exact match on `domain`). Exorde
 * covers 200+ sources — this is the discoverable shortlist, grouped by kind;
 * anything else goes in as a custom domain.
 */
export const PLATFORMS = [
  { domain: "x.com", label: "X (Twitter)", group: "Social", note: "Profile filters only work here" },
  { domain: "reddit.com", label: "Reddit", group: "Social", note: "Use a URL pattern to target a subreddit" },
  { domain: "youtube.com", label: "YouTube", group: "Social", note: "Comments and video metadata" },
  { domain: "tiktok.com", label: "TikTok", group: "Social", note: null },
  { domain: "instagram.com", label: "Instagram", group: "Social", note: null },
  { domain: "facebook.com", label: "Facebook", group: "Social", note: null },
  { domain: "linkedin.com", label: "LinkedIn", group: "Social", note: null },
  { domain: "threads.net", label: "Threads", group: "Social", note: null },
  { domain: "bluesky.social", label: "Bluesky", group: "Decentralized", note: null },
  { domain: "mastodon.social", label: "Mastodon", group: "Decentralized", note: "Other instances via custom domain" },
  { domain: "lemmy.world", label: "Lemmy", group: "Decentralized", note: null },
  { domain: "nostr.com", label: "Nostr", group: "Decentralized", note: null },
  { domain: "truthsocial.com", label: "Truth Social", group: "Alt social", note: null },
  { domain: "gab.com", label: "Gab", group: "Alt social", note: null },
  { domain: "gettr.com", label: "Gettr", group: "Alt social", note: null },
  { domain: "minds.com", label: "Minds", group: "Alt social", note: null },
  { domain: "rumble.com", label: "Rumble", group: "Alt social", note: null },
  { domain: "news.ycombinator.com", label: "Hacker News", group: "Forums & boards", note: null },
  { domain: "4chan.org", label: "4chan", group: "Forums & boards", note: null },
  { domain: "stackexchange.com", label: "Stack Exchange", group: "Forums & boards", note: null },
  { domain: "quora.com", label: "Quora", group: "Forums & boards", note: null },
  { domain: "medium.com", label: "Medium", group: "Blogs & news", note: null },
  { domain: "substack.com", label: "Substack", group: "Blogs & news", note: null },
  { domain: "wordpress.com", label: "WordPress", group: "Blogs & news", note: null },
  { domain: "bitcointalk.org", label: "Bitcointalk", group: "Crypto", note: null },
  { domain: "tradingview.com", label: "TradingView", group: "Crypto", note: null },
  { domain: "social.com", label: "social.com", group: "Docs aliases", note: "X-style IDs in Exorde's own examples" },
  { domain: "smth.com", label: "smth.com", group: "Docs aliases", note: "Reddit-style t1_* IDs in Exorde's examples" },
] as const;

/** Ready-made `url_patterns` so the syntax is discoverable rather than guessed. */
export const URL_PATTERN_EXAMPLES = [
  { value: "reddit.com/r/", label: "Any subreddit", note: "Append the name, e.g. reddit.com/r/france" },
  { value: "reddit.com/r/cryptocurrency", label: "One subreddit", note: "r/cryptocurrency" },
  { value: "youtube.com/watch", label: "YouTube videos", note: "Video watch pages" },
  { value: "youtube.com/@", label: "A YouTube channel", note: "Append the handle" },
  { value: "x.com/i/status", label: "X status pages", note: null },
  { value: "news.ycombinator.com/item", label: "Hacker News threads", note: null },
  { value: "medium.com/@", label: "A Medium author", note: "Append the handle" },
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
  { name: "title", type: "string?", description: "Post title (if applicable)", category: "Post Metadata" },
  { name: "summary", type: "string?", description: "AI-generated summary", category: "Post Metadata" },
  { name: "raw_content", type: "string", description: "Original post text", category: "Post Metadata" },
  { name: "translated_content", type: "string?", description: "English translation (non-EN posts)", category: "Post Metadata" },
  { name: "picture", type: "string?", description: "Image URL (if present)", category: "Post Metadata" },
  { name: "collected_at", type: "string", description: "Collection timestamp", category: "Post Metadata" },
  { name: "author", type: "string?", description: "Author SHA1 hash of username", category: "Author Information" },
  { name: "username", type: "string?", description: "Public username (e.g., @user123)", category: "Author Information" },
  { name: "userprofile_url", type: "string?", description: "User profile link", category: "Author Information" },
  { name: "location", type: "string?", description: "User-declared location", category: "Author Information" },
  { name: "external_id", type: "string", description: "Platform post ID", category: "Source Information" },
  { name: "external_parent_id", type: "string?", description: "Parent post ID (replies/threads)", category: "Source Information" },
  { name: "domain", type: "string", description: "Source platform", category: "Source Information" },
  { name: "url", type: "string", description: "Direct link to post", category: "Source Information" },
  { name: "language", type: "string", description: "ISO 639-1/639-2 language code", category: "Source Information" },
  { name: "analysis_classification_label", type: "string", description: "Content category", category: "Analysis - Core" },
  { name: "analysis_classification_score", type: "float", description: "Classification confidence (0-1)", category: "Analysis - Core" },
  { name: "analysis_language_score", type: "float", description: "Language detection confidence", category: "Analysis - Core" },
  { name: "analysis_sentiment", type: "float", description: "Sentiment -1.0 to 1.0", category: "Analysis - Core" },
  { name: "analysis_embedding", type: "float[]", description: "Vector embedding (excluded by default)", category: "Analysis - Core" },
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
