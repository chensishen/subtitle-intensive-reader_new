import { groqTranscriptionToSubtitles } from "./groqSubtitles";
import { upload } from "@vercel/blob/client";
import type { SubtitleItem } from "../types";

export interface TranscribeOptions {
  model?: string;
  onStatus?: (status: string) => void;
}

export async function transcribeMediaFile(file: File, options: TranscribeOptions = {}): Promise<SubtitleItem[]> {
  options.onStatus?.("正在上传媒体文件...");
  const blob = await upload(`groq-input/${Date.now()}-${sanitizeFilename(file.name)}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });

  options.onStatus?.("正在切分音频并生成字幕...");
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type,
      model: options.model || "whisper-large-v3-turbo",
    }),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload.error || "字幕识别失败，请稍后重试。");
  }

  const subtitles = groqTranscriptionToSubtitles(payload);
  if (subtitles.length === 0) {
    throw new Error("没有识别到可用字幕片段，请换一个音视频文件重试。");
  }

  return subtitles;
}

export async function translateSubtitles(
  subtitles: readonly SubtitleItem[],
  targetLanguage: string,
  sourceLanguage?: string,
): Promise<SubtitleItem[]> {
  const response = await fetch("/api/translate-subtitles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subtitles: subtitles.map(({ id, index, startTime, endTime, text }) => ({ id, index, startTime, endTime, text })),
      targetLanguage,
      sourceLanguage,
      style: "natural subtitle translation for language learning",
    }),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload.error || "字幕翻译失败");
  }

  const translations = new Map<string, string>(
    Array.isArray(payload.translations)
      ? payload.translations
          .filter((item: { id?: unknown; translation?: unknown }) => typeof item.id === "string" && typeof item.translation === "string")
          .map((item: { id: string; translation: string }) => [item.id, item.translation.trim()])
      : [],
  );

  return subtitles.map((item) => ({
    ...item,
    translation: translations.get(item.id) || item.translation,
  }));
}

async function readJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "media-file";
}
