import { getExportJob } from "@/lib/exorde-client";
import { getRequestApiKey, jsonError, jsonOk } from "@/lib/api-helpers";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    const data = await getExportJob(jobId, await getRequestApiKey(request));
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
