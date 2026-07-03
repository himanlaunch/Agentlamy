import { auth } from "@/lib/auth";
import { getScanForUser } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";
import { toMarkdownReport } from "@/lib/report-format";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const scan = await getScanForUser(id, session.user.id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format") || "json";
  if (format === "md") {
    return new NextResponse(toMarkdownReport(scan), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `inline; filename="${scan.projectName}-aeo-report.md"`,
      },
    });
  }

  return NextResponse.json(scan.summaryJson ?? {});
}
