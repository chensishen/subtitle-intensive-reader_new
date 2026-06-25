import { FileText, Pause, Play, Repeat, Rows3, ScanText, Settings2, SplitSquareHorizontal, Upload, X } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { CloudSubtitleTools, DownloadSubtitleTools, type ToolbarPanelId } from "./CloudSubtitleTools";
import { parseSubtitle } from "../lib/subtitleParser";
import { useSubtitleReader } from "../state/SubtitleReaderContext";
import type { IntervalType, LayoutMode, PlayMode } from "../types";

interface PlayerControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  onTogglePlay: () => void;
  onPlaybackRateChange: (rate: number) => void;
  className?: string;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const intervalOptions: Array<{ value: IntervalType; label: string }> = [
  { value: "fixed", label: "固定停顿" },
  { value: "multiplier", label: "按句长" },
  { value: "infinite", label: "句末暂停" },
];

export function PlayerControls({
  isPlaying,
  playbackRate,
  onTogglePlay,
  onPlaybackRateChange,
  className = "",
}: PlayerControlsProps) {
  const {
    playMode,
    layout,
    loopConfig,
    setMediaFile,
    setSubtitles,
    setPlayMode,
    setLayout,
    patchLoopConfig,
  } = useSubtitleReader();
  const [activePanel, setActivePanel] = useState<ToolbarPanelId | null>(null);

  const handleMediaChange = (file: File | undefined) => {
    if (!file) {
      return;
    }

    setMediaFile(file);
  };

  const handleSubtitleChange = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const extension = file.name.toLowerCase().endsWith(".vtt") ? "vtt" : "srt";
    const content = await file.text();
    setSubtitles(parseSubtitle(content, extension));
  };

  return (
    <section className={`overflow-visible border-t border-slate-200 bg-white p-3 ${className}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          <span>媒体</span>
          <input
            className="sr-only"
            type="file"
            accept="audio/*,video/*"
            onChange={(event) => handleMediaChange(event.target.files?.[0])}
          />
        </label>

        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
          <FileText className="h-4 w-4" />
          <span>字幕</span>
          <input
            className="sr-only"
            type="file"
            accept=".srt,.vtt,text/vtt"
            onChange={(event) => void handleSubtitleChange(event.target.files?.[0])}
          />
        </label>

        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-600 text-white shadow-sm transition hover:bg-cyan-700"
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <SegmentedControl<PlayMode>
          value={playMode}
          onChange={setPlayMode}
          options={[
            { value: "reading", label: "阅读", icon: Rows3 },
            { value: "intensive", label: "精读", icon: Repeat },
          ]}
        />

        <SegmentedControl<LayoutMode>
          value={layout}
          onChange={setLayout}
          options={[
            { value: "main", label: "主视图", icon: SplitSquareHorizontal },
            { value: "split", label: "文本", icon: ScanText },
          ]}
        />

        {playMode === "intensive" && (
          <IntensiveOptionsPopup
            activePanel={activePanel}
            loopConfig={loopConfig}
            onActivePanelChange={setActivePanel}
            onPatchLoopConfig={patchLoopConfig}
          />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-slate-500">倍速</span>
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
            value={playbackRate}
            onChange={(event) => onPlaybackRateChange(Number(event.target.value))}
          >
            {playbackRates.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </div>

        <CloudSubtitleTools activePanel={activePanel} onActivePanelChange={setActivePanel} />
        <DownloadSubtitleTools activePanel={activePanel} onActivePanelChange={setActivePanel} />
      </div>
    </section>
  );
}

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentedControlOption<T>>;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-slate-300 bg-slate-100 p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm font-medium transition ${
              active ? "bg-white text-cyan-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface IntensiveOptionsPopupProps {
  activePanel: ToolbarPanelId | null;
  loopConfig: ReturnType<typeof useSubtitleReader>["loopConfig"];
  onActivePanelChange: (panel: ToolbarPanelId | null) => void;
  onPatchLoopConfig: (patch: Partial<ReturnType<typeof useSubtitleReader>["loopConfig"]>) => void;
}

function IntensiveOptionsPopup({ activePanel, loopConfig, onActivePanelChange, onPatchLoopConfig }: IntensiveOptionsPopupProps) {
  const isOpen = activePanel === "intensive";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => onActivePanelChange(isOpen ? null : "intensive")}
        className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
          isOpen
            ? "border-cyan-300 bg-cyan-50 text-cyan-700"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        <Settings2 className="h-4 w-4" />
        <span>跟读设置</span>
      </button>

      {isOpen && (
        <ToolbarPopupPanel widthClass="w-[min(360px,calc(100vw-24px))]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Repeat className="h-4 w-4 text-cyan-600" />
              <span>精读跟读设置</span>
            </div>
            <button
              type="button"
              onClick={() => onActivePanelChange(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1 block">重复次数</span>
              <input
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                type="number"
                min={0}
                value={loopConfig.maxCount}
                onChange={(event) => onPatchLoopConfig({ maxCount: Number(event.target.value) })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1 block">停顿方式</span>
              <select
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                value={loopConfig.intervalType}
                onChange={(event) => onPatchLoopConfig({ intervalType: event.target.value as IntervalType })}
              >
                {intervalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="mb-1 block">{loopConfig.intervalType === "multiplier" ? "句长倍数" : "停顿秒数"}</span>
              <input
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 disabled:bg-slate-100"
                type="number"
                min={0}
                step={0.25}
                disabled={loopConfig.intervalType === "infinite"}
                value={loopConfig.intervalValue}
                onChange={(event) => onPatchLoopConfig({ intervalValue: Number(event.target.value) })}
              />
            </label>
          </div>
        </ToolbarPopupPanel>
      )}
    </div>
  );
}

interface ToolbarPopupPanelProps {
  children: ReactNode;
  widthClass: string;
}

function ToolbarPopupPanel({ children, widthClass }: ToolbarPopupPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  useLayoutEffect(() => {
    const updateOffset = () => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      const margin = 12;
      let nextOffset = 0;

      if (rect.left < margin) {
        nextOffset = margin - rect.left;
      } else if (rect.right > window.innerWidth - margin) {
        nextOffset = window.innerWidth - margin - rect.right;
      }

      setOffsetX(nextOffset);
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-[calc(100%+12px)] left-1/2 z-50 max-w-[calc(100vw-24px)] -translate-x-1/2 ${widthClass} rounded-md border border-slate-200 bg-white p-4 text-slate-800 shadow-[0_18px_55px_rgba(15,23,42,0.22)]`}
      style={{ marginLeft: offsetX }}
    >
      {children}
    </div>
  );
}
