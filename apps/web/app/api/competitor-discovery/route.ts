import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverCompetitors } from "@/lib/competitor-discovery";
import { normalizeHttpUrl } from "@/lib/url";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

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
  url: websiteUrlSchema,
  area: z.string().optional().default(""),
  focus: z.string().optional().default(""),
  limit: z.number().int().min(1).max(8).optional().default(6),
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
