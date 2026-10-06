import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, queryValue, setCacheControl } from "@/lib/api-handler";
import { generateAPIResponse } from "@/lib/api-response";
import { GitLabApiError } from "@/lib/gitlab";
import { getPipelineDetails } from "@/lib/pipeline-detail";

const API_ID = "gitlab_pipeline_detail";

function parseId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response, API_ID);

  const projectId = parseId(queryValue(request, "projectId"));
  const pipelineId = parseId(queryValue(request, "pipelineId"));
  if (!projectId || !pipelineId) return response.status(400).json(generateAPIResponse(400, API_ID, { error: "Invalid project or pipeline id" }));

  try {
    const detail = await getPipelineDetails(projectId, pipelineId);
    setCacheControl(response, "private, max-age=20, stale-while-revalidate=60");
    return response.status(200).json(generateAPIResponse(200, API_ID, detail));
  } catch (error) {
    const status = error instanceof GitLabApiError ? (error.status === 404 ? 404 : 502) : 500;
    const message = error instanceof GitLabApiError && error.status === 404
      ? "Pipeline not found or not visible to the configured GitLab identity"
      : "Pipeline details could not be loaded";
    return response.status(status).json(generateAPIResponse(status, API_ID, { error: message }));
  }
}
