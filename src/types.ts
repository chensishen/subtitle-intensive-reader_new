export interface SubtitleItem {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

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
