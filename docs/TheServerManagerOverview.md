# The Server Manager

The Server Manager project is an ecosystem of APIs that are deployed on Ubuntu servers and a front facing Next.js web application that connects to these APIs.

## The Server Manager API

The Server Manager API is an ExpressJS TypeScript application that provides a RESTful API for managing servers and their applications. Each Ubuntu server runs its own instance of this API, all secured by a shared authentication layer and unified MongoDB instance.

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
├── api/                      # FastAPI or ExpressJS
│   ├── .env
│   ├── docs/
│   ├── requirements.txt or package.json
│   ├── node_modules/
│   ├── tests/
│   └── src/
│        ├── routes/
│        ├── models/
│        ├── modules/
│        ├── main.py, server.js, index.js
│        └── requirements.txt
├── docs/                     # Project-wide documentation
├── .gitignore
└── README.md
```
