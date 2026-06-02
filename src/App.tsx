import { GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PlayerControls } from "./components/PlayerControls";
import { SubtitleList } from "./components/SubtitleList";
import { VideoPane } from "./components/VideoPane";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSubtitlePlayer } from "./hooks/useSubtitlePlayer";
import { SubtitleReaderProvider, useSubtitleReader } from "./state/SubtitleReaderContext";

export default function App() {
  return (
    <SubtitleReaderProvider>
      <ReaderShell />
    </SubtitleReaderProvider>
  );
}

function ReaderShell() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mainLayoutRef = useRef<HTMLElement | null>(null);
  const { mediaSrc, subtitles, currentIndex, layout } = useSubtitleReader();
  const { snapshot, togglePlay, seekToIndex, setPlaybackRate, handleTimeUpdate } = useSubtitlePlayer(videoRef);
  const [mediaPanelPercent, setMediaPanelPercent] = useState(60);
  const [miniVideoPosition, setMiniVideoPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const placeMiniVideo = () => {
      setMiniVideoPosition((previous) => {
        if (previous.x > 0 || previous.y > 0) {
          return clampMiniVideoPosition(previous);
        }

        return clampMiniVideoPosition({
          x: window.innerWidth - MINI_VIDEO_WIDTH - 20,
          y: window.innerHeight - MINI_VIDEO_HEIGHT - CONTROL_BAR_HEIGHT - 28,
        });
      });
    };

    placeMiniVideo();
    window.addEventListener("resize", placeMiniVideo);
    return () => window.removeEventListener("resize", placeMiniVideo);
  }, []);

  const seekPrevious = useCallback(() => {
    seekToIndex(Math.max(currentIndex - 1, 0), true);
  }, [currentIndex, seekToIndex]);

  const seekNext = useCallback(() => {
    seekToIndex(Math.min(currentIndex + 1, subtitles.length - 1), true);
  }, [currentIndex, seekToIndex, subtitles.length]);

  const handleSubtitleSelect = useCallback(
    (index: number) => {
      seekToIndex(index, true);
    },
    [seekToIndex],
  );

  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onNext: seekNext,
    onPrevious: seekPrevious,
  });

  const handlePanelResizeStart = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const container = mainLayoutRef.current;
    if (!container) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = container.getBoundingClientRect();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setMediaPanelPercent(Math.min(Math.max(nextPercent, 35), 75));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, []);

  const handleMiniVideoDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, label")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const startPointer = { x: event.clientX, y: event.clientY };
    const startPosition = miniVideoPosition;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setMiniVideoPosition(
        clampMiniVideoPosition({
          x: startPosition.x + moveEvent.clientX - startPointer.x,
          y: startPosition.y + moveEvent.clientY - startPointer.y,
        }),
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, [miniVideoPosition]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main
        ref={mainLayoutRef}
        className={
          layout === "main"
            ? "grid h-screen grid-cols-[var(--media-panel)_12px_minmax(0,1fr)] gap-4 p-4 pb-24"
            : "relative h-screen p-4 pb-24"
        }
        style={{ "--media-panel": `${mediaPanelPercent}%` } as CSSProperties}
      >
        <section
          className={
            layout === "main"
              ? "flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white"
              : "fixed z-20 w-[min(380px,calc(100vw-40px))] cursor-move touch-none"
          }
          style={layout === "split" ? { left: miniVideoPosition.x, top: miniVideoPosition.y } : undefined}
          onPointerDown={layout === "split" ? handleMiniVideoDragStart : undefined}
          title={layout === "split" ? "拖动视频位置" : undefined}
        >
          <VideoPane mediaSrc={mediaSrc} videoRef={videoRef} onTimeUpdate={handleTimeUpdate} compact={layout === "split"} />
        </section>

        <button
          type="button"
          className={`h-full cursor-col-resize touch-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-600 ${
            layout === "main" ? "flex" : "hidden"
          }`}
          onPointerDown={handlePanelResizeStart}
          title="拖动调整音视频和字幕大小"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <aside className={layout === "main" ? "min-h-0" : "subtitle-list-split mx-auto h-full max-w-5xl"}>
          <SubtitleList
            subtitles={subtitles}
            currentIndex={currentIndex}
            onSelect={handleSubtitleSelect}
          />
        </aside>
      </main>
      <PlayerControls
        isPlaying={snapshot.isPlaying}
        playbackRate={snapshot.playbackRate}
        onTogglePlay={togglePlay}
        onPlaybackRateChange={setPlaybackRate}
        className="fixed inset-x-0 bottom-0 z-30 shadow-[0_-16px_35px_rgba(15,23,42,0.10)]"
      />
    </div>
  );
}

const MINI_VIDEO_WIDTH = 380;
const MINI_VIDEO_HEIGHT = 176;
const CONTROL_BAR_HEIGHT = 84;

function clampMiniVideoPosition(position: { x: number; y: number }) {
  const maxX = Math.max(window.innerWidth - Math.min(MINI_VIDEO_WIDTH, window.innerWidth - 40) - 12, 12);
  const maxY = Math.max(window.innerHeight - MINI_VIDEO_HEIGHT - CONTROL_BAR_HEIGHT - 12, 12);

  return {
    x: Math.min(Math.max(position.x, 12), maxX),
    y: Math.min(Math.max(position.y, 12), maxY),
  };
}
