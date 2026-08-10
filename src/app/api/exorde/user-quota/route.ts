import { getUserQuota } from "@/lib/exorde-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const data = await getUserQuota(await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
