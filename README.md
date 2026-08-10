# Backend TFS Collection

Node.js + Express API for the **TFS Projects Portal**.

Deploy this repo alone (e.g. Render).  
Frontend is a **separate** Netlify site.

- Live API example: https://backendtfscollection.onrender.com
- Lists projects from on-prem TFS 2018 and TFS 2017
- Per-user Windows/NTLM login (session cookie)
- Stores sub-projects and DB connections in SQLite

## Setup (local)

```bash
npm install
copy .env.example .env
npm run dev
```

## Deploy on Render (backend only)

1. Connect this GitHub repo to a Render **Web Service**
2. Settings:
   - **Build Command:** `npm install && npm run build` (or `npm run render-build`)
   - **Start Command:** `npm start` (preferred) or `node dist/index.js` if `dist/` is committed
3. Environment variables:

| Key | Example |
|---|---|
| `SESSION_SECRET` | long random string |
| `CORS_ORIGIN` | `http://localhost:4200` |
| `CORS_ORIGINS` | `https://YOUR-SITE.netlify.app` |
| `TFS_2018_URL` | your collection URL |
| `TFS_2017_URL` | your collection URL |
| `TFS_AUTH_MODE` | `ntlm` |
| `TFS_DEFAULT_DOMAIN` | `REALSOFT-ME` |

`*.netlify.app` origins are allowed by default for CORS.

## Important (safe split)

- Do **not** put Windows passwords in env for shared login — users sign in themselves
- Do **not** commit `.env`
- Render (public cloud) usually **cannot** reach internal TFS hosts unless VPN/tunnel/public access exists
- Frontend must call this API URL, never `localhost`, when hosted on Netlify

## Main endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Status |
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/tfs/projects` | Projects for logged-in user |
