import { getUserQuota } from "@/lib/api-client";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  try {
    const data = await getUserQuota();
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
