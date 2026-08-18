import { NextResponse } from "next/server";
import { UpstreamApiError } from "./types";

export function jsonError(error: unknown) {
  if (error instanceof UpstreamApiError) {
    const headers: HeadersInit = {};
    if (error.retryAfterSeconds != null) {
      headers["Retry-After"] = String(error.retryAfterSeconds);
    }
    return NextResponse.json(
      {
        ok: false,
        status: error.status,
        error: error.body,
        retry_after_seconds: error.retryAfterSeconds,
      },
      { status: error.status, headers },
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ ok: false, status: 500, error: { detail: message } }, { status: 500 });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
