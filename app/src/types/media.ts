export type AspectRatio =
  | "square"
  | "portrait"
  | "landscape"
  | "ultrawide"
  | "vertical";

export type ImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1792x1024"
  | "1024x1792";

export const aspectRatioToSize: Record<AspectRatio, ImageSize> = {
  square: "1024x1024",
  portrait: "1024x1536",
  landscape: "1536x1024",
  ultrawide: "1792x1024",
  vertical: "1024x1792",
} as const;

export interface GeneratedAsset {
  type: "image" | "video";
  url?: string;
  base64?: string;
  mimeType?: string;
}
