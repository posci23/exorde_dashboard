import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = "exorde_api_key";

export async function GET() {
  const jar = await cookies();
  const cookieConfigured = Boolean(jar.get(COOKIE)?.value?.trim());
  const envConfigured = Boolean(process.env.EXORDE_API_KEY?.trim());
  return NextResponse.json({
    ok: true,
    data: {
      envConfigured,
      cookieConfigured,
      keyAvailable: envConfigured || cookieConfigured,
      baseUrl: process.env.EXORDE_API_BASE_URL || "https://export-api.exorde.io",
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
