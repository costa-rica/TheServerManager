# The Server Manager NextJs

## Overview

### Purpose

The Server Manager NextJs is the primary user-facing dashboard of **The Server Manager** ecosystem — a comprehensive suite of applications designed to help monitor, manage, and orchestrate servers and their applications across your infrastructure. It connects to various APIs deployed on each machine, all secured by a shared authentication layer and unified MongoDB instance.

This Next.js web portal provides real-time visibility and management features for your servers. Through its interface, users can:

- View service logs from any connected machine.
- Check the status of services running on any connected machine.
- Manage DNS entries via the Porkbuns API to add or modify Type A subdomains.
- Automatically generate and register Nginx configurations for new subdomains.
- View and manage existing Nginx configuration files from each server’s `/etc/nginx/sites-available/` and `conf.d` directories.

The dashboard unifies multiple APIs, each hosted on a separate Ubuntu server, and communicates securely with the shared MongoDB database that stores machine data and network configurations. By switching between connected machines, The Server Manager NextJs dynamically updates its data context to display logs, apps, and configurations for the selected server.

### Architecture Summary

- **Frontend**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit with persistence
- **Backend**: Connects to individual server APIs (the404back instances)
- **Database**: MongoDB (shared across all servers for global state)
- **Authentication**: Token-based, shared across all machines
- **Hosting**: Ubuntu servers managed by .service and .timer files, proxied through Nginx

---

## Styling Guide

The Server Manager NextJs uses a **terminal-inspired design language** — minimalist, functional, with high contrast and readability that evokes classic CRT terminal environments.

### Color Palette

The application uses a fully implemented terminal-inspired color system with a 10-step scale for each color category:

- **Brand (Terminal Orange)**: `#e95420` - Primary actions, links, active states
- **Gray (True Black)**: `#000000` to `#fcfcfc` - Neutral structure, backgrounds, text hierarchy
- **Success (Phosphor Green)**: `#10b981` - Positive states, confirmations
- **Error (Bright Red)**: `#ef4444` - Negative states, destructive actions
- **Warning (Amber)**: `#fbbf24` - Caution states, important notices
- **Info (Terminal Cyan)**: `#06b6d4` - Informational content, secondary highlights

All colors follow a standardized 10-step scale (25-950) defined in `src/app/globals.css`. Components reference these scales by name, allowing easy customization without code changes.

**For complete color scales, component usage examples, and customization guidelines, see [docs/STYLE_GUIDE.md](./docs/STYLE_GUIDE.md).**

### Typography

**Font**: JetBrains Mono (monospace) - Loaded via Google Fonts in `src/app/layout.tsx`

### Implementation Status

**These design guidelines are finalized but NOT YET IMPLEMENTED in code.** They should guide all future UI and style updates. Implementation pending design approval.

---

### Template Origin

This project originated from a Next.js admin dashboard template and was customized to fit the structure and goals of **The Server Manager**. The following references describe its starting point and base setup:

- Started from `npx create-next-app@latest`
  - No Turbopack → causes issues with SVG icons (`src/icons`)
- Architectural inspiration from [free-nextjs-admin-dashboard-main](https://tailadmin.com/download)
- Modified and extended to fit the 404 ecosystem’s requirements
- Uses:
  - App Router
  - Tailwind CSS
  - Redux Toolkit for state management
  - TypeScript

## Imports

### Required for Template

- `npm install @reduxjs/toolkit react-redux redux-persist`
- `npm install tailwind-merge`
- `npm i -D @svgr/webpack`
  - Requires an update to the `next.config.ts` file → see the file for details.
