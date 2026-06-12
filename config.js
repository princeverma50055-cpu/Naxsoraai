// ============================================================
//  NAXSORA AI — config.js
// ============================================================

const NAXSORA_CONFIG = {
  // Gemini API key — set karo Settings mein app ke andar
  GEMINI_API_KEY: "",

  // Image Generation (Pollinations AI — free, no key needed)
  IMAGE_API_BASE: "https://image.pollinations.ai/prompt/",
  IMAGE_WIDTH: 1024,
  IMAGE_HEIGHT: 1024,
  IMAGE_MODEL: "flux",

  // App Branding
  APP_NAME: "Naxsora AI",
  APP_TAGLINE: "Your intelligent companion",
  APP_VERSION: "1.0.0",

  // Defaults
  DEFAULT_THEME: "dark",
  MAX_HISTORY_MESSAGES: 100,
  STREAM_RESPONSES: true,
};

export default NAXSORA_CONFIG;
