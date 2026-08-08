import { previewQuery } from "@/lib/exorde-client";
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
    const previewBody = { ...parsed.data };
    delete previewBody.output_format;
    delete previewBody.result_limit;
    delete previewBody.per_day_limit;
    const data = await previewQuery(previewBody, await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
