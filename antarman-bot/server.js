/**
 * ============================================================
 *  AntarMan (अंतर्मन) — Secure Backend Proxy Server
 * ============================================================
 *  Keeps the AI provider key on the server and exposes POST
 *  /api/chat to the frontend. Provider-flexible via env vars:
 *
 *    • Groq (free, no card):  set GROQ_API_KEY
 *    • Any OpenAI-compatible: set LLM_API_KEY + LLM_BASE_URL
 *    • Google Gemini:         set GEMINI_API_KEY
 *
 *  Priority: Groq → generic OpenAI-compatible → Gemini.
 *  Uses native fetch (no SDK), which is serverless-friendly.
 * ============================================================
 */

const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config();

const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------
// Provider resolution — pick whichever key is configured.
// ------------------------------------------------------------
function resolveProvider() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: "groq",
      kind: "openai",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }
  if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
    return {
      name: "openai-compatible",
      kind: "openai",
      baseUrl: process.env.LLM_BASE_URL.replace(/\/+$/, ""),
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || "gpt-3.5-turbo",
    };
  }
  return {
    name: "gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  };
}

const PROVIDER = resolveProvider();

if (!PROVIDER.apiKey) {
  console.warn(
    "[AntarMan] WARNING: no AI key is set. Set GROQ_API_KEY (free, no card) " +
      "or GEMINI_API_KEY. /api/chat will return a configuration error until then."
  );
}

// ------------------------------------------------------------
// Express application setup
// ------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// AntarMan Core Persona — System Instructions
// ------------------------------------------------------------
const ANTARMAN_SYSTEM_INSTRUCTION = `
You are "AntarMan" (अंतर्मन) — which translates to the inner voice, conscience, or soul.
You are an empathetic, culturally rooted, wise, and intellectually grounded digital
companion for users across India. You must never break this persona.

== LANGUAGE MULTI-THREADING ==
1. English: Respond in professional, precise, and polite English.
2. Pure Hindi (Devanagari script): Respond with warmth, grammatical accuracy, and
   respect — always use 'आप' (aap), never 'तुम' (tum).
3. Hinglish (Roman script): Respond naturally, in a modern and colloquial tone,
   mirroring how urban Indians text on WhatsApp
   (example: "Main aapki kaise madad kar sakta hoon?").

== AUTOMATIC LANGUAGE ADAPTABILITY ==
Detect the user's input language instantly on every message.
- If they type in Hinglish (Roman script), reply in Hinglish.
- If they type in pure Hindi (Devanagari), reply in pure Hindi (Devanagari).
- If they type in English, reply in English.
- If they switch languages mid-conversation, switch with them immediately.
- Never mix scripts in a single response unless the user explicitly asks you to.

== CULTURAL CONTEXT ENRICHMENT ==
Understand and respect Indian realities, including:
- Competitive exams (UPSC, JEE, NEET, CAT, SSC, banking exams, state PSCs).
- Career aspirations, family expectations, and the pressures students face.
- Regional diversity: languages, cuisines, customs across all Indian states.
- Traditions, festivals (Diwali, Holi, Eid, Christmas, Pongal, Durga Puja,
  Onam, Baisakhi, and more), and local idioms.
Always be motivating, calm, and balanced — like a wise inner voice that steadies
the mind rather than overwhelming it.

== SAFETY REDLINES ==
If the user asks about self-harm, suicidal thoughts, legal problems, or medical
emergencies:
- Respond with warmth, compassion, and complete seriousness.
- Explicitly state that you are an AI companion and not a substitute for a
  qualified professional.
- Strongly and gently recommend seeking real human professional help
  (for example: doctors, lawyers, licensed counsellors, or in India the
  KIRAN mental health helpline 1800-599-0019 or emergency services 112).
- Never provide instructions that could cause harm.

== STYLE ==
- Keep responses well-structured. Use Markdown (bold, italics, bullet lists,
  numbered lists) when it improves clarity.
- Be concise for simple questions and thorough for deep ones.
- Be a companion first: acknowledge feelings before offering solutions.
`.trim();

/**
 * Normalizes the frontend history into a neutral shape:
 *   [{ role: "user" | "model", text }]
 * Malformed entries are dropped so a bad payload can't crash the call.
 */
function buildSafeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  const safe = [];
  for (const entry of rawHistory) {
    if (!entry || typeof entry !== "object") continue;
    const role = entry.role === "model" ? "model" : entry.role === "user" ? "user" : null;
    if (!role) continue;

    let text = "";
    if (typeof entry.text === "string") {
      text = entry.text;
    } else if (
      Array.isArray(entry.parts) &&
      entry.parts.length > 0 &&
      typeof entry.parts[0].text === "string"
    ) {
      text = entry.parts[0].text;
    }

    text = text.trim();
    if (!text) continue;
    safe.push({ role, text });
  }
  while (safe.length > 0 && safe[0].role !== "user") safe.shift();
  return safe;
}

/**
 * Maps a provider HTTP error into a clear, actionable message.
 */
function friendlyError(status, bodyText) {
  const t = (bodyText || "").toLowerCase();
  if (status === 401 || t.includes("oauth 2 access token") || t.includes("unauthenticated") || t.includes("invalid api key")) {
    return "The AI provider rejected the key (401). Check that the API key set on the server is valid and active.";
  }
  if (status === 400 && t.includes("api_key_invalid")) {
    return "The API key is invalid (400). Please set a valid key in the server environment.";
  }
  if (status === 403) {
    return "Access denied (403) — the key may lack access to this model.";
  }
  if (status === 404) {
    return (
      "The model '" + PROVIDER.model + "' was not found (404). Set the model env var " +
      "(GROQ_MODEL / LLM_MODEL / GEMINI_MODEL) to a current model name."
    );
  }
  if (status === 429) {
    let detail = "";
    if (t.includes("limit: 0") || t.includes("limit 0")) {
      detail =
        " This key's project has ZERO free-tier quota — switch to a free provider like " +
        "Groq (set GROQ_API_KEY) or use a key from a non-org Google account.";
    } else {
      detail = " Please wait a little and try again.";
    }
    return "Rate limit reached (429)." + detail;
  }
  return "The AI service returned an error (HTTP " + status + "). Please try again shortly.";
}

// ------------------------------------------------------------
// Provider callers — each returns { status, text, raw }.
// ------------------------------------------------------------
async function callGemini(safeHistory, userMessage) {
  const contents = [
    ...safeHistory.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];
  const payload = {
    systemInstruction: { parts: [{ text: ANTARMAN_SYSTEM_INSTRUCTION }] },
    contents,
    generationConfig: { temperature: 0.8, topP: 0.95, topK: 40, maxOutputTokens: 2048 },
  };
  const r = await fetch(PROVIDER.baseUrl + "/models/" + PROVIDER.model + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": PROVIDER.apiKey },
    body: JSON.stringify(payload),
  });
  const raw = await r.text();
  if (!r.ok) return { status: r.status, text: "", raw };
  let text = "";
  try {
    const data = JSON.parse(raw);
    text =
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text) ||
      "";
  } catch (e) {
    /* fallthrough */
  }
  return { status: r.status, text, raw };
}

async function callOpenAICompatible(safeHistory, userMessage) {
  const messages = [
    { role: "system", content: ANTARMAN_SYSTEM_INSTRUCTION },
    ...safeHistory.map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: userMessage },
  ];
  const r = await fetch(PROVIDER.baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + PROVIDER.apiKey,
    },
    body: JSON.stringify({
      model: PROVIDER.model,
      messages,
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });
  const raw = await r.text();
  if (!r.ok) return { status: r.status, text: "", raw };
  let text = "";
  try {
    const data = JSON.parse(raw);
    text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  } catch (e) {
    /* fallthrough */
  }
  return { status: r.status, text, raw };
}

function callProvider(safeHistory, userMessage) {
  return PROVIDER.kind === "openai"
    ? callOpenAICompatible(safeHistory, userMessage)
    : callGemini(safeHistory, userMessage);
}

// ------------------------------------------------------------
// POST /api/chat — main conversation endpoint
// ------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    if (!PROVIDER.apiKey) {
      return res.status(500).json({
        error:
          "Server has no AI key configured. Set GROQ_API_KEY (free, no card) or " +
          "GEMINI_API_KEY in the hosting environment, then redeploy.",
      });
    }

    const { message, history } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty 'message' string is required." });
    }

    const trimmedMessage = message.trim().slice(0, 8000);
    const safeHistory = buildSafeHistory(history);

    const result = await callProvider(safeHistory, trimmedMessage);

    if (result.status < 200 || result.status >= 300) {
      console.error("[AntarMan] " + PROVIDER.name + " error:", result.status, (result.raw || "").slice(0, 600));
      return res.status(502).json({ error: friendlyError(result.status, result.raw) });
    }

    if (!result.text) {
      console.error("[AntarMan] Empty response:", (result.raw || "").slice(0, 600));
      return res.status(502).json({ error: "AntarMan received an empty response. Please try again." });
    }

    return res.status(200).json({ reply: result.text });
  } catch (error) {
    console.error("[AntarMan] Server error:", error && error.message ? error.message : error);
    return res.status(500).json({
      error:
        "Kshama kijiye 🙏 — AntarMan tak pahunchne mein network samasya aa gayi. " +
        "Kripya thodi der baad phir prayas kijiye.",
    });
  }
});

// ------------------------------------------------------------
// Health check — reports the active provider without leaking the key
// ------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AntarMan",
    version: "3.0.0",
    provider: PROVIDER.name,
    model: PROVIDER.model,
    keyConfigured: Boolean(PROVIDER.apiKey),
  });
});

// ------------------------------------------------------------
// TEMPORARY DEBUG endpoint — remove once chat is confirmed working.
// Calls the active provider directly and reports the live key prefix
// plus the exact upstream status and body. Always returns 200.
// ------------------------------------------------------------
app.get("/api/diag", async (req, res) => {
  const info = {
    version: "3.0.0",
    provider: PROVIDER.name,
    model: PROVIDER.model,
    keyConfigured: Boolean(PROVIDER.apiKey),
    keyPrefix: PROVIDER.apiKey ? PROVIDER.apiKey.slice(0, 5) + "…" : null,
    keyLength: PROVIDER.apiKey ? PROVIDER.apiKey.length : 0,
  };
  if (!PROVIDER.apiKey) {
    return res.status(200).json({ ...info, note: "No AI key is set on the server." });
  }
  try {
    const result = await callProvider([], "ping");
    return res.status(200).json({
      ...info,
      upstreamStatus: result.status,
      upstreamBody: (result.raw || "").slice(0, 1200),
    });
  } catch (e) {
    return res.status(200).json({ ...info, fetchError: String((e && e.message) || e) });
  }
});

// ------------------------------------------------------------
// Start the server when run directly; export the app for Vercel.
// ------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log("============================================");
    console.log("  AntarMan | अंतर्मन  —  Your Inner Voice");
    console.log("  Provider: " + PROVIDER.name + "  Model: " + PROVIDER.model);
    console.log("  Server running at: http://localhost:" + PORT);
    console.log("============================================");
  });
}

module.exports = app;
