# The Server Manager

The Server Manager is an ecosystem for monitoring, managing, and orchestrating Ubuntu servers and their applications. It consists of a REST API deployed on every managed server and a Next.js dashboard deployed on one primary server.

- The API provides per-machine control: process status, logs, Nginx configuration, and DNS management via the Porkbun API.
- The Web dashboard unifies every connected machine into a single interface, switching context dynamically as you select different servers.

All machines — API instances and the web server — share a single MongoDB database and a common authentication layer.

> For a full project overview see [docs/TheServerManagerOverview.md](docs/TheServerManagerOverview.md).

---

## Deployment model

| Component | Runs on                     |
| --------- | --------------------------- |
| `api/`    | Every managed Ubuntu server |
| `web/`    | Primary server only         |

---

## Getting started

Both sub-projects are independent. Each has its own `package.json`, `node_modules`, and `.env` file.

### API (`api/`)

```bash
cd api
cp .env.example .env   # fill in required values
npm install
npm run dev            # dev server with hot-reload on :3000
```

Production:

```bash
npm run build
npm start
```

### Web (`web/`)

```bash
cd web
cp .env.example .env   # fill in required values
npm install
npm run dev            # Next.js dev server on :3001
```

Production:

```bash
npm run build
npm start
```

Both projects respect a `PORT` environment variable. Defaults are `:3000` (API) and `:3001` (Web).

---

## Project structure

```
TheServerManager/
├── api/                        # Express.js 5 REST API (TypeScript)
│   ├── src/
│   │   ├── routes/             # Express routers (users, machines, services, nginx, registrar, admin)
│   │   ├── models/             # Mongoose models (User, Machine, NginxFile)
│   │   ├── modules/            # Auth middleware and shared utilities
│   │   ├── templates/          # Nginx config and systemd service file templates
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
│
├── web/                        # Next.js frontend (TypeScript)
│   ├── src/
│   │   ├── app/                # Next.js App Router (dashboard, auth route groups)
│   │   ├── components/         # Shared UI components
│   │   ├── store/              # Redux Toolkit slices (user, machine)
│   │   ├── utils/              # Permissions, helpers
│   │   └── middleware.ts       # Route protection
│   ├── .env.example
│   └── package.json
│
├── docs/                       # Project-wide documentation
│   ├── TheServerManagerOverview.md
│   ├── API_REFERENCE.md
│   ├── DATABASE_REFERENCE.md
│   ├── SERVER_INTERACTIONS.md
│   ├── api/                    # Per-router API docs
│   ├── requirements/           # Feature and error requirements
│   └── server-scripts/         # Utility scripts for managed servers
│
└── README.md
```

---

## Documentation

| Document                                                             | Description                               |
| -------------------------------------------------------------------- | ----------------------------------------- |
| [docs/TheServerManagerOverview.md](docs/TheServerManagerOverview.md) | Full ecosystem overview and goals         |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md)                       | API endpoint reference index              |
| [docs/DATABASE_REFERENCE.md](docs/DATABASE_REFERENCE.md)             | MongoDB schema and collection reference   |
| [docs/SERVER_INTERACTIONS.md](docs/SERVER_INTERACTIONS.md)           | How the API, web, and servers communicate |
| [docs/api/](docs/api/)                                               | Detailed docs for each API router         |
| [docs/requirements/](docs/requirements/)                             | Feature and error handling requirements   |
| [docs/server-scripts/](docs/server-scripts/)                         | Scripts deployed to managed servers       |
| [api/CLAUDE.md](api/CLAUDE.md)                                       | API-specific development notes            |
| [web/CLAUDE.md](web/CLAUDE.md)                                       | Web-specific development notes            |

---

## Server migration

[docs/references/ubuntu-service-files/](docs/references/ubuntu-service-files/) contains `.service` files for running the API and web app as systemd services on Ubuntu.

- The files with "obe" suffix are old files that are no longer used. The .service files are the current examples that are being used on our production servers.

These replace the service files from the previously segregated repos. The key path change is:

| Before                                           | After                                          |
| ------------------------------------------------ | ---------------------------------------------- |
| `/home/nick/applications/TheServerManagerAPI`    | `/home/nick/applications/TheServerManager/api` |
| `/home/nick/applications/TheServerManagerNextJs` | `/home/nick/applications/TheServerManager/web` |
