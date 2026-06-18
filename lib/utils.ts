import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Dana Okafor" → "DO". Used for presence + sidebar avatars. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Strip protocol/trailing slash for compact link display. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * A stable, distinct color for a user id — used for presence dots, note borders,
 * and avatar tints so each judge reads as the same color everywhere.
 */
const PRESENCE_PALETTE = [
  "#2563EB", // blue
  "#8B5CF6", // violet
  "#2E8A5E", // green
  "#D97706", // amber
  "#DB2777", // pink
  "#0891B2", // cyan
  "#DC2626", // red
  "#7C3AED", // purple
];

export function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PRESENCE_PALETTE[Math.abs(hash) % PRESENCE_PALETTE.length];
}
