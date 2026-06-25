import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 300,
};

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const SEGMENT_SECONDS = 8 * 60;
const MAX_GROQ_AUDIO_BYTES = 24 * 1024 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: "Missing GROQ_API_KEY server environment variable" });
  }

  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const fileUrl = typeof body.url === "string" ? body.url : "";
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : "whisper-large-v3-turbo";

  if (!fileUrl) {
    return response.status(400).json({ error: "Missing uploaded file URL" });
  }

  const workingDir = await mkdtemp(path.join(tmpdir(), "groq-transcribe-"));

  try {
    const sourcePath = await downloadToFile(fileUrl, workingDir);
    const chunks = await createAudioChunks(sourcePath, workingDir);
    const segments = [];
    const texts = [];

    for (const [chunkIndex, chunkPath] of chunks.entries()) {
      const chunkStats = await stat(chunkPath);
      if (chunkStats.size > MAX_GROQ_AUDIO_BYTES) {
        throw new Error("切分后的音频片段仍超过 Groq 25MB 限制，请使用更短或更低码率的视频。");
      }

      const payload = await transcribeChunk(apiKey, chunkPath, model);
      const offset = chunkIndex * SEGMENT_SECONDS;

      if (typeof payload.text === "string" && payload.text.trim()) {
        texts.push(payload.text.trim());
      }

      if (Array.isArray(payload.segments)) {
        for (const segment of payload.segments) {
          if (typeof segment?.text !== "string") {
            continue;
          }
          segments.push({
            ...segment,
            start: Number(segment.start || 0) + offset,
            end: Number(segment.end || 0) + offset,
          });
        }
      }
    }

    return response.status(200).json({
      text: texts.join("\n"),
      segments,
      chunkCount: chunks.length,
      segmentSeconds: SEGMENT_SECONDS,
    });
  } catch (error) {
    return response.status(502).json({ error: error instanceof Error ? error.message : "Groq transcription failed" });
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

async function downloadToFile(fileUrl, workingDir) {
  const downloadResponse = await fetch(fileUrl);
  if (!downloadResponse.ok || !downloadResponse.body) {
    throw new Error("无法读取上传的视频文件。");
  }

  const sourcePath = path.join(workingDir, `source-${randomUUID()}`);
  await pipeline(Readable.fromWeb(downloadResponse.body), createWriteStream(sourcePath));
  return sourcePath;
}

async function createAudioChunks(sourcePath, workingDir) {
  const outputPattern = path.join(workingDir, "chunk-%03d.mp3");
  await runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "48k",
    "-f",
    "segment",
    "-segment_time",
    String(SEGMENT_SECONDS),
    "-reset_timestamps",
    "1",
    outputPattern,
  ]);

  const files = await readdir(workingDir);
  const chunks = files
    .filter((file) => /^chunk-\d+\.mp3$/.test(file))
    .sort()
    .map((file) => path.join(workingDir, file));

  if (chunks.length === 0) {
    throw new Error("视频中没有提取到可识别的音频。");
  }

  return chunks;
}

async function runFfmpeg(args) {
  const ffmpegPath = await getFfmpegPath();

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || "ffmpeg 切分失败。"));
    });
  });
}

async function getFfmpegPath() {
  try {
    const ffmpegStatic = await import("ffmpeg-static");
    return ffmpegStatic.default || ffmpegStatic;
  } catch {
    return process.env.FFMPEG_PATH || "ffmpeg";
  }
}

async function transcribeChunk(apiKey, chunkPath, model) {
  const audio = await readFile(chunkPath);
  const formData = new FormData();

  formData.append("file", new Blob([audio], { type: "audio/mpeg" }), path.basename(chunkPath));
  formData.append("model", model);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const groqResponse = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const payload = await readGroqJson(groqResponse);
  if (!groqResponse.ok) {
    throw new Error(getGroqError(payload, "Groq transcription failed"));
  }

  return payload;
}

async function readGroqJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getGroqError(payload, fallback) {
  return payload?.error?.message || payload?.error || fallback;
}
