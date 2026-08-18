import { createExport } from "@/lib/api-client";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { UpstreamApiError, queryBodySchema } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = queryBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new UpstreamApiError(400, {
        detail: parsed.error.issues.map((i) => i.message).join("; "),
      });
    }
    const data = await createExport(parsed.data);
    return jsonOk(data, 200);
  } catch (error) {
    return jsonError(error);
  }
}
