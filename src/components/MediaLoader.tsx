import { FileAudio, FileText, Upload } from "lucide-react";
import { parseSubtitle } from "../lib/subtitleParser";
import { useSubtitleReader } from "../state/SubtitleReaderContext";

export function MediaLoader() {
  const { setMediaFile, setSubtitles } = useSubtitleReader();

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
    <section className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
        <Upload className="h-4 w-4" />
        <span>媒体文件</span>
        <input
          className="sr-only"
          type="file"
          accept="audio/*,video/*"
          onChange={(event) => handleMediaChange(event.target.files?.[0])}
        />
      </label>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
        <FileText className="h-4 w-4" />
        <span>字幕 SRT/VTT</span>
        <input
          className="sr-only"
          type="file"
          accept=".srt,.vtt,text/vtt"
          onChange={(event) => void handleSubtitleChange(event.target.files?.[0])}
        />
      </label>
      <div className="ml-auto hidden items-center gap-2 text-sm text-slate-500 sm:flex">
        <FileAudio className="h-4 w-4" />
        <span>Space 播放，左右方向键切句</span>
      </div>
    </section>
  );
}
