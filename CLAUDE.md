# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

Two independent sub-projects, each with their own `node_modules`, `package.json`, and `CLAUDE.md`:

```
TheServerManager/
├── api/    # Express.js 5 REST API (TypeScript, port 3000)
└── web/    # Next.js frontend (TypeScript, port 3001)
```

There is no root `package.json`. All commands must be run from within `api/` or `web/`.

## Development Commands

**API** (`cd api/`):
```bash
npm run dev     # nodemon + ts-node, watches src/
npm run build   # tsc + copies templates to dist/
npm start       # node dist/server.js (requires build first)
npm test        # jest
npm run test:watch
```

**Web** (`cd web/`):
```bash
npm run dev     # Next.js dev server on :${PORT:-3001}
npm run build   # Production build
npm start       # Production server on :${PORT:-3001}
npm run lint    # ESLint
```

Both projects use the `PORT` environment variable when present; otherwise they default to their respective ports.

## Architecture Overview

### How the Two Projects Connect

The web frontend never calls the API directly from the browser for auth — it proxies through Next.js API routes (`web/src/app/api/auth/`). All other API calls are made client-side using a Bearer token from Redux state.

| Context | Variable | Used by |
|---|---|---|
| Server-side (Next.js routes) | `NEXT_PUBLIC_INTERNAL_API_BASE_URL` | `/api/auth/*` routes |
| Client-side (browser) | `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` | Component fetch calls |

This split exists because when both run on the same server, the server-side code cannot reach the public domain via NAT hairpinning.

### API (`api/`)

- **Entry**: `server.ts` → `app.ts` → 7 Express routers
- **Routers**: `index`, `users` (auth), `machines`, `services`, `nginx`, `registrar` (Porkbun DNS), `admin`
- **Models**: `User`, `Machine`, `NginxFile` (Mongoose/MongoDB)
- **Auth middleware**: `modules/authentication.ts` — JWT via `Authorization: Bearer <token>` header; `isAdmin` role check
- **Env flag**: `AUTHENTIFICATION_TURNED_OFF=true` bypasses JWT (testing only)
- **Error format**: All errors return `{ error: { code, message, details?, status } }`
- **Templates**: `src/templates/` contains nginx config and systemd service file templates used for auto-generation

### Web (`web/`)

- **Route groups**: `(dashboard)` wraps authenticated pages with header + right-side sidebar; `(full-width)/(auth)` for login/register
- **Auth flow**: Login POSTs to `/api/auth/login` (Next.js route) → backend called server-side → HTTP-only cookie set + token returned to client → Redux stores token for API calls
- **Route protection**: `src/middleware.ts` checks `auth-token` cookie; dashboard layout also client-side checks token and page access permissions via `utils/permissions.ts`
- **State**: Redux Toolkit with redux-persist; `user` slice holds token, username, isAdmin, accessServersArray, accessPagesArray; `machine` slice for selected machine state
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`; terminal-inspired design with JetBrains Mono font; custom color scales defined in `globals.css`
- **SVG icons**: Files in `src/icons/` imported as React components via `@svgr/webpack`
- **Logging**: Winston initialized via `src/instrumentation.ts`; `NEXT_PUBLIC_MODE=production` writes to files, `workstation`/`development` writes to console

### Shared MongoDB

Both projects connect to the same MongoDB instance. The API reads/writes all collections; the web app only interacts with MongoDB indirectly through API calls.

## Environment Setup

Each sub-project has its own `.env` file (gitignored). See `api/.env.example` for required API variables. Key variables:

**API** (`api/.env`):
- `PORT`, `JWT_SECRET`, `MONGODB_URI`, `NODE_ENV`
- `ADMIN_EMAIL` — JSON array of admin email addresses
- `PATH_TO_LOGS`, `PROJECT_RESOURCES`
- Porkbun, Nodemailer credentials for DNS and email features

**Web** (`web/.env`):
- `NEXT_PUBLIC_INTERNAL_API_BASE_URL` — used server-side (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` — used client-side (public domain)
- `NEXT_PUBLIC_MODE` — `workstation` for local dev (console logging, prefills login form), `production` for file logging
- `PATH_TO_LOGS` — required when `NEXT_PUBLIC_MODE=production`

## Monorepo Webpack Fix

`web/next.config.ts` explicitly sets `config.resolve.modules` to include `path.resolve(dir, 'node_modules')`. This is required because webpack otherwise walks up to the git root (which has no `node_modules`) and fails to resolve packages like `tailwindcss`.
