---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (opus-4.7)
modified_by: claude (opus-4.7)
---

# Fix Log Location Configuration — V02 (20260517)

## Summary

Revised plan that addresses the concerns raised in
`20260517_PLAN_FIX_LOG_LOCATION_ASSESSMENT_CODEX.md` (V01-review) AND the
follow-up `20260517_PLAN_FIX_LOG_LOCATION_V02_ASSESSMENT_CODEX.md`
(V02-review).

The original plan documented a one-time MongoDB migration plus two web UI fixes
to switch service log paths from `/home/nick/logs/` to `/home/limited_user/logs/`.
The Codex V01-review surfaced one moderate execution gap and two minor
inconsistencies; the Codex V02-review surfaced one material data-loss risk in
the migration's schema/write strategy plus one minor gitignore gap.
This V02 (now incorporating both rounds of review):

- Wires the migration script into the `api/` workspace so the documented
  commands actually run.
- Tightens the dry-run/apply contract with an explicit `--apply --confirm`
  two-step.
- Narrows migration scope to the log-path bug and isolates the nginx-path
  default change as a separately-tracked concern.
- Updates the `ModalMachineAdd.tsx` placeholder so the visible hint matches the
  new default value.
- Replaces the "minimal Mongoose schema + whole-array `$set`" pattern with a
  `.lean()` read + native collection write that preserves every service field
  byte-for-byte.
- Adds `api/scripts/logs/` to `.gitignore` so audit-output files cannot be
  accidentally committed.

## Codex V01-review concerns — accepted as warranted

1. **Moderate: migration command will not run as written.** The npm script
   `update-logs-paths` is absent from `api/package.json` and V01 does not list
   `api/package.json` in its "Files to Modify" table. Verified by inspection —
   `api/package.json` only declares `dev`, `build`, `start`, `test`,
   `test:unit`, `test:watch`, `test:integration`. Additionally the script path
   `scripts/update-logs-paths.js` is ambiguous since the monorepo has no root
   `package.json` (per `AGENTS.md`).
2. **Minor: stale placeholder in `ModalMachineAdd.tsx`.** Line 249 still shows
   `placeholder="/home/nick/logs/"`. Changing only the initial `useState`
   default leaves the visible hint inconsistent.
3. **Minor: nginx default change is out-of-scope for the log-path bug.** V01
   line 24 (`"/home/nick"` in `nginxPaths` initial state) is unrelated to the
   `pathToLogs` migration. Bundling them obscures the rollback boundary.

## Codex V02-review concerns — accepted as warranted

The Codex review of V02 itself surfaced one material issue and one minor
execution note. Both are accepted and addressed inline below.

1. **Material: minimal-schema + whole-array replacement risks dropping service
   fields.** Verified against `api/src/models/machine.ts:32-59`: each
   `servicesArray` subdocument actually carries six fields — `name`,
   `filename`, `filenameTimer`, `workingDirectory`, `port`, and `pathToLogs`.
   V02 originally said to use an inline Mongoose schema declaring only the
   migration fields, then write the replacement via
   `$set: { servicesArray: ... }`. Under Mongoose's default strict mode,
   hydrated documents discard fields not declared in the schema, so the
   whole-array replacement would silently strip `name`, `filename`,
   `filenameTimer`, `workingDirectory`, and `port` from every migrated record.
   Resolution: read via `.lean()` so each document comes back as a plain JS
   object with every persisted field intact, build the updated array by
   spreading every existing service field, and write via the native collection
   API (`Machine.collection.updateOne`) so Mongoose never re-casts the
   payload. See the revised section 1 below.
2. **Minor: audit-output path is not gitignored.** V02 writes
   `api/scripts/logs/dry-run-*.txt`, but the root `.gitignore` does not cover
   that path; V02 originally left this as "Implementation detail for the
   executor." Resolution: `.gitignore` is now a first-class file in the "Files
   to modify" table, and the edit is sequenced before the first dry-run in
   "Execution order".

## What changed vs. V01

| Area                 | V01                                          | V02                                                                |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Script location      | `scripts/update-logs-paths.js` (ambiguous)   | `api/scripts/update-logs-paths.js`                                 |
| npm script           | Not wired — `npm run update-logs-paths` fails | New entry in `api/package.json`                                    |
| Env loading          | Unspecified                                  | `dotenv` loads `api/.env` explicitly                               |
| `--apply` safety     | Single `--apply` writes immediately          | Two-step: `--apply` previews; `--apply --confirm` writes           |
| Flag conflict        | Unspecified                                  | `--apply` + `--dry-run` together → error                           |
| Add-modal placeholder| Not changed (still `/home/nick/logs/`)       | Updated to `/home/limited_user/logs/`                              |
| Nginx default (line 24) | Bundled with log-path fix                | Explicitly out-of-scope; tracked separately                        |
| Migration scope      | "Replace all occurrences"                    | Anchored regex `^/home/nick/logs/` — only the prefix is rewritten  |

## Implementation plan

### 1. MongoDB migration script

**Files**:

- `api/scripts/update-logs-paths.js` (NEW)
- `api/package.json` (EDIT — V01 omitted this)

**`api/package.json` edit**:

Add to the `scripts` object:

```json
"update-logs-paths": "node scripts/update-logs-paths.js"
```

This is the change V01 missed. The npm script must be invocable from inside
`api/`, matching the documented `cd api && npm run update-logs-paths` pattern.

**Command line contract**:

| Invocation                                       | Behavior                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `npm run update-logs-paths`                      | Dry-run mode (default). Print banner, connect, scan, print proposed changes. No writes. Exit 0.            |
| `npm run update-logs-paths -- --dry-run`         | Same as above (explicit flag).                                                                            |
| `npm run update-logs-paths -- --apply`           | Print proposed changes and a "to write, re-run with `--apply --confirm`" hint. No writes. Exit 0.          |
| `npm run update-logs-paths -- --apply --confirm` | Connect, write per-machine via `Machine.collection.updateOne` (native driver — see section 1 Responsibilities), print per-record outcome and final summary. |
| `--apply` together with `--dry-run`              | Print error, exit non-zero.                                                                               |
| Any unknown flag                                 | Print usage, exit non-zero.                                                                               |

**Responsibilities**:

- Load env explicitly:
  `require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })`.
- Connect via `MONGODB_URI`. If missing, log "Missing MONGODB_URI" and exit 1.
- Register an inline Mongoose model for the `machines` collection. The model
  exists so that `Machine.collection` (the native MongoDB driver handle) is
  available and so the script does not need to know the collection name as a
  bare string. Do NOT import `api/src/models/machine.ts` — that would couple
  a one-off script to the TS build pipeline. The inline schema's contents do
  NOT determine which fields are read or written: reads use `.lean()` (which
  returns the raw BSON document with every persisted field intact, regardless
  of what the schema declares) and writes use the native collection API
  (which bypasses Mongoose casting entirely). The inline schema may therefore
  be declared as `new mongoose.Schema({}, { strict: false })` — its only
  purpose is to register the collection.
- Query: machines where any service has a `pathToLogs` starting with
  `/home/nick/logs/`. Use an anchored regex
  (`/^\/home\/nick\/logs\//`) so substrings inside otherwise-correct paths
  are never rewritten.
- Read raw documents via `.lean()`:

  ```js
  const machines = await Machine.find(query).lean();
  ```

  `.lean()` is REQUIRED — without it, a strict inline schema would drop
  fields like `workingDirectory` from the in-memory representation before
  the script ever sees them.

- For each match, build the updated service array by spreading every existing
  field and rewriting only `pathToLogs`. The spread guarantees that any
  service field present on disk — including ones the script does not name
  explicitly — survives the rewrite:

  ```js
  const updatedServices = machine.servicesArray.map((service) => ({
    ...service,
    pathToLogs: service.pathToLogs.replace(
      /^\/home\/nick\/logs\//,
      "/home/limited_user/logs/"
    ),
  }));
  ```

- Write via the native collection API. This bypasses Mongoose casting and
  guarantees the document written to disk is exactly the object built above,
  with no field stripping and no implicit defaults applied:

  ```js
  await Machine.collection.updateOne(
    { _id: machine._id },
    { $set: { servicesArray: updatedServices } }
  );
  ```

  Do NOT use `Machine.findByIdAndUpdate` here — it would route through the
  Mongoose document machinery and re-introduce the strict-mode risk that
  motivated this whole change.

- In dry-run modes: print `publicId`, `machineName`, and a `before → after`
  row per affected service. Print totals (machines touched, services touched).
- In `--apply --confirm`: same printing, then perform the writes one machine
  at a time using `Machine.collection.updateOne` as shown above. Log
  per-record success/failure. Exit 0 only if every write succeeded, otherwise
  non-zero.
- Print a final summary including a runtime ISO-8601 timestamp.

**Migration scope** (narrowed and explicit):

- ONLY mutates `servicesArray[].pathToLogs` values that begin with
  `/home/nick/logs/`.
- Every other service field — including but not limited to `name`,
  `filename`, `filenameTimer`, `workingDirectory`, and `port` (the full set
  declared by `api/src/models/machine.ts:32-59`) — MUST survive the rewrite
  byte-for-byte. The `.lean()` read + spread + native
  `collection.updateOne` pattern in **Responsibilities** is the mandated
  implementation precisely because it guarantees this. Any alternative that
  relies on a Mongoose-cast write (`findByIdAndUpdate`, `machine.save()`,
  etc.) is disallowed.
- Does NOT touch `userHomeDir`, `nginxStoragePathOptions`, `urlApiForTsmNetwork`,
  or any other top-level field.
- Does NOT delete, add, or reorder array elements.
- Skips machines where every service already has the correct prefix (counted
  but not written).

**Dry-run / apply safety**:

- Default behavior (no flag) is dry-run. The banner makes this explicit; the
  operator cannot mistakenly believe writes occurred.
- The `--apply` two-step requires the operator to inspect the diff before
  re-running with `--confirm`. A typo or muscle-memory invocation cannot
  silently write.
- Mutually-exclusive flags (`--apply` with `--dry-run`) are rejected
  before any DB connection so contradictions never reach mongoose.
- Before running `--apply --confirm`, save dry-run output to a timestamped
  file under `api/scripts/logs/dry-run-YYYYMMDD-HHMMSS.txt`. The script does
  this automatically when run in any mode. This serves as the operator-owned
  pre-image for rollback comparison; a programmatic backup of the collection
  is intentionally not added because it would require introducing collection
  cloning that does not exist elsewhere in this repo.

**Manual rollback**:

- Reverse direction by re-running the script with the regex flipped
  (`/^\/home\/limited_user\/logs\//` → `/home/nick/logs/`). Document this
  reversal as a comment at the bottom of the script so it lives next to the
  forward migration logic.

**Verification commands**:

```bash
cd api
npm run update-logs-paths -- --dry-run            # 1. Preview
npm run update-logs-paths -- --apply              # 2. Show diff again, exit without writing
npm run update-logs-paths -- --apply --confirm    # 3. Actually write

# 4. Sanity-check via mongosh:
#    db.machines.countDocuments({ "servicesArray.pathToLogs": /^\/home\/nick\/logs\// })
#    Expected: 0
```

### 2. Update `ModalMachineAdd.tsx`

**File**: `web/src/components/ui/modal/ModalMachineAdd.tsx` (EDIT)

**In-scope changes** (log-path bug only):

| Line | From                                  | To                                            |
| ---- | ------------------------------------- | --------------------------------------------- |
| 31   | `pathToLogs: "/home/nick/logs/",`     | `pathToLogs: "/home/limited_user/logs/",`     |
| 60   | `pathToLogs: "/home/nick/logs/",`     | `pathToLogs: "/home/limited_user/logs/",`     |
| 249  | `placeholder="/home/nick/logs/"`      | `placeholder="/home/limited_user/logs/"`      |

Line 249 is the addition V01 missed — it is the visible hint shown when the
field is empty. Without this edit the new default and the placeholder
disagree.

**Out-of-scope, deferred**:

- Line 24 (`"/home/nick"` in `nginxPaths` initial state). This is an nginx
  storage default, not a log path. It may be the right change for this host,
  but the rationale ("the API user is now `limited_user`") is a broader
  config-defaults concern that should land as its own commit with its own
  test plan. Tracking only — not in this PR.

**Why not derive the default from `machine.userHomeDir` like the Edit modal does?**

The Add modal has no `machine` object yet — the machine is being created and
`userHomeDir` is resolved by the backend after submission. A static default
is the only option here. Matching the production user's home directory is
acceptable as long as it stays in sync with the typical deployment;
re-evaluate if a second deployment target appears.

### 3. Fix `ModalMachineEdit.tsx` service visibility

**File**: `web/src/components/ui/modal/ModalMachineEdit.tsx` (EDIT)

Unchanged from V01. Replace line 52:

```diff
-      ? machine.servicesArray.map(() => false) // Existing services collapsed by default
+      ? machine.servicesArray.map((_, i) => i === 0) // First service expanded so "Path to Logs" is visible
```

Rationale: after the migration changes persisted `pathToLogs` values,
operators verifying the result via the Edit modal currently have to click
each service header to see the field. Expanding the first service is the
minimum change that supports verification without overwhelming the UI for
machines with many services.

## Files to modify (corrected)

| File                                                 | Type | Changes                                                              |
| ---------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| `api/scripts/update-logs-paths.js`                   | NEW  | Migration script per section 1                                       |
| `api/package.json`                                   | EDIT | Add `update-logs-paths` npm script (V01 missed this)                 |
| `.gitignore` (repo root)                             | EDIT | Add `api/scripts/logs/` so dry-run audit files are not committed     |
| `web/src/components/ui/modal/ModalMachineAdd.tsx`    | EDIT | Lines 31, 60 (defaults) and line 249 (placeholder)                   |
| `web/src/components/ui/modal/ModalMachineEdit.tsx`   | EDIT | Line 52 (expand first service)                                       |

**`.gitignore` edit**: append the following block (e.g. after the existing
"# Build outputs" group) to the root `.gitignore`:

```gitignore
# Migration audit output
api/scripts/logs/
```

## Execution order

1. Land the migration script, the `api/package.json` edit, and the
   `.gitignore` edit together (no DB writes occur yet). The `.gitignore`
   edit MUST precede the first dry-run so the auto-generated audit files
   under `api/scripts/logs/` are never tracked.
2. Run `npm run update-logs-paths -- --dry-run` against the production DB.
   Save the auto-generated `api/scripts/logs/dry-run-*.txt` artifact.
3. Review dry-run output with the operator. Confirm every proposed rewrite is
   a strict `/home/nick/logs/` → `/home/limited_user/logs/` prefix swap, and
   confirm every per-service `before → after` line shows the full set of
   non-`pathToLogs` fields the operator expects (the dry-run line for each
   service should make it obvious that `name`, `filename`, `filenameTimer`,
   `workingDirectory`, and `port` are unchanged).
4. Run `npm run update-logs-paths -- --apply` (no `--confirm`). Confirms the
   diff one more time without writing.
5. Run `npm run update-logs-paths -- --apply --confirm` to write.
6. Verify via the mongosh count query (expected: 0). Additionally, spot-check
   at least one migrated machine in mongosh and confirm that every service
   subdocument still has the same `name`, `filename`, `filenameTimer`,
   `workingDirectory`, and `port` values that the dry-run pre-image recorded
   — only `pathToLogs` should differ.
7. Land the two `Modal*.tsx` edits.
8. Manual UI smoke:
   - Open Add modal — default + placeholder both read `/home/limited_user/logs/`.
   - Open Edit modal for a migrated machine — first service expanded,
     `pathToLogs` displays the new path.
   - Submit changes — persisted record retains the new path.

## Verification checklist

- [ ] `api/package.json` contains a `update-logs-paths` script
- [ ] `.gitignore` contains `api/scripts/logs/` and the entry is committed
      BEFORE the first dry-run is executed
- [ ] `npm run update-logs-paths` (no flag) runs as dry-run, prints banner,
      makes no writes
- [ ] `npm run update-logs-paths -- --dry-run` matches the no-flag behavior
- [ ] `npm run update-logs-paths -- --apply` prints the diff and exits without
      writing
- [ ] `npm run update-logs-paths -- --apply --confirm` writes; post-run count
      query returns 0
- [ ] `npm run update-logs-paths -- --apply --dry-run` errors and exits non-zero
- [ ] Dry-run output is written to `api/scripts/logs/dry-run-*.txt` and is NOT
      tracked by git (`git status` shows nothing under `api/scripts/logs/`)
- [ ] No `userHomeDir`, `nginxStoragePathOptions`, or non-`pathToLogs` top-level
      field is mutated
- [ ] No service field other than `pathToLogs` is mutated; spot-checking a
      migrated machine in mongosh shows `name`, `filename`, `filenameTimer`,
      `workingDirectory`, and `port` exactly matching the dry-run pre-image
- [ ] Script reads with `.lean()` and writes with `Machine.collection.updateOne`
      (no `findByIdAndUpdate`, no `.save()`)
- [ ] `ModalMachineAdd.tsx` initial default AND placeholder both read
      `/home/limited_user/logs/`
- [ ] `ModalMachineEdit.tsx` opens existing machines with the first service
      expanded and `Path to Logs` visible
- [ ] Line 24 (`nginxPaths` default) is NOT changed in this PR

## Rollback

- **MongoDB**: re-run the script with the regex direction flipped (snippet
  documented inline as a comment in the script).
- **Web changes**: standard `git revert` of the two component edits.
- **Order**: web changes are independent of the migration and can be reverted
  individually.

## Notes

- Do NOT modify `api/package-lock.json` or `api/.env-obe`.
- The script uses an inline empty + `strict: false` Mongoose schema
  (`new mongoose.Schema({}, { strict: false })`) rather than importing
  `api/src/models/machine.ts`, to avoid coupling a one-off migration to the
  TS build pipeline. The schema is intentionally NOT "minimal in declared
  fields" — that pattern was the V02-review data-loss risk and is explicitly
  rejected (see section 1 Responsibilities and the disallowed-write list).
- No secrets are emitted: the dry-run output contains `publicId`,
  `machineName`, and before/after paths only. `MONGODB_URI` must never be
  logged — fail-fast error messages should say "Missing MONGODB_URI" without
  reflecting the value.
- Ignoring of `api/scripts/logs/` is NOT an "implementation detail" — it is
  a first-class deliverable. See the `.gitignore` row in "Files to modify"
  and step 1 of "Execution order", which require the `.gitignore` edit to
  land before the first dry-run.
