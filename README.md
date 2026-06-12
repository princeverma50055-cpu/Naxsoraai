# ✦ Naxsora AI

**Your intelligent AI companion** — A fully-featured, production-ready AI chatbot with a premium UI/UX, powered by Anthropic Claude.

![Naxsora AI](https://image.pollinations.ai/prompt/futuristic%20AI%20chat%20interface%20dark%20purple%20neon%20ui%20screenshot?width=1200&height=600&model=flux&nologo=true)

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat** | Real-time streaming chat powered by Claude (Sonnet / Opus / Haiku) |
| 🎨 **Image Generation** | Free image generation via Pollinations AI (no key needed) |
| 📎 **File & Image Upload** | Attach images, PDFs, code files for AI analysis |
| 🌙 **Dark / Light Mode** | Seamless theme switching with persistent preference |
| 💾 **Chat History** | All conversations saved locally in your browser |
| ⚙️ **Settings Panel** | Configure API key, model, streaming, and more |
| 📋 **Code Highlighting** | Syntax-highlighted code blocks with one-click copy |
| 📱 **Fully Responsive** | Works perfectly on mobile, tablet, and desktop |
| ⌨️ **Keyboard Shortcuts** | `Enter` to send, `Ctrl+K` new chat, `Esc` to close modals |
| 🖼️ **Image Lightbox** | Full-screen image viewer with download support |
| ✍️ **Markdown Rendering** | Full markdown support including tables, lists, bold, italic |
| 🔒 **100% Private** | Everything runs in your browser — no server, no data collection |

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/naxsora-ai.git
cd naxsora-ai
```

### 2. Add your Anthropic API Key

Open `config.js` and replace the placeholder:

```js
ANTHROPIC_API_KEY: "sk-ant-YOUR_KEY_HERE",
```

Get a free API key at [console.anthropic.com](https://console.anthropic.com)

### 3. Run locally

Since this uses ES Modules, you need a local server:

```bash
# Option A — Python (built-in)
python3 -m http.server 8080

# Option B — Node.js (npx)
npx serve .

# Option C — VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open: **http://localhost:8080**

---

## 📁 Project Structure

```
naxsora-ai/
├── index.html      # Main HTML — full UI layout
├── style.css       # Complete styling (dark/light themes, animations)
├── app.js          # Core logic — chat, sessions, rendering, events
├── api.js          # API layer — Anthropic + Pollinations AI
├── config.js       # Configuration — API keys, model, settings
└── README.md       # This file
```

---

## 🎨 Image Generation

Just ask naturally — no special commands needed:

- *"Generate an image of a sunset over mountains"*
- *"Create a futuristic robot in a neon city"*
- *"Draw a watercolor painting of a cozy coffee shop"*
- *"Make a portrait of an astronaut on Mars"*

Powered by **Pollinations AI** — completely free, no API key required.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Ctrl + K` | Start new chat |
| `Esc` | Close modal / lightbox |

---

## ⚙️ Configuration (`config.js`)

```js
const NAXSORA_CONFIG = {
  ANTHROPIC_API_KEY: "YOUR_KEY",        // Your Claude API key
  ANTHROPIC_MODEL: "claude-sonnet-4-…", // Model to use
  MAX_TOKENS: 4096,                      // Max response length
  IMAGE_MODEL: "flux",                   // Image model: flux | turbo
  DEFAULT_THEME: "dark",                 // "dark" | "light"
  STREAM_RESPONSES: true,                // Enable streaming
};
```

---

## 🌐 Deploy to GitHub Pages

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your app will be live at `https://YOUR_USERNAME.github.io/naxsora-ai`

> **Note:** Your API key will be visible in `config.js`. For production, use a backend proxy.

---

## 🔒 Security Note

This project calls the Anthropic API directly from the browser. This is fine for **personal use** or **local development**. For a **public deployment**, build a simple backend proxy to keep your API key secret.

---

## 🛠️ Tech Stack

- **Vanilla JS** (ES Modules) — zero dependencies
- **CSS Custom Properties** — full theming system
- **Anthropic Claude API** — AI chat & reasoning
- **Pollinations AI** — free image generation
- **LocalStorage** — persistent chat history

---

## 📱 Mobile App

To convert to a mobile app (Android/iOS):

```bash
# Using Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init NaxsoraAI com.naxsora.ai
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Opens Android Studio
npx cap open ios       # Opens Xcode
```

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<p align="center">Made with ❤️ · Naxsora AI v1.0.0</p>
