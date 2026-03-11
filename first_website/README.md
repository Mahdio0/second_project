# TubeMind — AI YouTube Summarizer

> Paste a YouTube URL → get an AI summary, an interactive mindmap, and a voiceover.

Built with a **glassmorphism** UI, a Node.js/Express backend, Supabase authentication, OpenAI, ElevenLabs, and Mermaid.js.

---

## Live Demo Architecture

```
Browser (Vercel / Netlify)
       │
       │  REST API calls
       ▼
Node.js/Express backend (Render / Heroku)
       ├── youtube-transcript  → extracts captions
       ├── OpenAI GPT-4o-mini  → generates summary + Mermaid mindmap
       ├── ElevenLabs TTS      → converts summary to MP3
       └── Supabase (DB + Auth)→ user accounts & saved summaries
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm     | ≥ 9 |

You will also need accounts on:
- [Supabase](https://supabase.com) (free tier works)
- [OpenAI Platform](https://platform.openai.com)
- [ElevenLabs](https://elevenlabs.io) (free tier: 10,000 chars/month)

---

## Project Structure

```
first_website/
├── backend/
│   ├── .env.example          ← copy to .env and fill in your keys
│   ├── package.json
│   ├── server.js             ← Express app entry point
│   ├── middleware/
│   │   └── auth.js           ← Supabase JWT verification
│   └── routes/
│       ├── summary.js        ← /api/summary  (transcript → AI → voiceover)
│       └── user.js           ← /api/user/summaries  (save / list / delete)
└── frontend/
    ├── index.html            ← single-page app
    ├── css/
    │   └── style.css         ← glassmorphism theme
    └── js/
        ├── auth.js           ← Supabase auth wrapper
        ├── mindmap.js        ← Mermaid.js renderer
        └── app.js            ← main UI logic
```

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Enable **Email/Password** authentication:  
   `Authentication → Providers → Email → Enable`
3. Run the following SQL to create the summaries table:

```sql
create table if not exists public.summaries (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  video_id    text not null,
  video_url   text,
  title       text,
  summary     text,
  mindmap     text,
  created_at  timestamptz default now()
);

-- Row-level security: users can only see their own rows
alter table public.summaries enable row level security;

create policy "Users can manage their own summaries"
  on public.summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

4. Note down from `Settings → API`:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → put in `index.html` `TUBEMIND_CONFIG`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend only, never expose publicly)

---

## Step 2 — Backend Setup (Local)

```bash
cd first_website/backend
cp .env.example .env      # fill in your API keys
npm install
npm run dev               # starts on http://localhost:3001
```

Test that it works:
```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

---

## Step 3 — Frontend Setup (Local)

The frontend is a plain HTML/JS/CSS project — no build step needed.

Either open `frontend/index.html` directly in a browser, **or** serve it with a static file server:

```bash
# using Node (npx)
npx serve first_website/frontend -p 3000
```

Then open `http://localhost:3000`.

Update `window.TUBEMIND_CONFIG` inside `index.html` with your Supabase credentials:
```js
window.TUBEMIND_CONFIG = {
  supabaseUrl:     'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  apiUrl:          'http://localhost:3001',  // or your deployed backend URL
};
```

---

## Step 4 — Deploy Frontend (Free)

### Option A — Vercel (recommended)

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo.
3. Set **Root Directory** to `first_website/frontend`.
4. No build command needed (static site). Click **Deploy**.
5. Update `window.TUBEMIND_CONFIG.apiUrl` in `index.html` to your backend URL, then redeploy.

### Option B — Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Deploy manually.
2. Drag and drop the `first_website/frontend` folder.
3. Done! Update `index.html` config and redeploy.

---

## Step 5 — Deploy Backend (Free)

### Render (recommended free tier)

1. Go to [render.com](https://render.com) → New → Web Service.
2. Connect your GitHub repo.
3. Set:
   - **Root Directory**: `first_website/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add environment variables under **Environment** (copy from your `.env` file).
5. Deploy. Render gives you a URL like `https://tubemind-api.onrender.com`.
6. Update `window.TUBEMIND_CONFIG.apiUrl` in `index.html` with this URL.

---

## API Reference

### `POST /api/summary`

Fetch transcript, generate summary, mindmap, and/or voiceover.

**Request body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "options": {
    "summary":   true,
    "mindmap":   true,
    "voiceover": false
  }
}
```

**Response:**
```json
{
  "videoId": "VIDEO_ID",
  "summary": "…plain-text summary…",
  "mindmap": "mindmap\n  root((Topic))\n    A\n    B",
  "voiceover": "<base64-encoded MP3>"
}
```

### `GET /api/user/summaries` _(auth required)_

Returns all saved summaries for the logged-in user.

### `POST /api/user/summaries` _(auth required)_

Saves a summary. Body: `{ videoId, videoUrl, title, summary, mindmap }`.

### `DELETE /api/user/summaries/:id` _(auth required)_

Deletes a summary by ID.

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| All routes | 100 req / 15 min per IP |
| `/api/summary` | 20 req / hour per IP |

---

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` and all API keys **must never** be committed to git or exposed in the frontend.
- All sensitive keys live exclusively in the backend `.env` file.
- The Supabase **anon key** is safe to put in the frontend — it has no admin privileges.
- Row-level security is enabled on the `summaries` table so users can only access their own data.
- CORS is restricted to the frontend origin in production.

---

## License

MIT
