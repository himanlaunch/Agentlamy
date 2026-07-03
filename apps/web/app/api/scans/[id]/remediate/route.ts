import { auth } from "@/lib/auth";
import { getScanForUser } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";
import { triggerArtifacts } from "@/lib/inngest";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  artifactKinds: z.array(z.string()).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const body = bodySchema.parse(await request.json().catch(() => ({})));
  await triggerArtifacts(scan.id, body.artifactKinds);

  return NextResponse.json({ ok: true });
}
