# Backend TFS Collection

Node.js + Express API for the **TFS Projects Portal**.

- Lists projects from on-prem TFS 2018 and TFS 2017
- Per-user Windows/NTLM login (session cookie)
- Stores sub-projects and database connections in SQLite

## Setup

```bash
npm install
copy .env.example .env
```

Edit `.env` (do **not** commit secrets):

```env
PORT=3000
CORS_ORIGIN=http://localhost:4200
SESSION_SECRET=change-me-to-a-long-random-string
TFS_2018_URL=http://tfs2018:8080/tfs/Realsoft-Projects
TFS_2017_URL=http://tfs2017srv:8080/tfs/DefaultCollection
TFS_AUTH_MODE=ntlm
TFS_DEFAULT_DOMAIN=REALSOFT-ME
```

## Run

```bash
npm run dev
# or
npm run build
npm start
```

API: `http://localhost:3000`

## Main endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/tfs/projects` | TFS projects for logged-in user |
| CRUD | `/api/projects/...`, `/api/subprojects/...`, `/api/connections/...` | Sub-projects & DB connections |

## Notes

- Visitors sign in with their own `DOMAIN\username` credentials
- Machine running this API must reach both TFS hosts
- `.env`, `node_modules`, `data/`, and `dist/` are gitignored
