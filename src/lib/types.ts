import { z } from "zod";
import { LIMITS } from "./constants";

const termSchema = z
  .string()
  .min(1)
  .max(LIMITS.maxTermLength);

export const keywordGroupSchema = z.object({
  terms: z.array(termSchema).min(1).max(LIMITS.maxTermsPerGroup),
  operator: z.enum(["OR", "AND"]),
});

export const proximityGroupSchema = z.object({
  term_a: z.string().min(1),
  term_b: z.string().min(1),
  distance: z
    .number()
    .int()
    .min(LIMITS.proximityDistanceMin)
    .max(LIMITS.proximityDistanceMax),
});

export const queryBodySchema = z
  .object({
    keyword_groups: z.array(keywordGroupSchema).min(1).max(LIMITS.maxKeywordGroups).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    collected_at_start_date: z.string().optional(),
    collected_at_end_date: z.string().optional(),
    domains: z.array(z.string().min(1)).max(LIMITS.maxDomains).optional(),
    languages: z.array(z.string().min(1)).max(LIMITS.maxLanguages).optional(),
    usernames: z.array(z.string().min(1)).max(LIMITS.maxUsernames).optional(),
    exclude_fields: z.array(z.string()).optional(),
    full_string_scan: z.boolean().optional(),
    external_ids: z
      .array(z.string().min(1).max(LIMITS.maxIdLength))
      .max(LIMITS.maxExternalIds)
      .optional(),
    external_parent_ids: z
      .array(z.string().min(1).max(LIMITS.maxIdLength))
      .max(LIMITS.maxExternalParentIds)
      .optional(),
    exclude_keyword_groups: z
      .array(keywordGroupSchema)
      .max(LIMITS.maxExcludeKeywordGroups)
      .optional(),
    output_format: z.enum(["jsonl", "csv"]).optional(),
    result_limit: z
      .number()
      .int()
      .min(LIMITS.resultLimitMin)
      .max(LIMITS.resultLimitMax)
      .optional(),
    group_operator: z.enum(["AND", "OR"]).optional(),
    case_sensitive_usernames: z.boolean().optional(),
    locations: z
      .array(z.string().min(1).max(LIMITS.maxLocationLength))
      .max(LIMITS.maxLocations)
      .optional(),
    proximity_groups: z
      .array(proximityGroupSchema)
      .max(LIMITS.maxProximityGroups)
      .optional(),
    url_patterns: z
      .array(z.string().min(1).max(LIMITS.maxPatternLength))
      .max(LIMITS.maxUrlPatterns)
      .optional(),
    profile_filters: z
      .record(z.string(), z.array(z.string()).max(LIMITS.maxProfileFilterValues))
      .optional(),
    per_day_limit: z
      .number()
      .int()
      .min(LIMITS.perDayLimitMin)
      .max(LIMITS.perDayLimitMax)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasSelective =
      (data.external_ids && data.external_ids.length > 0) ||
      (data.external_parent_ids && data.external_parent_ids.length > 0) ||
      (data.usernames && data.usernames.length > 0) ||
      (data.url_patterns && data.url_patterns.length > 0);

    const hasKeywords = data.keyword_groups && data.keyword_groups.length > 0;

    if (data.proximity_groups && data.proximity_groups.length > 0 && !hasKeywords) {
      ctx.addIssue({
        code: "custom",
        message: "proximity_groups requires keyword_groups",
        path: ["proximity_groups"],
      });
    }

    if (!hasKeywords && !hasSelective) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide keyword_groups or a selective filter (external_ids, external_parent_ids, usernames, url_patterns)",
        path: ["keyword_groups"],
      });
    }

    if (data.per_day_limit != null && (!data.start_date || !data.end_date)) {
      ctx.addIssue({
        code: "custom",
        message: "per_day_limit requires both start_date and end_date",
        path: ["per_day_limit"],
      });
    }

    if (
      (data.collected_at_start_date || data.collected_at_end_date) &&
      (!data.start_date || !data.end_date)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Collection-time filters require both start_date and end_date",
        path: ["collected_at_start_date"],
      });
    }

    if (data.profile_filters) {
      const fieldCount = Object.keys(data.profile_filters).length;
      if (fieldCount > LIMITS.maxProfileFilterFields) {
        ctx.addIssue({
          code: "custom",
          message: `profile_filters allows max ${LIMITS.maxProfileFilterFields} fields`,
          path: ["profile_filters"],
        });
      }
    }
  });

export type QueryBody = z.infer<typeof queryBodySchema>;
export type KeywordGroup = z.infer<typeof keywordGroupSchema>;
export type ProximityGroup = z.infer<typeof proximityGroupSchema>;

export type SamplePost = {
  created_at?: string;
  domain?: string;
  url?: string;
  raw_content?: string;
  language?: string;
  external_id?: string;
  username?: string;
  analysis_sentiment?: number;
  analysis_top_keywords?: string[];
  [key: string]: unknown;
};

export type PreviewResponse = {
  count: number;
  query_time_seconds: number;
  estimated_export_size_mb: number;
  sample: SamplePost[];
  filters_applied: Record<string, unknown>;
};

export type ExportCreateResponse = {
  job_id: string;
  status: string;
  message: string;
  estimated_rows: number | null;
  estimated_time_minutes: number | null;
};

export type JobStatus =
  | "pending"
  | "validated"
  | "running"
  | "completed"
  | "failed"
  | "rejected"
  | string;

export type ExportJobResponse = {
  job_id: string;
  status: JobStatus;
  job_type?: string;
  created_at?: string | null;
  completed_at?: string | null;
  execution_time_seconds?: number | null;
  rows_returned?: number | null;
  file_size_bytes?: number | null;
  file_size_mb?: number | null;
  download_url?: string | null;
  download_expires_at?: string | null;
  error_message?: string | null;
  rows?: number | null;
  execution_time?: number | null;
};

export type HealthResponse = {
  status: string;
  version?: string;
  clickhouse?: string;
  postgres?: string;
  s3?: string;
  timestamp?: string;
};

export type QueueCapacityResponse = {
  current_jobs: number;
  max_capacity: number;
  utilization_pct: number;
  accepting_new_jobs: boolean;
};

/** GET /api/v1/user/info — identity + configured caps. */
export type UserInfoResponse = {
  user_id: string;
  email?: string | null;
  organization?: string | null;
  plan?: string | null;
  limits: Record<string, number | null>;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UsagePeriod = {
  exports?: number | null;
  rows?: number | null;
  remaining_exports?: number | null;
  remaining_rows?: number | null;
  quota_used_pct?: number | null;
};

/**
 * GET /api/v1/user/quota — limits plus live usage, keyed by period
 * (`today`, `this_month`). Indexed loosely so an added period still renders.
 */
export type UserQuotaResponse = UserInfoResponse & {
  usage: Record<string, UsagePeriod | undefined>;
  reset_at: string;
};

export type UserExportsResponse = {
  user_id: string;
  total: number;
  exports: ExportJobResponse[];
};

export type DuplicateExportDetail = {
  error: "duplicate_export";
  message: string;
  existing_job_id: string;
  existing_status: string;
  window_seconds: number;
};

export type RateLimitDetail = {
  error: "rate_limited";
  reason: "burst_limit" | "hourly_limit" | "cooldown" | string;
  retry_after_seconds: number;
  weight?: number;
  span_days?: number;
};

export class ExordeApiError extends Error {
  status: number;
  body: unknown;
  retryAfterSeconds?: number;

  constructor(status: number, body: unknown, retryAfterSeconds?: number) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : `Exorde API error ${status}`;
    super(message);
    this.name = "ExordeApiError";
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
