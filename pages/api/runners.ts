import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, queryValue, setCacheControl } from "@/lib/api-handler";
import { pageNumber, paginateItems, perPageNumber } from "@/lib/api-pagination";
import { GitLabApiError } from "@/lib/gitlab";
import { listAllRunners, listAllRunnersForProject, listRunners, runnerStats } from "@/lib/gitlab-resources";
import { cached } from "@/lib/ttl-cache";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response);

  const project = queryValue(request, "project") || "all";
  const page = pageNumber(queryValue(request, "page"));
  const perPage = perPageNumber(queryValue(request, "per_page"));
  const allRecords = queryValue(request, "all") === "true";
  const projectId = project === "all" ? null : Number(project);
  if (projectId !== null && (!Number.isSafeInteger(projectId) || projectId < 1)) return response.status(400).json({ error: "project must be all or a numeric project id" });

  try {
    if (projectId === null) {
      if (allRecords) {
        const items = await cached("runners:instance", listAllRunners);
        const result = paginateItems(items, page, perPage);
        setCacheControl(response, "private, max-age=15, stale-while-revalidate=30");
        return response.status(200).json({ ...result, items, stats: runnerStats(items), filters: { project: "all", all: true } });
      }
      const result = await listRunners(null, page, perPage);
      setCacheControl(response, "private, max-age=15, stale-while-revalidate=30");
      return response.status(200).json({ ...result, stats: runnerStats(result.items, "instance", false, result.pagination.total ?? result.items.length), filters: { project: "all" } });
    }

    if (allRecords) {
      const items = await cached(`runners:project:${projectId}`, () => listAllRunnersForProject(projectId));
      const result = paginateItems(items, page, perPage);
      setCacheControl(response, "private, max-age=15, stale-while-revalidate=30");
      return response.status(200).json({ ...result, items, stats: runnerStats(items, "project"), filters: { project: projectId, all: true } });
    }

    const result = await listRunners(projectId, page, perPage);
    setCacheControl(response, "private, max-age=15, stale-while-revalidate=30");
    return response.status(200).json({ ...result, stats: runnerStats(result.items, "project", result.pagination.total !== null && !result.pagination.hasNext), filters: { project: projectId } });
  } catch (error) {
    const status = error instanceof GitLabApiError && error.status === 403 ? 403 : 502;
    return response.status(status).json({ error: status === 403 ? "Runner inventory is not available to this GitLab token" : "Runners could not be loaded" });
  }
}
