/**
 * ============================================================
 * AntarMan (अंतर्मन) — Secure Backend Proxy Server
 * ============================================================
 * This version completely removes the Google SDK to bypass 
 * all token formatting errors, utilizing native Node fetch.
 * ============================================================
 */

const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
// Using the correct AQ. key (removed the accidental "NAME" typo from the end)
const GEMINI_API_KEY = "AQ.Ab8RN6LzYFBoaXggyLifEY3r4l3u8arVxkscu55Ozk6h2dfDWw";

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

/**
 * Sanitizes chat history for the native REST payload
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
    } else if (Array.isArray(entry.parts) && entry.parts.length > 0 && typeof entry.parts[0].text === "string") {
      text = entry.parts[0].text;
    }

    text = text.trim();
    if (!text) continue;
    safe.push({ role, parts: [{ text }] });
  }

  while (safe.length > 0 && safe[0].role !== "user") {
    safe.shift();
  }
  return safe;
}

// ------------------------------------------------------------
// POST /api/chat — using Native Node fetch instead of SDK
// ------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty 'message' string is required." });
    }

    const trimmedMessage = message.trim().slice(0, 8000);
    const safeHistory = buildSafeHistory(history);

    // 1. Construct the exact JSON payload the Google REST API expects
    const payload = {
      systemInstruction: {
        parts: [{ text: ANTARMAN_SYSTEM_INSTRUCTION }]
      },
      contents: [
        ...safeHistory,
        { role: "user", parts: [{ text: trimmedMessage }] }
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      }
    };

    // 2. Fire directly at the active Gemini 3.5 Flash endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;
    
    // 3. Inject the AQ. key as a Bearer Token in the Authorization header
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AntarMan] Native Fetch API Error:", response.status, errText);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
      throw new Error("Received empty text array from Google");
    }

    return res.status(200).json({ reply: responseText });
    
  } catch (error) {
    console.error("[AntarMan] Server Error:", error.message || error);
    return res.status(500).json({
      error:
        "Kshama kijiye 🙏 — AntarMan abhi thoda vishram kar raha hai. " +
        "(Apologies — AntarMan is resting for a moment. This can happen if the " +
        "free API quota is briefly exceeded or the key is invalid. " +
        "Please try again in a few seconds.)",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "AntarMan Native", model: "gemini-3.5-flash" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("============================================");
    console.log("  AntarMan | अंतर्मन  —  Your Inner Voice (Native)");
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log("============================================");
  });
}

module.exports = app;
