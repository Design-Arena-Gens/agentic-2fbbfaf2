import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ImageGenerateParams } from "openai/resources/images";

import { env } from "@/lib/env";
import { getOpenAIClient } from "@/lib/openai";
import { aspectRatioToSize } from "@/types/media";

const requestSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters."),
  aspectRatio: z
    .enum(["square", "portrait", "landscape", "ultrawide", "vertical"])
    .default("square"),
  style: z
    .enum(["cinematic", "3d", "illustration", "photographic", "digital-art"])
    .default("cinematic"),
  negativePrompt: z.string().optional(),
  quality: z.enum(["standard", "high"]).default("high"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const openai = getOpenAIClient();

    const styleMappings: Record<
      (typeof parsed)["style"],
      ImageGenerateParams["style"]
    > = {
      cinematic: "vivid",
      "3d": "vivid",
      illustration: "vivid",
      photographic: "natural",
      "digital-art": "vivid",
    };

    const prompt =
      parsed.negativePrompt && parsed.negativePrompt.trim().length > 0
        ? `${parsed.prompt}\n\nAvoid: ${parsed.negativePrompt}`
        : parsed.prompt;

    const payload: ImageGenerateParams = {
      model: env.VEO_MODEL && env.VEO_MODEL.length > 0 ? env.VEO_MODEL : "veo-3",
      prompt,
      size: aspectRatioToSize[parsed.aspectRatio],
      quality: parsed.quality === "high" ? "hd" : "standard",
      style: styleMappings[parsed.style],
    };

    const response = await openai.images.generate(payload);

    const image = response.data?.[0];

    if (!image) {
      return NextResponse.json(
        { error: "Image generation returned no results." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageBase64: image.b64_json,
      imageUrl: image.url,
      revisedPrompt: image.revised_prompt,
      created: response.created,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }

    console.error("Image generation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error during image generation.",
      },
      { status: 500 },
    );
  }
}
