# AntarMan | अंतर्मन — Your Inner Voice 🪔

An empathetic, culturally rooted AI companion for India, powered by the **free tier** of the Google Gemini API (`gemini-1.5-flash`). AntarMan speaks fluent **English, pure Hindi (Devanagari), and Hinglish**, automatically matching whichever language you type in.

## Project Structure

```
antarman-bot/
│
├── package.json          # Node.js project configuration & dependencies
├── .env.example          # Template for your environment variables
├── .gitignore            # Keeps secrets & node_modules out of git
├── server.js             # Secure backend proxy (your API key lives here)
└── public/
    ├── index.html        # Premium dark-themed chat UI (Tailwind CDN)
    ├── style.css         # Scrollbars, typing animation, markdown styling
    └── script.js         # Frontend state engine & vanilla markdown parser
```

---

## Step 1: Get Your Free Gemini API Key (3 Steps)

1. Open **[https://aistudio.google.com](https://aistudio.google.com)** in your browser and sign in with any standard Google account (the same one you use for Gmail works perfectly).
2. Click the **"Get API Key"** button (top-left area of Google AI Studio), then click **"Create API key"**.
3. A long key starting with `AIza...` appears — click the **copy** icon and keep it somewhere safe. **Never share this key publicly or commit it to GitHub.**

The free tier requires no credit card and is more than enough for personal use.

## Step 2: Run It Locally (Beginner-Friendly)

1. **Install Node.js:** Go to [https://nodejs.org](https://nodejs.org), download the **LTS** version, and install it with all default options. To confirm it worked, open a terminal (Command Prompt on Windows, Terminal on Mac) and type `node -v` — you should see a version number like `v20.x.x`.
2. **Create the project:** Make a folder named `antarman-bot`, and inside it create the files exactly as shown in the structure above (including the `public` sub-folder). Paste each file's code into its matching file.
3. **Add your API key:** Duplicate `.env.example`, rename the copy to exactly `.env` (nothing before the dot), and replace `YOUR_FREE_GEMINI_API_KEY_HERE` with the key you copied in Step 1.
4. **Install dependencies:** In your terminal, navigate into the folder and install:
   ```bash
   cd antarman-bot
   npm install
   ```
5. **Start the server:**
   ```bash
   node server.js
   ```
6. Open **[http://localhost:5000](http://localhost:5000)** in your browser. Namaste — AntarMan is live! 🙏

## Step 3: Deploy for Free (Production)

Basic static web hosting (HTML/CSS only) **cannot** run this app, because it needs a Node.js server to protect your API key. Use one of these free platforms instead — all of them deploy directly from a GitHub repository:

### Option A: Render (Recommended — easiest)
1. Push this folder to a GitHub repository (make sure `.env` is NOT included — the `.gitignore` handles this).
2. Go to [https://render.com](https://render.com), sign up with GitHub, and click **New → Web Service**.
3. Select your repository. Set **Build Command** to `npm install` and **Start Command** to `node server.js`.
4. Under **Environment**, add a variable: key `GEMINI_API_KEY`, value = your real key. (You don't need `PORT` — Render sets it automatically, and the server reads it.)
5. Click **Create Web Service**. In a minute or two you'll get a live URL like `https://antarman.onrender.com`.

### Option B: Railway
1. Go to [https://railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project → Deploy from GitHub repo** and pick your repository.
3. In the **Variables** tab, add `GEMINI_API_KEY` with your real key.
4. Railway auto-detects Node.js, runs `npm install`, and starts it with `npm start`. Click **Generate Domain** under Settings to get your public URL.

### Option C: Vercel
The repo includes a `vercel.json` that wraps `server.js` as a serverless function (via `@vercel/node`) and routes every request to it, so the Express app — including the static `public/` frontend and the `/api/chat` endpoint — works as-is.
1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project** and import your repository.
3. Set **Root Directory** to `antarman-bot`.
4. Add the `GEMINI_API_KEY` environment variable during import (Vercel auto-detects the `@vercel/node` build from `vercel.json`, so no build/start command changes are needed).
5. Click **Deploy**. You'll get a live URL like `https://antarman.vercel.app` in under a minute.

## Safety Note

AntarMan is an AI companion, not a professional. For medical, legal, or mental-health emergencies it will gently direct users to real human help (e.g., India's KIRAN helpline **1800-599-0019** or emergency services **112**).
