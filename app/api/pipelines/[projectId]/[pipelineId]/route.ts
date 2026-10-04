import { NextRequest, NextResponse } from "next/server";

import { getPipelineDetails } from "@/lib/pipeline-detail";
import { GitLabApiError } from "@/lib/gitlab";

export const dynamic = "force-dynamic";

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; pipelineId: string }> },
) {
  const { projectId: projectIdValue, pipelineId: pipelineIdValue } = await params;
  const projectId = parseId(projectIdValue);
  const pipelineId = parseId(pipelineIdValue);

  if (!projectId || !pipelineId) {
    return NextResponse.json({ error: "Invalid project or pipeline id" }, { status: 400 });
  }

  try {
    const detail = await getPipelineDetails(projectId, pipelineId);
    return NextResponse.json(detail, {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    const status = error instanceof GitLabApiError ? (error.status === 404 ? 404 : 502) : 500;
    const message = error instanceof GitLabApiError && error.status === 404
      ? "Pipeline not found or not visible to the configured GitLab identity"
      : "Pipeline details could not be loaded";
    return NextResponse.json({ error: message }, { status });
  }
}
