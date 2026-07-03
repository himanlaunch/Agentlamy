import { auth } from "@/lib/auth";
import { getScanArtifacts, getScanFindings, getScanForUser, getScanPages } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
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

  const [pages, findings, artifacts] = await Promise.all([
    getScanPages(scan.id),
    getScanFindings(scan.id),
    getScanArtifacts(scan.id),
  ]);

  return NextResponse.json({ scan, pages, findings, artifacts });
}
