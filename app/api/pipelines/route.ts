import { NextRequest, NextResponse } from "next/server";

import { pageNumber, perPageNumber } from "@/lib/api-pagination";
import { collectPipelinesForProjects, getProject, listGroupProjects, listPipelines, listProjects } from "@/lib/gitlab-resources";
import { GitLabApiError } from "@/lib/gitlab";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project") || "all";
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const hours = Math.min(Math.max(Number(params.get("hours") || 24), 1), 168);
  const status = params.get("status") || undefined;
  const ref = params.get("ref") || undefined;
  const groupValue = params.get("group_id");
  const groupId = groupValue === null ? null : Number(groupValue);
  const includeSubgroups = params.get("include_subgroups") === "true";
  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId < 1)) return NextResponse.json({ error: "group_id must be a positive numeric group id" }, { status: 400 });

  try {
    if (project !== "all") {
      const projectId = Number(project);
      if (!Number.isSafeInteger(projectId) || projectId < 1) return NextResponse.json({ error: "project must be all or a numeric project id" }, { status: 400 });
      const selected = await getProject(projectId);
      return NextResponse.json({ ...(await listPipelines(selected, page, perPage, { hours, status, ref })), filters: { project: projectId, groupId, includeSubgroups, hours, status: status || null, ref: ref || null } });
    }

    const projectPageSize = Math.min(perPage, 20);
    const recentProjects = groupId
      ? await listGroupProjects(groupId, page, projectPageSize, { includeSubgroups })
      : await listProjects(page, projectPageSize, new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());
    const collected = await collectPipelinesForProjects(recentProjects.items, (item) => listPipelines(item, 1, 100, { hours, status, ref }));
    return NextResponse.json({ items: collected.items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), pagination: recentProjects.pagination, filters: { project: "all", groupId, includeSubgroups, hours, status: status || null, ref: ref || null }, warnings: collected.warnings, paginationNote: "For exact pipeline pagination, select a project. All-project mode paginates recently active projects to avoid a 5,000-project fan-out." });
  } catch (error) {
    const statusCode = error instanceof GitLabApiError
      ? error.status === 403 ? 403 : error.status === 404 ? 404 : 502
      : 502;
    return NextResponse.json({ error: "Pipelines could not be loaded" }, { status: statusCode });
  }
}
