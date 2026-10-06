import type { NextApiRequest, NextApiResponse } from "next";

import { getDashboardSnapshot } from "@/lib/dashboard-service";
import { methodNotAllowed, queryValue, setCacheControl } from "@/lib/api-handler";
import { generateAPIResponse } from "@/lib/api-response";
import { parseHours } from "@/lib/time-window";

const API_ID = "gitlab_dashboard";

function validId(value: number | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response, API_ID);

  const projectValue = queryValue(request, "project");
  const projectId = projectValue && projectValue !== "all" ? Number(projectValue) : undefined;
  const groupValue = queryValue(request, "group_id");
  const groupId = groupValue ? Number(groupValue) : undefined;

  try {
    const data = await getDashboardSnapshot({
      projectId: validId(projectId) ? projectId : undefined,
      groupId: validId(groupId) ? groupId : undefined,
      includeSubgroups: queryValue(request, "include_subgroups") === "true",
      hours: parseHours(queryValue(request, "hours")),
    });
    setCacheControl(response, "private, max-age=20, stale-while-revalidate=60");
    return response.status(200).json(generateAPIResponse(200, API_ID, data));
  } catch {
    return response.status(502).json(generateAPIResponse(502, API_ID, { error: "Dashboard data could not be loaded" }));
  }
}
