import { NextRequest, NextResponse } from "next/server";

import { pageNumber, perPageNumber } from "@/lib/api-pagination";
import { listRunners } from "@/lib/gitlab-resources";
import { GitLabApiError } from "@/lib/gitlab";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project") || "all";
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const projectId = project === "all" ? null : Number(project);
  if (projectId !== null && (!Number.isSafeInteger(projectId) || projectId < 1)) return NextResponse.json({ error: "project must be all or a numeric project id" }, { status: 400 });
  try {
    return NextResponse.json({ ...(await listRunners(projectId, page, perPage)), filters: { project: projectId ?? "all" } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch (error) {
    const statusCode = error instanceof GitLabApiError && error.status === 403 ? 403 : 502;
    return NextResponse.json({ error: statusCode === 403 ? "Runner inventory is not available to this GitLab token" : "Runners could not be loaded" }, { status: statusCode });
  }
}
