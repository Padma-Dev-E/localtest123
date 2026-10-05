import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/dashboard";
import { parseHours } from "@/lib/time-window";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectIdValue = url.searchParams.get("project");
  const projectId = projectIdValue && projectIdValue !== "all" ? Number(projectIdValue) : undefined;
  const data = await getDashboardData({ projectId: Number.isFinite(projectId) ? projectId : undefined, hours: parseHours(url.searchParams.get("hours")) });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
    },
  });
}
