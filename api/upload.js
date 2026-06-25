import { handleUpload } from "@vercel/blob/client";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const uploadResponse = await handleUpload({
      request: toWebRequest(request),
      body: request.body,
      onUploadCompleted: async () => {},
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "audio/flac",
          "audio/mp3",
          "audio/mp4",
          "audio/mpeg",
          "audio/mpga",
          "audio/ogg",
          "audio/wav",
          "audio/webm",
          "video/mp4",
          "video/mpeg",
          "video/ogg",
          "video/quicktime",
          "video/webm",
        ],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        tokenPayload: JSON.stringify({ purpose: "groq-transcription" }),
      }),
    });

    return response.status(200).json(uploadResponse);
  } catch (error) {
    return response.status(400).json({ error: error instanceof Error ? error.message : "Blob upload failed" });
  }
}

function toWebRequest(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host || "localhost";
  return new Request(`${protocol}://${host}${request.url}`, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(request.body || {}),
  });
}
