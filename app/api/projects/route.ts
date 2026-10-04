import { NextRequest, NextResponse } from "next/server";

import { pageNumber, perPageNumber } from "@/lib/api-pagination";
import { listProjects } from "@/lib/gitlab-resources";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const lastActivityAfter = params.get("last_activity_after") || undefined;
  const search = params.get("search") || undefined;
  try {
    return NextResponse.json({ ...(await listProjects(page, perPage, lastActivityAfter, search)), filters: { search: search || null, lastActivityAfter: lastActivityAfter || null } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ error: "Projects could not be loaded" }, { status: 502 });
  }
}
