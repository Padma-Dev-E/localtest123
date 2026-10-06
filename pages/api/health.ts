import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed } from "@/lib/api-handler";
import { generateAPIResponse } from "@/lib/api-response";

const API_ID = "gitlab_health";

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response, API_ID);

  const configured = Boolean(process.env.GITLAB_URL && (process.env.GITLAB_API_TOKEN || process.env.GITLAB_REPORTER_TOKEN));
  const status = configured ? 200 : 503;
  return response.status(status).json(generateAPIResponse(status, API_ID, { status: configured ? "ok" : "degraded", configured }));
}
