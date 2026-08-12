import { listUserExports } from "@/lib/api-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";
import { LIMITS } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Number(searchParams.get("limit") ?? LIMITS.historyLimitDefault);
    const limit = Math.min(
      Math.max(Number.isFinite(raw) ? raw : LIMITS.historyLimitDefault, 1),
      LIMITS.historyLimitMax,
    );
    const data = await listUserExports(limit, await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
