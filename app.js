// ============================================================
//  NAXSORA AI — app.js
//  Main application logic
// ============================================================

import { sendChatMessage, sendMessageWithFile, generateImage } from "./api.js";
import NAXSORA_CONFIG from "./config.js";
import { requireAuth, signOut, supabase } from "./auth.js";

// ── State ────────────────────────────────────────────────────
const state = {
  sessions: JSON.parse(localStorage.getItem("naxsora_sessions") || "[]"),
  currentId: null,
  isGenerating: false,
  attachedFile: null,
  settings: JSON.parse(localStorage.getItem("naxsora_settings") || "{}"),
};

// Default settings
const defaultSettings = {
  theme: NAXSORA_CONFIG.DEFAULT_THEME,
  streaming: true,
  soundEnabled: false,
  model: NAXSORA_CONFIG.ANTHROPIC_MODEL,
  apiKey: NAXSORA_CONFIG.ANTHROPIC_API_KEY,
};

Object.keys(defaultSettings).forEach((k) => {
  if (!(k in state.settings)) state.settings[k] = defaultSettings[k];
});

// ── DOM Refs ─────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const dom = {
  sidebar: $("sidebar"),
  sidebarOverlay: $("sidebar-overlay"),
  chatHistory: $("chat-history"),
  chatContainer: $("chat-container"),
  welcome: $("welcome"),
  messages: $("messages"),
  userInput: $("user-input"),
  sendBtn: $("send-btn"),
  fileInput: $("file-input"),
  filePreviewBar: $("file-preview-bar"),
  filePreviewContent: $("file-preview-content"),
  settingsModal: $("settings-modal"),
  lightbox: $("lightbox"),
  lightboxImg: $("lightbox-img"),
  toast: $("toast"),
  modelBadge: $("model-badge-text"),
};

// ── Init ─────────────────────────────────────────────────────
async function init() {
  // Auth guard — redirect to login if not signed in
  const user = await requireAuth();
  if (!user) return;

  // Show user info in sidebar
  renderUserProfile(user);

  applyTheme(state.settings.theme);
  renderSidebar();
  loadSettingsUI();

  if (state.sessions.length === 0) {
    showWelcome();
  } else {
    loadSession(state.sessions[0].id);
  }

  bindEvents();
}

// ── Render user profile in sidebar footer ────────────────────
function renderUserProfile(user) {
  const el = document.getElementById("user-profile");
  if (!el) return;
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const avatar = user.user_metadata?.avatar_url;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);background:var(--bg-tertiary);border:1px solid var(--border)">
      ${avatar
        ? `<img src="${avatar}" style="width:30px;height:30px;border-radius:50%;object-fit:cover" />`
        : `<div style="width:30px;height:30px;border-radius:50%;background:var(--accent-dim);border:1px solid var(--border-hover);display:flex;align-items:center;justify-content:center;font-size:13px">👤</div>`
      }
      <div style="flex:1;min-width:0">
        <div style="font-size:0.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.email}</div>
      </div>
      <button onclick="window.naxsora.logout()" title="Sign out" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:15px;padding:2px;transition:color 0.2s" onmouseover="this.style.color='var(--error)'" onmouseout="this.style.color='var(--text-muted)'">⏻</button>
    </div>`;
}

// ── Theme ────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  state.settings.theme = theme;
  saveSettings();
  const btn = $("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  applyTheme(state.settings.theme === "dark" ? "light" : "dark");
}

// ── Sessions ─────────────────────────────────────────────────
function createSession(firstMsg = "") {
  const id = Date.now().toString();
  const title = firstMsg ? firstMsg.slice(0, 46) + (firstMsg.length > 46 ? "…" : "") : "New conversation";
  const session = { id, title, messages: [], created: Date.now() };
  state.sessions.unshift(session);
  saveSessions();
  renderSidebar();
  return session;
}

function loadSession(id) {
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return;
  state.currentId = id;

  dom.welcome.style.display = "none";
  dom.messages.style.display = "flex";
  dom.messages.innerHTML = "";

  session.messages.forEach((msg) => renderMessage(msg));
  renderSidebar();
  scrollBottom(false);
}

function getCurrentSession() {
  return state.sessions.find((s) => s.id === state.currentId);
}

function deleteSession(id, e) {
  e.stopPropagation();
  state.sessions = state.sessions.filter((s) => s.id !== id);
  saveSessions();
  if (state.currentId === id) {
    state.currentId = null;
    if (state.sessions.length > 0) {
      loadSession(state.sessions[0].id);
    } else {
      showWelcome();
    }
  }
  renderSidebar();
}

function showWelcome() {
  state.currentId = null;
  dom.welcome.style.display = "flex";
  dom.messages.style.display = "none";
  dom.messages.innerHTML = "";
}

function renderSidebar() {
  dom.chatHistory.innerHTML = "";
  state.sessions.forEach((s) => {
    const el = document.createElement("div");
    el.className = `history-item${s.id === state.currentId ? " active" : ""}`;
    el.innerHTML = `<span class="history-icon">💬</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis">${escHtml(s.title)}</span><button class="delete-btn" title="Delete">✕</button>`;
    el.addEventListener("click", () => loadSession(s.id));
    el.querySelector(".delete-btn").addEventListener("click", (e) => deleteSession(s.id, e));
    dom.chatHistory.appendChild(el);
  });
}

// ── Markdown renderer (lightweight) ──────────────────────────
function renderMarkdown(text) {
  let html = escHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || "text";
    const id = "cb_" + Math.random().toString(36).slice(2);
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${escHtml(language)}</span>
        <button class="copy-btn" onclick="window.naxsora.copyCode('${id}')">📋 Copy</button>
      </div>
      <pre id="${id}"><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold / Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  // Unordered list
  html = html.replace(/^(\s*[-*+] .+(?:\n\s*[-*+] .+)*)/gm, (block) => {
    const items = block.split("\n").map((l) => `<li>${l.replace(/^\s*[-*+] /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });

  // Ordered list
  html = html.replace(/^(\s*\d+\. .+(?:\n\s*\d+\. .+)*)/gm, (block) => {
    const items = block.split("\n").map((l) => `<li>${l.replace(/^\s*\d+\. /, "")}</li>`).join("");
    return `<ol>${items}</ol>`;
  });

  // Paragraphs — wrap remaining lines
  html = html.replace(/^(?!<[houbl]|<block|<hr|<div|<pre)(.+)$/gm, "<p>$1</p>");

  // Clean up
  html = html.replace(/(<\/p>)(\s*<p>)/g, "$1$2");
  html = html.replace(/\n{2,}/g, "\n");

  return html;
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Render Message ────────────────────────────────────────────
function renderMessage(msg) {
  const row = document.createElement("div");
  row.className = `message-row ${msg.role}`;
  row.dataset.id = msg.id;

  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isUser = msg.role === "user";

  let bodyContent = "";
  if (msg.imageUrl) {
    bodyContent = `<div class="generated-image-wrap">
      <img class="generated-image" src="${msg.imageUrl}" alt="Generated" onclick="window.naxsora.openLightbox('${msg.imageUrl}')" loading="lazy">
      <div class="image-actions">
        <button class="image-action-btn" onclick="window.naxsora.downloadImage('${msg.imageUrl}', 'naxsora-image.jpg')">⬇️ Download</button>
        <button class="image-action-btn" onclick="window.naxsora.openLightbox('${msg.imageUrl}')">🔍 Fullscreen</button>
      </div>
    </div>`;
  } else if (msg.imageGenerating) {
    bodyContent = `<div class="image-generating"><div class="spin"></div> Generating image — please wait…</div>`;
  } else {
    bodyContent = `<div class="message-body md-content">${renderMarkdown(msg.content)}</div>`;
  }

  row.innerHTML = `
    <div class="message-inner">
      <div class="avatar ${msg.role}">${isUser ? "👤" : "✦"}</div>
      <div class="message-content">
        <div class="message-meta">
          <span class="message-sender">${isUser ? "You" : NAXSORA_CONFIG.APP_NAME}</span>
          <span class="message-time">${time}</span>
        </div>
        ${bodyContent}
        ${msg.attachedFile ? `<div style="margin-top:6px;font-size:0.75rem;color:var(--text-muted)">📎 ${escHtml(msg.attachedFile)}</div>` : ""}
        <div class="message-actions">
          ${!isUser ? `<button class="msg-action-btn" onclick="window.naxsora.copyMsg('${msg.id}')">📋 Copy</button>` : ""}
          <button class="msg-action-btn" onclick="window.naxsora.deleteMsg('${msg.id}')">🗑️ Delete</button>
        </div>
      </div>
    </div>`;

  dom.messages.appendChild(row);
  return row;
}

function updateMessageContent(msgId, content, isStream = false) {
  const row = dom.messages.querySelector(`[data-id="${msgId}"]`);
  if (!row) return;
  const body = row.querySelector(".md-content");
  if (body) body.innerHTML = renderMarkdown(content);
}

function setMessageImage(msgId, imageUrl) {
  const row = dom.messages.querySelector(`[data-id="${msgId}"]`);
  if (!row) return;
  const wrap = row.querySelector(".generated-image-wrap") || row.querySelector(".image-generating");
  if (wrap) {
    wrap.outerHTML = `<div class="generated-image-wrap">
      <img class="generated-image" src="${imageUrl}" alt="Generated" onclick="window.naxsora.openLightbox('${imageUrl}')" loading="lazy">
      <div class="image-actions">
        <button class="image-action-btn" onclick="window.naxsora.downloadImage('${imageUrl}', 'naxsora-image.jpg')">⬇️ Download</button>
        <button class="image-action-btn" onclick="window.naxsora.openLightbox('${imageUrl}')">🔍 Fullscreen</button>
      </div>
    </div>`;
  }
}

// ── Send Message ──────────────────────────────────────────────
async function sendMessage() {
  const text = dom.userInput.value.trim();
  const file = state.attachedFile;
  if (!text && !file) return;
  if (state.isGenerating) return;

  // Ensure session
  if (!state.currentId) {
    const session = createSession(text);
    state.currentId = session.id;
    dom.welcome.style.display = "none";
    dom.messages.style.display = "flex";
  }

  const session = getCurrentSession();
  dom.userInput.value = "";
  autoResize();
  clearAttachment();
  state.isGenerating = true;
  dom.sendBtn.disabled = true;

  // User message
  const userMsg = {
    id: "msg_" + Date.now(),
    role: "user",
    content: text,
    timestamp: Date.now(),
    attachedFile: file ? file.name : null,
  };
  session.messages.push(userMsg);
  renderMessage(userMsg);
  scrollBottom();

  // Check for image generation request
  const imgKeywords = /^(generate|create|draw|make|design|paint|imagine|show me)\s+(an?\s+)?(image|picture|photo|illustration|art|artwork|portrait|painting)/i;
  const isImgRequest = imgKeywords.test(text);

  // Typing indicator
  const aiMsg = {
    id: "msg_" + (Date.now() + 1),
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    imageGenerating: isImgRequest,
  };
  session.messages.push(aiMsg);
  const aiRow = renderMessage(aiMsg);
  scrollBottom();

  if (isImgRequest) {
    // Extract prompt from text
    const prompt = text.replace(/^(generate|create|draw|make|design|paint|imagine|show me)\s+(an?\s+)?/i, "").replace(/(image|picture|photo|illustration|art|artwork|portrait|painting)\s*(of\s*)?/i, "").trim() || text;

    try {
      const imageUrl = await generateImage(prompt);
      // Pre-load
      const img = new Image();
      img.onload = () => {
        aiMsg.content = `Here is your generated image for: *${prompt}*`;
        aiMsg.imageUrl = imageUrl;
        aiMsg.imageGenerating = false;
        setMessageImage(aiMsg.id, imageUrl);
        saveSessions();
      };
      img.onerror = () => {
        aiMsg.content = "Sorry, the image couldn't be generated. Please try a different prompt.";
        aiMsg.imageGenerating = false;
        updateMessageContent(aiMsg.id, aiMsg.content);
        saveSessions();
      };
      img.src = imageUrl;
    } catch (err) {
      aiMsg.content = "Image generation failed: " + err.message;
      aiMsg.imageGenerating = false;
      updateMessageContent(aiMsg.id, aiMsg.content);
    }

    state.isGenerating = false;
    dom.sendBtn.disabled = false;
    saveSessions();
    return;
  }

  // AI chat message
  const history = session.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content || " " }));

  const onChunk = (_, full) => {
    aiMsg.content = full;
    // Check for inline image request from AI
    const imgMatch = full.match(/\[IMAGE_REQUEST:\s*(.+?)\]/s);
    if (imgMatch) {
      aiMsg.content = full.replace(/\[IMAGE_REQUEST:.+?\]/s, "").trim() + "\n\n*Generating image…*";
    }
    updateMessageContent(aiMsg.id, aiMsg.content);
    scrollBottom();
  };

  const onDone = async (full) => {
    const imgMatch = full.match(/\[IMAGE_REQUEST:\s*(.+?)\]/s);
    if (imgMatch) {
      const prompt = imgMatch[1].trim();
      aiMsg.content = full.replace(/\[IMAGE_REQUEST:.+?\]/s, "").trim();
      updateMessageContent(aiMsg.id, aiMsg.content);

      // Insert image generating placeholder
      const imgMsgId = aiMsg.id + "_img";
      const imgMsg = {
        id: imgMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        imageGenerating: true,
      };
      session.messages.push(imgMsg);
      renderMessage(imgMsg);
      scrollBottom();

      const imageUrl = await generateImage(prompt);
      const img = new Image();
      img.onload = () => {
        imgMsg.imageUrl = imageUrl;
        imgMsg.imageGenerating = false;
        setMessageImage(imgMsgId, imageUrl);
        saveSessions();
      };
      img.src = imageUrl;
    }

    aiMsg.content = full.replace(/\[IMAGE_REQUEST:.+?\]/s, "").trim();
    saveSessions();
    state.isGenerating = false;
    dom.sendBtn.disabled = false;

    // Update session title from first message
    if (session.messages.filter((m) => m.role === "user").length === 1) {
      session.title = (text || "New conversation").slice(0, 50);
      renderSidebar();
    }
  };

  const onError = (err) => {
    aiMsg.content = `⚠️ **Error:** ${err}\n\nPlease check your API key in Settings and try again.`;
    updateMessageContent(aiMsg.id, aiMsg.content);
    state.isGenerating = false;
    dom.sendBtn.disabled = false;
    saveSessions();
  };

  if (file) {
    await sendMessageWithFile(history, file, text, onChunk, onDone, onError);
  } else {
    await sendChatMessage([...history, { role: "user", content: text }], onChunk, onDone, onError);
  }
}

// ── File Attachment ───────────────────────────────────────────
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  state.attachedFile = file;

  let preview = `<span>📄</span>`;
  if (file.type.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    preview = `<img src="${url}" alt="">`;
  }

  dom.filePreviewContent.innerHTML = `
    <div class="file-chip">
      ${preview}
      <span>${escHtml(file.name)}</span>
      <button class="file-chip-remove" onclick="window.naxsora.clearAttachment()">✕</button>
    </div>`;
  dom.filePreviewBar.classList.add("show");
  dom.userInput.focus();
  e.target.value = "";
}

function clearAttachment() {
  state.attachedFile = null;
  dom.filePreviewBar.classList.remove("show");
  dom.filePreviewContent.innerHTML = "";
}

// ── Auto-resize textarea ─────────────────────────────────────
function autoResize() {
  dom.userInput.style.height = "auto";
  dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 180) + "px";
}

// ── Scroll ────────────────────────────────────────────────────
function scrollBottom(smooth = true) {
  requestAnimationFrame(() => {
    dom.chatContainer.scrollTo({ top: dom.chatContainer.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  });
}

// ── Settings ──────────────────────────────────────────────────
function loadSettingsUI() {
  const apiInput = $("setting-api-key");
  const modelSelect = $("setting-model");
  const streamToggle = $("toggle-streaming");
  const themeToggle = $("toggle-theme-setting");

  if (apiInput) apiInput.value = state.settings.apiKey !== "YOUR_ANTHROPIC_API_KEY_HERE" ? state.settings.apiKey : "";
  if (modelSelect) modelSelect.value = state.settings.model;
  if (streamToggle) streamToggle.classList.toggle("on", state.settings.streaming);
  if (themeToggle) themeToggle.classList.toggle("on", state.settings.theme === "dark");

  if (dom.modelBadge) dom.modelBadge.textContent = state.settings.model.includes("opus") ? "Claude Opus 4" : "Claude Sonnet 4";
}

function saveSettingsFromUI() {
  const apiInput = $("setting-api-key");
  const modelSelect = $("setting-model");

  if (apiInput && apiInput.value.trim()) {
    state.settings.apiKey = apiInput.value.trim();
    NAXSORA_CONFIG.ANTHROPIC_API_KEY = state.settings.apiKey;
  }
  if (modelSelect) {
    state.settings.model = modelSelect.value;
    NAXSORA_CONFIG.ANTHROPIC_MODEL = state.settings.model;
  }
  saveSettings();
  loadSettingsUI();
  closeModal("settings-modal");
  showToast("✅ Settings saved!");
}

function saveSettings() {
  localStorage.setItem("naxsora_settings", JSON.stringify(state.settings));
}

function saveSessions() {
  const trimmed = state.sessions.map((s) => ({
    ...s,
    messages: s.messages.slice(-NAXSORA_CONFIG.MAX_HISTORY_MESSAGES),
  }));
  try {
    localStorage.setItem("naxsora_sessions", JSON.stringify(trimmed));
  } catch (_) {}
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(id) {
  const el = $(id);
  if (el) el.classList.add("open");
}
function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove("open");
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  dom.toast.textContent = msg;
  dom.toast.classList.add("show");
  setTimeout(() => dom.toast.classList.remove("show"), duration);
}

// ── Lightbox ──────────────────────────────────────────────────
function openLightbox(src) {
  dom.lightboxImg.src = src;
  dom.lightbox.classList.add("open");
}

function closeLightbox() {
  dom.lightbox.classList.remove("open");
}

// ── Sidebar Mobile ────────────────────────────────────────────
function openSidebar() {
  dom.sidebar.classList.add("open");
  dom.sidebarOverlay.classList.add("show");
}

function closeSidebar() {
  dom.sidebar.classList.remove("open");
  dom.sidebarOverlay.classList.remove("show");
}

// ── Global exposed functions (called from inline HTML) ────────
window.naxsora = {
  copyCode: (id) => {
    const el = $(id);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent).then(() => showToast("📋 Copied!"));
  },
  copyMsg: (id) => {
    const session = getCurrentSession();
    const msg = session?.messages.find((m) => m.id === id);
    if (msg) navigator.clipboard.writeText(msg.content).then(() => showToast("📋 Copied!"));
  },
  deleteMsg: (id) => {
    const session = getCurrentSession();
    if (!session) return;
    session.messages = session.messages.filter((m) => m.id !== id);
    const row = dom.messages.querySelector(`[data-id="${id}"]`);
    if (row) row.remove();
    saveSessions();
  },
  openLightbox,
  downloadImage: (url, name) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  },
  clearAttachment,
  logout: async () => {
    if (confirm("Sign out of Naxsora AI?")) await signOut();
  },
  useSuggestion: (text) => {
    dom.userInput.value = text;
    dom.userInput.focus();
    autoResize();
  },
};

// ── Event Bindings ────────────────────────────────────────────
function bindEvents() {
  // Send
  $("send-btn").addEventListener("click", sendMessage);
  dom.userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  dom.userInput.addEventListener("input", autoResize);

  // Sidebar toggle
  $("sidebar-toggle").addEventListener("click", () => {
    if (window.innerWidth <= 768) openSidebar();
    else dom.sidebar.style.display = dom.sidebar.style.display === "none" ? "" : (dom.sidebar.style.display = "none");
  });
  dom.sidebarOverlay.addEventListener("click", closeSidebar);

  // New chat
  $("btn-new-chat").addEventListener("click", () => {
    showWelcome();
    closeSidebar();
  });

  // File upload
  $("attach-btn").addEventListener("click", () => dom.fileInput.click());
  dom.fileInput.addEventListener("change", handleFileSelect);

  // Drag & drop on chat
  dom.chatContainer.addEventListener("dragover", (e) => e.preventDefault());
  dom.chatContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      state.attachedFile = file;
      const fakeEvent = { target: { files: [file], value: "" } };
      handleFileSelect(fakeEvent);
    }
  });

  // Theme
  $("theme-toggle").addEventListener("click", toggleTheme);

  // Settings
  $("settings-btn").addEventListener("click", () => { loadSettingsUI(); openModal("settings-modal"); });
  $("close-settings").addEventListener("click", () => closeModal("settings-modal"));
  $("save-settings").addEventListener("click", saveSettingsFromUI);
  $("settings-modal").addEventListener("click", (e) => { if (e.target === $("settings-modal")) closeModal("settings-modal"); });

  // Toggles in settings
  $("toggle-streaming").addEventListener("click", function() {
    state.settings.streaming = !state.settings.streaming;
    NAXSORA_CONFIG.STREAM_RESPONSES = state.settings.streaming;
    this.classList.toggle("on", state.settings.streaming);
    saveSettings();
  });
  $("toggle-theme-setting").addEventListener("click", function() {
    const isDark = state.settings.theme !== "dark";
    applyTheme(isDark ? "dark" : "light");
    this.classList.toggle("on", isDark);
  });

  // Lightbox close
  dom.lightbox.addEventListener("click", closeLightbox);

  // Clear all
  $("btn-clear-all").addEventListener("click", () => {
    if (confirm("Delete all chat history?")) {
      state.sessions = [];
      state.currentId = null;
      saveSessions();
      renderSidebar();
      showWelcome();
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal("settings-modal");
      closeLightbox();
      closeSidebar();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      showWelcome();
    }
  });
}

// ── Start ────────────────────────────────────────────────────
init();
