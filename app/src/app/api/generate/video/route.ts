import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { env, requireEnv } from "@/lib/env";

const requestSchema = z.object({
  prompt: z.string().min(12, "Prompt must be at least 12 characters."),
  aspectRatio: z
    .enum(["square", "portrait", "landscape", "ultrawide", "vertical"])
    .default("landscape"),
  duration: z.number().min(1).max(60).default(10),
  motionStrength: z
    .enum(["subtle", "balanced", "dynamic"])
    .default("balanced"),
  stylePreset: z
    .enum(["cinematic", "documentary", "hyperreal", "stylized"])
    .default("cinematic"),
  negativePrompt: z.string().optional(),
  referenceImageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const apiKey = requireEnv("OPENAI_API_KEY");
    const baseUrl =
      env.OPENAI_BASE_URL?.replace(/\/$/, "") ?? "https://api.openai.com/v1";

    const payload = {
      model: env.SORA_MODEL && env.SORA_MODEL.length > 0 ? env.SORA_MODEL : "sora-2",
      prompt: parsed.prompt,
      aspect_ratio: parsed.aspectRatio,
      duration: parsed.duration,
      motion_strength: parsed.motionStrength,
      style_preset: parsed.stylePreset,
      negative_prompt: parsed.negativePrompt,
      reference_image_url: parsed.referenceImageUrl,
    };

    const response = await fetch(`${baseUrl}/videos/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Video generation failed with status ${response.status}`,
          details: errorText,
        },
        { status: 502 },
      );
    }

    const json = (await response.json()) as {
      data?: Array<{
        url?: string;
        id?: string;
        status?: string;
        eta_seconds?: number;
      }>;
      task_id?: string;
    };

    const first = json.data?.[0];

    return NextResponse.json({
      videoUrl: first?.url,
      status: first?.status ?? "queued",
      etaSeconds: first?.eta_seconds,
      taskId: first?.id ?? json.task_id,
      raw: json,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }

    console.error("Video generation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error during video generation.",
      },
      { status: 500 },
    );
  }
}
