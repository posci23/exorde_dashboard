import { createExport } from "@/lib/exorde-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";
import { ExordeApiError, queryBodySchema } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = queryBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ExordeApiError(400, {
        detail: parsed.error.issues.map((i) => i.message).join("; "),
      });
    }
    const data = await createExport(parsed.data, await getRequestApiKey(request));
    return jsonOk(data, 200);
  } catch (error) {
    return jsonError(error);
  }
}
