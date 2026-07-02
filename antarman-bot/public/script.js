/**
 * ============================================================
 *  AntarMan (अंतर्मन) — Frontend State Engine
 * ============================================================
 *  Responsibilities:
 *   - DOM orchestration & event handling
 *   - In-memory conversation history (mirrors backend format)
 *   - XSS-safe rendering pipeline
 *   - Vanilla Markdown → HTML parser (no external libraries)
 *   - Async communication with the /api/chat proxy
 * ============================================================
 */

"use strict";

// ------------------------------------------------------------
// 1. DOM SELECTIONS
// ------------------------------------------------------------
const chatContainer = document.getElementById("chat-container");
const chatList = document.getElementById("chat-list");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");

// ------------------------------------------------------------
// 2. STATE MANAGEMENT
// ------------------------------------------------------------
/**
 * Mirrors the structural format required by the backend proxy:
 *   [{ role: "user" | "model", parts: [{ text: "..." }] }, ...]
 */
let chatHistory = [];

/** True while a request is in flight — freezes the input. */
let isGenerating = false;

const WELCOME_MESSAGE =
  "Namaste 🙏 Main **AntarMan** hoon — aapki apni aantarik awaaz.\n\n" +
  "Aap mujhse kisi bhi bhasha mein baat kar sakte hain:\n" +
  "- **English** — professional and precise\n" +
  "- **हिंदी** — शुद्ध देवनागरी में\n" +
  "- **Hinglish** — bilkul WhatsApp waale andaaz mein\n\n" +
  "Padhai ho, career ho, ya mann ki koi bhi baat — main sunne ke liye yahin hoon. " +
  "Boliye, aaj kya chal raha hai aapke mann mein?";

// ------------------------------------------------------------
// 3. XSS-SAFE HTML ESCAPING
// ------------------------------------------------------------
/**
 * Escapes raw text so it can never be interpreted as HTML.
 * This runs BEFORE the markdown parser, so any tags the user
 * (or the model) emits are rendered as literal text.
 */
function escapeHTML(rawText) {
  return String(rawText)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ------------------------------------------------------------
// 4. VANILLA MARKDOWN PARSER
// ------------------------------------------------------------
/**
 * Converts inline markdown tokens inside a single (already
 * HTML-escaped) line into semantic HTML.
 *   `code`        → <code>
 *   **bold**      → <strong>
 *   *italic*      → <em>
 *   _italic_      → <em>
 */
function parseInlineMarkdown(escapedLine) {
  let html = escapedLine;

  // Inline code first, so tokens inside backticks are preserved.
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Bold: **text**
  html = html.replace(/\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* (single asterisks that are not part of bold)
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

  // Italic: _text_
  html = html.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?;:])/g, "$1<em>$2</em>");

  return html;
}

/**
 * Converts a full markdown string into semantic HTML blocks.
 * Handles: headings, unordered lists (- or *), ordered lists
 * (1. 2. 3.), paragraphs, and line breaks — all XSS-safe
 * because every line is escaped before any HTML is generated.
 */
function parseMarkdown(rawText) {
  const lines = String(rawText).replace(/\r\n/g, "\n").split("\n");
  const htmlParts = [];

  let listBuffer = [];
  let listType = null; // "ul" | "ol" | null
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const paragraphHTML = paragraphBuffer
        .map((line) => parseInlineMarkdown(escapeHTML(line)))
        .join("<br>");
      htmlParts.push("<p>" + paragraphHTML + "</p>");
      paragraphBuffer = [];
    }
  }

  function flushList() {
    if (listBuffer.length > 0 && listType) {
      const items = listBuffer
        .map((item) => "<li>" + parseInlineMarkdown(escapeHTML(item)) + "</li>")
        .join("");
      htmlParts.push("<" + listType + ">" + items + "</" + listType + ">");
      listBuffer = [];
      listType = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Blank line → close any open blocks
    if (trimmed === "") {
      flushList();
      flushParagraph();
      continue;
    }

    // Headings: #, ##, ###
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length;
      const content = parseInlineMarkdown(escapeHTML(headingMatch[2]));
      htmlParts.push("<h" + level + ">" + content + "</h" + level + ">");
      continue;
    }

    // Unordered list items: "- item" or "* item"
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listBuffer.push(ulMatch[1]);
      continue;
    }

    // Ordered list items: "1. item", "2. item" …
    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listBuffer.push(olMatch[1]);
      continue;
    }

    // Regular paragraph line
    flushList();
    paragraphBuffer.push(trimmed);
  }

  // Close any blocks still open at the end
  flushList();
  flushParagraph();

  return htmlParts.join("");
}

// ------------------------------------------------------------
// 5. MESSAGE RENDERING PIPELINE
// ------------------------------------------------------------
/**
 * Appends a chat bubble to the DOM.
 * @param {"user"|"model"} role  Who sent the message.
 * @param {string} text          Raw message text (markdown allowed).
 * @returns {HTMLElement}        The created bubble wrapper.
 */
function appendBubble(role, text) {
  const isUser = role === "user";

  // Remove the "active" rim light from the previous AI bubble
  const previousActive = chatList.querySelector(".bubble-active");
  if (previousActive) {
    previousActive.classList.remove("bubble-active");
  }

  const wrapper = document.createElement("div");
  wrapper.className =
    "bubble-enter flex w-full " + (isUser ? "justify-end" : "justify-start");

  const bubble = document.createElement("div");
  bubble.className = isUser
    ? "bubble-user max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md border border-amber-700/40 " +
      "bg-gradient-to-br from-amber-600/25 to-red-900/30 px-4 py-3 text-sm sm:text-base text-neutral-100 shadow-lg"
    : "bubble-ai bubble-active max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md border border-neutral-800 " +
      "bg-neutral-900 px-4 py-3 text-sm sm:text-base text-neutral-200 shadow-lg";

  const label = document.createElement("div");
  label.className = isUser
    ? "mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-300/80"
    : "mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-500/90";
  label.textContent = isUser ? "You / आप" : "AntarMan / अंतर्मन";

  const content = document.createElement("div");
  content.className = "bubble-content";
  // Safe: parseMarkdown escapes ALL raw text before generating HTML.
  content.innerHTML = parseMarkdown(text);

  bubble.appendChild(label);
  bubble.appendChild(content);
  wrapper.appendChild(bubble);
  chatList.appendChild(wrapper);

  scrollToLatest();
  return wrapper;
}

/**
 * Appends the pulsing 3-dot typing indicator bubble.
 * @returns {HTMLElement} The indicator wrapper (for later removal).
 */
function appendTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.id = "typing-bubble";
  wrapper.className = "bubble-enter flex w-full justify-start";

  const bubble = document.createElement("div");
  bubble.className =
    "bubble-ai bubble-active rounded-2xl rounded-bl-md border border-neutral-800 " +
    "bg-neutral-900 px-4 py-3 shadow-lg";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.setAttribute("aria-label", "AntarMan is typing");

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "dot";
    indicator.appendChild(dot);
  }

  bubble.appendChild(indicator);
  wrapper.appendChild(bubble);
  chatList.appendChild(wrapper);

  scrollToLatest();
  return wrapper;
}

/** Removes the typing indicator, if present. */
function removeTypingIndicator() {
  const indicator = document.getElementById("typing-bubble");
  if (indicator) {
    indicator.remove();
  }
}

/** Smoothly scrolls the chat view to the newest message. */
function scrollToLatest() {
  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: "smooth",
  });
}

// ------------------------------------------------------------
// 6. INPUT FREEZE / THAW
// ------------------------------------------------------------
function freezeInput() {
  isGenerating = true;
  userInput.disabled = true;
  sendBtn.disabled = true;
}

function thawInput() {
  isGenerating = false;
  userInput.disabled = false;
  sendBtn.disabled = false;
  userInput.focus();
}

// ------------------------------------------------------------
// 7. ASYNCHRONOUS NETWORK LOGIC
// ------------------------------------------------------------
async function sendMessageToServer(messageText) {
  // Step 1: Freeze input & show the typing indicator
  freezeInput();
  appendTypingIndicator();

  try {
    // Step 2: POST the message + full history to the secure proxy
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageText,
        history: chatHistory,
      }),
    });

    // Step 3: Validate the network response
    const data = await response.json().catch(() => ({}));

    // Step 4: Remove the typing indicator
    removeTypingIndicator();

    if (!response.ok || typeof data.reply !== "string") {
      const errorMessage =
        (data && typeof data.error === "string" && data.error) ||
        "Kshama kijiye 🙏 — kuch takneeki samasya aa gayi hai. Kripya thodi der baad phir prayas karein.";
      appendBubble("model", errorMessage);
      return;
    }

    // Step 5: Print the response into a new chat bubble
    appendBubble("model", data.reply);

    // Step 6: Push BOTH turns into the local history array
    chatHistory.push({ role: "user", parts: [{ text: messageText }] });
    chatHistory.push({ role: "model", parts: [{ text: data.reply }] });

    // Step 7: Anchor the view to the newest message
    scrollToLatest();
  } catch (networkError) {
    removeTypingIndicator();
    appendBubble(
      "model",
      "Lagta hai server se sampark toot gaya hai 🌐 — kripya check kijiye ki " +
        "`node server.js` chal raha hai, phir dobara koshish kijiye."
    );
  } finally {
    thawInput();
  }
}

// ------------------------------------------------------------
// 8. EVENT ORCHESTRATION
// ------------------------------------------------------------
/** Handles a submit from either the button click or the Enter key. */
function handleSubmit() {
  if (isGenerating) return;

  const messageText = userInput.value.trim();
  if (!messageText) return;

  appendBubble("user", messageText);
  userInput.value = "";
  autoResizeTextarea();
  sendMessageToServer(messageText);
}

// Send button click (form submit)
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit();
});

// Enter submits; Shift+Enter inserts a newline
userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
});

// Auto-resize the textarea as the user types (up to a max height)
function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 160) + "px";
}

userInput.addEventListener("input", autoResizeTextarea);

// Clear Conversation History button
clearBtn.addEventListener("click", () => {
  if (isGenerating) return;

  chatHistory = [];
  chatList.innerHTML = "";
  renderWelcomeMessage();
  userInput.focus();
});

// ------------------------------------------------------------
// 9. INITIALIZATION
// ------------------------------------------------------------
function renderWelcomeMessage() {
  appendBubble("model", WELCOME_MESSAGE);
}

renderWelcomeMessage();
autoResizeTextarea();
userInput.focus();
