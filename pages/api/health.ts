import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed } from "@/lib/api-handler";

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response);

  const configured = Boolean(process.env.GITLAB_URL && (process.env.GITLAB_API_TOKEN || process.env.GITLAB_REPORTER_TOKEN));
  return response.status(configured ? 200 : 503).json({ status: configured ? "ok" : "degraded", configured });
}
