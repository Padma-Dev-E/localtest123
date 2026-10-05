import { NextRequest, NextResponse } from "next/server";

import { pageNumber, paginateItems, perPageNumber } from "@/lib/api-pagination";
import { collectPipelinesForProjects, getGroup, getProject, instancePipelineAnalytics, listAllPipelines, listGroupProjects, listGlobalPipelinesPage, listPipelines, pipelineAnalytics, pipelineStatsForItems, pipelineStatsForPage, pipelineStatsForProject } from "@/lib/gitlab-resources";
import { GitLabApiError } from "@/lib/gitlab";
import { cached } from "@/lib/ttl-cache";
import { parseHours } from "@/lib/time-window";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project") || "all";
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const hours = parseHours(params.get("hours"));
  const status = params.get("status") || undefined;
  const ref = params.get("ref") || undefined;
  const allRecords = params.get("all") === "true";
  const summary = params.get("summary") === "true";
  const groupValue = params.get("group_id");
  const groupId = groupValue === null ? null : Number(groupValue);
  const includeSubgroups = params.get("include_subgroups") === "true";
  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId < 1)) return NextResponse.json({ error: "group_id must be a positive numeric group id" }, { status: 400 });

  try {
    if (groupId === null && (project === "all" || summary)) {
      const projectId = project === "all" ? undefined : Number(project);
      if (projectId !== undefined && (!Number.isSafeInteger(projectId) || projectId < 1)) return NextResponse.json({ error: "project must be all or a numeric project id" }, { status: 400 });
      const directCacheKey = `global-pipeline-page:${projectId ?? "instance"}:${page}:${perPage}:${hours}`;
      const warnings: string[] = [];
      if (status || ref) warnings.push("GitLab's direct global pipeline listing does not support status/ref filters; aggregate metrics apply the filters, but visible rows remain the latest direct rows.");
      let result: Awaited<ReturnType<typeof listGlobalPipelinesPage>>;
      try {
        result = await cached(directCacheKey, () => listGlobalPipelinesPage(page, perPage, { hours, projectId }));
      } catch (error) {
        if (!(error instanceof GitLabApiError) || ![403, 404, 405].includes(error.status)) throw error;
        result = paginateItems([], page, perPage);
        warnings.push("GitLab global pipeline listing is unavailable for this instance; use a project or group pipeline list for detailed rows.");
      }
      let stats = pipelineStatsForPage(result, "authenticated-user");
      let analyticsAvailable = false;
      try {
        const projectPath = projectId === undefined ? undefined : (await getProject(projectId)).path_with_namespace;
        stats = await cached(`pipeline-analytics:${projectPath || "instance"}:${hours}:${status || "all"}:${ref || "all"}`, () => projectPath ? pipelineAnalytics({ hours, project: projectPath, status, ref }) : instancePipelineAnalytics({ hours, status, ref }));
        analyticsAvailable = true;
      } catch (error) {
        warnings.push(error instanceof GitLabApiError && error.status === 403
          ? "GitLab pipeline analytics is not available to this token; direct pipeline rows are limited to pipelines triggered by the authenticated user."
          : "GitLab pipeline analytics is unavailable; direct pipeline rows are shown with page-level counts.");
      }
      const pagination = analyticsAvailable
        ? { ...result.pagination, total: stats.totalPipelines, totalPages: Math.ceil(stats.totalPipelines / perPage), hasNext: page < Math.ceil(stats.totalPipelines / perPage), nextPage: page < Math.ceil(stats.totalPipelines / perPage) ? page + 1 : null }
        : result.pagination;
      return NextResponse.json({ ...result, pagination, stats, filters: { project: project === "all" ? "all" : projectId, groupId: null, includeSubgroups, hours, status: status || null, ref: ref || null, all: false, summary }, warnings, paginationNote: analyticsAvailable ? "Rows use GitLab's direct /pipelines endpoint; aggregate counts and trends use Enterprise pipeline analytics." : "Rows use GitLab's direct /pipelines endpoint. Its documented scope is pipelines triggered by the authenticated user." });
    }

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

    const projects = await listGroupProjects(groupId as number, 1, 100, { includeSubgroups });
    const collected = await cached(`group-pipelines:${groupId}:${includeSubgroups}:${hours}:${status || "all"}:${ref || "all"}`, () => collectPipelinesForProjects(projects.items, (item) => listPipelines(item, 1, 1, { hours, status, ref })));
    const sorted = collected.items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const result = paginateItems(sorted, page, perPage);
    let stats = pipelineStatsForItems(sorted, "recent-project-page", false);
    const warnings = [...collected.warnings];
    try {
      const group = await getGroup(groupId as number);
      stats = await cached(`pipeline-analytics:group:${group.full_path}:${hours}:${status || "all"}:${ref || "all"}`, () => pipelineAnalytics({ hours, group: group.full_path, status, ref }));
    } catch {
      warnings.push("Enterprise group pipeline analytics is unavailable; group cards use the visible latest rows.");
    }
    return NextResponse.json({ ...result, items: allRecords ? sorted : result.items, projectPagination: projects.pagination, stats, filters: { project: "all", groupId, includeSubgroups, hours, status: status || null, ref: ref || null, all: false }, warnings: [...new Set(warnings)], paginationNote: "Group pipeline rows show the latest accessible pipeline per project. Use a project pipeline endpoint for complete project history; aggregate group totals come from Enterprise pipeline analytics." });
  } catch (error) {
    const statusCode = error instanceof GitLabApiError
      ? error.status === 403 ? 403 : error.status === 404 ? 404 : 502
      : 502;
    return NextResponse.json({ error: "Pipelines could not be loaded" }, { status: statusCode });
  }
}
