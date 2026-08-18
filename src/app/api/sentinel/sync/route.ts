import { syncExportJob } from "@/lib/api-client";
import { jsonError, jsonOk } from "@/lib/api-helpers";
import { UpstreamApiError } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as { job_id?: string };
    if (!json.job_id) {
      throw new UpstreamApiError(400, { detail: "job_id is required" });
    }
    const data = await syncExportJob(json.job_id);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
