import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.GITLAB_URL && process.env.GITLAB_REPORTER_TOKEN);
  return NextResponse.json(
    { status: configured ? "ok" : "degraded", configured },
    { status: configured ? 200 : 503 },
  );
}
