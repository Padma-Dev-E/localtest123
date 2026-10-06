import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, queryValue, setCacheControl } from "@/lib/api-handler";
import { generateAPIResponse } from "@/lib/api-response";
import { GitLabApiError } from "@/lib/gitlab";
import { listGroups } from "@/lib/gitlab-resources";

const API_ID = "gitlab_all_groups";
const PAGE_SIZE = 100;

function booleanParam(value: string | null, fallback?: boolean) {
  if (value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response, API_ID);

  const search = queryValue(request, "search") || undefined;
  const topLevelOnly = booleanParam(queryValue(request, "top_level_only"));
  const allAvailable = booleanParam(queryValue(request, "all_available"), true);
  const visibility = queryValue(request, "visibility") || undefined;
  const active = booleanParam(queryValue(request, "active"));
  const archived = booleanParam(queryValue(request, "archived"));
  const orderBy = queryValue(request, "order_by") || "name";
  const sort = queryValue(request, "sort") || "asc";
  const items = [] as Awaited<ReturnType<typeof listGroups>>["items"];
  let page = 1;
  let total: number | null = null;
  let totalPages: number | null = null;

  try {
    while (true) {
      const result = await listGroups(page, PAGE_SIZE, { search, topLevelOnly, allAvailable, visibility, active, archived, orderBy, sort });
      items.push(...result.items);
      total = result.pagination.total ?? total;
      totalPages = result.pagination.totalPages ?? totalPages;

      if (!result.pagination.hasNext || result.items.length === 0) break;
      page = result.pagination.nextPage || page + 1;
    }

    const resolvedTotal = total ?? items.length;
    const resolvedTotalPages = totalPages ?? (resolvedTotal ? Math.ceil(resolvedTotal / PAGE_SIZE) : 0);
    setCacheControl(response, "private, max-age=60, stale-while-revalidate=120");
    return response.status(200).json(generateAPIResponse(200, API_ID, {
      items,
      pagination: {
        page: 1,
        perPage: PAGE_SIZE,
        total: resolvedTotal,
        totalPages: resolvedTotalPages,
        hasNext: false,
        hasPrevious: false,
        nextPage: null,
        previousPage: null,
      },
      filters: { search: search || null, topLevelOnly: topLevelOnly ?? null, allAvailable, visibility: visibility || null, active: active ?? null, archived: archived ?? null, orderBy, sort, all: true },
    }));
  } catch (error) {
    const status = error instanceof GitLabApiError && error.status === 403 ? 403 : 502;
    return response.status(status).json(generateAPIResponse(status, API_ID, { error: status === 403 ? "Groups are not available to this GitLab token" : "All groups could not be loaded" }));
  }
}
