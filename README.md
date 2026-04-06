# Jumpinboat

Monorepo for the Jumpinboat app: web, API, mobile, and shared code.

## Prerequisites

- **Node.js** >= 20
- **npm** (workspaces)

## Structure

| Package | Description |
|---------|-------------|
| `packages/shared` | Shared TypeScript library: domain models, schemas (Effect + @effect/schema), validation |
| `packages/api` | Shared API layer (Effect services, Drizzle + PostgreSQL, JWT via jose); HTTP is served by Next Route Handlers in `packages/web` |
| `packages/web` | Next.js 16 web app (React 19, Tailwind 4, Jotai, next-intl) |
| `packages/mobile` | Expo + React Native app (expo-router, maps/location) |

## Getting started

```bash
# Install dependencies (from repo root)
npm install

# Build all packages (shared → api → web)
npm run build
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Same as `dev:web` — Next.js on port 3000 including `/api/*` routes |
| `npm run dev:web` | Start Next.js dev server (port 3000) |
| `npm run dev:mobile` | Start Expo dev server |
| `npm run build` | Build shared, api, and web |
| `npm run lint` | Type-check all workspaces (`tsc --noEmit`) |

## API

HTTP endpoints live in **`packages/web/app/api`** (Next.js Route Handlers) and call into **`packages/api`** (services, DB). There is no separate `listen()` server.

- Dev: `npm run dev:web` or `npm run dev:api` → [http://localhost:3000](http://localhost:3000) (`/api/*` on the same origin)
- Set `DATABASE_URL` (and `JWT_SECRET` for auth) in the environment used by Next (`packages/web`) and for CLI migrations in `packages/api`
- **First-time DB:** from `packages/api` run `npm run db:migrate` then `npm run db:seed` (sample boats + departures + `owner@jumpinboat.local` / `password123`)
- Other scripts: `npm run db:generate` (after schema edits), `npm run db:migrate`, `npm run db:seed`
- **Production (e.g. Vercel):** set `DATABASE_URL`, `JWT_SECRET` on the web project. No `API_BASE_URL` rewrite is required for same-origin `/api`.

### MVP endpoints (high level)

- `GET /api/boats/search` — discovery (query params: `query`, `goodsTransportOnly`, `minFreeSpots`, `locale`, `nearMeLat`/`nearMeLng`/`nearMeRadiusKm`, route `routeStartLat`…`routeEndLng`, `routeMatchKm`)
- `GET /api/boats/detail?boatId=` — listing + route for map
- `GET /api/boats/departures?boatId=` — upcoming departures
- `POST /api/auth/sign-up` — body: `email`, `password`, optional `canBook` / `canListBoats` (at least one must be true)
- `POST /api/bookings` — bearer token, customer with `canBook`
- `GET /api/bookings/mine`, `GET /api/bookings/owner`, `PATCH /api/bookings/owner-status` — `{ bookingId, status: confirmed|declined }`
- `POST /api/translate` — stub AI/translation hook for EN/HR (`{ text, targetLocale }`)

## Web

- Dev: `npm run dev:web` → http://localhost:3000
- Build: `npm run build` then `npm run start` in `packages/web`
- SSR / client fetches to `/api/*` use the same origin as the app (no proxy to another port). For absolute URLs in server components, set `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_API_BASE_URL` if needed.
- Vercel: set the project Root Directory to `packages/web`. The app-level config in `packages/web/vercel.json` runs the repo-root build so `packages/shared` and `packages/api` are compiled before Next builds the web app. The Next config also traces `packages/api/dist` and `packages/shared/dist` from the monorepo root so serverless functions include those workspace files at runtime.

## Mobile

- From repo root: `npm run dev:mobile`, or from `packages/mobile`: `npm start`, `npm run ios`, `npm run android`, `npm run web`
- Set **`EXPO_PUBLIC_API_URL`** to your deployed web origin (e.g. `https://your-app.vercel.app`) so the app calls `/api/*` on that host. Local dev defaults to the machine running Next on port 3000.
