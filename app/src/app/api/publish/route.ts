import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  publishToSocialPlatforms,
  type SocialPlatform,
} from "@/lib/socials";

const publishSchema = z
  .object({
    mediaType: z.enum(["image", "video"]),
    caption: z.string().min(3, "Caption must be at least 3 characters."),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    mediaUrl: z.string().url().optional(),
    mediaBase64: z.string().optional(),
    mimeType: z.string().optional(),
    callToActionUrl: z.string().url().optional(),
    campaignId: z.string().optional(),
    platforms: z
      .array(z.enum(["x", "instagram", "tiktok", "youtube"]))
      .min(1, "Select at least one platform."),
  })
  .superRefine((value, ctx) => {
    if (!value.mediaUrl && !value.mediaBase64) {
      ctx.addIssue({
        message: "Provide either mediaUrl or mediaBase64.",
        code: z.ZodIssueCode.custom,
        path: ["mediaUrl"],
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publishSchema.parse(body);

    const results = await publishToSocialPlatforms(
      {
        mediaType: parsed.mediaType,
        caption: parsed.caption,
        title: parsed.title,
        tags: parsed.tags,
        mediaUrl: parsed.mediaUrl,
        mediaBase64: parsed.mediaBase64,
        mimeType: parsed.mimeType,
        callToActionUrl: parsed.callToActionUrl,
        campaignId: parsed.campaignId,
      },
      parsed.platforms as SocialPlatform[],
    );

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }

    console.error("Publishing failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while publishing to social platforms.",
      },
      { status: 500 },
    );
  }
}
