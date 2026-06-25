import type { SubtitleItem } from "../types";

interface GroqSegment {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
}

interface GroqTranscriptionResponse {
  segments?: GroqSegment[];
  text?: string;
}

export function groqTranscriptionToSubtitles(response: GroqTranscriptionResponse): SubtitleItem[] {
  const segments = Array.isArray(response.segments) ? response.segments : [];

  if (segments.length === 0 && response.text?.trim()) {
    return [
      {
        id: "groq-0-0",
        index: 0,
        startTime: 0,
        endTime: 1,
        text: response.text.trim(),
      },
    ];
  }

  return segments
    .map((segment, segmentIndex): SubtitleItem | null => {
      const text = segment.text?.trim();
      const startTime = Number(segment.start);
      const endTime = Number(segment.end);

      if (!text || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        return null;
      }

      return {
        id: `groq-${segment.id ?? segmentIndex}-${startTime.toFixed(3)}`,
        index: segmentIndex,
        startTime,
        endTime,
        text,
      };
    })
    .filter((item): item is SubtitleItem => item !== null)
    .sort((a, b) => a.startTime - b.startTime)
    .map((item, index) => ({ ...item, index }));
}
