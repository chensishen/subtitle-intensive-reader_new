import { memo, useEffect, useRef } from "react";
import type { SubtitleItem } from "../types";

interface SubtitleListProps {
  subtitles: SubtitleItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export const SubtitleList = memo(function SubtitleList({
  subtitles,
  currentIndex,
  onSelect,
}: SubtitleListProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (currentIndex < 0) {
      return;
    }

    itemRefs.current[currentIndex]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [currentIndex]);

  if (subtitles.length === 0) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm text-slate-500">
        导入 SRT 或 VTT 字幕后开始精读
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <div className="subtitle-list-inner py-3">
        {subtitles.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            onClick={() => onSelect(index)}
            className={`group grid w-full grid-cols-[4px_1fr] gap-0 text-left transition ${
              index === currentIndex
                ? "bg-gradient-to-r from-cyan-50 to-white text-slate-950"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className={index === currentIndex ? "bg-cyan-500" : "bg-transparent group-hover:bg-slate-200"} />
            <span className="subtitle-row-content px-5 py-3.5">
              <span className="mb-1 block font-mono text-xs text-slate-400">{formatRange(item)}</span>
              <span className="subtitle-row-text whitespace-pre-line text-base leading-7">{item.text}</span>
              {item.translation && (
                <span className="mt-2 block whitespace-pre-line text-sm leading-6 text-cyan-700">{item.translation}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

function formatRange(item: SubtitleItem): string {
  return `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
