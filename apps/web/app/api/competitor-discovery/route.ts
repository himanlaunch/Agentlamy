import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverCompetitors } from "@/lib/competitor-discovery";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  url: z.string().url(),
  area: z.string().optional().default(""),
  focus: z.string().optional().default(""),
  limit: z.number().int().min(1).max(8).optional().default(6),
}).superRefine((body, ctx) => {
  if (!body.area.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Area is required to find competitors in the same market.",
      path: ["area"],
    });
  }

  if (!body.focus.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Products or services is required to find competitors in the same business category.",
      path: ["focus"],
    });
  }
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await discoverCompetitors(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join(" ")
      : error instanceof Error
        ? error.message
        : "Unable to discover competitors.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
