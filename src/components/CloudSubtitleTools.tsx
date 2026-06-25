import { Captions, Download, Languages, Loader2, UploadCloud, X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { downloadSubtitleFile } from "../lib/subtitleSerializer";
import { transcribeMediaFile, translateSubtitles } from "../lib/groqClient";
import { useSubtitleReader } from "../state/SubtitleReaderContext";
import type { SubtitleExportMode, SubtitleFormat } from "../types";

const exportModes: Array<{ value: SubtitleExportMode; label: string }> = [
  { value: "original", label: "原文" },
  { value: "translation", label: "译文" },
  { value: "bilingual", label: "双语" },
];

const transcriptionModels = ["whisper-large-v3-turbo", "whisper-large-v3"] as const;
const targetLanguages = ["中文", "英语", "日语", "韩语", "法语", "德语", "西班牙语", "意大利语", "葡萄牙语", "俄语"] as const;

export type ToolbarPanelId = "recognition" | "translation" | "download" | "intensive";

interface CloudSubtitleToolsProps {
  activePanel: ToolbarPanelId | null;
  onActivePanelChange: (panel: ToolbarPanelId | null) => void;
}

export function CloudSubtitleTools({ activePanel, onActivePanelChange }: CloudSubtitleToolsProps) {
  const { mediaFile, subtitles, setMediaFile, setSubtitles } = useSubtitleReader();
  const [targetLanguage, setTargetLanguage] = useState("中文");
  const [transcriptionModel, setTranscriptionModel] = useState<(typeof transcriptionModels)[number]>("whisper-large-v3-turbo");
  const [recognitionStatus, setRecognitionStatus] = useState("");
  const [translationStatus, setTranslationStatus] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranscribe = async (file: File | null) => {
    if (!file) {
      setRecognitionStatus("请先导入或选择一个音视频文件。");
      return;
    }

    setIsTranscribing(true);
    setRecognitionStatus("正在上传音视频文件...");
    try {
      const result = await transcribeMediaFile(file, {
        model: transcriptionModel,
        onStatus: setRecognitionStatus,
      });
      setSubtitles(result);
      setRecognitionStatus(`识别完成：已生成 ${result.length} 条字幕并自动应用。`);
    } catch (error) {
      setRecognitionStatus(error instanceof Error ? error.message : "字幕识别失败，请稍后重试。");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMediaAndTranscribe = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setMediaFile(file);
    await handleTranscribe(file);
  };

  const handleTranslate = async () => {
    if (subtitles.length === 0) {
      setTranslationStatus("请先导入字幕，或先完成云端识别。");
      return;
    }

    if (!targetLanguage.trim()) {
      setTranslationStatus("请选择目标语言。");
      return;
    }

    setIsTranslating(true);
    setTranslationStatus(`正在翻译为${targetLanguage.trim()}...`);
    try {
      const translated = await translateSubtitles(subtitles, targetLanguage.trim());
      setSubtitles(translated);
      setTranslationStatus("翻译完成：已显示为双语字幕。");
    } catch (error) {
      setTranslationStatus(error instanceof Error ? error.message : "字幕翻译失败。");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="relative">
        <ToolbarButton
          active={activePanel === "recognition"}
          icon={isTranscribing ? Loader2 : Captions}
          label="识别"
          spinning={isTranscribing}
          onClick={() => onActivePanelChange(activePanel === "recognition" ? null : "recognition")}
        />
        {activePanel === "recognition" && (
          <PopupPanel widthClass="w-[min(560px,calc(100vw-24px))]">
          <PanelHeader icon={Captions} title="从音视频生成字幕" onClose={() => onActivePanelChange(null)} />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 min-w-52 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                value={transcriptionModel}
                onChange={(event) => setTranscriptionModel(event.target.value as (typeof transcriptionModels)[number])}
                  title="识别模型"
              >
                {transcriptionModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleTranscribe(mediaFile)}
                disabled={isTranscribing || !mediaFile}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-cyan-600 px-3 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Captions className="h-4 w-4" />}
                  <span>识别当前文件</span>
              </button>
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <UploadCloud className="h-4 w-4" />
                  <span>选择文件识别</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(event) => void handleMediaAndTranscribe(event.target.files?.[0])}
                />
              </label>
            </div>
            {recognitionStatus && <StatusLine text={recognitionStatus} />}
          </PopupPanel>
        )}
      </div>

      <div className="relative">
        <ToolbarButton
          active={activePanel === "translation"}
          icon={isTranslating ? Loader2 : Languages}
          label="翻译"
          spinning={isTranslating}
          onClick={() => onActivePanelChange(activePanel === "translation" ? null : "translation")}
        />
        {activePanel === "translation" && (
          <PopupPanel widthClass="w-[min(360px,calc(100vw-24px))]">
          <PanelHeader icon={Languages} title="翻译当前字幕" onClose={() => onActivePanelChange(null)} />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              >
                {targetLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleTranslate()}
                disabled={isTranslating || subtitles.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-cyan-600 px-3 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                  <span>开始翻译</span>
              </button>
            </div>
            {translationStatus && <StatusLine text={translationStatus} />}
          </PopupPanel>
        )}
      </div>
    </div>
  );
}

interface DownloadSubtitleToolsProps {
  activePanel: ToolbarPanelId | null;
  onActivePanelChange: (panel: ToolbarPanelId | null) => void;
}

export function DownloadSubtitleTools({ activePanel, onActivePanelChange }: DownloadSubtitleToolsProps) {
  const { subtitles } = useSubtitleReader();
  const [exportMode, setExportMode] = useState<SubtitleExportMode>("bilingual");
  const hasTranslations = useMemo(() => subtitles.some((item) => Boolean(item.translation?.trim())), [subtitles]);

  useLayoutEffect(() => {
    if (!hasTranslations && exportMode !== "original") {
      setExportMode("original");
    }
  }, [exportMode, hasTranslations]);

  const exportCurrent = (format: SubtitleFormat) => {
    downloadSubtitleFile(subtitles, format, exportMode, `subtitles-${exportMode}`);
  };

  return (
    <div className="relative shrink-0">
      <ToolbarButton
        active={activePanel === "download"}
        icon={Download}
        label="下载"
        onClick={() => onActivePanelChange(activePanel === "download" ? null : "download")}
      />
      {activePanel === "download" && (
        <PopupPanel widthClass="w-[min(320px,calc(100vw-24px))]">
          <PanelHeader icon={Download} title="导出当前字幕" onClose={() => onActivePanelChange(null)} />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
              value={exportMode}
              onChange={(event) => setExportMode(event.target.value as SubtitleExportMode)}
              title="当前字幕导出内容"
            >
              {exportModes.map((mode) => (
                <option key={mode.value} value={mode.value} disabled={mode.value !== "original" && !hasTranslations}>
                  {mode.label}
                </option>
              ))}
            </select>
            <ExportButton label="SRT" disabled={subtitles.length === 0} onClick={() => exportCurrent("srt")} />
            <ExportButton label="VTT" disabled={subtitles.length === 0} onClick={() => exportCurrent("vtt")} />
          </div>
        </PopupPanel>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  spinning?: boolean;
  onClick: () => void;
}

function ToolbarButton({ active, icon: Icon, label, spinning = false, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
        active
          ? "border-cyan-300 bg-cyan-50 text-cyan-700"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      }`}
    >
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      <span>{label}</span>
    </button>
  );
}

interface PopupPanelProps {
  children: ReactNode;
  widthClass: string;
}

function PopupPanel({ children, widthClass }: PopupPanelProps) {
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

interface PanelHeaderProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  onClose: () => void;
}

function PanelHeader({ icon: Icon, title, onClose }: PanelHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-cyan-600" />
        <span>{title}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        title="关闭"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatusLine({ text }: { text: string }) {
  return <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{text}</div>;
}

interface ExportButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

function ExportButton({ label, disabled = false, onClick }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    >
      {label}
    </button>
  );
}
