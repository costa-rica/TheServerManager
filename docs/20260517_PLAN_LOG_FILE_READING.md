---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (opus-4.7)
modified_by: claude (opus-4.7)
---

# Plan: Make TSM read date-suffixed log files

## Context

TheServerManager's log endpoint expects every service to write to a single fixed file `{name}.log`. A newer logging convention (see `/Users/nick/Documents/_logs/GoLightly04`) writes one file per day: `{NAME_APP}-YYYY-MM-DD.log`, so the static-name lookup 404s for any app that adopts it.

Going forward, all apps should use the date-suffixed convention so log files stop growing unbounded and old days are kept as historical record. Legacy apps (e.g. `GoLightly02API.log`) must keep working without forcing an immediate migration — TSM should transparently handle both naming styles.

The successor logging-instruction specs that codify the new convention live alongside the prior versions:

- [docs/references/log-file-instructions/LOGGING_NODE_JS_V08.md](references/log-file-instructions/LOGGING_NODE_JS_V08.md)
- [docs/references/log-file-instructions/LOGGING_PYTHON_V07.md](references/log-file-instructions/LOGGING_PYTHON_V07.md)

Existing V07 / V06 docs are left untouched.

## Changes

### 1. Update `readLogFile()` to handle both naming conventions

**File:** [api/src/modules/services.ts:332](../api/src/modules/services.ts)

Modify `readLogFile(pathToLogs, name)`:

1. If `path.join(pathToLogs, '${name}.log')` exists, read and return it (legacy path — unchanged behavior).
2. Otherwise, `fs.readdir(pathToLogs)` and filter for entries matching `^{name}-\d{4}-\d{2}-\d{2}(\..+)?\.log$` (escape `name` for regex). This matches both:
   - `GoLightly04API-2026-05-17.log` (daily file)
   - `GoLightly04API-2026-05-17.1.log` (within-day size-rotation overflow)
3. If no matches, return the existing `{ success: false, error: ... }` shape with a message that lists what was searched for (both the legacy path and the date-suffixed glob).
4. Otherwise `fs.stat` each candidate, pick the one with the newest `mtime`, read it, return it.
   - **Why mtime, not lexicographic sort:** `GoLightly04API-2026-05-17.1.log` sorts *before* `GoLightly04API-2026-05-17.log` because `.1` < `.l` in ASCII, so a name sort would pick the wrong file when a within-day rotation has occurred.

Route handler at [api/src/routes/services.ts:432](../api/src/routes/services.ts) is unchanged — it already consumes the `{success, content?, error?}` shape. Web UI ([web/src/components/ui/modal/ModalServiceLog.tsx](../web/src/components/ui/modal/ModalServiceLog.tsx)) is unchanged.

**Imports already present** in `services.ts`: `fs` (promises), `path`. No new deps.

### 2. New logging-instruction docs (already written)

- [LOGGING_NODE_JS_V08.md](references/log-file-instructions/LOGGING_NODE_JS_V08.md) — Winston + `winston-daily-rotate-file`, naming `{NAME_APP}-YYYY-MM-DD.log` with within-day size overflow as `.1.log`, `.2.log`, etc. Local-timezone date.
- [LOGGING_PYTHON_V07.md](references/log-file-instructions/LOGGING_PYTHON_V07.md) — Loguru with two sinks (daily-midnight rotation and `LOG_MAX_SIZE_IN_MB` size rotation), same naming convention.

Both files carry the YAML frontmatter required by [AGENTS.md](../AGENTS.md).

## Critical files

- [api/src/modules/services.ts](../api/src/modules/services.ts) — only code change (`readLogFile`, around line 332)
- [api/src/routes/services.ts](../api/src/routes/services.ts) — read-only reference (no change)
- [docs/references/log-file-instructions/LOGGING_NODE_JS_V08.md](references/log-file-instructions/LOGGING_NODE_JS_V08.md) — already created
- [docs/references/log-file-instructions/LOGGING_PYTHON_V07.md](references/log-file-instructions/LOGGING_PYTHON_V07.md) — already created

## Verification

1. **Date-suffixed path** — point `pathToLogs` at `/Users/nick/Documents/_logs/GoLightly04` and call the resolver with `name = "GoLightly04API"`. Expect it to return the contents of `GoLightly04API-2026-05-17.log` (newest by mtime in that folder).
2. **Legacy fast path** — point at `/Users/nick/Documents/_logs/GoLightly` with `name = "GoLightly02API"`. Expect it to return `GoLightly02API.log` via the fast path (no readdir needed).
3. **Missing both** — call with a name that has neither form. Expect `{success: false, error: ...}` with a clear message naming both lookups that were attempted.
4. **End-to-end** — run the API in `testing` or `production` `NODE_ENV` against a machine document whose `servicesArray` includes both a legacy service and a date-suffixed service; hit `GET /services/logs/:name` for each from the web UI and confirm both render.
