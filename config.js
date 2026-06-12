// ============================================================
//  NAXSORA AI — config.js
//  Edit these values before deploying
// ============================================================

const NAXSORA_CONFIG = {
  // ── Anthropic (Claude) ──────────────────────────────────
  // Get your key at https://console.anthropic.com
  ANTHROPIC_API_KEY: "YOUR_ANTHROPIC_API_KEY_HERE",
  ANTHROPIC_MODEL: "claude-sonnet-4-20250514", // or claude-opus-4-20250514
  MAX_TOKENS: 4096,

  // ── Image Generation (Pollinations AI — free, no key needed) ──
  IMAGE_API_BASE: "https://image.pollinations.ai/prompt/",
  IMAGE_WIDTH: 1024,
  IMAGE_HEIGHT: 1024,
  IMAGE_MODEL: "flux", // flux | turbo | dreamshaper

  // ── App Branding ────────────────────────────────────────
  APP_NAME: "Naxsora AI",
  APP_TAGLINE: "Your intelligent companion",
  APP_VERSION: "1.0.0",

  // ── Defaults ────────────────────────────────────────────
  DEFAULT_THEME: "dark", // "dark" | "light"
  MAX_HISTORY_MESSAGES: 100,
  STREAM_RESPONSES: true,

  // ── System Prompt ────────────────────────────────────────
  SYSTEM_PROMPT: `You are Naxsora AI, an advanced, helpful, and friendly AI assistant. 
You can help with writing, coding, analysis, math, creative tasks, and much more.
When asked to generate an image, respond ONLY with: [IMAGE_REQUEST: <detailed description>]
Format code blocks properly with the language name. Be concise but thorough.
Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
};

export default NAXSORA_CONFIG;
