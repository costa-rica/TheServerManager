# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Server Manager NextJs** is the primary user-facing dashboard for The Server Manager ecosystem — a comprehensive suite for monitoring, managing, and orchestrating servers and their applications. This Next.js web portal connects to various APIs deployed on each machine, all secured by shared authentication and a unified MongoDB instance.

The dashboard provides real-time visibility for:

- Services process logs from any connected machine
- Services status for processes running on any connected machine
- DNS management via Porkbuns API (Type A subdomains)
- Automatic Nginx configuration generation and management
- Server configuration file viewing and management

**Architecture Stack:**

- Frontend: Next.js 16 (App Router) + TypeScript
- Styling: Tailwind CSS v4
- State Management: Redux Toolkit with persistence
- Backend Integration: Connects to TheServerManagerAPI instances on each Ubuntu server
- Database: Shared MongoDB across all servers
- Authentication: Token-based, shared across all machines

## Development Commands

```bash
# Start development server on port 3001
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Core Architecture Patterns

### Route Groups & Layouts

Next.js App Router uses route groups (parentheses) for layout organization. Route groups do NOT appear in URLs:

**`(dashboard)`** — `src/app/(dashboard)/layout.tsx`

- Wraps authenticated pages with `AppHeader` + `AppSidebar`
- Provides responsive sidebar with expand/collapse functionality
- Uses `SidebarProvider` context for state management
- Example: `/home` route at `src/app/(dashboard)/home/page.tsx`
- Sidebar positioned on RIGHT side of screen (custom from template)

**`(full-width)/(auth)`** — `src/app/(full-width)/(auth)/layout.tsx`

- Full-width pages without dashboard chrome
- Split-screen auth layout with logo on right side
- Example: `/login` route at `src/app/(full-width)/(auth)/login/page.tsx`

### State Management with Redux

Redux store configuration in `src/store/index.ts`:

```typescript
// Store setup with persistence
const rootReducer = combineReducers({ user });
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["user"], // Only persist user slice
};
```

**User slice** (`src/store/features/user/userSlice.ts`):

- `loginUser`: Sets token, username, email, isAdmin after authentication
- `logoutUser`: Clears token and user info
- `logoutUserFully`: Complete state reset (use this for logout flows)

**Typed hooks** (`src/store/hooks.ts`):

- Use `useAppDispatch` and `useAppSelector` instead of raw Redux hooks
- Provides proper TypeScript inference

**Provider hierarchy** (`src/app/layout.tsx`):

1. `<Providers>` — Redux Provider + PersistGate (`src/app/providers.tsx`)
2. `<ThemeProvider>` — Dark/light mode context (`src/context/ThemeContext.tsx`)
3. `<SidebarProvider>` — Sidebar state management (`src/context/SidebarContext.tsx`)

### Authentication & Route Protection

**IMPLEMENTATION STATUS:** Fully implemented with Next.js middleware and HTTP-only cookies

Authentication uses a **hybrid approach** combining server-side route protection with client-side token management:

#### Login Flow

1. User submits email/password via `src/components/auth/LoginForm.tsx`
2. POST to `/api/auth/login` (Next.js API route)
3. API route calls backend, receives token
4. Sets HTTP-only cookie `auth-token` (for middleware protection)
5. Returns token + user data to client
6. Redux stores token via `dispatch(loginUser(resJson))`
7. Token persisted to localStorage via redux-persist
8. Router navigates to `/servers/machines`

**Files:**

- Login form: `src/components/auth/LoginForm.tsx`
- API route: `src/app/api/auth/login/route.ts`
- User slice: `src/store/features/user/userSlice.ts`

#### Logout Flow

1. User clicks logout in `src/layout/AppSidebar.tsx`
2. POST to `/api/auth/logout` (clears HTTP-only cookie)
3. Redux state cleared via `dispatch(logoutUserFully())`
4. Router navigates to `/login`

**Files:**

- Logout button: `src/layout/AppSidebar.tsx`
- API route: `src/app/api/auth/logout/route.ts`

#### Route Protection (Middleware)

All routes except `/login`, `/register`, and `/forgot-password` are protected by Next.js middleware.

**How it works:**

1. Middleware runs on every request (before page loads)
2. Checks for `auth-token` cookie
3. No cookie → redirect to `/login`
4. Has cookie → allow access

**Files:**

- Middleware: `src/middleware.ts`
- Protected routes: Everything except auth pages and `/api/*`

**IMPORTANT:** Middleware must be in `src/` directory (not project root) for projects using `src/` structure.

#### Backend API Calls

All non-auth API calls continue to use direct fetch to backend:

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/endpoint`,
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }
);
```

Token is retrieved from Redux state via `useAppSelector((state) => state.user.token)`.

**Why this hybrid approach?**

- Cookie enables server-side route protection (can't be bypassed by user)
- Token in Redux allows components to make authenticated API calls
- Minimal changes to existing fetch patterns
- Only login/logout use `/api/auth/*` routes

### SVG Icons

Icons in `src/icons/` transformed to React components via `@svgr/webpack`:

- Webpack config in `next.config.ts` handles `.svg` imports
- Import: `import { HouseIcon, LogoutIcon } from "@/icons"`

### Sidebar Navigation

Sidebar menu defined in `src/layout/AppSidebar.tsx`:

```typescript
// Main navigation items
const navItems: NavItem[] = [
  {
    icon: <HouseIcon />,
    name: "Home",
    subItems: [{ name: "Home page", path: "/home" }],
  },
  // ...
];

// Admin/other items
const othersItems: NavItem[] = [
  {
    icon: <DatabaseIcon />,
    name: "Database",
    subItems: [
      { name: "Backup", path: "/admin-database/backup" },
      // ...
    ],
  },
];
```

**Adding new routes:**

1. Create page: `src/app/(dashboard)/your-route/page.tsx`
2. Add to `navItems` or `othersItems` in AppSidebar
3. Page automatically inherits dashboard layout

**Sidebar behavior:**

- RIGHT-side placement (custom from template)
- Desktop: Expands/collapses between 290px and 90px
- Mobile: Slides over with backdrop
- Click collapsed sidebar to expand
- Auto-opens parent menu when child route is active

### Component Organization

```
src/components/
├── auth/              # LoginForm, RegistrationForm
├── form/              # Form inputs, selects, switches, labels, etc.
├── ui/                # Reusable primitives (button, modal, dropdown, alert, badge, table)
├── common/            # Shared components (breadcrumbs, theme toggle, chart tabs)
└── tables/            # Specialized table components

src/layout/            # Top-level layout components
├── AppHeader.tsx      # Top navigation bar
├── AppSidebar.tsx     # Right-side navigation sidebar
├── Backdrop.tsx       # Mobile overlay
└── SidebarWidget.tsx  # Sidebar content widgets
```

### TypeScript Configuration

Path alias: `@/*` → `./src/*`

Example: `import { AppHeader } from "@/layout/AppHeader"`

**IMPORTANT: Strict Typing Requirements**

This project enforces strict ESLint rules that **prohibit the use of `any` type**. All code must be properly typed:

- Use explicit types for all function parameters and return values
- Import proper types from libraries (e.g., `Row<T>` from `@tanstack/react-table`)
- Avoid `any` type — use specific types, generics, or `unknown` when appropriate
- The build will fail if ESLint detects `any` types in the code

When adding new code, always ensure proper TypeScript typing to pass `npm run build`.

### Styling with Tailwind

- Tailwind CSS v4 via `@tailwindcss/postcss`
- Global styles: `src/app/globals.css`
- Dark mode: Use `dark:` prefix (managed by ThemeContext)
- Font: JetBrains Mono (monospace)

### Context Usage

Both contexts require `"use client"`:

```typescript
// Theme (dark/light mode)
import { useTheme } from "@/context/ThemeContext";
const { isDarkMode, toggleTheme } = useTheme();

// Sidebar state
import { useSidebar } from "@/context/SidebarContext";
const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
  useSidebar();
```

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

## Backend Integration

The project uses **split environment variables** to handle server-side vs client-side API calls:

### Environment Variables

Add to `.env.local` (not in repo):

```bash
# Internal API (server-side only) - localhost for same-machine routing
NEXT_PUBLIC_INTERNAL_API_BASE_URL=http://localhost:8002

# External API (client-side) - public domain for browser requests
NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://dev.nws-the404.the404api.dashanddata.com

# Development mode
NEXT_PUBLIC_MODE=workstation  # Prefills login form
```

### Why Split URLs?

**Problem**: When Next.js and the API run on the same server, **server-side routes cannot reach the public domain** due to NAT hairpinning restrictions. The server cannot connect to its own public IP.

**Solution**: Use different URLs based on execution context:

| Context         | Variable                            | Example                     | Used By                               |
| --------------- | ----------------------------------- | --------------------------- | ------------------------------------- |
| **Server-side** | `NEXT_PUBLIC_INTERNAL_API_BASE_URL` | `http://localhost:8002`     | `/api/auth/login`, `/api/auth/logout` |
| **Client-side** | `NEXT_PUBLIC_EXTERNAL_API_BASE_URL` | `https://dev.nws-the404...` | Component fetch calls                 |

### API Call Patterns

User the connected machine's API to make API calls. These examples are for the first call where a machine is not connected and we use the default .env variable `NEXT_PUBLIC_EXTERNAL_API_BASE_URL`.

**Server-side** (Next.js API routes):

```typescript
// src/app/api/auth/login/route.ts
const response = await fetch(
  `${process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL}/users/login`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }
);
```

**Client-side** (components):

```typescript
// src/app/(dashboard)/servers/machines/page.tsx
const response = await fetch(
  `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/machines`,
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
```

## Template Notes

This project originated from `create-next-app@latest` and was customized from the TailAdmin template architecture. Key customizations:

- Sidebar moved to RIGHT side
- Component renaming: `SignInForm` → `LoginForm`, `SignUpForm` → `RegistrationForm`
- Redux persistence configured for user authentication state
- Custom SVG icon webpack loader

## Adding New Features

**New dashboard page:**

1. Create: `src/app/(dashboard)/your-page/page.tsx`
2. Add route to sidebar: `src/layout/AppSidebar.tsx`
3. Inherits header + sidebar automatically

**New Redux state:**

1. Create slice: `src/store/features/your-feature/yourFeatureSlice.ts`
2. Add to `rootReducer` in `src/store/index.ts`
3. Add to `whitelist` if state should persist
4. Use `useAppDispatch`/`useAppSelector` in components

**New auth page:**

1. Create: `src/app/(full-width)/(auth)/your-page/page.tsx`
2. Inherits full-width auth layout automatically

## Implementation Difficulty Index

This index helps Claude determine how challenging a proposed implementation would be within this project’s architecture and conventions. Claude should use this to assign a score from 0 to 10 when assessing new implementation requests.

**Scale:**

0: no need to change anything — functionality already exists  
1: minor modifications to existing files  
2: major modifications to existing files  
3–4: create new files  
5–6: create new files and folders  
7–8: change current structure and architecture (renaming, deleting, or repurposing)  
9: outside the range of convention given the technology, packages, and architecture in use  
10: impossible to accomplish
