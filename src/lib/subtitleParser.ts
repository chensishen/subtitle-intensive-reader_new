import type { SubtitleItem } from "../types";

const TIMESTAMP_PATTERN =
  /(?<start>\d{2,}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(?<end>\d{2,}:\d{2}:\d{2}[,.]\d{1,3})/;

export function parseSubtitle(content: string, type: "srt" | "vtt"): SubtitleItem[] {
  const normalized = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalized) {
    return [];
  }

  const withoutHeader =
    type === "vtt" ? normalized.replace(/^WEBVTT(?:[^\n]*)\n+/, "").trim() : normalized;

  return withoutHeader
    .split(/\n{2,}/)
    .map((block, blockIndex): SubtitleItem | null => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const timeLineIndex = lines.findIndex((line) => TIMESTAMP_PATTERN.test(line));
      if (timeLineIndex < 0) {
        return null;
      }

      const match = lines[timeLineIndex].match(TIMESTAMP_PATTERN);
      const start = match?.groups?.start;
      const end = match?.groups?.end;
      if (!start || !end) {
        return null;
      }

      const text = sanitizeSubtitleText(lines.slice(timeLineIndex + 1).join("\n"));
      if (!text) {
        return null;
      }

      return {
        id: `${type}-${blockIndex}-${start}`,
        index: blockIndex,
        startTime: parseTimestampToSeconds(start),
        endTime: parseTimestampToSeconds(end),
        text,
      };
    })
    .filter((item): item is SubtitleItem => item !== null)
    .sort((a, b) => a.startTime - b.startTime)
    .map((item, index) => ({ ...item, index }));
}

export function parseTimestampToSeconds(timestamp: string): number {
  const [hours, minutes, secondsWithMs] = timestamp.replace(",", ".").split(":");
  const [seconds, milliseconds = "0"] = secondsWithMs.split(".");
  const ms = Number(milliseconds.padEnd(3, "0").slice(0, 3));

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + ms / 1000;
}

function sanitizeSubtitleText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
