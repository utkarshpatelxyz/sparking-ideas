/**
 * ============================================================
 *  AntarMan (अंतर्मन) — Secure Backend Proxy Server
 * ============================================================
 *  Keeps the Gemini API key on the server and exposes POST
 *  /api/chat to the frontend. Uses native fetch (no SDK), which
 *  is serverless-friendly on Vercel. Runs as a normal server
 *  locally / on Render, and is exported for Vercel functions.
 * ============================================================
 */

const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config();

const PORT = process.env.PORT || 5000;

// The API key lives ONLY in the environment — never hardcode it.
// Get a valid Gemini API key at: https://aistudio.google.com/app/apikey
// (It must be a standard Gemini "AIza…" key, NOT an OAuth/"AQ." token.)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Model is configurable so it can be updated without a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!GEMINI_API_KEY) {
  console.warn(
    "[AntarMan] WARNING: GEMINI_API_KEY is not set. /api/chat will return a " +
      "configuration error until you add it to the environment."
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
 * Normalizes the frontend history array into the shape the Gemini REST
 * API expects: [{ role: "user" | "model", parts: [{ text }] }, ...].
 * Malformed entries are dropped so a bad payload can never crash the call.
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
    safe.push({ role, parts: [{ text }] });
  }
  // Gemini requires the history to start with a "user" turn.
  while (safe.length > 0 && safe[0].role !== "user") safe.shift();
  return safe;
}

/**
 * Maps a Google API HTTP error into a clear, actionable message.
 * Returned to the client so misconfigurations are diagnosable in the UI.
 */
function friendlyError(status, bodyText) {
  const t = (bodyText || "").toLowerCase();
  if (status === 401 || t.includes("oauth 2 access token") || t.includes("unauthenticated")) {
    return (
      "AntarMan's server credential was rejected (401). The GEMINI_API_KEY is missing " +
      "or is not a valid Gemini API key. Use a standard 'AIza…' key from " +
      "Google AI Studio — an OAuth-style 'AQ.' token will not work here."
    );
  }
  if (status === 400 && t.includes("api_key_invalid")) {
    return "The Gemini API key is invalid (400). Please set a valid key in GEMINI_API_KEY.";
  }
  if (status === 403) {
    return "Access denied (403) — the key may lack access to this model, or the Generative Language API isn't enabled for it.";
  }
  if (status === 404) {
    return (
      "The AI model '" + GEMINI_MODEL + "' was not found (404) — it may be retired. " +
      "Set the GEMINI_MODEL env var to a current model (e.g. gemini-2.0-flash)."
    );
  }
  if (status === 429) {
    // Surface which quota tripped and the suggested retry delay, so a
    // temporary rate limit is distinguishable from a project with zero quota.
    let detail = "";
    try {
      const parsed = JSON.parse(bodyText);
      const details = (parsed.error && parsed.error.details) || [];
      for (const d of details) {
        if (d["@type"] && d["@type"].includes("QuotaFailure") && Array.isArray(d.violations)) {
          const v = d.violations[0] || {};
          if (v.quotaId || v.quotaMetric) {
            detail += " Quota: " + (v.quotaId || v.quotaMetric);
            if (v.quotaValue !== undefined) detail += " (limit " + v.quotaValue + ")";
            detail += ".";
          }
        }
        if (d["@type"] && d["@type"].includes("RetryInfo") && d.retryDelay) {
          detail += " Retry in " + d.retryDelay + ".";
        }
      }
    } catch (e) {
      /* body wasn't JSON — keep the generic message */
    }
    return (
      "Rate limit reached (429)." + (detail || " Please wait a little and try again.") +
      (detail.indexOf("limit 0") !== -1
        ? " A limit of 0 means this Google Cloud project has no free-tier quota for this model — enable billing on the project or use a key from a personal AI Studio account."
        : "")
    );
  }
  return "The AI service returned an error (HTTP " + status + "). Please try again shortly.";
}

// ------------------------------------------------------------
// POST /api/chat — main conversation endpoint
// ------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "Server is missing GEMINI_API_KEY. Add a valid Gemini API key in the " +
          "hosting environment (e.g. Vercel → Settings → Environment Variables), then redeploy.",
      });
    }

    const { message, history } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty 'message' string is required." });
    }

    const trimmedMessage = message.trim().slice(0, 8000);
    const safeHistory = buildSafeHistory(history);

    const payload = {
      systemInstruction: { parts: [{ text: ANTARMAN_SYSTEM_INSTRUCTION }] },
      contents: [...safeHistory, { role: "user", parts: [{ text: trimmedMessage }] }],
      generationConfig: { temperature: 0.8, topP: 0.95, topK: 40, maxOutputTokens: 2048 },
    };

    // Canonical Gemini REST auth: the API key goes in the x-goog-api-key header.
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      GEMINI_MODEL +
      ":generateContent";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AntarMan] Gemini API error:", response.status, errText.slice(0, 600));
      return res.status(502).json({ error: friendlyError(response.status, errText) });
    }

    const data = await response.json();
    const responseText =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!responseText) {
      const blockReason =
        (data && data.promptFeedback && data.promptFeedback.blockReason) ||
        (data && data.candidates && data.candidates[0] && data.candidates[0].finishReason);
      console.error("[AntarMan] Empty candidate:", JSON.stringify(data).slice(0, 600));
      return res.status(502).json({
        error: blockReason
          ? "AntarMan couldn't respond to that (" + blockReason + "). Please try rephrasing."
          : "AntarMan received an empty response. Please try again.",
      });
    }

    return res.status(200).json({ reply: responseText });
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
// Health check — reports config without leaking the key
// ------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AntarMan",
    version: "2.2.0",
    model: GEMINI_MODEL,
    keyConfigured: Boolean(GEMINI_API_KEY),
  });
});

// ------------------------------------------------------------
// TEMPORARY DEBUG endpoint — remove once chat is confirmed working.
// Calls Google directly and reports which key is live (first chars
// only) plus the exact upstream status and body, so quota/auth issues
// are unambiguous. Always returns 200 so it renders in a browser.
// ------------------------------------------------------------
app.get("/api/diag", async (req, res) => {
  const info = {
    version: "2.2.0",
    model: GEMINI_MODEL,
    keyConfigured: Boolean(GEMINI_API_KEY),
    keyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 5) + "…" : null,
    keyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0,
  };
  if (!GEMINI_API_KEY) {
    return res.status(200).json({ ...info, note: "GEMINI_API_KEY is not set on the server." });
  }
  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] }),
      }
    );
    const text = await r.text();
    return res.status(200).json({ ...info, upstreamStatus: r.status, upstreamBody: text.slice(0, 1200) });
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
    console.log("  Model: " + GEMINI_MODEL);
    console.log("  Server running at: http://localhost:" + PORT);
    console.log("============================================");
  });
}

module.exports = app;
