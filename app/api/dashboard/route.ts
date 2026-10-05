import { NextResponse } from "next/server";

import { getDashboardSnapshot } from "@/lib/dashboard-service";
import { parseHours } from "@/lib/time-window";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectIdValue = url.searchParams.get("project");
  const projectId = projectIdValue && projectIdValue !== "all" ? Number(projectIdValue) : undefined;
  const groupIdValue = url.searchParams.get("group_id");
  const groupId = groupIdValue ? Number(groupIdValue) : undefined;
  const validId = (value: number | undefined) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  const data = await getDashboardSnapshot({
    projectId: validId(projectId) ? projectId : undefined,
    groupId: validId(groupId) ? groupId : undefined,
    includeSubgroups: url.searchParams.get("include_subgroups") === "true",
    hours: parseHours(url.searchParams.get("hours")),
  });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
    },
  });
}
