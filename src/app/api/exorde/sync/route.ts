import { syncExportJob } from "@/lib/exorde-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";
import { ExordeApiError } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as { job_id?: string };
    if (!json.job_id) {
      throw new ExordeApiError(400, { detail: "job_id is required" });
    }
    const data = await syncExportJob(json.job_id, await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
