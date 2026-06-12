// ============================================================
//  NAXSORA AI — api.js
//  Gemini API (free) + Pollinations AI (image generation)
// ============================================================

// ── Gemini Chat API ──────────────────────────────────────────
export async function sendChatMessage(messages, onChunk, onDone, onError) {
  const apiKey = window._naxsoraApiKey || localStorage.getItem("naxsora_gemini_key");
  if (!apiKey) {
    onError("API key not set. Please add your Gemini API key in Settings.");
    return;
  }

  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
    systemInstruction: {
      parts: [{
        text: `You are Naxsora AI, an advanced, helpful, and friendly AI assistant. 
You can help with writing, coding, analysis, math, creative tasks, and much more.
When asked to generate an image, respond ONLY with: [IMAGE_REQUEST: <detailed description>]
Format code blocks properly with the language name. Be concise but thorough.
Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`
      }]
    }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

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
            const chunk = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              fullText += chunk;
              onChunk(chunk, fullText);
            }
          } catch (_) {}
        }
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err.message || "Something went wrong. Please try again.");
  }
}

// ── File/Image analysis with Gemini Vision ───────────────────
export async function sendMessageWithFile(messages, file, userText, onChunk, onDone, onError) {
  const apiKey = window._naxsoraApiKey || localStorage.getItem("naxsora_gemini_key");
  if (!apiKey) {
    onError("API key not set. Please add your Gemini API key in Settings.");
    return;
  }

  const toBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  let parts = [];

  if (file.type.startsWith("image/")) {
    const b64 = await toBase64(file);
    parts.push({ inline_data: { mime_type: file.type, data: b64 } });
  } else {
    const text = await file.text();
    parts.push({ text: `[File: ${file.name}]\n\n${text}` });
  }

  if (userText) parts.push({ text: userText });

  const prevContents = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const payload = {
    contents: [...prevContents, { role: "user", parts }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || `API error ${response.status}`);
    }

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
          try {
            const json = JSON.parse(data);
            const chunk = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              fullText += chunk;
              onChunk(chunk, fullText);
            }
          } catch (_) {}
        }
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err.message || "Something went wrong.");
  }
}

// ── Image Generation (Pollinations AI — free) ────────────────
export async function generateImage(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;
}
