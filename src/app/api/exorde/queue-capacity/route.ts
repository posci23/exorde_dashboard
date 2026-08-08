import { getQueueCapacity } from "@/lib/exorde-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const data = await getQueueCapacity(await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
