# Trade-Log-AI

## Overview

AI-powered trading journal — a pnpm workspace monorepo using TypeScript. Logs trades, tracks P&L, and generates AI-powered narratives and analysis using Claude (Anthropic via Replit AI Integrations).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in DB)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (backend) + Vite (frontend)
- **AI**: Anthropic Claude via Replit AI Integrations (`AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`)

## Workflows

- **Start application** — Dev proxy on port 5000. Routes `/api/*` → Express (3000), everything else → Metro (18116). Command: `PORT=5000 METRO_PORT=18116 node artifacts/mobile/server/dev-proxy.js`
- **Backend API** — Express API server on port 3000: `PORT=3000 pnpm --filter @workspace/api-server run dev`
- **artifacts/mobile: expo** — Expo mobile dev server. Uses `expo-wrapper.js` which starts a proxy on port 18115 immediately (for Replit's health check), then starts Metro on port 18116 in background. Dev script: `node server/expo-wrapper.js`

### Port layout

| Port | Service |
|------|---------|
| 3000 | Express API (Backend API workflow) |
| 5000 | Dev proxy — routes /api/* to 3000, /* to 18116 (Start application workflow) |
| 18115 | expo-wrapper proxy — routes everything to Metro on 18116 (artifacts/mobile: expo workflow) |
| 18116 | Metro bundler (React Native web bundle) |

### API base URL selection (\_layout.tsx)

The mobile app picks the API URL at startup based on the browser's hostname:
- **localhost** — relative URLs (`null`) so the dev-proxy on port 5000 handles `/api/*`
- **any other host** — absolute `https://$EXPO_PUBLIC_DOMAIN` so cross-domain calls from `expo.pike.replit.dev` work; Express CORS is open to all origins

## Structure

```text
.
├── artifacts/
│   ├── api-server/         # Express 5 API server (port 3000)
│   ├── mockup-sandbox/     # Vite/React web frontend (port 5000)
│   └── mobile/             # Expo React Native mobile app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks + fetch client
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations/       # Shared integrations
│   └── integrations-anthropic-ai/ # Anthropic AI client wrapper
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — `pnpm run typecheck` (runs `tsc --build --emitDeclarationOnly`)
- **emitDeclarationOnly** — JS bundling is handled by esbuild/tsx/vite, not tsc
- **Project references** — when A depends on B, A's tsconfig must list B in `references`

## Root Scripts

- `pnpm run build` — typecheck + recursive build in all packages
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly` using project references

## Key Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API. Routes in `src/routes/`, validated with `@workspace/api-zod`, persisted with `@workspace/db`.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App: `src/app.ts` — CORS, JSON parsing, routes at `/api`
- Routes: `src/routes/health.ts` (`GET /api/health`), `src/routes/trades.ts`
- `pnpm --filter @workspace/api-server run dev` — dev server (build + start)
- `pnpm --filter @workspace/api-server run build` — esbuild bundle to `dist/`

### `artifacts/mockup-sandbox` (`@workspace/mockup-sandbox`)

Vite/React web frontend. Canvas component preview system.

- Requires env: `PORT` and `BASE_PATH` (e.g. `PORT=5000 BASE_PATH=/`)
- Configured with `allowedHosts: true` for Replit proxy compatibility
- `pnpm --filter @workspace/mockup-sandbox run dev` — Vite dev server

### `lib/db` (`@workspace/db`)

Drizzle ORM + PostgreSQL. Schema in `src/schema/`.

- Push schema: `pnpm --filter @workspace/db run push`
- Requires: `DATABASE_URL` (auto-provided by Replit)

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI spec + Orval codegen. Run: `pnpm --filter @workspace/api-spec run codegen`

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native mobile app — 3-tab layout (Journal, Add Trade, Statistics).

- API URL via `EXPO_PUBLIC_DOMAIN` env var in `_layout.tsx`
- `pnpm --filter @workspace/mobile run dev` — Expo dev server

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Replit DB | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Replit AI Integration | Anthropic proxy URL |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Replit AI Integration | Anthropic API key |
| `PORT` | Workflow env | Port for each service |
| `BASE_PATH` | Workflow env | Base path for mockup-sandbox |
