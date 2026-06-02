---
created_at: 2026-02-11
updated_at: 2026-06-01
created_by: unknown
modified_by: claude (opus-4.8)
---

# The Server Manager

The Server Manager project is an ecosystem of APIs that are deployed on Ubuntu servers and a front facing Next.js web application that connects to these APIs.

> For server-side privilege/sudo details that on-server AI agents need, see [Agent_Server_Access.md](Agent_Server_Access.md).

## The Server Manager API

The Server Manager API is an Express.js 5 TypeScript application (port 3000) that provides a RESTful API for managing servers and their applications. Each Ubuntu server runs its own instance of this API, all secured by a shared authentication layer and unified MongoDB instance.

The API is organized into routers: `index`, `users` (auth), `machines`, `services`, `nginx`, `registrar` (Porkbun DNS), and `admin`. Beyond service status and control, the `services` router also exposes git (branch list, fetch, pull, checkout, delete), npm (install, build), log reading, systemd service-file generation/editing, and `.env`/`.env.local` management. JWT auth is enforced via `Authorization: Bearer <token>`; all errors return `{ error: { code, message, details?, status } }`.

## The Server Manager Ecosystem

The Server Manager project is designed to help monitor, manage, and orchestrate servers and their applications across Ubuntu servers. It connects to various APIs deployed on each machine, all secured by a shared authentication layer and unified MongoDB instance.

There will be a front facing Next.js web application that provides real-time visibility and management features for your servers. Through its interface, users can:

- View process logs from any connected machine. Logs found in machine collection in MongoDB, the document called pathToLogs to the corresponding server's (machine) document.
- Check the status of apps running on the server. These apps Python and node.js applications that run using .service files
- Manage DNS entries via the Porkbun API to add or modify Type A subdomains.
- Automatically generate and register Nginx configurations for new subdomains.
- View and manage existing Nginx configuration files from each server’s `/etc/nginx/sites-available/`, `/etc/nginx/sites-enabled/` directories - these paths are found in the machine collection in MongoDB, the document called nginxStoragePathOptions to the corresponding server's (machine) document.

The dashboard unifies multiple APIs, each hosted on a separate Ubuntu server, and communicates securely with the shared MongoDB database that stores machine data and network configurations. By switching between connected machines, The Server Manager dynamically updates its data context to display logs, apps, and configurations for the selected server.

## Project Structure

The project is split into two main components:

1. api/: active in all servers
2. web/: active in only one location, the main server

This is the general structure of the project:

```
TheServerManager/
├── web/                      # NextJS frontend
│   ├── .env
│   ├── docs/
│   ├── package.json
│   ├── node_modules/
│   ├── tests/
│   └── src/
│        ├── app/
│        ├── components/
│        └── types/
├── api/                      # Express.js 5 (TypeScript)
│   ├── .env
│   ├── docs/
│   ├── package.json
│   ├── node_modules/
│   ├── tests/
│   └── src/
│        ├── routes/
│        ├── models/
│        ├── modules/
│        ├── config/
│        ├── templates/       # nginx + systemd templates
│        └── server.ts        # entry → app.ts → routers
├── docs/                     # Project-wide documentation
├── .gitignore
└── README.md
```
