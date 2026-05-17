---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (opus-4.7)
modified_by: claude (opus-4.7)
---

# TODO: TSM log file reading — date-suffixed support

Implements [docs/20260517_PLAN_LOG_FILE_READING_V03.md](../20260517_PLAN_LOG_FILE_READING_V03.md). Teach `readLogFile()` to find both the legacy `{name}.log` and the new date-suffixed naming styles produced by `winston-daily-rotate-file` (`{name}-YYYY-MM-DD.log[.N]`) and Loguru (`{name}-YYYY-MM-DD.YYYY-MM-DD_HH-MM-SS_microseconds.log`). Return the newest segment by `mtime`.

All work is in the `api/` sub-project. Run commands from `cd api/`.

---

## Phase 1 — Implement and unit-test `readLogFile()`

Touches only [api/src/modules/services.ts](../../api/src/modules/services.ts) and a new test file under `api/tests/modules/`.

- [ ] Update `readLogFile(pathToLogs, name)` in [api/src/modules/services.ts:332](../../api/src/modules/services.ts):
  - [ ] Keep the existing fast path: if `path.join(pathToLogs, '${name}.log')` exists, read and return it unchanged.
  - [ ] On miss, `fs.readdir(pathToLogs)` and filter entries against the union regex below. Escape `name` before building the regex.
        ```ts
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const dateSuffixed = new RegExp(
          `^${escaped}-\\d{4}-\\d{2}-\\d{2}` +
          `(?:` +
            `\\.log(?:\\.\\d+)?` +                                         // {name}-YYYY-MM-DD.log[.N]  (Node)
            `|\\.\\d+\\.log` +                                             // {name}-YYYY-MM-DD.N.log    (tolerated)
            `|\\.\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}_\\d+\\.log` +   // Loguru rename
          `)$`
        );
        ```
  - [ ] If no candidates match, return `{ success: false, error: ... }` whose message names both lookups attempted (the legacy `{name}.log` path and the date-suffixed pattern).
  - [ ] If one or more candidates match, `fs.stat` each, pick the entry with the newest `mtime`, read it, return it as `{ success: true, content }`.
  - [ ] Preserve the existing logger calls and the directory-missing branch.
- [ ] Add `api/tests/modules/services.test.ts` covering `readLogFile`. Each test uses a fresh tempdir under `os.tmpdir()` and cleans up afterward:
  - [ ] `returns_legacy_when_present` — only `{name}.log` exists → returns its content via the fast path.
  - [ ] `returns_base_dated_file` — only `{name}-2026-05-17.log` exists → returns it.
  - [ ] `returns_newest_node_overflow_by_mtime` — `{name}-2026-05-17.log` (older mtime) + `{name}-2026-05-17.log.1` (newer mtime via `fs.utimes`) → returns `.log.1`.
  - [ ] `returns_newest_loguru_overflow_by_mtime` — `{name}-2026-05-17.2026-05-17_12-56-30_269989.log` (older mtime) + `{name}-2026-05-17.log` (newer mtime) → returns the active `.log` file.
  - [ ] `matches_loguru_rename_when_only_candidate` — only `{name}-2026-05-17.2026-05-17_12-56-30_269989.log` exists → regex matches and the file is returned. (Regression test for the V02 regex bug.)
  - [ ] `prefers_legacy_when_both_exist` — `{name}.log` and `{name}-2026-05-17.log` both exist → returns the legacy file (fast path wins).
  - [ ] `missing_directory` — `pathToLogs` does not exist → `{success: false}` with a directory-missing message.
  - [ ] `missing_file` — directory exists but no matching files → `{success: false}` whose error message names both the legacy path and the date-suffixed pattern attempted.
- [ ] Run `npm test` from `api/` — all tests (existing + new) must pass.
- [ ] Run `npm run build` from `api/` — `tsc` must succeed with no errors.
- [ ] Check off this phase's items and commit. Commit message references this TODO file and Phase 1.

---

## Phase 2 — End-to-end verification against real log folders

No code changes expected. If a discrepancy is found, fix it under Phase 1, retest, and recommit before completing this phase.

- [ ] Confirm `NODE_ENV` is `testing` or `production` for the run (the route gates on this at [api/src/routes/services.ts:440](../../api/src/routes/services.ts)).
- [ ] Ensure a `Machine` document for the current host (`machineName` from OS) has `servicesArray` entries for both:
  - [ ] a legacy service whose `pathToLogs` is `/Users/nick/Documents/_logs/GoLightly` and `name` is `GoLightly02API`
  - [ ] a date-suffixed service whose `pathToLogs` is `/Users/nick/Documents/_logs/GoLightly04` and `name` is `GoLightly04API`
- [ ] Start the API (`npm run dev` from `api/`) and the web app (`npm run dev` from `web/`).
- [ ] In the web UI, open the log modal for the legacy service — content of `GoLightly02API.log` renders.
- [ ] In the web UI, open the log modal for the date-suffixed service — content of `GoLightly04API-2026-05-17.log` renders (newest by mtime in that folder today).
- [ ] Manually rename one of the GoLightly04 files to a Loguru-shaped sibling in a scratch copy of the folder, point a temporary service at it, and confirm TSM still returns it. (Optional sanity check — skip if Phase 1's `matches_loguru_rename_when_only_candidate` unit test is enough confidence.)
- [ ] Check off this phase's items and commit any incidental fixes. Commit message references this TODO file and Phase 2.
