import type { NextApiRequest, NextApiResponse } from "next";

import { methodNotAllowed, queryValue, setCacheControl } from "@/lib/api-handler";
import { pageNumber, perPageNumber } from "@/lib/api-pagination";
import { GitLabApiError } from "@/lib/gitlab";
import { listGroups } from "@/lib/gitlab-resources";

function booleanParam(value: string | null, fallback?: boolean) {
  if (value === null) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") return methodNotAllowed(response);

  const page = pageNumber(queryValue(request, "page"));
  const perPage = perPageNumber(queryValue(request, "per_page"));
  const search = queryValue(request, "search") || undefined;
  const topLevelOnly = booleanParam(queryValue(request, "top_level_only"));
  const allAvailable = booleanParam(queryValue(request, "all_available"), true);
  const visibility = queryValue(request, "visibility") || undefined;
  const active = booleanParam(queryValue(request, "active"));
  const archived = booleanParam(queryValue(request, "archived"));
  const orderBy = queryValue(request, "order_by") || "name";
  const sort = queryValue(request, "sort") || "asc";

  try {
    const result = await listGroups(page, perPage, { search, topLevelOnly, allAvailable, visibility, active, archived, orderBy, sort });
    setCacheControl(response, "private, max-age=60, stale-while-revalidate=120");
    return response.status(200).json({
      ...result,
      filters: { search: search || null, topLevelOnly: topLevelOnly ?? null, allAvailable, visibility: visibility || null, active: active ?? null, archived: archived ?? null, orderBy, sort },
    });
  } catch (error) {
    const status = error instanceof GitLabApiError && error.status === 403 ? 403 : 502;
    return response.status(status).json({ error: status === 403 ? "Groups are not available to this GitLab token" : "Groups could not be loaded" });
  }
}
