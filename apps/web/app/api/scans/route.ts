import { auth } from "@/lib/auth";
import { createQueuedScan, getProjectForUser } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";
import { triggerScan } from "@/lib/inngest";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: Request) {
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

  const body = bodySchema.parse(await request.json());
  const project = await getProjectForUser(body.projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const scan = await createQueuedScan(project.id);
  await triggerScan(scan.id);

  return NextResponse.json({ scan }, { status: 201 });
}
