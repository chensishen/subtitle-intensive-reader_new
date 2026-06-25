export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
  maxDuration: 300,
};

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const BATCH_SIZE = 30;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof request.body === "object" && request.body !== null ? request.body : {};

  const subtitles = Array.isArray(body?.subtitles) ? body.subtitles : [];
  const targetLanguage = typeof body?.targetLanguage === "string" ? body.targetLanguage.trim() : "";
  const sourceLanguage = typeof body?.sourceLanguage === "string" ? body.sourceLanguage.trim() : "";
  const style = typeof body?.style === "string" ? body.style.trim() : "";

  if (subtitles.length === 0) {
    return response.status(400).json({ error: "Missing subtitles" });
  }

  if (!targetLanguage) {
    return response.status(400).json({ error: "Missing targetLanguage" });
  }

  const normalizedSubtitles = subtitles
    .map((item) => ({
      id: typeof item?.id === "string" ? item.id : "",
      text: typeof item?.text === "string" ? item.text.trim() : "",
    }))
    .filter((item) => item.id && item.text);

  if (normalizedSubtitles.length === 0) {
    return response.status(400).json({ error: "No translatable subtitle text" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: "Missing GROQ_API_KEY server environment variable" });
  }

  const batches = chunk(normalizedSubtitles, BATCH_SIZE);
  const translations = [];

  try {
    for (const batch of batches) {
      const translatedBatch = await translateBatch(apiKey, batch, targetLanguage, sourceLanguage, style);
      translations.push(...mergeBatch(batch, translatedBatch));
    }
  } catch (error) {
    return response.status(502).json({ error: error instanceof Error ? error.message : "Groq subtitle translation failed" });
  }

  return response.status(200).json({ translations });
}

async function translateBatch(apiKey, subtitles, targetLanguage, sourceLanguage, style) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_TRANSLATION_MODEL || DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You translate subtitle segments. Return only valid JSON with a translations array. Each item must keep the original id and include a translation string. Do not add commentary.",
        },
        {
          role: "user",
          content: JSON.stringify({
            targetLanguage,
            sourceLanguage: sourceLanguage || "auto",
            style: style || "natural subtitle translation",
            outputShape: { translations: [{ id: "same id", translation: "translated text" }] },
            subtitles,
          }),
        },
      ],
    }),
  });

  const payload = await readGroqJson(response);
  if (!response.ok) {
    throw new Error(getGroqError(payload, "Groq subtitle translation failed"));
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.translations) ? parsed.translations : [];
  } catch {
    return [];
  }
}

function mergeBatch(sourceBatch, translatedBatch) {
  const translatedById = new Map(
    translatedBatch
      .filter((item) => typeof item?.id === "string" && typeof item?.translation === "string")
      .map((item) => [item.id, item.translation.trim()]),
  );

  return sourceBatch.map((item) => ({
    id: item.id,
    translation: translatedById.get(item.id) || "",
  }));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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
