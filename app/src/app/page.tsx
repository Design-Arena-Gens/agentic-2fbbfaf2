"use client";

import Image from "next/image";
import clsx from "clsx";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Settings2,
  Sparkles,
  UploadCloud,
  Video as VideoIcon,
  Wand2,
  XCircle,
} from "lucide-react";

import type { AspectRatio } from "@/types/media";
import type { SocialPlatform } from "@/lib/socials";

type GenerationMode = "image" | "video";

type AssetState = {
  type: "image" | "video";
  url?: string;
  base64?: string;
  mimeType?: string;
  revisedPrompt?: string;
  status?: string;
  taskId?: string;
  etaSeconds?: number | null;
};

const aspectOptions: Array<{ value: AspectRatio; label: string }> = [
  { value: "square", label: "1:1 Square" },
  { value: "portrait", label: "3:4 Portrait" },
  { value: "vertical", label: "9:16 Vertical" },
  { value: "landscape", label: "4:3 Landscape" },
  { value: "ultrawide", label: "21:9 Ultrawide" },
];

const platforms: SocialPlatform[] = ["x", "instagram", "tiktok", "youtube"];

const platformLabels: Record<SocialPlatform, string> = {
  x: "X / Twitter",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};

export default function Home() {
  const [mode, setMode] = useState<GenerationMode>("image");
  const [imagePrompt, setImagePrompt] = useState(
    "Hyper-realistic portrait of a future city fashion model wearing volumetric neon light armor, cinematic lighting, rain reflections, depth of field",
  );
  const [videoPrompt, setVideoPrompt] = useState(
    "Cinematic drone shot of bioluminescent rainforest canopy with mist rolling in, dynamic camera move, ultra-detailed foliage, volumetric lighting",
  );
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, distorted, low-resolution, text artifacts",
  );
  const [imageAspect, setImageAspect] = useState<AspectRatio>("portrait");
  const [imageStyle, setImageStyle] = useState("cinematic");
  const [imageQuality, setImageQuality] = useState("high");

  const [videoAspect, setVideoAspect] = useState<AspectRatio>("vertical");
  const [videoDuration, setVideoDuration] = useState(12);
  const [videoMotion, setVideoMotion] = useState("balanced");
  const [videoStyle, setVideoStyle] = useState("cinematic");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");

  const [asset, setAsset] = useState<AssetState | null>(null);
  const [caption, setCaption] = useState(
    "Exploring the future of immersive storytelling with Veo-3 imagery and Sora-2 video intelligence.",
  );
  const [title, setTitle] = useState("Future Forward Media Drop");
  const [tags, setTags] = useState("AI,Innovation,CreativeTech");
  const [ctaUrl, setCtaUrl] = useState("https://agentic-2fbbfaf2.vercel.app");

  const [platformConfig, setPlatformConfig] = useState<
    Record<SocialPlatform, boolean>
  >({
    x: true,
    instagram: true,
    tiktok: true,
    youtube: true,
  });

  const [isGenerating, startGenerate] = useTransition();
  const [isPublishing, startPublish] = useTransition();

  const activePlatforms = useMemo(
    () =>
      platforms.filter((platform) => platformConfig[platform]).map((p) => p),
    [platformConfig],
  );

  const isReadyToPublish = asset && activePlatforms.length > 0;

  async function handleGenerateImage() {
    startGenerate(async () => {
      try {
        const response = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: imagePrompt,
            aspectRatio: imageAspect,
            style: imageStyle,
            quality: imageQuality,
            negativePrompt,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error ?? "Failed to generate image.");
        }

        const payload = (await response.json()) as {
          imageBase64?: string;
          imageUrl?: string;
          revisedPrompt?: string;
        };

        if (!payload.imageBase64 && !payload.imageUrl) {
          throw new Error("No image payload returned from Veo-3.");
        }

        const dataUrl =
          payload.imageUrl ??
          (payload.imageBase64
            ? `data:image/png;base64,${payload.imageBase64}`
            : undefined);

        setAsset({
          type: "image",
          base64: payload.imageBase64,
          url: dataUrl ?? undefined,
          revisedPrompt: payload.revisedPrompt,
          mimeType: "image/png",
        });

        toast.success("Image generated with Veo-3.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Image generation failed.",
        );
      }
    });
  }

  async function handleGenerateVideo() {
    startGenerate(async () => {
      try {
        const response = await fetch("/api/generate/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: videoPrompt,
            aspectRatio: videoAspect,
            duration: videoDuration,
            motionStrength: videoMotion,
            stylePreset: videoStyle,
            negativePrompt,
            referenceImageUrl: referenceImageUrl || undefined,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to generate video.");
        }

        setAsset({
          type: "video",
          url: payload.videoUrl,
          taskId: payload.taskId,
          status: payload.status,
          etaSeconds: payload.etaSeconds ?? null,
          mimeType: "video/mp4",
        });

        if (payload.videoUrl) {
          toast.success("Video generated with Sora-2.");
        } else {
          toast.message("Sora-2 task queued", {
            description:
              "Video is rendering asynchronously. Monitor the task ID to retrieve the final asset.",
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Video generation failed.",
        );
      }
    });
  }

  async function handlePublish() {
    if (!asset) {
      toast.error("Generate an image or video before publishing.");
      return;
    }

    if (activePlatforms.length === 0) {
      toast.error("Select at least one platform to publish.");
      return;
    }

    startPublish(async () => {
      try {
        const response = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaType: asset.type,
            caption,
            title,
            tags: tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            mediaUrl:
              asset.url && !asset.url.startsWith("data:")
                ? asset.url
                : undefined,
            mediaBase64:
              asset.base64 ??
              (asset.url?.startsWith("data:")
                ? asset.url.split(",")[1]
                : undefined),
            mimeType: asset.mimeType,
            callToActionUrl: ctaUrl || undefined,
            platforms: activePlatforms,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Publishing failed for social platforms.",
          );
        }

        const successes =
          payload.results?.filter(
            (result: { status: string }) => result.status === "success",
          ) ?? [];
        const failures =
          payload.results?.filter(
            (result: { status: string }) => result.status !== "success",
          ) ?? [];

        if (successes.length > 0) {
          toast.success(
            `Published to ${successes.length} platform${
              successes.length > 1 ? "s" : ""
            }.`,
          );
        }

        if (failures.length > 0) {
          failures.forEach(
            (failure: { platform: SocialPlatform; message?: string }) => {
              toast.error(
                `Failed to publish on ${platformLabels[failure.platform]}. ${
                  failure.message ?? ""
                }`,
              );
            },
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Publishing failed.",
        );
      }
    });
  }

  return (
    <main className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-14 lg:px-10 xl:px-16">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="rounded-full bg-indigo-500/90 p-3 text-white shadow-lg shadow-indigo-500/40">
              <Sparkles className="size-6" />
            </span>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.38em] text-indigo-300">
                <Brain className="size-4" />
                Agentic Media Director
              </p>
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                Veo-3 imagery + Sora-2 cinematics + one-click social launchpad
              </h1>
              <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
                Generate premium visuals, orchestrate stories, and syndicate to
                every channel with a single command. Configure platform
                automations via secure webhook tokens for a true hands-off
                growth engine.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)]">
          <div className="space-y-8">
            <GeneratorCard
              title="Creative Brief"
              description="Craft direction, refine Veo-3 settings, and launch generation tasks."
            >
              <div className="flex flex-col gap-6">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Wand2 className="size-4 text-indigo-300" />
                    {mode === "image"
                      ? "Veo-3 Image Prompt"
                      : "Sora-2 Video Prompt"}
                  </span>
                  <textarea
                    className="min-h-[140px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                    value={mode === "image" ? imagePrompt : videoPrompt}
                    onChange={(event) =>
                      mode === "image"
                        ? setImagePrompt(event.target.value)
                        : setVideoPrompt(event.target.value)
                    }
                    placeholder={
                      mode === "image"
                        ? "Describe the visuals you want Veo-3 to render..."
                        : "Describe the cinematic moment for Sora-2 to generate..."
                    }
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-200">
                    <XCircle className="size-4 text-indigo-300" />
                    Negative Guidance (Veo-3 &amp; Sora-2)
                  </span>
                  <input
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                    value={negativePrompt}
                    onChange={(event) => setNegativePrompt(event.target.value)}
                    placeholder="Avoid blurry, deformed, logo artifacts..."
                  />
                </label>

                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">
                    <Settings2 className="size-4" />
                    {mode === "image" ? "Veo-3 parameters" : "Sora-2 controls"}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Selector
                      label="Aspect Ratio"
                      icon={mode === "image" ? ImageIcon : VideoIcon}
                      value={mode === "image" ? imageAspect : videoAspect}
                      onChange={(value) =>
                        mode === "image"
                          ? setImageAspect(value as AspectRatio)
                          : setVideoAspect(value as AspectRatio)
                      }
                      options={aspectOptions}
                    />

                    {mode === "image" ? (
                      <Selector
                        label="Visual Aesthetic"
                        icon={Sparkles}
                        value={imageStyle}
                        onChange={setImageStyle}
                        options={[
                          { value: "cinematic", label: "Cinematic" },
                          { value: "3d", label: "3D Render" },
                          { value: "illustration", label: "Illustration" },
                          { value: "digital-art", label: "Digital Art" },
                          { value: "photographic", label: "Photographic" },
                        ]}
                      />
                    ) : (
                      <Selector
                        label="Motion Profile"
                        icon={Sparkles}
                        value={videoMotion}
                        onChange={setVideoMotion}
                        options={[
                          { value: "subtle", label: "Subtle" },
                          { value: "balanced", label: "Balanced" },
                          { value: "dynamic", label: "Dynamic" },
                        ]}
                      />
                    )}
                  </div>

                  {mode === "image" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Selector
                        label="Quality"
                        icon={Sparkles}
                        value={imageQuality}
                        onChange={setImageQuality}
                        options={[
                          { value: "standard", label: "Standard" },
                          { value: "high", label: "High" },
                        ]}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm text-slate-200">
                        Duration (seconds)
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={videoDuration}
                          onChange={(event) =>
                            setVideoDuration(Number(event.target.value))
                          }
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                        />
                      </label>
                      <Selector
                        label="Cinematic Lens"
                        icon={Sparkles}
                        value={videoStyle}
                        onChange={setVideoStyle}
                        options={[
                          { value: "cinematic", label: "Cinematic" },
                          { value: "documentary", label: "Documentary" },
                          { value: "hyperreal", label: "Hyper-Real" },
                          { value: "stylized", label: "Stylized" },
                        ]}
                      />
                    </div>
                  )}

                  {mode === "video" && (
                    <label className="flex flex-col gap-2 text-sm text-slate-200">
                      Reference Image (Optional)
                      <input
                        value={referenceImageUrl}
                        onChange={(event) =>
                          setReferenceImageUrl(event.target.value)
                        }
                        placeholder="https://..."
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                      />
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    mode === "image" ? handleGenerateImage : handleGenerateVideo
                  }
                  disabled={isGenerating}
                  className="group inline-flex items-center justify-center gap-2 self-start rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Minting {mode === "image" ? "Image" : "Video"}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 transition group-hover:rotate-6" />
                      Generate {mode === "image" ? "Image" : "Video"}
                    </>
                  )}
                </button>
              </div>
            </GeneratorCard>

            <GeneratorCard
              title="Distribution Blueprint"
              description="Compose captions, define tags, configure call-to-action, and control distribution."
            >
              <div className="grid gap-6">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-200">Campaign Title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Future Forward Media Drop"
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-200">Caption</span>
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder="Share the story behind your drop..."
                    className="min-h-[100px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-slate-200">Hashtags / Tags</span>
                    <input
                      value={tags}
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="AI,Innovation,CreativeTech"
                      className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="text-slate-200">Call-To-Action URL</span>
                    <input
                      value={ctaUrl}
                      onChange={(event) => setCtaUrl(event.target.value)}
                      placeholder="https://your-landing-page"
                      className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {platforms.map((platform) => {
                    const active = platformConfig[platform];
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() =>
                          setPlatformConfig((current) => ({
                            ...current,
                            [platform]: !current[platform],
                          }))
                        }
                        className={clsx(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                          active
                            ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-100",
                        )}
                      >
                        <span className="size-2 rounded-full bg-current" />
                        {platformLabels[platform]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </GeneratorCard>
          </div>

          <aside className="space-y-6">
            <GeneratorCard
              title="Asset Preview"
              description="Inspect Veo-3 imagery or Sora-2 sequences before orchestration."
            >
              <div className="flex flex-col gap-4">
                {!asset ? (
                  <EmptyState />
                ) : asset.type === "image" && asset.url ? (
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/20 bg-white/10">
                    <Image
                      src={asset.url}
                      alt="Generated visual"
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(min-width: 768px) 480px, 100vw"
                    />
                    {asset.revisedPrompt && (
                      <div className="border-t border-white/10 bg-black/40 p-4 text-xs text-slate-200">
                        <p className="font-semibold text-indigo-200">
                          Veo-3 prompt refinement
                        </p>
                        <p className="mt-1 text-slate-300">
                          {asset.revisedPrompt}
                        </p>
                      </div>
                    )}
                  </div>
                ) : asset.url ? (
                  <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/30">
                    <video
                      className="aspect-video w-full"
                      controls
                      src={asset.url}
                    />
                    <div className="flex items-center justify-between border-t border-white/10 bg-black/40 p-4 text-xs text-slate-200">
                      <span>Status: {asset.status ?? "ready"}</span>
                      {asset.taskId && (
                        <span className="font-mono text-indigo-200">
                          Task: {asset.taskId}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-3xl border border-dashed border-white/20 bg-black/30 p-6 text-sm text-slate-300">
                    <p>
                      Sora-2 rendering pipeline accepted the request. Await
                      asynchronous completion and poll using the task ID below.
                    </p>
                    <p className="font-mono text-indigo-200">
                      Task ID: {asset.taskId ?? "pending"}
                    </p>
                    {asset.etaSeconds && (
                      <p>Estimated time remaining: {asset.etaSeconds}s</p>
                    )}
                  </div>
                )}
              </div>
            </GeneratorCard>

            <GeneratorCard
              title="Syndicate Everywhere"
              description="Trigger simultaneous publishing across every connected social endpoint."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                  <p>
                    {activePlatforms.length > 0
                      ? `Ready to broadcast on ${activePlatforms
                          .map((platform) => platformLabels[platform])
                          .join(", ")}.`
                      : "Select at least one platform to enable the mission launch."}
                  </p>
                  <p className="mt-2 text-indigo-200">
                    Configure per-platform webhooks via environment variables to
                    deliver secure uploads.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!isReadyToPublish || isPublishing}
                  className={clsx(
                    "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition",
                    isReadyToPublish
                      ? "bg-emerald-500 text-white hover:bg-emerald-400"
                      : "bg-white/10 text-slate-400",
                  )}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deploying across channels...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="size-4" />
                      Launch Campaign
                    </>
                  )}
                </button>

                {asset && (
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-200">
                      <ChevronRight className="size-4" />
                      Asset Manifest
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        Type: {asset.type === "image" ? "Image" : "Video"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        CTA: {ctaUrl || "Not defined"}
                      </li>
                      {asset.taskId && (
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-400" />
                          Task ID: {asset.taskId}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </GeneratorCard>
          </aside>
        </section>
      </div>
    </main>
  );
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-slate-300">
      <button
        type="button"
        onClick={() => onChange("image")}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 transition",
          mode === "image"
            ? "bg-indigo-500 text-white shadow shadow-indigo-500/40"
            : "hover:text-white",
        )}
      >
        <ImageIcon className="size-3.5" />
        Veo-3 Image
      </button>
      <button
        type="button"
        onClick={() => onChange("video")}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 transition",
          mode === "video"
            ? "bg-indigo-500 text-white shadow shadow-indigo-500/40"
            : "hover:text-white",
        )}
      >
        <VideoIcon className="size-3.5" />
        Sora-2 Video
      </button>
    </div>
  );
}

function GeneratorCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
      <div>{children}</div>
    </article>
  );
}

function Selector({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="flex items-center gap-2">
        <Icon className="size-4 text-indigo-300" />
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
              value === option.value
                ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-100",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/20 bg-black/30 p-8 text-center">
      <div className="rounded-full bg-indigo-500/20 p-4 text-indigo-300">
        <Sparkles className="size-6" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">
          Awaiting your first render
        </h3>
        <p className="text-sm text-slate-300">
          Launch a Veo-3 image or Sora-2 video scene to see real-time previews
          here before syndication.
        </p>
      </div>
    </div>
  );
}
