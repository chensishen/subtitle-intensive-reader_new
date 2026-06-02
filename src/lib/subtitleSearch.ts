import type { SubtitleItem } from "../types";

export function findSubtitleIndexByTime(
  subtitles: readonly SubtitleItem[],
  currentTime: number,
  fallbackIndex = 0,
): number {
  if (subtitles.length === 0) {
    return -1;
  }

  const fallback = subtitles[fallbackIndex];
  if (fallback && currentTime >= fallback.startTime && currentTime < fallback.endTime) {
    return fallbackIndex;
  }

  let left = 0;
  let right = subtitles.length - 1;
  let nearestPrevious = 0;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const item = subtitles[middle];

    if (currentTime < item.startTime) {
      right = middle - 1;
      continue;
    }

    nearestPrevious = middle;
    if (currentTime < item.endTime) {
      return middle;
    }

    left = middle + 1;
  }

  return nearestPrevious;
}
