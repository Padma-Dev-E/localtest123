import { NextRequest, NextResponse } from "next/server";

import { pageNumber, paginateItems, perPageNumber } from "@/lib/api-pagination";
import { collectAllPipelinesForProjects, getProject, listAllPipelines, listAllProjects, listPipelines, pipelineStatsForPage, pipelineStatsForProject } from "@/lib/gitlab-resources";
import { GitLabApiError } from "@/lib/gitlab";
import { cached } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project") || "all";
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const hours = Math.min(Math.max(Number(params.get("hours") || 24), 1), 168);
  const status = params.get("status") || undefined;
  const ref = params.get("ref") || undefined;
  const allRecords = params.get("all") === "true";
  const groupValue = params.get("group_id");
  const groupId = groupValue === null ? null : Number(groupValue);
  const includeSubgroups = params.get("include_subgroups") === "true";
  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId < 1)) return NextResponse.json({ error: "group_id must be a positive numeric group id" }, { status: 400 });

  try {
    if (project !== "all") {
      const projectId = Number(project);
      if (!Number.isSafeInteger(projectId) || projectId < 1) return NextResponse.json({ error: "project must be all or a numeric project id" }, { status: 400 });
      const selected = await getProject(projectId);
      if (allRecords) {
        const items = await listAllPipelines(selected, { hours, status, ref });
        const resolved = paginateItems(items, page, perPage);
        const stats = pipelineStatsForPage({ items, pagination: resolved.pagination }, "project");
        return NextResponse.json({ ...resolved, items, stats, filters: { project: projectId, groupId, includeSubgroups, hours, status: status || null, ref: ref || null, all: true } });
      }
      const resolved = await listPipelines(selected, page, perPage, { hours, status, ref });
      let stats = pipelineStatsForPage(resolved, "project");
      if (!status) {
        try {
          stats = await pipelineStatsForProject(selected, { hours, ref }, resolved);
        } catch {
          // Keep the paginated project response usable if a status-specific permission differs.
        }
      }
      return NextResponse.json({ ...resolved, stats, filters: { project: projectId, groupId, includeSubgroups, hours, status: status || null, ref: ref || null } });
    }

    const cacheKey = `pipelines:${groupId ?? "instance"}:${includeSubgroups}:${hours}:${status || "all"}:${ref || "all"}`;
    const collected = await cached(cacheKey, async () => {
      const projects = await listAllProjects({ groupId: groupId ?? undefined, includeSubgroups });
      return { projects, collected: await collectAllPipelinesForProjects(projects, (item) => listAllPipelines(item, { hours, status, ref })) };
    });
    const projects = collected.projects;
    const pipelineCollection = collected.collected;
    const sorted = pipelineCollection.items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const result = paginateItems(sorted, page, perPage);
    return NextResponse.json({ ...result, items: allRecords ? sorted : result.items, projectPagination: paginateItems(projects, 1, projects.length || 1).pagination, stats: pipelineCollection.stats, filters: { project: "all", groupId, includeSubgroups, hours, status: status || null, ref: ref || null, all: allRecords }, warnings: pipelineCollection.warnings, paginationNote: "Pipeline pagination is across all accessible instance projects. projectPagination describes the project set that was scanned." });
  } catch (error) {
    const statusCode = error instanceof GitLabApiError
      ? error.status === 403 ? 403 : error.status === 404 ? 404 : 502
      : 502;
    return NextResponse.json({ error: "Pipelines could not be loaded" }, { status: statusCode });
  }
}
