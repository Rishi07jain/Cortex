# Cortex

> Put everything on the board. Connect the dots. See the bigger picture.

A visual workspace for collecting, organizing and connecting information — files, images, videos, links and notes — into an interactive investigation board.

Built as a **MERN** app: **M**ongoDB + **E**xpress (`server/`) and **R**eact via Next.js App Router (`client/`), all in JavaScript.

---

## Current status — Step 1 of 5

| Step | Scope | State |
|------|-------|-------|
| **1** | Project scaffold, MongoDB models, JWT auth, workspaces, canvas CRUD, dashboard | ✅ done |
| 2 | Infinite canvas (React Flow): nodes, edges, drag, pan/zoom, inspector, minimap, autosave | next |
| 3 | File uploads, image/PDF/video/link nodes, asset library | planned |
| 4 | Search, groups, tags, undo/redo, export (PNG/SVG/PDF/JSON) | planned |
| 5 | Animated landing page (Motion + scroll reveals) | planned |

---

## Prerequisites

- **Node.js 18.18+** (Node 20 or 22 recommended) — `node -v`
- **npm 9+**
- **MongoDB** — either a local install or a free MongoDB Atlas cluster (see below)

---

## Project structure

```text
cortex/
├── package.json              # runs client + server together
├── client/                   # Next.js App Router frontend
│   ├── src/app/              # routes: /, /login, /signup, /dashboard, /canvas/[id]
│   ├── src/components/       # ui/, auth/, dashboard/, marketing/
│   ├── src/context/          # AuthContext (session state)
│   ├── src/lib/              # api.js (fetch wrapper), utils.js
│   └── tailwind.config.js    # design tokens: melon accent, ink neutrals, node colours
└── server/                   # Express REST API
    ├── server.js             # entry point
    ├── uploads/              # uploaded files land here (Step 3)
    └── src/
        ├── app.js            # express app, CORS, routes, error handling
        ├── config/db.js      # Mongoose connection
        ├── models/           # User, Workspace, Canvas, Node, Edge, Group, Asset
        ├── middleware/       # auth (protect), error handlers, asyncHandler
        ├── controllers/      # auth, workspace, canvas
        ├── routes/           # /api/auth, /api/workspaces, /api/canvases
        └── utils/token.js    # JWT signing + cookie helpers
```

---

## Setup

### 1. Install dependencies

From the project root:

```bash
npm run install:all
```

That installs the root tooling, then `server/`, then `client/`. (Equivalent to running `npm install` in all three folders.)

### 2. Set up MongoDB

**Option A — local MongoDB**

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0

# Ubuntu/Debian: follow https://www.mongodb.com/docs/manual/administration/install-on-linux/
# Windows: install MongoDB Community Server, it runs as a service automatically
```

Connection string: `mongodb://127.0.0.1:27017/cortex`

**Option B — MongoDB Atlas (no local install)**

1. Create a free cluster at <https://www.mongodb.com/cloud/atlas>
2. Database Access → add a user with a password
3. Network Access → allow your IP (or `0.0.0.0/0` while developing)
4. Connect → Drivers → copy the connection string, and add the database name:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/cortex?retryWrites=true&w=majority`

### 3. Configure the server environment

```bash
cd server
cp .env.example .env
```

Then edit `server/.env`:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/cortex
JWT_SECRET=paste_a_long_random_string_here
JWT_EXPIRES_IN=30d
CLIENT_URL=http://localhost:3000
```

> **Why port 5001?** macOS's AirPlay Receiver (AirTunes) owns port 5000 and answers
> there before Express ever sees the request — it shows up as a `403` from
> `Server: AirTunes` and looks exactly like a CORS failure. If you disabled AirPlay
> Receiver (System Settings → AirDrop & Handoff) you can use 5000 again, but 5001 is
> the safe default.

Generate a real secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Configure the client environment

```bash
cd ../client
cp .env.local.example .env.local
```

`client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 5. Run both apps

From the project root:

```bash
npm run dev
```

- API → <http://localhost:5001> (health check: <http://localhost:5001/api/health>)
- App → <http://localhost:3000>

Or run them in separate terminals:

```bash
npm --prefix server run dev      # nodemon
npm --prefix client run dev      # next dev
```

Open <http://localhost:3000>, click **Start mapping — free**, create an account, and you'll land on the dashboard with a default workspace already created.

---

## API reference (Step 1)

All responses are JSON. Auth uses an `httpOnly` cookie named `ic_token`, so browser requests must send `credentials: 'include'` (the client's `lib/api.js` already does).

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` | Create account + default workspace, sets cookie |
| POST | `/api/auth/login` | `{ email, password }` | Sign in, sets cookie |
| POST | `/api/auth/logout` | — | Clears the cookie |
| GET | `/api/auth/me` | — | Current user (401 if no session) |

### Workspaces — all require a session

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces` | List with `canvasCount` |
| POST | `/api/workspaces` | Create — `{ name, description?, color? }` |
| GET | `/api/workspaces/:id` | Fetch one |
| PUT | `/api/workspaces/:id` | Update name/description/colour |
| DELETE | `/api/workspaces/:id` | Delete + cascade canvases, nodes, edges, groups |

### Canvases — all require a session

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canvases?workspace=<id>` | List with `nodeCount` / `edgeCount` |
| POST | `/api/canvases` | Create — `{ name?, workspace?, description? }` |
| GET | `/api/canvases/:id` | Fetch one, stamps `lastOpenedAt` |
| PUT | `/api/canvases/:id` | Update `name`, `description`, `viewport`, `isArchived` |
| DELETE | `/api/canvases/:id` | Delete + cascade nodes, edges, groups |

Every workspace and canvas query is scoped to `owner: req.user._id`, so one account can never read or mutate another's data.

---

## Smoke test the API

With the server running:

```bash
bash scripts/smoke-test.sh
```

It registers a throwaway user, logs in, creates a workspace and a canvas, lists them, then deletes them — printing each response. Any failure means the API or the DB connection needs attention before you build on top of it.

---

## Data model

Defined in `server/src/models/`, following the PRD's entity list:

- **User** — name, email, hashed password
- **Workspace** — owned by a user, contains canvases
- **Canvas** — belongs to a workspace, stores its own `viewport` so reopening restores the exact view
- **Node** — `type` (text, file, image, video, link, person, event, note), title, content, `position`, `size`, tags, `metadata`, optional `asset` and `group`
- **Edge** — `source`/`target` nodes, `label`, `relationshipType` (works-at, founded, mentions, supports, contradicts…), `direction`, `style`, `confidence`, `isSuggestion` for unapproved AI proposals
- **Group** — a titled, coloured region containing nodes
- **Asset** — an uploaded file: mime type, size, URL, thumbnail, `processingStatus`, extracted text

Nodes, edges, groups and assets are unused by the UI until Steps 2 and 3 — they're defined now so the schema doesn't churn later.

---

## Security posture (Step 1)

Already in place:

- Passwords hashed with bcrypt (10 rounds) and `select: false` on the schema, so a hash can never be returned by accident.
- Session held in an `httpOnly` cookie — unreadable by JavaScript, which rules out token theft via XSS. `secure` + `sameSite: 'none'` switch on automatically when `NODE_ENV=production`.
- Cookie lifetime is derived from `JWT_EXPIRES_IN`, so the cookie and the token always expire together.
- Every workspace and canvas query is filtered by `owner: req.user._id`. Requesting another account's canvas returns 404, not 403 — it doesn't even confirm the id exists.
- `POST /api/auth/register` and `/api/auth/login` are capped at 20 attempts per IP per 15 minutes.
- Stack traces are only returned when `NODE_ENV=development`.

Deliberately deferred:

- **`/uploads` is currently a public static mount.** Nothing writes to it until Step 3, but before real uploads ship it needs to become an authenticated route that verifies asset ownership and then streams the file. It's flagged with a comment in `server/src/app.js`.
- Rate limiting is in-process memory, so it resets on restart and doesn't work across multiple server instances. Move to `express-rate-limit` with a Redis store for production.
- No `helmet`, no CSRF token (the `sameSite` cookie covers the common cases), no malware scanning or MIME validation yet — those belong with the upload pipeline in Step 3.

---

## Troubleshooting

**`MONGO_URI is not set`** — you skipped `cp .env.example .env` in `server/`.

**`ECONNREFUSED 127.0.0.1:27017`** — MongoDB isn't running. `brew services start mongodb-community` on macOS, or switch `MONGO_URI` to an Atlas string.

**Login seems to work but the dashboard bounces back to `/login`** — the auth cookie isn't being stored. Check that `CLIENT_URL` in `server/.env` exactly matches the client origin (`http://localhost:3000`, no trailing slash) and that `NEXT_PUBLIC_API_URL` points at the API. Restart both dev servers after editing env files — Next only reads `.env.local` at startup.

**`Not authorised` on every request** — a `JWT_SECRET` change invalidates existing cookies. Sign out and back in.

**Port already in use** — change `PORT` in `server/.env` (and `NEXT_PUBLIC_API_URL` to match), or run the client on another port with `npm --prefix client run dev -- -p 3001` (then update `CLIENT_URL`).

**Fonts fail to download on first build** — `next/font/google` fetches Inter and Plus Jakarta Sans at build time; it needs network access on the first run.
