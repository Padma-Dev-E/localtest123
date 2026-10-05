import { NextRequest, NextResponse } from "next/server";

import { pageNumber, paginateItems, perPageNumber } from "@/lib/api-pagination";
import { listAllRunners, listAllRunnersForProject, listRunners, runnerStats } from "@/lib/gitlab-resources";
import { GitLabApiError } from "@/lib/gitlab";
import { cached } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project") || "all";
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const allRecords = params.get("all") === "true";
  const projectId = project === "all" ? null : Number(project);
  if (projectId !== null && (!Number.isSafeInteger(projectId) || projectId < 1)) return NextResponse.json({ error: "project must be all or a numeric project id" }, { status: 400 });
  try {
    if (projectId === null) {
      const items = await cached("runners:instance", listAllRunners);
      const result = paginateItems(items, page, perPage);
      return NextResponse.json({ ...result, items: allRecords ? items : result.items, stats: runnerStats(items), filters: { project: "all", all: allRecords } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
    }
    if (allRecords) {
      const items = await cached(`runners:project:${projectId}`, () => listAllRunnersForProject(projectId));
      const result = paginateItems(items, page, perPage);
      return NextResponse.json({ ...result, items, stats: runnerStats(items, "project"), filters: { project: projectId, all: true } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
    }
    const result = await listRunners(projectId, page, perPage);
    return NextResponse.json({ ...result, stats: runnerStats(result.items, "project", result.pagination.total !== null && !result.pagination.hasNext), filters: { project: projectId } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch (error) {
    const statusCode = error instanceof GitLabApiError && error.status === 403 ? 403 : 502;
    return NextResponse.json({ error: statusCode === 403 ? "Runner inventory is not available to this GitLab token" : "Runners could not be loaded" }, { status: statusCode });
  }
}
