# Planning Poker — Chrome Extension

Real-time planning poker for development teams. Self-hosted backend + Chrome MV3 extension.

## Architecture

```
pln-pkr-chrome-ext/
├── apps/
│   ├── extension/          # Chrome MV3 extension (React + Zustand + Tailwind)
│   │   ├── src/
│   │   │   ├── background/ # Service worker (side panel registration)
│   │   │   ├── popup/      # Quick launcher (create/join in 2 clicks)
│   │   │   ├── sidepanel/  # Main UI (full planning interface)
│   │   │   ├── options/    # Settings (server URL)
│   │   │   ├── features/   # Feature-scoped components
│   │   │   │   ├── room/         CreateRoom, JoinRoom
│   │   │   │   ├── voting/       CardGrid, VoteCard
│   │   │   │   ├── participants/ ParticipantList
│   │   │   │   └── admin/        AdminControls
│   │   │   └── shared/
│   │   │       ├── ws/     WebSocket client + event hooks
│   │   │       ├── store/  Zustand stores (room, session)
│   │   │       ├── api/    HTTP client (create room, get card sets)
│   │   │       └── ui/     Button, Input, Card, StatusBadge
│   └── server/             # Fastify + ws + Drizzle ORM + SQLite
│       └── src/
│           ├── config/     env.ts
│           ├── db/         schema, repositories
│           ├── modules/    rooms (REST routes + service)
│           └── websocket/  ws-server, connection-manager, handlers
└── packages/
    └── shared-types/       Models, WS event contracts, card sets, stats
```

## UX Design Decisions

| Choice | Reason |
|--------|--------|
| Side panel as main UI | More vertical space for cards; persistent across tabs; one-click access |
| Popup as launcher | Fastest path to join/create — room code → Join in 2 clicks |
| Side panel auto-opens on icon click | No extra step for the user |
| Zustand (not Redux) | No boilerplate; fine-grained selectors; simple for this scope |
| `ws` (not Socket.IO) | No polling overhead; Chrome extensions have native WebSocket |

## WebSocket Event Flow

```
Admin creates room (REST POST /rooms)
  → receives adminToken + sessionToken

Admin opens side panel → sends join_room
  ← server sends joined + room_state to all

Admin sends start_round { story, adminToken }
  ← server broadcasts round_started to all

Participants send submit_vote { cardValue }
  ← server broadcasts vote_submitted { userId, hasVoted: true } (no value visible)

Admin sends reveal_votes { adminToken }
  ← server broadcasts votes_revealed { votes: [{userId, userName, value}] }

Admin sends reset_round / start_round for next iteration
```

## Local Setup

### Prerequisites
- Node.js 20+
- pnpm 9+

### 1. Install dependencies

```bash
cd pln-pkr-chrome-ext
pnpm install

# Build native SQLite bindings (required once after install)
cd node_modules/.pnpm/better-sqlite3@9.6.0/node_modules/better-sqlite3
npm run build-release
cd -
```

### 2. Start the server

```bash
cd apps/server
cp .env.example .env
pnpm dev
# Server runs on http://localhost:3000
```

### 3. Build the extension

```bash
cd apps/extension
pnpm build
# Output: apps/extension/dist/
```

### 4. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `apps/extension/dist/`

### 5. Configure

1. Click the extension icon → **Settings**
2. Server URL: `http://localhost:3000`
3. Click **Test Connection** → should show ✓

## Docker (Production)

```bash
# Copy and edit env
cp apps/server/.env.example .env

# Start
docker compose up -d

# Logs
docker compose logs -f server
```

Server will be available at `http://your-server:3000`.

Update the extension's Server URL in Options to point to your VPS.

## VPS Deployment

```bash
# On your VPS
git clone https://github.com/you/pln-pkr-chrome-ext.git
cd pln-pkr-chrome-ext

# Edit ADMIN_SECRET and CORS_ORIGINS in .env
cp apps/server/.env.example .env

docker compose up -d
```

For HTTPS (recommended), put Nginx or Caddy in front:

```nginx
server {
    listen 443 ssl;
    server_name poker.yourteam.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Then in extension Options use `https://poker.yourteam.com`.  
WebSocket will use `wss://` automatically.

## Card Sets

| Name | Cards |
|------|-------|
| Fibonacci | 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕, Pass |
| Modified Fibonacci | 0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕, Pass |
| T-Shirt Sizes | XS, S, M, L, XL, XXL, ?, ☕, Pass |
| Powers of 2 | 1, 2, 4, 8, 16, 32, 64, ?, ☕, Pass |

Custom sets can be created via the admin panel.

## Security Model

- Admin creates room → server returns `adminToken` (UUID, stored in extension storage, hashed in DB)
- All users get a `sessionToken` for WS identity
- Admin operations require `adminToken` in WS payload
- Tokens are never logged or exposed to other clients
- `adminToken` is not shared with other room members

## PostgreSQL Migration

Change one line in `apps/server/src/db/index.ts`:

```ts
// SQLite:
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// PostgreSQL:
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
```

The Drizzle schema is compatible with both.

## v2 Ideas

- [ ] Round history (view past rounds in the session)
- [ ] Timer per round with configurable duration
- [ ] Export session results to CSV / Markdown
- [ ] Jira / Linear integration (auto-fill story name from ticket)
- [ ] Multiple active stories (backlog mode)
- [ ] Spectator link with live view (no extension required)
- [ ] PostgreSQL + Redis pub/sub for horizontal scaling
- [ ] Room persistence across browser restarts (already partially done via sessionToken)
- [ ] Mobile-friendly web client alongside the extension
