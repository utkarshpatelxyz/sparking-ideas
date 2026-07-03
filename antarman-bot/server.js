/**
 * ============================================================
 * AntarMan (अंतर्मन) — Secure Backend Proxy Server
 * ============================================================
 * This server keeps the Gemini API key safely on the server
 * side and exposes a single POST /api/chat endpoint that the
 * frontend talks to. The frontend never sees the API key.
 * ============================================================
 */

const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables from the .env file
dotenv.config();

const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fail fast (with a helpful message) if the API key is missing
if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_FREE_GEMINI_API_KEY_HERE") {
  console.error(
    "\n[AntarMan] FATAL: GEMINI_API_KEY is missing or still a placeholder.\n" +
      "1. Copy .env.example to a new file named .env\n" +
      "2. Paste your free key from https://aistudio.google.com/app/apikey\n" +
      "3. Restart the server with: npm start\n"
  );
  process.exit(1);
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
- Respond with warmth, compassionate, and complete seriousness.
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

// ------------------------------------------------------------
// Gemini SDK setup
// ------------------------------------------------------------
const genAI = new GoogleGenerativeAI("AQ.Ab8RN6JH2i0mq2kBM5Spt0YZElZqYFb5H6Qk6dNcDwR86BtI7A");
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: ANTARMAN_SYSTEM_INSTRUCTION,
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
  },
});

/**
 * Sanitizes and normalizes the chat history array sent by the frontend
 * into the exact shape the Gemini SDK expects:
 * [{ role: "user" | "model", parts: [{ text: "..." }] }, ...]
 *
 * Any malformed entries are silently dropped so a corrupted client
 * payload can never crash the model call.
 */
function buildSafeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

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
  while (safe.length > 0 && safe[0].role !== "user") {
    safe.shift();
  }

  return safe;
}

// ------------------------------------------------------------
// POST /api/chat — the main conversation endpoint
// ------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "A non-empty 'message' string is required.",
      });
    }

    const trimmedMessage = message.trim().slice(0, 8000);
    const safeHistory = buildSafeHistory(history);

    const chat = model.startChat({ history: safeHistory });
    const result = await chat.sendMessage(trimmedMessage);
    const responseText = result.response.text();

    return res.status(200).json({ reply: responseText });
  } catch (error) {
    // Log the raw error safely on the server — never leak it to the client.
    console.error("[AntarMan] Gemini API error:", error && error.message ? error.message : error);

    return res.status(500).json({
      error:
        "Kshama kijiye 🙏 — AntarMan abhi thoda vishram kar raha hai. " +
        "(Apologies — AntarMan is resting for a moment. This can happen if the " +
        "free API quota is briefly exceeded or the key is invalid. " +
        "Please try again in a few seconds.)",
    });
  }
});

// ------------------------------------------------------------
// Health check endpoint (useful for Render/Railway deployments)
// ------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "AntarMan", model: "gemini-2.0-flash" });
});

// ------------------------------------------------------------
// Start the server
// ------------------------------------------------------------
// Only bind a port when run directly (e.
