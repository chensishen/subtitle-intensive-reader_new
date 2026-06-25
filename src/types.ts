export interface SubtitleItem {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
}

export type SubtitleFormat = "srt" | "vtt";

export type SubtitleExportMode = "original" | "translation" | "bilingual";

export type PlayMode = "reading" | "intensive";

export type LayoutMode = "main" | "split";

export type IntervalType = "infinite" | "multiplier" | "fixed";

export interface LoopConfig {
  maxCount: number;
  currentCount: number;
  intervalType: IntervalType;
  intervalValue: number;
}

export interface PlayerSnapshot {
  isPlaying: boolean;
  playbackRate: number;
}
