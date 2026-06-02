import type { RefObject } from "react";

interface VideoPaneProps {
  mediaSrc: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
  compact?: boolean;
}

export function VideoPane({ mediaSrc, videoRef, onTimeUpdate, compact = false }: VideoPaneProps) {
  return (
    <div
      className={
        compact
          ? "overflow-hidden rounded-md bg-black shadow-2xl"
          : "flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-black shadow-panel"
      }
    >
      {mediaSrc ? (
        <video
          ref={videoRef}
          src={mediaSrc}
          controls
          playsInline
          onTimeUpdate={onTimeUpdate}
          className={compact ? "h-full w-full object-contain" : "h-full w-full object-contain"}
        />
      ) : (
        <div
          className={
            compact
              ? "flex h-44 items-center justify-center text-sm text-slate-400"
              : "flex h-full w-full items-center justify-center text-sm text-slate-400"
          }
        >
          请选择音频或视频文件
        </div>
      )}
    </div>
  );
}
