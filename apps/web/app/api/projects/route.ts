import { auth } from "@/lib/auth";
import { createProjectForUser } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";
import { normalizeHttpUrl } from "@/lib/url";
import { NextResponse } from "next/server";
import { z } from "zod";

const websiteUrlSchema = z.string().min(1).transform((value, ctx) => {
  const normalizedUrl = normalizeHttpUrl(value);
  if (!normalizedUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid website URL or domain.",
    });
    return z.NEVER;
  }

  return normalizedUrl;
});

const bodySchema = z.object({
  name: z.string().min(2).max(100),
  baseUrl: websiteUrlSchema,
  description: z.string().max(300).optional(),
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
  const project = await createProjectForUser({
    user: session.user,
    ...body,
  });

  return NextResponse.json({ project }, { status: 201 });
}
