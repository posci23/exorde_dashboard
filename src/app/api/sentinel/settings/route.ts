import { cookies } from "next/headers";
import { resolveBaseUrl } from "@/lib/api-client";
import { NextResponse } from "next/server";

const COOKIE = "sentinel_api_key";

export async function GET() {
  const jar = await cookies();
  const cookieConfigured = Boolean(jar.get(COOKIE)?.value?.trim());
  const envConfigured = Boolean(
    process.env.SENTINEL_API_KEY?.trim() || process.env.EXORDE_API_KEY?.trim(),
  );
  return NextResponse.json({
    ok: true,
    data: {
      envConfigured,
      cookieConfigured,
      keyAvailable: envConfigured || cookieConfigured,
      baseUrl: resolveBaseUrl(),
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { apiKey?: string; clear?: boolean };
  const response = NextResponse.json({ ok: true });

  if (body.clear) {
    response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }

  const key = body.apiKey?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, error: { detail: "apiKey required" } }, { status: 400 });
  }

  response.cookies.set(COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
