import { getExportJob } from "@/lib/api-client";
import { jsonError, jsonOk } from "@/lib/api-helpers";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    const data = await getExportJob(jobId);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
