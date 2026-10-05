import { NextRequest, NextResponse } from "next/server";

import { pageNumber, paginateItems, perPageNumber } from "@/lib/api-pagination";
import { listAllProjects, listGroupProjects, listProjects } from "@/lib/gitlab-resources";
import { cached } from "@/lib/ttl-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = pageNumber(params.get("page"));
  const perPage = perPageNumber(params.get("per_page"));
  const lastActivityAfter = params.get("last_activity_after") || undefined;
  const search = params.get("search") || undefined;
  const groupValue = params.get("group_id");
  const includeSubgroups = params.get("include_subgroups") === "true";
  const allRecords = params.get("all") === "true";
  const groupId = groupValue === null ? null : Number(groupValue);
  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId < 1)) return NextResponse.json({ error: "group_id must be a positive numeric group id" }, { status: 400 });
  try {
    if (allRecords && !search && !lastActivityAfter) {
      const items = await cached(`projects:${groupId ?? "instance"}:${includeSubgroups}`, () => listAllProjects({ groupId: groupId ?? undefined, includeSubgroups }));
      const result = paginateItems(items, page, perPage);
      return NextResponse.json({ ...result, items: items, filters: { search: null, lastActivityAfter: null, groupId, includeSubgroups, all: true } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
    }
    const result = groupId === null
      ? await listProjects(page, perPage, lastActivityAfter, search)
      : await listGroupProjects(groupId, page, perPage, { search, includeSubgroups });
    return NextResponse.json({ ...result, filters: { search: search || null, lastActivityAfter: groupId === null ? lastActivityAfter || null : null, groupId, includeSubgroups } }, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ error: "Projects could not be loaded" }, { status: 502 });
  }
}
