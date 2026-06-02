import { FileText, Pause, Play, Repeat, Rows3, ScanText, SplitSquareHorizontal, Upload } from "lucide-react";
import type { ComponentType } from "react";
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
  { value: "fixed", label: "固定" },
  { value: "multiplier", label: "倍数" },
  { value: "infinite", label: "暂停" },
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
    setMediaSrc,
    setSubtitles,
    setPlayMode,
    setLayout,
    patchLoopConfig,
  } = useSubtitleReader();

  const handleMediaChange = (file: File | undefined) => {
    if (!file) {
      return;
    }

    setMediaSrc(URL.createObjectURL(file));
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
    <section className={`overflow-x-auto border-t border-slate-200 bg-white p-3 ${className}`}>
      <div className="flex min-w-max flex-nowrap items-center gap-3">
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
          <div className="flex shrink-0 flex-nowrap items-center gap-2 rounded-md border border-cyan-100 bg-cyan-50/70 px-2.5 py-2">
            <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
              <span>循环</span>
              <input
                className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                type="number"
                min={0}
                value={loopConfig.maxCount}
                onChange={(event) => patchLoopConfig({ maxCount: Number(event.target.value) })}
              />
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
              <span>间隔</span>
              <select
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                value={loopConfig.intervalType}
                onChange={(event) => patchLoopConfig({ intervalType: event.target.value as IntervalType })}
              >
                {intervalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
              <span>值</span>
              <input
                className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 disabled:bg-slate-100"
                type="number"
                min={0}
                step={0.25}
                disabled={loopConfig.intervalType === "infinite"}
                value={loopConfig.intervalValue}
                onChange={(event) => patchLoopConfig({ intervalValue: Number(event.target.value) })}
              />
            </label>
          </div>
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
