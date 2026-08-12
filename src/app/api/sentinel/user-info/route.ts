import { getUserInfo } from "@/lib/api-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const data = await getUserInfo(await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
