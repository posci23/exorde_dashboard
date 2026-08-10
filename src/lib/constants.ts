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

/** Known platforms for the domains filter (exact match on `domain`). Exorde covers 200+ sources; add custom domains for others. */
export const PLATFORMS = [
  { domain: "x.com", label: "X (Twitter)", note: "Profile filters supported" },
  { domain: "youtube.com", label: "YouTube", note: null },
  { domain: "reddit.com", label: "Reddit", note: "Or use url_patterns for subreddits" },
  { domain: "mastodon.social", label: "Mastodon (mastodon.social)", note: "Other instances via custom domain" },
  { domain: "bluesky.social", label: "Bluesky", note: "If present in your corpus" },
  { domain: "threads.net", label: "Threads", note: "If present in your corpus" },
  { domain: "truthsocial.com", label: "Truth Social", note: "If present in your corpus" },
  { domain: "tiktok.com", label: "TikTok", note: "If present in your corpus" },
  { domain: "linkedin.com", label: "LinkedIn", note: "If present in your corpus" },
  { domain: "facebook.com", label: "Facebook", note: "If present in your corpus" },
  { domain: "instagram.com", label: "Instagram", note: "If present in your corpus" },
  { domain: "news.ycombinator.com", label: "Hacker News", note: "If present in your corpus" },
  { domain: "4chan.org", label: "4chan", note: "If present in your corpus" },
  { domain: "social.com", label: "social.com (docs alias)", note: "X-style IDs in Exorde examples" },
  { domain: "smth.com", label: "smth.com (docs alias)", note: "Reddit-style t1_* IDs in Exorde examples" },
] as const;

export const PLATFORM_DOMAINS: Set<string> = new Set(PLATFORMS.map((p) => p.domain));

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

export const COMMON_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ko", label: "Korean" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "sv", label: "Swedish" },
  { code: "no", label: "Norwegian" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "cs", label: "Czech" },
  { code: "uk", label: "Ukrainian" },
  { code: "el", label: "Greek" },
  { code: "he", label: "Hebrew" },
  { code: "id", label: "Indonesian" },
  { code: "th", label: "Thai" },
  { code: "vi", label: "Vietnamese" },
  { code: "ro", label: "Romanian" },
  { code: "hu", label: "Hungarian" },
  { code: "fa", label: "Persian" },
  { code: "bn", label: "Bengali" },
] as const;

export const LANGUAGE_CODES: Set<string> = new Set(COMMON_LANGUAGES.map((l) => l.code));

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
