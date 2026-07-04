/**
 * ============================================================
 *  ANTARMAN AI — Frontend State Engine
 * ============================================================
 *  - Multi-conversation store persisted in localStorage
 *  - Sidebar history (grouped, searchable, rename/delete/pin)
 *  - Collapsible icon rail · settings · sign-in placeholder
 *  - XSS-safe rendering + vanilla markdown parser (preserved)
 *  - Talks to the unchanged POST /api/chat backend:
 *      request:  { message, history:[{role,parts:[{text}]}] }
 *      response: { reply } | { error }
 * ============================================================
 */
"use strict";

/* ---------- DOM ---------- */
const app = document.getElementById("app");
const sidebar = document.getElementById("sidebar");
const scrim = document.getElementById("scrim");
const historyEl = document.getElementById("history");
const searchInput = document.getElementById("search-input");
const messagesEl = document.getElementById("messages");
const heroGreeting = document.getElementById("hero-greeting");
const chipsWrap = document.getElementById("suggestion-chips");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const convTitle = document.getElementById("conv-title");
const modelPillLabel = document.getElementById("model-pill-label");

const newChatBtn = document.getElementById("new-chat-btn");
const topbarNew = document.getElementById("topbar-new");
const collapseBtn = document.getElementById("collapse-btn");
const menuBtn = document.getElementById("menu-btn");

/* Rail */
const railExpand = document.getElementById("rail-expand");
const railNew = document.getElementById("rail-new");
const railSearch = document.getElementById("rail-search");
const railSettings = document.getElementById("rail-settings");
const railProfile = document.getElementById("rail-profile");

/* Composer extras */
const modelPill = document.getElementById("model-pill");
const modelMenu = document.getElementById("model-menu");
const micBtn = document.getElementById("mic-btn");
const attachBtn = document.getElementById("attach-btn");

/* Footer / auth */
const signinBtn = document.getElementById("signin-btn");
const profileRow = document.getElementById("profile-row");
const profileName = document.getElementById("profile-name");
const profileMenuBtn = document.getElementById("profile-menu-btn");
const accountMenu = document.getElementById("account-menu");
const acctSettings = document.getElementById("acct-settings");
const acctSignout = document.getElementById("acct-signout");

const signinScrim = document.getElementById("signin-scrim");
const signinClose = document.getElementById("signin-close");
const signinDemo = document.getElementById("signin-demo");

/* Settings */
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const panelScrim = document.getElementById("panel-scrim");
const panelClose = document.getElementById("panel-close");
const themeSeg = document.getElementById("theme-seg");
const langSeg = document.getElementById("lang-seg");
const sizeSeg = document.getElementById("size-seg");
const clearAllBtn = document.getElementById("clear-all-btn");

const confirmScrim = document.getElementById("confirm-scrim");
const confirmText = document.getElementById("confirm-text");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");

/* ---------- Constants ---------- */
const STORAGE_KEY = "antarman.v2";
const GREETINGS = [
  "What should we focus on?",
  "Aaj hum kis par dhyaan dein?",
  "आज हम किस पर ध्यान दें?",
  "What's on your mind today?",
];
const NAMED_GREETINGS = [
  (n) => `Your move, ${n}.`,
  (n) => `Hi, ${n}. What's on your mind?`,
  (n) => `Namaste ${n} — kis par baat karein?`,
];
const GENERIC_ERROR =
  "Kshama kijiye 🙏 — kuch takneeki samasya aa gayi. Kripya thodi der baad phir prayas kijiye.";
const NETWORK_ERROR =
  "Lagta hai server se sampark toot gaya 🌐 — connection check karke dobara koshish kijiye.";

/* ---------- State ---------- */
let store = {
  conversations: [],
  activeId: null,
  settings: { theme: "system", lang: "auto", size: "comfortable", collapsed: false },
  account: null, // { name } when "signed in"
};
let isGenerating = false;

/* ============================================================
   PERSISTENCE
   ============================================================ */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        store.conversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
        store.activeId = parsed.activeId || null;
        store.settings = Object.assign(store.settings, parsed.settings || {});
        store.account = parsed.account || null;
      }
    }
  } catch (e) {
    /* corrupt storage — start fresh */
  }
  if (store.activeId && !store.conversations.some((c) => c.id === store.activeId)) {
    store.activeId = null;
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    /* storage full or blocked — ignore */
  }
}

/* ---------- Helpers ---------- */
function uid() {
  return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function getActive() {
  return store.conversations.find((c) => c.id === store.activeId) || null;
}
function titleFrom(text) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > 42 ? clean.slice(0, 42).trim() + "…" : clean || "New chat";
}
function langPreface() {
  switch (store.settings.lang) {
    case "english": return "Please reply in English. ";
    case "hindi": return "Please reply in pure Hindi (Devanagari script). ";
    case "hinglish": return "Please reply in Hinglish (Roman script). ";
    default: return "";
  }
}
function prefersReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function scrollToBottom() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: prefersReduced() ? "auto" : "smooth" });
}

/* ============================================================
   XSS-SAFE ESCAPING + VANILLA MARKDOWN PARSER  (preserved)
   ============================================================ */
function escapeHTML(rawText) {
  return String(rawText)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function parseInlineMarkdown(escapedLine) {
  let html = escapedLine;
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?;:])/g, "$1<em>$2</em>");
  return html;
}
function parseMarkdown(rawText) {
  const lines = String(rawText).replace(/\r\n/g, "\n").split("\n");
  const htmlParts = [];
  let listBuffer = [];
  let listType = null;
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const html = paragraphBuffer.map((l) => parseInlineMarkdown(escapeHTML(l))).join("<br>");
      htmlParts.push("<p>" + html + "</p>");
      paragraphBuffer = [];
    }
  }
  function flushList() {
    if (listBuffer.length > 0 && listType) {
      const items = listBuffer.map((i) => "<li>" + parseInlineMarkdown(escapeHTML(i)) + "</li>").join("");
      htmlParts.push("<" + listType + ">" + items + "</" + listType + ">");
      listBuffer = [];
      listType = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") { flushList(); flushParagraph(); continue; }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushList(); flushParagraph();
      const level = heading[1].length;
      htmlParts.push("<h" + level + ">" + parseInlineMarkdown(escapeHTML(heading[2])) + "</h" + level + ">");
      continue;
    }
    const ul = trimmed.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listBuffer.push(ul[1]);
      continue;
    }
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushParagraph();
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listBuffer.push(ol[1]);
      continue;
    }
    flushList();
    paragraphBuffer.push(trimmed);
  }
  flushList();
  flushParagraph();
  return htmlParts.join("");
}

/* ============================================================
   MESSAGE RENDERING
   ============================================================ */
const ICONS = {
  copy: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  regen: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  dots: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6Z"/><path d="M12 16v4"/></svg>',
  unpin: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M9 4h6l-1 6 2.2 2.2M7 13h6M12 16v4"/></svg>',
  rename: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  pinBadge: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M9 3h6l-1 6 3 3H7l3-3-1-6Z"/><rect x="11" y="15" width="2" height="6" rx="1"/></svg>',
};

function avatarNode() {
  const av = document.createElement("div");
  av.className = "msg__avatar";
  av.textContent = "अ";
  av.setAttribute("aria-hidden", "true");
  return av;
}
function toolButton(label, icon, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tool-btn";
  b.innerHTML = icon + "<span>" + label + "</span>";
  b.addEventListener("click", onClick);
  return b;
}
function messageNode(role, text, opts) {
  opts = opts || {};
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "assistant");
  if (role !== "user") wrap.appendChild(avatarNode());

  const col = document.createElement("div");
  col.className = "msg__col";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") {
    bubble.innerHTML = escapeHTML(text).replace(/\n/g, "<br>");
  } else {
    bubble.innerHTML = parseMarkdown(text); // safe: every line escaped before HTML
  }
  if (opts.error) bubble.style.color = "var(--danger)";
  col.appendChild(bubble);

  if (role !== "user" && !opts.error) {
    const tools = document.createElement("div");
    tools.className = "msg__tools";
    tools.appendChild(toolButton("Copy", ICONS.copy, (e) => copyText(text, e.currentTarget)));
    tools.appendChild(toolButton("Regenerate", ICONS.regen, () => regenerateLast()));
    col.appendChild(tools);
  }
  wrap.appendChild(col);
  return wrap;
}
function appendMessageDOM(role, text, opts) {
  messagesEl.appendChild(messageNode(role, text, opts));
}
function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg assistant";
  wrap.id = "typing-msg";
  wrap.appendChild(avatarNode());
  const col = document.createElement("div");
  col.className = "msg__col";
  const t = document.createElement("div");
  t.className = "typing";
  t.setAttribute("aria-label", "AntarMan is typing");
  t.innerHTML = "<span></span><span></span><span></span>";
  col.appendChild(t);
  wrap.appendChild(col);
  messagesEl.appendChild(wrap);
  return wrap;
}
function copyText(text, btn) {
  const done = () => {
    const span = btn.querySelector("span");
    if (span) {
      const old = span.textContent;
      span.textContent = "Copied";
      setTimeout(() => (span.textContent = old), 1400);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(done);
  } else { done(); }
}

/* ============================================================
   THREAD + EMPTY STATE
   ============================================================ */
function pickGreeting() {
  const name = store.account && store.account.name;
  if (name) {
    const fn = NAMED_GREETINGS[Math.floor(Math.random() * NAMED_GREETINGS.length)];
    return fn(name);
  }
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}
function showEmpty() {
  heroGreeting.textContent = pickGreeting();
  app.classList.add("is-empty");
}
function hideEmpty() { app.classList.remove("is-empty"); }
function renderThread() {
  messagesEl.innerHTML = "";
  const conv = getActive();
  if (!conv || conv.messages.length === 0) { showEmpty(); return; }
  hideEmpty();
  conv.messages.forEach((m) => appendMessageDOM(m.role, m.text, { error: m.error }));
  requestAnimationFrame(scrollToBottom);
}
function updateTitle() {
  const conv = getActive();
  convTitle.textContent = conv ? conv.title : "New chat";
}

/* ============================================================
   SIDEBAR HISTORY
   ============================================================ */
function groupConvs(convs) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYest = startToday - 86400000;
  const start7 = startToday - 6 * 86400000;
  const groups = { Pinned: [], Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  convs.forEach((c) => {
    if (c.pinned) { groups.Pinned.push(c); return; }
    const t = c.updatedAt || c.createdAt || 0;
    if (t >= startToday) groups.Today.push(c);
    else if (t >= startYest) groups.Yesterday.push(c);
    else if (t >= start7) groups["Previous 7 days"].push(c);
    else groups.Older.push(c);
  });
  return groups;
}
function historyItem(conv) {
  const item = document.createElement("div");
  item.className = "history__item" + (conv.id === store.activeId ? " active" : "");
  item.dataset.id = conv.id;
  item.setAttribute("role", "button");
  item.tabIndex = 0;

  if (conv.pinned) {
    const pin = document.createElement("span");
    pin.className = "history__pin";
    pin.setAttribute("aria-label", "Pinned");
    pin.innerHTML = ICONS.pinBadge;
    item.appendChild(pin);
  }

  const title = document.createElement("span");
  title.className = "history__title";
  title.textContent = conv.title;
  item.appendChild(title);

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "history__menu";
  menu.setAttribute("aria-label", "Chat options");
  menu.innerHTML = ICONS.dots;
  menu.addEventListener("click", (e) => { e.stopPropagation(); openCtxMenu(e.currentTarget, conv); });
  item.appendChild(menu);

  const select = () => selectConversation(conv.id);
  item.addEventListener("click", select);
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
  });
  return item;
}
function renderSidebar() {
  const q = (searchInput.value || "").trim().toLowerCase();
  let convs = store.conversations.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (q) {
    convs = convs.filter(
      (c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }
  historyEl.innerHTML = "";
  if (convs.length === 0) {
    const e = document.createElement("div");
    e.className = "history__empty";
    e.textContent = q ? "No matching chats." : "No conversations yet.";
    historyEl.appendChild(e);
    return;
  }
  const groups = groupConvs(convs);
  Object.keys(groups).forEach((label) => {
    const list = groups[label];
    if (!list.length) return;
    const gl = document.createElement("div");
    gl.className = "history__group-label";
    gl.textContent = label;
    historyEl.appendChild(gl);
    list.forEach((c) => historyEl.appendChild(historyItem(c)));
  });
}

/* ---------- Context menu (rename / pin / delete) ---------- */
let openCtx = null;
function closeCtxMenu() { if (openCtx) { openCtx.remove(); openCtx = null; } }
function ctxButton(label, icon, cls, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  if (cls) b.className = cls;
  b.innerHTML = icon + "<span>" + label + "</span>";
  b.addEventListener("click", onClick);
  return b;
}
function openCtxMenu(anchor, conv) {
  closeCtxMenu();
  const menu = document.createElement("div");
  menu.className = "ctx";
  menu.appendChild(ctxButton("Rename", ICONS.rename, "", () => { closeCtxMenu(); startRename(conv); }));
  menu.appendChild(ctxButton(conv.pinned ? "Unpin" : "Pin", conv.pinned ? ICONS.unpin : ICONS.pin, "", () => {
    closeCtxMenu();
    conv.pinned = !conv.pinned;
    conv.updatedAt = Date.now();
    save();
    renderSidebar();
  }));
  menu.appendChild(ctxButton("Delete", ICONS.trash, "danger", async () => {
    closeCtxMenu();
    const ok = await confirmDialog('Delete "' + conv.title + '"? This cannot be undone.', "Delete");
    if (ok) deleteConversation(conv.id);
  }));
  document.body.appendChild(menu);

  const r = anchor.getBoundingClientRect();
  const mw = 168;
  menu.style.top = r.bottom + 6 + "px";
  menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8)) + "px";
  openCtx = menu;
}
document.addEventListener("click", (e) => {
  if (openCtx && !openCtx.contains(e.target)) closeCtxMenu();
});

function startRename(conv) {
  if (searchInput.value) { searchInput.value = ""; }
  renderSidebar();
  const target = historyEl.querySelector('.history__item[data-id="' + conv.id + '"]');
  if (!target) return;
  const titleSpan = target.querySelector(".history__title");
  const menuBtnEl = target.querySelector(".history__menu");
  if (menuBtnEl) menuBtnEl.style.display = "none";

  const box = document.createElement("input");
  box.className = "history__rename";
  box.value = conv.title;
  titleSpan.replaceWith(box);
  box.focus();
  box.select();

  const commit = () => {
    const val = box.value.replace(/\s+/g, " ").trim();
    if (val) { conv.title = val; conv.titleSet = true; conv.updatedAt = Date.now(); save(); }
    renderSidebar();
    updateTitle();
  };
  box.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); box.blur(); }
    else if (e.key === "Escape") { box.value = conv.title; box.blur(); }
  });
  box.addEventListener("blur", commit);
  box.addEventListener("click", (e) => e.stopPropagation());
}

/* ============================================================
   CONVERSATION ACTIONS
   ============================================================ */
function ensureActive() {
  let conv = getActive();
  if (!conv) {
    conv = {
      id: uid(), title: "New chat", titleSet: false, pinned: false,
      createdAt: Date.now(), updatedAt: Date.now(), messages: [],
    };
    store.conversations.push(conv);
    store.activeId = conv.id;
  }
  return conv;
}
function newChat() {
  store.activeId = null;
  save();
  renderSidebar();
  renderThread();
  updateTitle();
  closeDrawer();
  input.focus();
}
function selectConversation(id) {
  store.activeId = id;
  save();
  renderSidebar();
  renderThread();
  updateTitle();
  closeDrawer();
}
function deleteConversation(id) {
  store.conversations = store.conversations.filter((c) => c.id !== id);
  if (store.activeId === id) store.activeId = null;
  save();
  renderSidebar();
  renderThread();
  updateTitle();
}

/* ============================================================
   SENDING / RECEIVING
   ============================================================ */
function setComposerBusy(busy) {
  isGenerating = busy;
  input.disabled = busy;
  updateSendState();
  if (!busy) input.focus();
}
function updateSendState() {
  const hasText = input.value.trim().length > 0;
  composer.classList.toggle("has-text", hasText);
  sendBtn.disabled = isGenerating || !hasText;
}
async function callModel(userText, history, conv) {
  const typingEl = appendTyping();
  setComposerBusy(true);
  scrollToBottom();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: langPreface() + userText, history }),
    });
    const data = await res.json().catch(() => ({}));
    typingEl.remove();
    const ok = res.ok && typeof data.reply === "string";
    const text = ok ? data.reply : (data && typeof data.error === "string" ? data.error : GENERIC_ERROR);
    conv.messages.push({ role: "model", text, error: !ok });
    conv.updatedAt = Date.now();
    save();
    renderSidebar();
    appendMessageDOM("model", text, { error: !ok });
    scrollToBottom();
  } catch (err) {
    typingEl.remove();
    conv.messages.push({ role: "model", text: NETWORK_ERROR, error: true });
    save();
    appendMessageDOM("model", NETWORK_ERROR, { error: true });
    scrollToBottom();
  } finally {
    setComposerBusy(false);
  }
}
function sendMessage(text) {
  const conv = ensureActive();
  const history = conv.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  conv.messages.push({ role: "user", text });
  if (!conv.titleSet) { conv.title = titleFrom(text); conv.titleSet = true; }
  conv.updatedAt = Date.now();
  save();
  renderSidebar();
  updateTitle();
  hideEmpty();
  appendMessageDOM("user", text);
  callModel(text, history, conv);
}
function regenerateLast() {
  if (isGenerating) return;
  const conv = getActive();
  if (!conv) return;
  let u = conv.messages.length - 1;
  while (u >= 0 && conv.messages[u].role !== "user") u--;
  if (u < 0) return;
  const userText = conv.messages[u].text;
  const history = conv.messages.slice(0, u).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  conv.messages = conv.messages.slice(0, u + 1);
  conv.updatedAt = Date.now();
  save();
  renderThread();
  callModel(userText, history, conv);
}

/* ============================================================
   SETTINGS
   ============================================================ */
function applySettings() {
  const s = store.settings;
  if (s.theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", s.theme);
  if (s.size === "compact") document.documentElement.setAttribute("data-size", "compact");
  else document.documentElement.removeAttribute("data-size");
  app.classList.toggle("collapsed", !!s.collapsed);
  markSeg(themeSeg, "themeValue", s.theme);
  markSeg(langSeg, "langValue", s.lang);
  markSeg(sizeSeg, "sizeValue", s.size);
}
function markSeg(seg, dataKey, value) {
  seg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset[dataKey] === value));
}
function openSettings() {
  settingsPanel.classList.add("open");
  settingsPanel.setAttribute("aria-hidden", "false");
  panelScrim.classList.add("show");
}
function closeSettings() {
  settingsPanel.classList.remove("open");
  settingsPanel.setAttribute("aria-hidden", "true");
  panelScrim.classList.remove("show");
}

/* ============================================================
   AUTH (placeholder) + ACCOUNT MENU
   ============================================================ */
function renderAccount() {
  const acc = store.account;
  if (acc && acc.name) {
    signinBtn.hidden = true;
    profileRow.hidden = false;
    profileName.textContent = acc.name;
  } else {
    signinBtn.hidden = false;
    profileRow.hidden = true;
  }
}
function openSignin() { signinScrim.classList.add("show"); }
function closeSignin() { signinScrim.classList.remove("show"); }

/* Generic dropdown menu positioning (model + account) */
let openDropdown = null;
function closeDropdown() {
  if (openDropdown) {
    openDropdown.el.hidden = true;
    openDropdown.el.setAttribute("aria-hidden", "true");
    if (openDropdown.trigger) openDropdown.trigger.setAttribute("aria-expanded", "false");
    openDropdown = null;
  }
}
function showDropdown(el, trigger, align) {
  closeDropdown();
  el.hidden = false;
  el.setAttribute("aria-hidden", "false");
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  const r = trigger.getBoundingClientRect();
  const w = el.offsetWidth || 260;
  const h = el.offsetHeight || 120;
  let left = align === "right" ? r.right - w : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.top - h - 8;                        // prefer above
  if (top < 8) top = r.bottom + 8;                // fall below if no room
  el.style.left = left + "px";
  el.style.top = top + "px";
  openDropdown = { el, trigger };
}
document.addEventListener("click", (e) => {
  if (openDropdown && !openDropdown.el.contains(e.target) && !openDropdown.trigger.contains(e.target)) {
    closeDropdown();
  }
});

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
function confirmDialog(message, okLabel) {
  return new Promise((resolve) => {
    confirmText.textContent = message;
    confirmOk.textContent = okLabel || "Delete";
    confirmScrim.classList.add("show");
    const cleanup = () => {
      confirmScrim.classList.remove("show");
      confirmOk.onclick = null;
      confirmCancel.onclick = null;
    };
    confirmOk.onclick = () => { cleanup(); resolve(true); };
    confirmCancel.onclick = () => { cleanup(); resolve(false); };
  });
}

/* ============================================================
   DRAWER / COLLAPSE
   ============================================================ */
function isMobile() { return window.matchMedia("(max-width: 840px)").matches; }
function openDrawer() { app.classList.add("drawer-open"); scrim.classList.add("show"); }
function closeDrawer() { app.classList.remove("drawer-open"); scrim.classList.remove("show"); }
function toggleSidebar() {
  if (isMobile()) {
    app.classList.contains("drawer-open") ? closeDrawer() : openDrawer();
  } else {
    store.settings.collapsed = !store.settings.collapsed;
    app.classList.toggle("collapsed", store.settings.collapsed);
    save();
  }
}
function expandSidebar() {
  store.settings.collapsed = false;
  app.classList.remove("collapsed");
  save();
}

/* ============================================================
   COMPOSER
   ============================================================ */
function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 184) + "px";
}
function submitFromInput() {
  if (isGenerating) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  autoResize();
  updateSendState();
  sendMessage(text);
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
composer.addEventListener("submit", (e) => { e.preventDefault(); submitFromInput(); });
input.addEventListener("input", () => { autoResize(); updateSendState(); });
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFromInput(); }
});

newChatBtn.addEventListener("click", newChat);
topbarNew.addEventListener("click", newChat);
document.getElementById("brand-home").addEventListener("click", (e) => { e.preventDefault(); newChat(); });

collapseBtn.addEventListener("click", toggleSidebar);
menuBtn.addEventListener("click", toggleSidebar);
scrim.addEventListener("click", closeDrawer);

/* Rail */
railExpand.addEventListener("click", expandSidebar);
railNew.addEventListener("click", () => { expandSidebar(); newChat(); });
railSearch.addEventListener("click", () => { expandSidebar(); setTimeout(() => searchInput.focus(), 60); });
railSettings.addEventListener("click", openSettings);
railProfile.addEventListener("click", () => { if (store.account) openAccountMenu(railProfile); else openSignin(); });

searchInput.addEventListener("input", renderSidebar);

convTitle.addEventListener("click", () => {
  const conv = getActive();
  if (conv) startRename(conv);
});

chipsWrap.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.textContent;
    autoResize();
    updateSendState();
    input.focus();
  });
});

/* Composer placeholder buttons */
attachBtn.addEventListener("click", () => input.focus());
micBtn.addEventListener("click", () => input.focus());

/* Model selector */
modelPill.addEventListener("click", (e) => {
  e.stopPropagation();
  if (openDropdown && openDropdown.el === modelMenu) { closeDropdown(); return; }
  showDropdown(modelMenu, modelPill, "left");
});
modelMenu.querySelectorAll("[data-model]").forEach((btn) => {
  btn.addEventListener("click", () => {
    modelMenu.querySelectorAll(".menu__item").forEach((b) => b.classList.remove("is-checked"));
    btn.classList.add("is-checked");
    modelPillLabel.textContent = btn.dataset.model;
    closeDropdown();
  });
});

/* Auth */
signinBtn.addEventListener("click", openSignin);
signinClose.addEventListener("click", closeSignin);
signinScrim.addEventListener("click", (e) => { if (e.target === signinScrim) closeSignin(); });
signinDemo.addEventListener("click", () => {
  store.account = { name: "Friend" };
  save();
  renderAccount();
  closeSignin();
  if (app.classList.contains("is-empty")) heroGreeting.textContent = pickGreeting();
});
function openAccountMenu(trigger) {
  showDropdown(accountMenu, trigger, "left");
}
profileMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (openDropdown && openDropdown.el === accountMenu) { closeDropdown(); return; }
  openAccountMenu(profileMenuBtn);
});
acctSettings.addEventListener("click", () => { closeDropdown(); openSettings(); });
acctSignout.addEventListener("click", () => {
  closeDropdown();
  store.account = null;
  save();
  renderAccount();
  if (app.classList.contains("is-empty")) heroGreeting.textContent = pickGreeting();
});

/* Settings */
settingsBtn.addEventListener("click", openSettings);
panelClose.addEventListener("click", closeSettings);
panelScrim.addEventListener("click", closeSettings);

themeSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-theme-value]");
  if (!b) return;
  store.settings.theme = b.dataset.themeValue;
  save(); applySettings();
});
langSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-lang-value]");
  if (!b) return;
  store.settings.lang = b.dataset.langValue;
  save(); applySettings();
});
sizeSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-size-value]");
  if (!b) return;
  store.settings.size = b.dataset.sizeValue;
  save(); applySettings();
});
clearAllBtn.addEventListener("click", async () => {
  const ok = await confirmDialog("Clear all conversations? This cannot be undone.", "Clear all");
  if (!ok) return;
  store.conversations = [];
  store.activeId = null;
  save();
  renderSidebar();
  renderThread();
  updateTitle();
  closeSettings();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCtxMenu();
    closeDropdown();
    if (signinScrim.classList.contains("show")) closeSignin();
    if (settingsPanel.classList.contains("open")) closeSettings();
    if (app.classList.contains("drawer-open")) closeDrawer();
  }
});
window.addEventListener("resize", () => { closeDropdown(); closeCtxMenu(); });

/* ============================================================
   MODEL PILL (from /api/health) — informational only
   ============================================================ */
function prettyModel(name) {
  if (!name) return "AntarMan";
  const n = String(name).toLowerCase();
  if (n.includes("llama-3.3-70b")) return "Llama 3.3 70B";
  if (n.includes("llama-3.1-8b")) return "Llama 3.1 8B";
  if (n.includes("qwen3-32b")) return "Qwen3 32B";
  if (n.includes("gemini")) return "Gemini";
  return name.split("/").pop();
}
async function loadModelPill() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.model) {
      const pretty = prettyModel(data.model);
      modelPillLabel.textContent = pretty;
      modelPill.title = "Model: " + data.model + " · Provider: " + (data.provider || "");
    }
  } catch (e) { /* keep default "AntarMan" */ }
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  load();
  applySettings();
  renderAccount();
  renderSidebar();
  renderThread();
  updateTitle();
  autoResize();
  updateSendState();
  loadModelPill();
  if (!isMobile()) input.focus();
}
init();
