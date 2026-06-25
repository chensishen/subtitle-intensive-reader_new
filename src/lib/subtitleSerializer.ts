import type { SubtitleExportMode, SubtitleFormat, SubtitleItem } from "../types";

export function serializeSubtitles(
  items: readonly SubtitleItem[],
  format: SubtitleFormat,
  mode: SubtitleExportMode,
): string {
  const blocks = items.map((item, index) => {
    const text = getExportText(item, mode);
    const timeRange = `${formatTimestamp(item.startTime, format)} --> ${formatTimestamp(item.endTime, format)}`;

    return format === "srt"
      ? `${index + 1}\n${timeRange}\n${text}`
      : `${timeRange}\n${text}`;
  });

  const body = blocks.join("\n\n");
  return format === "vtt" ? `WEBVTT\n\n${body}\n` : `${body}\n`;
}

export function downloadSubtitleFile(
  items: readonly SubtitleItem[],
  format: SubtitleFormat,
  mode: SubtitleExportMode,
  filename: string,
) {
  const content = serializeSubtitles(items, format, mode);
  const blob = new Blob([content], { type: format === "vtt" ? "text/vtt;charset=utf-8" : "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = ensureExtension(filename, format);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getExportText(item: SubtitleItem, mode: SubtitleExportMode): string {
  const original = item.text.trim();
  const translation = item.translation?.trim();

  if (mode === "translation") {
    return translation || original;
  }

  if (mode === "bilingual" && translation) {
    return `${original}\n${translation}`;
  }

  return original;
}

function ensureExtension(filename: string, format: SubtitleFormat): string {
  const cleanName = filename.trim() || "subtitles";
  return cleanName.toLowerCase().endsWith(`.${format}`) ? cleanName : `${cleanName}.${format}`;
}

function formatTimestamp(totalSeconds: number, format: SubtitleFormat): string {
  const totalMilliseconds = Math.round(Math.max(totalSeconds, 0) * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  const separator = format === "srt" ? "," : ".";

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    `${String(seconds).padStart(2, "0")}${separator}${String(milliseconds).padStart(3, "0")}`,
  ].join(":");
}
