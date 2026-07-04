import { NextResponse } from "next/server";
import { z } from "zod";
import { createBatchScanSummary, scanPublicUrl } from "@/lib/public-scan";
import { normalizeHttpUrl } from "@/lib/url";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  focus: z.union([z.string(), z.array(z.string())]).optional().default(""),
  competitors: z.union([z.string(), z.array(z.string())]).optional().default(""),
  pageBudget: z.number().int().min(1).max(30).optional().default(12),
  includeAi: z.boolean().optional().default(false),
  includeArtifacts: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const startedAt = Date.now();
    const result = await scanPublicUrl(body);

    return NextResponse.json({
      ok: true,
      summary: createBatchScanSummary({
        url: body.url,
        area: body.area,
        focus: body.focus,
        result,
        elapsedMs: Date.now() - startedAt,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan this URL.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
