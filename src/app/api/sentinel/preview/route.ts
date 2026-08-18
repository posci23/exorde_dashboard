import { previewQuery } from "@/lib/api-client";
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
    const previewBody = { ...parsed.data };
    delete previewBody.output_format;
    delete previewBody.result_limit;
    delete previewBody.per_day_limit;
    const data = await previewQuery(previewBody);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
