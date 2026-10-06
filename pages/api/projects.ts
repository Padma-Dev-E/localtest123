import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, queryValue, setCacheControl } from "@/lib/api-handler";
import { pageNumber, paginateItems, perPageNumber } from "@/lib/api-pagination";
import { listAllProjects, listGroupProjects, listProjects } from "@/lib/gitlab-resources";
import { cached } from "@/lib/ttl-cache";

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response);

  const page = pageNumber(queryValue(request, "page"));
  const perPage = perPageNumber(queryValue(request, "per_page"));
  const lastActivityAfter = queryValue(request, "last_activity_after") || undefined;
  const search = queryValue(request, "search") || undefined;
  const groupValue = queryValue(request, "group_id");
  const includeSubgroups = queryValue(request, "include_subgroups") === "true";
  const allRecords = queryValue(request, "all") === "true";
  const groupId = groupValue === null ? null : Number(groupValue);

  if (groupId !== null && (!Number.isSafeInteger(groupId) || groupId < 1)) return response.status(400).json({ error: "group_id must be a positive numeric group id" });

  try {
    if (allRecords && !search && !lastActivityAfter) {
      const items = await cached(`projects:${groupId ?? "instance"}:${includeSubgroups}`, () => listAllProjects({ groupId: groupId ?? undefined, includeSubgroups }));
      const result = paginateItems(items, page, perPage);
      setCacheControl(response, "private, max-age=15, stale-while-revalidate=30");
      return response.status(200).json({ ...result, items, filters: { search: null, lastActivityAfter: null, groupId, includeSubgroups, all: true } });
    }

    const result = groupId === null
      ? await listProjects(page, perPage, lastActivityAfter, search)
      : await listGroupProjects(groupId, page, perPage, { search, includeSubgroups });
    setCacheControl(response, "private, max-age=15, stale-while-revalidate=30");
    return response.status(200).json({ ...result, filters: { search: search || null, lastActivityAfter: groupId === null ? lastActivityAfter || null : null, groupId, includeSubgroups } });
  } catch {
    return response.status(502).json({ error: "Projects could not be loaded" });
  }
}
