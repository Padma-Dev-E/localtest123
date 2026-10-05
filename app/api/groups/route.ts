import { NextRequest, NextResponse } from "next/server";

import { pageNumber, perPageNumber } from "@/lib/api-pagination";
import { GitLabApiError } from "@/lib/gitlab";
import { listGroups } from "@/lib/gitlab-resources";

export const dynamic = "force-dynamic";

function booleanParam(value: string | null, fallback?: boolean) {
  if (value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const search = params.get("search") || undefined;
  const topLevelOnly = booleanParam(params.get("top_level_only"));
  const allAvailable = booleanParam(params.get("all_available"), true);
  const visibility = params.get("visibility") || undefined;
  const active = booleanParam(params.get("active"));
  const archived = booleanParam(params.get("archived"));
  const orderBy = params.get("order_by") || "name";
  const sort = params.get("sort") || "asc";

  try {
    return NextResponse.json({
      ...(await listGroups(page, perPage, { search, topLevelOnly, allAvailable, visibility, active, archived, orderBy, sort })),
      filters: { search: search || null, topLevelOnly: topLevelOnly ?? null, allAvailable, visibility: visibility || null, active: active ?? null, archived: archived ?? null, orderBy, sort },
    }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } });
  } catch (error) {
    const status = error instanceof GitLabApiError && error.status === 403 ? 403 : 502;
    return NextResponse.json({ error: status === 403 ? "Groups are not available to this GitLab token" : "Groups could not be loaded" }, { status });
  }
}
