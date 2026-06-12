// ============================================================
//  NAXSORA AI — api.js
//  Handles all API calls: Anthropic (chat) + Pollinations (images)
// ============================================================

import NAXSORA_CONFIG from "./config.js";

// ── Chat API (Anthropic Claude) ──────────────────────────────
export async function sendChatMessage(messages, onChunk, onDone, onError) {
  const payload = {
    model: NAXSORA_CONFIG.ANTHROPIC_MODEL,
    max_tokens: NAXSORA_CONFIG.MAX_TOKENS,
    system: NAXSORA_CONFIG.SYSTEM_PROMPT,
    stream: NAXSORA_CONFIG.STREAM_RESPONSES,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NAXSORA_CONFIG.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

    if (NAXSORA_CONFIG.STREAM_RESPONSES) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              if (json.type === "content_block_delta" && json.delta?.text) {
                fullText += json.delta.text;
                onChunk(json.delta.text, fullText);
              }
            } catch (_) {}
          }
        }
      }
      onDone(fullText);
    } else {
      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      onChunk(text, text);
      onDone(text);
    }
  } catch (err) {
    onError(err.message || "Something went wrong. Please try again.");
  }
}

// ── File → Base64 helper ─────────────────────────────────────
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Chat with file/image attachment (vision) ─────────────────
export async function sendMessageWithFile(messages, file, userText, onChunk, onDone, onError) {
  let content = [];

  if (file.type.startsWith("image/")) {
    const b64 = await fileToBase64(file);
    content.push({ type: "image", source: { type: "base64", media_type: file.type, data: b64 } });
  } else {
    // Text/PDF — read as text
    const text = await file.text();
    content.push({ type: "text", text: `[File: ${file.name}]\n\n${text}` });
  }

  if (userText) content.push({ type: "text", text: userText });

  const allMessages = [
    ...messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content },
  ];

  await sendChatMessage(allMessages, onChunk, onDone, onError);
}

// ── Image Generation (Pollinations AI) ───────────────────────
export async function generateImage(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 99999);
  const url = `${NAXSORA_CONFIG.IMAGE_API_BASE}${encoded}?width=${NAXSORA_CONFIG.IMAGE_WIDTH}&height=${NAXSORA_CONFIG.IMAGE_HEIGHT}&model=${NAXSORA_CONFIG.IMAGE_MODEL}&seed=${seed}&nologo=true`;
  return url; // Pollinations returns image directly at URL
}
