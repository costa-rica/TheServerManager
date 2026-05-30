# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

Two independent sub-projects, each with their own `node_modules`, `package.json`, and `AGENTS.md`:

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

| Context                      | Variable                            | Used by               |
| ---------------------------- | ----------------------------------- | --------------------- |
| Server-side (Next.js routes) | `NEXT_PUBLIC_INTERNAL_API_BASE_URL` | `/api/auth/*` routes  |
| Client-side (browser)        | `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` | Component fetch calls |

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
- `PATH_TO_LOGS`, `PATH_PROJECT_RESOURCES`
- Porkbun, Nodemailer credentials for DNS and email features

**Web** (`web/.env`):

- `NEXT_PUBLIC_INTERNAL_API_BASE_URL` — used server-side (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` — used client-side (public domain)
- `NEXT_PUBLIC_MODE` — `workstation` for local dev (console logging, prefills login form), `production` for file logging
- `PATH_TO_LOGS` — required when `NEXT_PUBLIC_MODE=production`

## Server Interactions & Sudo Privileges

**Read `docs/SERVER_INTERACTIONS.md` before modifying any code that uses `sudo` commands** (e.g., reading/writing nginx configs, managing systemd services, or controlling services via `systemctl`).

The API runs as a regular user (`nick`) and relies on specific NOPASSWD sudoers rules for system operations. These rules are managed through a CSV file (`/home/nick/nick-systemctl.csv`) and applied via an update script. If you add or change any `sudo` command in the API, you must also update the CSV and document the required sudoers entry — otherwise the command will fail at runtime with "sudo: a password is required".

## Monorepo Webpack Fix

`web/next.config.ts` explicitly sets `config.resolve.modules` to include `path.resolve(dir, 'node_modules')`. This is required because webpack otherwise walks up to the git root (which has no `node_modules`) and fails to resolve packages like `tailwindcss`.

## Creating Markdown Files in docs/

### Filenames

The default naming pattern should be

- prefix date using the `YYYYMMDD_` format
- descriptive name in all caps
- use "\_" in place of spaces

### YAML frontmatter

Every generated `.md` file will begin with a YAML frontmatter block delimited by `---` lines containing exactly these four keys:

```yaml
---
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
created_by: <agent name> (<model>)
modified_by: <agent name> (<model>)
---
```

Rules:

- `created_at` is set once, at file creation, and MUST NEVER be modified on later edits.
- `updated_at` is rewritten to today's date on every modification.
- `created_by` is set once, at file creation, and MUST NEVER be modified on later edits.
- `modified_by` is rewritten on every modification. On the very first write, set it to the same value as `created_by`.
- `modified_by` must be one line containing only the latest modifier.
- The `created_by` / `modified_by` value uses the format `<agent name> (<model>)`, lowercase only, with no email addresses and no angle brackets.

Acceptable examples:

```yaml
created_by: claude (sonnet-4)
created_by: claude (opus-4.7)
created_by: codex (gpt-5)
modified_by: claude (haiku-4.5)
```

### Archive Subfolder

- Really old docs are moved into `docs/archive/`.
- Organized into per-month subfolders named `YYYYMM/` (e.g. `202604/`).
- Not every month will have a folder — only months with archived files exist.
- Usually managed by the operator, not the AI coding agent.
- Agents: these files are kept for reference only; do not review them when scanning the project to build context.

## Commit Message Guidance

### Guidelines

- Only generate the message for staged files/changes
- Title is lowercase, no period at the end.
- Title should be a clear summary, max 50 characters.
- Use the body to explain _why_ and the main areas changed, not just _what_.
- Bullet points should be concise and high-level.
- Try to use the ideal format. But if the commit is too broad or has too many different types, then use the borad format.
- When committing changes from TODO or task list that is already part of the repo and has phases, make refernce to the file and phase instead of writing a long commit message.
- Add a commit body whenever the staged change is not trivially small.
- A body is expected when the commit:
  - touches more than 3 files
  - touches more than one package or app
  - includes both implementation and tests
  - adds a new route, component, workflow, or integration point
- For broader commits, the title can stay concise, but the body should summarize the main change areas so a reader can understand scope without opening the diff.
- Do not use the body as a file inventory. Summarize the logical changes in 2-5 bullets.
- append co-authored-by line(s) at the end of the commit message
  - format: `co-authored-by: <agent name> (<model>)`
  - examples:
    - `co-authored-by: claude (sonnet-4)`
    - `co-authored-by: codex (gpt-5)`
- never include emails or angle brackets (`< >`)
- use lowercase only
- if multiple agents contributed, add one line per agent (no bullets, just separate lines)

### Format

#### Ideal Format

```
<type>:<space><message title>

<bullet points summarizing what was updated>
```

#### Broad Format

```
<message title>

<bullet points summarizing what was updated>
```

#### Types for Ideal Format

| Type     | Description                           |
| -------- | ------------------------------------- |
| feat     | New feature                           |
| fix      | Bug fix                               |
| chore    | Maintenance (e.g., tooling, deps)     |
| docs     | Documentation changes                 |
| refactor | Code restructure (no behavior change) |
| test     | Adding or refactoring tests           |
| style    | Code formatting (no logic change)     |
| perf     | Performance improvements              |
