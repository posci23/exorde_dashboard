import { listProviders } from "@/lib/analysis/providers";
import { jsonOk } from "@/lib/api-helpers";

export const runtime = "nodejs";

/**
 * What scoring options this deployment actually has. Names and availability
 * only — the endpoint and its key never leave the server.
 */
export async function GET() {
  return jsonOk({ providers: listProviders() });
}
