import { getHealth } from "@/lib/api-client";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  try {
    const data = await getHealth();
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
