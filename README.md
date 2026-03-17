# Jumpinboat

Monorepo for the Jumpinboat app: web, API, mobile, and shared code.

## Prerequisites

- **Node.js** >= 20
- **npm** (workspaces)

## Structure

| Package | Description |
|---------|-------------|
| `packages/shared` | Shared TypeScript library: domain models, schemas (Effect + @effect/schema), validation |
| `packages/api` | Backend API (Node + Effect, Drizzle + PostgreSQL, JWT via jose) |
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
| `npm run dev:api` | Start API dev server (tsx watch) |
| `npm run dev:web` | Start Next.js dev server (port 3000) |
| `npm run dev:mobile` | Start Expo dev server |
| `npm run build` | Build shared, api, and web |
| `npm run lint` | Type-check all workspaces (`tsc --noEmit`) |

## API

- Dev: `npm run dev:api` (default port 4000, set `PORT` to override)
- DB: `npm run db:generate`, `npm run db:migrate`, `npm run db:seed` (from `packages/api`)

## Web

- Dev: `npm run dev:web` → http://localhost:3000
- Build: `npm run build` then `npm run start` in `packages/web`
- SSR boat fetching uses an absolute base URL. Set one of these env vars for the web app when needed: `NEXT_PUBLIC_API_BASE_URL`, `API_BASE_URL`, or `NEXT_PUBLIC_APP_URL`
- Local dev default: if none are set, web falls back to `http://localhost:3000` and uses the Next rewrite for `/api/*` → `http://localhost:4000/api/*`
- Example for local/custom setup: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm run dev:web`

## Mobile

- From repo root: `npm run dev:mobile`, or from `packages/mobile`: `npm start`, `npm run ios`, `npm run android`, `npm run web`
