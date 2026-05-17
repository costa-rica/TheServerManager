---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (opus-4.7)
modified_by: claude (opus-4.7)
---

# Plan V03: Make TSM read date-suffixed log files

Supersedes [20260517_PLAN_LOG_FILE_READING_V02.md](20260517_PLAN_LOG_FILE_READING_V02.md). V02's regex did not actually match the Loguru renamed sibling it claimed to support — the `\.\d+\.log` branch fails because Loguru's timestamp suffix continues past the date with hyphens, underscores, and a microseconds field before reaching `.log`. Without the fix below, Python services would silently 404 in TSM every time a rotation occurred. V03 adds an explicit alternation branch for that filename shape and a regression test.

## Context

TheServerManager's log endpoint expects every service to write to a single fixed file `{name}.log`. The newer logging convention (see `/Users/nick/Documents/_logs/GoLightly04`) writes one file per day: `{NAME_APP}-YYYY-MM-DD.log`, so the static-name lookup 404s for any app that adopts it.

Going forward, all apps should use the date-suffixed convention so log files stop growing unbounded and old days are kept as historical record. Legacy apps (e.g. `GoLightly02API.log`) must keep working without forcing an immediate migration — TSM should transparently handle both naming styles.

The successor logging-instruction specs:

- [docs/references/log-file-instructions/LOGGING_NODE_JS_V08.md](references/log-file-instructions/LOGGING_NODE_JS_V08.md)
- [docs/references/log-file-instructions/LOGGING_PYTHON_V07.md](references/log-file-instructions/LOGGING_PYTHON_V07.md)

Active and rotated filenames produced by the recommended libraries:

| Source                                        | Active file (today)           | Within-day rotated sibling                                              |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| Node — `winston-daily-rotate-file`            | `{NAME}-YYYY-MM-DD.log`       | `{NAME}-YYYY-MM-DD.log.1`, `{NAME}-YYYY-MM-DD.log.2`, …                 |
| Python — Loguru with custom rotation callable | `{NAME}-YYYY-MM-DD.log`       | `{NAME}-YYYY-MM-DD.YYYY-MM-DD_HH-MM-SS_microseconds.log` (Loguru rename) |

TSM must accept all of these patterns and not break on legacy `{NAME}.log`.

## Behavior decision: newest segment, not concatenation

`GET /services/logs/:name` returns **one file**: the newest segment by modification time. Rationale:

- Matches the current modal's expectations (single-file view).
- Smallest change; route + UI unchanged.
- Concatenation across same-day rotated siblings is deferred until an operator actually requests a "today, in order" view.

## Changes

### 1. Update `readLogFile()` in [api/src/modules/services.ts:332](../api/src/modules/services.ts)

Modify `readLogFile(pathToLogs, name)`:

1. **Fast path (legacy)** — if `path.join(pathToLogs, '${name}.log')` exists, read and return it. No directory scan.
2. **Slow path (date-suffixed)** — `fs.readdir(pathToLogs)` and filter entries against the union regex below.
3. If no matches, return `{ success: false, error: ... }` whose message lists both lookups that were attempted (the legacy filename and the date-suffixed pattern).
4. Otherwise `fs.stat` each candidate, pick the one with the newest `mtime`, read it, return it.

#### Regex

Escape `name` first (service names may contain regex metacharacters even though current ones don't), then match four explicit shapes:

```ts
const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dateSuffixed = new RegExp(
  `^${escaped}-\\d{4}-\\d{2}-\\d{2}` +
  `(?:` +
    `\\.log(?:\\.\\d+)?` +                                  // {name}-YYYY-MM-DD.log[.N]
    `|\\.\\d+\\.log` +                                      // {name}-YYYY-MM-DD.N.log
    `|\\.\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}_\\d+\\.log` + // Loguru renamed sibling
  `)$`
);
```

This matches:

| File                                                                    | Matches? | Source                       |
| ----------------------------------------------------------------------- | -------- | ---------------------------- |
| `GoLightly04API-2026-05-17.log`                                         | yes      | Node + Python active file    |
| `GoLightly04API-2026-05-17.log.1`                                       | yes      | Node within-day overflow     |
| `GoLightly04API-2026-05-17.log.2`                                       | yes      | Node within-day overflow     |
| `GoLightly04API-2026-05-17.2026-05-17_12-56-30_269989.log`              | yes      | Loguru renamed sibling       |
| `GoLightly04API-2026-05-17.1.log`                                       | yes      | tolerated alternative form   |
| `GoLightly04API.log`                                                    | no       | handled by the legacy fast path |
| `something-else.log`                                                    | no       | unrelated                    |

#### Why mtime, not lexicographic sort

`GoLightly04API-2026-05-17.log.1` sorts *after* `GoLightly04API-2026-05-17.log` (fine for Node), but `GoLightly04API-2026-05-17.2026-05-17_12-56-30_269989.log` sorts *before* `GoLightly04API-2026-05-17.log` because `.2` < `.l` in ASCII. A name sort would pick the wrong file for Loguru output. `mtime` is reliable across all four patterns.

### 2. Tests

Add focused tests for `readLogFile`. Use a tempdir per test:

- `returns_legacy_when_present` — only `{name}.log` exists → returns its content via the fast path.
- `returns_base_dated_file` — only `{name}-2026-05-17.log` exists → returns it.
- `returns_newest_node_overflow_by_mtime` — `{name}-2026-05-17.log` (older mtime) + `{name}-2026-05-17.log.1` (newer mtime) → returns the `.log.1` file.
- `returns_newest_loguru_overflow_by_mtime` — `{name}-2026-05-17.log` (newer mtime) + `{name}-2026-05-17.2026-05-17_12-56-30_269989.log` (older mtime) → returns the active `.log` file.
- `matches_loguru_rename_when_only_candidate` — only `{name}-2026-05-17.2026-05-17_12-56-30_269989.log` exists → regex matches and the file is returned (regression test for the V02 regex bug).
- `prefers_legacy_when_both_exist` — `{name}.log` and `{name}-2026-05-17.log` both exist → returns the legacy file (fast path wins, no surprise migration).
- `missing_directory` — `pathToLogs` does not exist → `{success: false}` with directory-missing message.
- `missing_file` — directory exists but no matching files → `{success: false}` whose message names both the legacy path and the date-suffixed pattern attempted.

Place tests alongside existing API tests (`api/tests/...`); follow the project's existing Jest patterns.

### 3. No route or UI changes

[api/src/routes/services.ts:432](../api/src/routes/services.ts) already consumes `{success, content?, error?}`. [web/src/components/ui/modal/ModalServiceLog.tsx](../web/src/components/ui/modal/ModalServiceLog.tsx) renders the returned text. No changes to either.

## Critical files

- [api/src/modules/services.ts](../api/src/modules/services.ts) — only code change (`readLogFile`, around line 332)
- `api/tests/...` — new test file for `readLogFile`
- [api/src/routes/services.ts](../api/src/routes/services.ts) — read-only reference (no change)
- [docs/references/log-file-instructions/LOGGING_NODE_JS_V08.md](references/log-file-instructions/LOGGING_NODE_JS_V08.md) — already updated
- [docs/references/log-file-instructions/LOGGING_PYTHON_V07.md](references/log-file-instructions/LOGGING_PYTHON_V07.md) — already updated

## Verification

1. **Date-suffixed path** — point `pathToLogs` at `/Users/nick/Documents/_logs/GoLightly04`, call resolver with `name = "GoLightly04API"`. Expect `GoLightly04API-2026-05-17.log` content (newest by mtime).
2. **Legacy fast path** — point at `/Users/nick/Documents/_logs/GoLightly` with `name = "GoLightly02API"`. Expect `GoLightly02API.log` returned via the fast path with no directory scan.
3. **Node overflow simulation** — in a scratch dir, `touch` `{name}-2026-05-17.log`, then later `{name}-2026-05-17.log.1`. Expect the `.log.1` file to win on mtime.
4. **Loguru overflow simulation** — in a scratch dir, `touch` `{name}-2026-05-17.2026-05-17_12-56-30_269989.log`, then later `{name}-2026-05-17.log`. Expect the `.log` file to win on mtime (active file is newest).
5. **Loguru-only directory** — in a scratch dir, create only `{name}-2026-05-17.2026-05-17_12-56-30_269989.log`. Expect a successful read (regression check for the V02 regex bug).
6. **Missing both** — directory exists but contains no matching file. Expect `{success: false}` with a message that names both lookups.
7. **End-to-end** — run the API in `testing` or `production` `NODE_ENV` against a machine whose `servicesArray` includes both a legacy service and a date-suffixed service; hit `GET /services/logs/:name` for each from the web UI and confirm both render.
