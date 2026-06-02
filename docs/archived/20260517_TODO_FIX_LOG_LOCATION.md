---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (opus-4.7)
modified_by: claude (opus-4.7)
---

# TODO — Fix Log Location (Implementation of V02 Plan)

Implementation-ready, sequential TODO list for an AI coding agent. Source of
truth: `docs/20260517_PLAN_FIX_LOG_LOCATION_V02.md` (accepted by Codex with no
remaining material blockers). Do not deviate from the plan; this document only
operationalises it.

---

## 0. Read-only context the agent must load first

Before touching any file:

1. Read `docs/20260517_PLAN_FIX_LOG_LOCATION_V02.md` end-to-end.
2. Read `AGENTS.md` and `CLAUDE.md` at the repo root.
3. Read these source files for reference only (do NOT edit yet):
   - `api/src/models/machine.ts`
   - `api/package.json`
   - `web/src/components/ui/modal/ModalMachineAdd.tsx`
   - `web/src/components/ui/modal/ModalMachineEdit.tsx`
   - `.gitignore`
4. Confirm current branch is `dev_03_log_file_reading` (or the dedicated
   feature branch the operator names). Do NOT create a new branch unless the
   operator instructs.

---

## 1. Hard safety constraints (read carefully — these apply throughout)

These constraints are absolute. Violating any of them is a stop-the-line event:

- **DB writes require explicit human approval.** The agent MAY run the script
  in dry-run modes (no flags, `--dry-run`, or bare `--apply`). The agent MUST
  NOT run `npm run update-logs-paths -- --apply --confirm` until the operator
  has explicitly approved it in chat for this specific session.
- **Do NOT modify `api/package-lock.json`.** It is currently dirty in the
  working tree from prior work. The edits in this TODO do not require
  installing any new dependency (`dotenv`, `mongoose`, and `path` are already
  present per `api/package.json`). Do NOT run `npm install`,
  `npm i`, `npm ci`, or anything that mutates the lockfile. If a step appears
  to require an install, STOP and ask the operator.
- **Do NOT modify or stage `api/.env-obe`.** It is an untracked operator file
  and must remain so.
- **Never use `git add -A`, `git add .`, or `git add -u`.** Always stage by
  explicit file path so the two dirty files above are not accidentally
  committed.
- **Never log, print, or echo `MONGODB_URI`.** The script's error path for a
  missing URI must say `Missing MONGODB_URI` only (no reflection of value).
  Any example URIs in this doc, commits, or commands must be written as
  `[REDACTED]`.
- **Do NOT skip git hooks.** Do not pass `--no-verify`. If a hook fails,
  investigate and fix.
- **Do NOT amend or force-push.** Always create new commits.
- **Do NOT change `nginxPaths` initial state on `ModalMachineAdd.tsx:24`.**
  It is explicitly out-of-scope per the plan.
- **Do NOT import `api/src/models/machine.ts` from the migration script.**
  Use the inline `strict: false` schema described in Phase 4.
- **Do NOT use `Machine.findByIdAndUpdate(...)` or `doc.save()` in the
  migration script.** Only `Machine.collection.updateOne(...)` is permitted
  for writes (native driver — bypasses Mongoose casting).

---

## 2. Pre-flight verification (read-only)

Run these commands; abort and report if any check fails.

```bash
# Confirm working directory and repo state
git -C /home/limited_user/applications/TheServerManager rev-parse --show-toplevel
git -C /home/limited_user/applications/TheServerManager status

# Expected dirty files (must remain untouched by this TODO):
#   M api/package-lock.json
#   ?? api/.env-obe
# Plus the two plan/assessment docs already in docs/. No other modifications.

# Confirm required deps are already installed (no install needed)
node -e "const p=require('/home/limited_user/applications/TheServerManager/api/package.json'); console.log({mongoose: p.dependencies.mongoose, dotenv: p.dependencies.dotenv});"
```

Acceptance:

- [ ] `git status` shows only the four pre-existing entries
      (`M api/package-lock.json`, `?? api/.env-obe`, the two docs).
- [ ] Output of the node one-liner shows both `mongoose` and `dotenv` are
      declared in `api/dependencies`.

---

## 3. Phase A — Land migration plumbing (no DB writes possible yet)

This phase produces one commit. All four edits in this phase must land
together. Stage them by explicit path.

### 3.1 Edit `.gitignore`

**File**: `/home/limited_user/applications/TheServerManager/.gitignore`

**Edit** (append at end, after the `# Docs` block):

```gitignore

# Migration audit output
api/scripts/logs/
```

Acceptance:

- [ ] `git diff .gitignore` shows ONLY the two-line additions above.
- [ ] `git check-ignore -v api/scripts/logs/dry-run-test.txt` exits 0 and
      cites the new rule.

### 3.2 Edit `api/package.json` — add npm script

**File**: `/home/limited_user/applications/TheServerManager/api/package.json`

**Edit** (insert into the `scripts` object, after the existing
`test:integration` entry; preserve trailing-comma rules and 2-space indent):

```json
    "test:integration": "jest --runInBand tests/integration --passWithNoTests",
    "update-logs-paths": "node scripts/update-logs-paths.js"
```

Constraints:

- Do NOT touch any other field. Specifically: no version bumps, no dependency
  changes, no devDependency changes. Touch only the `scripts` object.
- Do NOT run `npm install` afterwards. The script change does not require it
  and an install would mutate `api/package-lock.json` (forbidden).

Acceptance:

- [ ] `git diff api/package.json` shows ONLY the one-line addition.
- [ ] `node -e "console.log(require('/home/limited_user/applications/TheServerManager/api/package.json').scripts['update-logs-paths'])"`
      prints `node scripts/update-logs-paths.js`.
- [ ] `git status` still shows `api/package-lock.json` modified but
      unchanged from its pre-existing dirty state (use
      `git diff api/package-lock.json | wc -l` before and after this phase to
      confirm the line count is identical).

### 3.3 Create migration script

**File**: `/home/limited_user/applications/TheServerManager/api/scripts/update-logs-paths.js` (NEW)

The script is a Node CommonJS module. It MUST implement the contract below
exactly. Inline comments documenting the rollback regex direction are
required (per plan §Manual rollback).

#### 3.3.1 CLI contract (verbatim from the plan)

| Invocation | Behavior |
| --- | --- |
| `npm run update-logs-paths` | Dry-run (default). Banner, connect, scan, print diff. No writes. Exit 0. |
| `npm run update-logs-paths -- --dry-run` | Identical to bare invocation. |
| `npm run update-logs-paths -- --apply` | Print diff and a "to write, re-run with `--apply --confirm`" hint. No writes. Exit 0. |
| `npm run update-logs-paths -- --apply --confirm` | Connect, write per-machine via `Machine.collection.updateOne`, print per-record outcome and final summary. Exit 0 iff every write succeeded. |
| `--apply` together with `--dry-run` | Print error, exit non-zero (BEFORE any DB connection). |
| Any unknown flag | Print usage, exit non-zero. |

#### 3.3.2 Required behaviours

- Argv parse: hand-rolled (no new dependency). Accept only the flags above.
- Env load:
  `require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })`.
- If `process.env.MONGODB_URI` is falsy: print exactly
  `Missing MONGODB_URI` (no value reflection), exit 1.
- Register model inline:
  `const Machine = mongoose.model('Machine', new mongoose.Schema({}, { strict: false }), 'machines');`
  Pass the collection name explicitly so Mongoose's pluraliser cannot
  surprise the script.
- Query:
  `{ 'servicesArray.pathToLogs': /^\/home\/nick\/logs\// }`
  (anchored at start; substrings inside otherwise-correct paths are never
  matched).
- Read raw documents: `const machines = await Machine.find(query).lean();`
  (`.lean()` is mandatory — see plan §1 Responsibilities for why).
- For each match, build the updated array via spread so EVERY existing
  service field survives:

  ```js
  const updatedServices = machine.servicesArray.map((service) => ({
    ...service,
    pathToLogs: service.pathToLogs.replace(
      /^\/home\/nick\/logs\//,
      "/home/limited_user/logs/"
    ),
  }));
  ```

- Write (only in `--apply --confirm` mode) via the native driver:

  ```js
  await Machine.collection.updateOne(
    { _id: machine._id },
    { $set: { servicesArray: updatedServices } }
  );
  ```

  Use NO other write path. `findByIdAndUpdate`, `updateMany`, `bulkWrite`,
  and `doc.save()` are all disallowed for this script.

- Per-service printing (dry-run and apply-confirm both):
  `<publicId> <machineName>  serviceIdx=<n>  <before> -> <after>`.
  Print only `publicId`, `machineName`, and the before/after pair. Do NOT
  print `MONGODB_URI`, full documents, or any field beyond the two required
  for traceability.
- Final summary line includes:
  - Machines scanned, machines matched, services matched.
  - Writes attempted, writes succeeded, writes failed (apply-confirm only).
  - Mode (`dry-run` | `apply-preview` | `apply-confirm`).
  - Runtime start/end ISO-8601 timestamps.
- Auto-save the full run output (banner + per-service rows + summary) to
  `api/scripts/logs/dry-run-YYYYMMDD-HHMMSS.txt` in every mode. The
  directory is auto-created if absent (`fs.mkdirSync(..., { recursive: true })`).
- Skip silently-counting: machines whose every service already starts with
  `/home/limited_user/logs/` are counted as "already-correct" and not
  rewritten.
- Disconnect mongoose cleanly on every exit path (success and error).

#### 3.3.3 Inline rollback comment (mandatory)

At the bottom of the script, include a block comment that documents the
reverse-direction one-liner so a future operator finds it next to the
forward migration:

```js
/*
 * Manual rollback (reverses this migration):
 *   Swap both regexes below:
 *     query:          /^\/home\/limited_user\/logs\//
 *     map replacement: /^\/home\/limited_user\/logs\//  ->  "/home/nick/logs/"
 *   Save as scripts/update-logs-paths-rollback.js and run via:
 *     npm run update-logs-paths -- --apply --confirm
 *   (after wiring an equivalent npm script). Do NOT mutate this file in place
 *   to roll back — keep the forward script intact for audit.
 */
```

#### 3.3.4 Secret-handling rules (script implementation)

- Never log `process.env.MONGODB_URI` directly.
- Error messages may name env var keys, not values.
- The auto-saved audit file contains only banner + per-service rows + summary
  (i.e. nothing that touches `MONGODB_URI`).

### 3.4 Commit Phase A

Stage by explicit path so the dirty `api/package-lock.json` and untracked
`api/.env-obe` are NOT included:

```bash
cd /home/limited_user/applications/TheServerManager
git add .gitignore api/package.json api/scripts/update-logs-paths.js
git status   # verify ONLY these three are staged
```

Expected `git status` after staging:

- Changes to be committed: `.gitignore`, `api/package.json`,
  `api/scripts/update-logs-paths.js`.
- Changes not staged for commit: `api/package-lock.json` (unchanged from
  pre-existing dirty state).
- Untracked: `api/.env-obe`, the two pre-existing planning docs, this TODO
  (until committed elsewhere).

Commit (HEREDOC body — follow `CLAUDE.md` §Commit Message Guidance):

```bash
git commit -m "$(cat <<'EOF'
feat: add log-path migration script and audit-output ignore

- Adds api/scripts/update-logs-paths.js implementing the V02 plan: dry-run
  by default, two-step --apply / --apply --confirm, .lean() reads + native
  collection.updateOne writes to preserve every service field.
- Wires npm run update-logs-paths in api/package.json.
- Ignores api/scripts/logs/ so per-run audit files are never committed.

Refs: docs/20260517_PLAN_FIX_LOG_LOCATION_V02.md (sections 1, "Files to
modify", and "Execution order" step 1).

co-authored-by: claude (opus-4.7)
EOF
)"
```

Acceptance:

- [ ] `git log -1 --stat` shows exactly the three files above.
- [ ] `git diff HEAD~1 -- api/package-lock.json` is empty.
- [ ] `git diff HEAD~1 -- api/.env-obe` is empty (file is still untracked).

---

## 4. Phase B — Recommended TDD safety net (OPTIONAL but strongly advised)

**Status**: NOT required by the plan. Strongly recommended because the entire
purpose of V02 was to prevent service-field stripping; a unit test that proves
preservation is the highest-value safety net available and the infrastructure
already exists (`mongodb-memory-server` is in `devDependencies`).

If you skip this phase, document the skip in the PR description and rely on
the mongosh spot-check in Phase E to catch field loss.

If you do it:

1. Add a Jest test at
   `api/tests/scripts/update-logs-paths.test.js` (new directory; the file is
   intentionally `.js` to match the script).
2. The test spins up `mongodb-memory-server`, seeds a `machines` collection
   with at least one document whose `servicesArray` contains every field
   declared in `api/src/models/machine.ts:32-59` (`name`, `filename`,
   `filenameTimer`, `workingDirectory`, `port`, `pathToLogs`) plus one
   unexpected extra field (e.g. `customNote: "x"`) to prove the spread
   genuinely preserves arbitrary fields.
3. The test invokes the script's exported core function (refactor the script
   minimally to export `runOnce({ mongoUri, mode })` if needed — do this in
   Phase A if you commit to Phase B, otherwise leave the script as-is).
4. Asserts: after `mode: 'apply-confirm'`, the rewritten document equals the
   seed document with ONLY `pathToLogs` changed; `customNote`,
   `workingDirectory`, `port`, etc. are intact.
5. Runs via `npm test` from `api/`. Must NOT add new runtime dependencies.

If implementing Phase B forces refactoring the script, fold those changes
into the Phase A commit before pushing OR land Phase B as its own commit.
Either is acceptable; do not mix Phase B with Phase D/F.

---

## 5. Phase C — Dry-run against production DB (READ-ONLY)

Permitted without operator approval (these are read-only).

### 5.1 Bare invocation

```bash
cd /home/limited_user/applications/TheServerManager/api
npm run update-logs-paths
```

Expected:

- Banner identifies the script as running in dry-run mode.
- Per-service rows show `<before> -> <after>` for every affected service.
- Final summary prints counts and mode `dry-run`.
- Exit code 0.
- `api/scripts/logs/dry-run-YYYYMMDD-HHMMSS.txt` is created.
- `git status` does NOT show `api/scripts/logs/*` as untracked
  (`.gitignore` rule covers it).

### 5.2 Explicit `--dry-run`

```bash
npm run update-logs-paths -- --dry-run
```

Expected: identical behaviour to the bare invocation. New audit file written.

### 5.3 Flag-conflict guard

```bash
npm run update-logs-paths -- --apply --dry-run
```

Expected:

- Non-zero exit.
- Error printed BEFORE any mongoose connection is attempted (verify by
  briefly disconnecting network or by inspecting the script — the conflict
  guard must precede `mongoose.connect`).
- No audit file written (or, if written before the guard, the file should
  end at the error).

### 5.4 Apply-preview (no writes)

```bash
npm run update-logs-paths -- --apply
```

Expected:

- Same per-service diff as 5.1.
- Final line says e.g. "PREVIEW ONLY — re-run with --apply --confirm to write".
- Exit 0. No writes performed.
- Verify via mongosh that the count is unchanged (see 5.5 below).

### 5.5 mongosh count BEFORE any write

```bash
# Replace [REDACTED] with the actual URI only when you run; do not log it.
mongosh "[REDACTED]" --quiet --eval \
  'db.machines.countDocuments({ "servicesArray.pathToLogs": /^\/home\/nick\/logs\// })'
```

Record the number. This is the expected pre-image count and must match the
count of machines flagged by the dry-run.

Acceptance for Phase C:

- [ ] 5.1, 5.2, 5.4 each exit 0.
- [ ] 5.3 exits non-zero with a guard message and no write.
- [ ] The pre-image mongosh count equals the dry-run "machines matched"
      count.
- [ ] At least one fresh audit file exists under `api/scripts/logs/`.
- [ ] `git status` shows no new tracked files.

---

## 6. Phase D — STOP. Request explicit approval before writing.

The agent MUST pause here and present the following to the operator:

1. The path of the latest audit file under `api/scripts/logs/`.
2. The pre-image mongosh count.
3. A summary of proposed changes (machines touched, services touched).
4. A sample of three rewrites (full `<publicId> <machineName> serviceIdx=<n>
   <before> -> <after>` lines), confirming the rewrite is strictly the
   `/home/nick/logs/` → `/home/limited_user/logs/` prefix swap.

Then ask the operator verbatim:

> "Dry-run is clean. May I proceed with
> `npm run update-logs-paths -- --apply --confirm` to write to the
> production DB?"

Wait for an explicit "yes" / approval message. Anything ambiguous → ask
again. Do NOT proceed on silence, on "ok thanks", on a thumbs-up reaction
that you only infer, or on prior session approvals — this approval is
required PER SESSION.

---

## 7. Phase E — Apply migration (only after explicit approval)

### 7.1 Run the write

```bash
cd /home/limited_user/applications/TheServerManager/api
npm run update-logs-paths -- --apply --confirm
```

Expected:

- Per-service rows + per-machine write outcomes.
- Final summary: writes attempted == writes succeeded; writes failed == 0;
  mode `apply-confirm`.
- Exit 0.
- New audit file under `api/scripts/logs/`.

If any write fails: STOP. Do not retry blindly. Capture the audit file, the
stderr output, and the failing `publicId`s. Report to the operator and ask
for direction.

### 7.2 Post-write verification

```bash
mongosh "[REDACTED]" --quiet --eval \
  'db.machines.countDocuments({ "servicesArray.pathToLogs": /^\/home\/nick\/logs\// })'
# Expected: 0
```

Spot-check one migrated machine end-to-end. Pick a `publicId` from the
dry-run pre-image and run:

```bash
mongosh "[REDACTED]" --quiet --eval \
  'JSON.stringify(db.machines.findOne({ publicId: "<picked publicId>" }, { servicesArray: 1 }), null, 2)'
```

Confirm against the dry-run pre-image audit file that, for every service
subdocument:

- `name`, `filename`, `filenameTimer`, `workingDirectory`, and `port` are
  byte-for-byte identical to the pre-image.
- ONLY `pathToLogs` changed, and only its `/home/nick/logs/` prefix was
  swapped for `/home/limited_user/logs/`.

If any non-`pathToLogs` field changed: STOP. Trigger rollback (see Phase H)
and report.

Acceptance for Phase E:

- [ ] Post-migration count is 0.
- [ ] Spot-check shows zero collateral changes.
- [ ] Audit files retained locally under `api/scripts/logs/`.

---

## 8. Phase F — UI edits (independent of migration)

These edits do not depend on the DB migration in either direction. They can
land in the same PR or a follow-up; the plan puts them after the migration
because they support manual verification of the result.

### 8.1 Edit `web/src/components/ui/modal/ModalMachineAdd.tsx`

**File**: `/home/limited_user/applications/TheServerManager/web/src/components/ui/modal/ModalMachineAdd.tsx`

Three edits, exact:

| Line | From | To |
| ---- | ---- | -- |
| 31   | `pathToLogs: "/home/nick/logs/",` | `pathToLogs: "/home/limited_user/logs/",` |
| 60   | `pathToLogs: "/home/nick/logs/",` | `pathToLogs: "/home/limited_user/logs/",` |
| 249  | `placeholder="/home/nick/logs/"` | `placeholder="/home/limited_user/logs/"` |

Constraints:

- DO NOT change line 24 (`"/home/nick"` in `nginxPaths`). Out-of-scope per
  plan.
- Make no other edits to this file.

Acceptance:

- [ ] `git diff web/src/components/ui/modal/ModalMachineAdd.tsx` shows
      exactly three single-line changes, all on lines 31, 60, 249.
- [ ] No change anywhere else.

### 8.2 Edit `web/src/components/ui/modal/ModalMachineEdit.tsx`

**File**: `/home/limited_user/applications/TheServerManager/web/src/components/ui/modal/ModalMachineEdit.tsx`

One edit, exact (line 52):

```diff
-      ? machine.servicesArray.map(() => false) // Existing services collapsed by default
+      ? machine.servicesArray.map((_, i) => i === 0) // First service expanded so "Path to Logs" is visible
```

Acceptance:

- [ ] `git diff web/src/components/ui/modal/ModalMachineEdit.tsx` shows
      exactly the one-line change on line 52.
- [ ] No other change.

### 8.3 Manual UI smoke test

Do NOT skip. From `web/`:

```bash
cd /home/limited_user/applications/TheServerManager/web
# Use whichever start command the operator uses. Default per AGENTS.md:
npm run dev
```

Validate, in a browser:

- **Add modal** — open it. The `Path to Logs` field default and placeholder
  BOTH read `/home/limited_user/logs/`. (Defaults appear in the editable
  value; placeholder appears when the field is cleared.)
- **Edit modal** — open it for a machine that was migrated in Phase E. The
  first service in `servicesArray` is expanded by default; subsequent
  services remain collapsed. The expanded first service's `Path to Logs`
  shows the new `/home/limited_user/logs/...` path.
- **Submit** — submit the Edit modal without changes. The persisted record
  retains the new path (verify via mongosh or via re-opening the modal).

If the dev server cannot be started in the agent's environment, the agent
MUST report this explicitly rather than claiming success.

### 8.4 Commit Phase F

Stage by explicit path:

```bash
cd /home/limited_user/applications/TheServerManager
git add web/src/components/ui/modal/ModalMachineAdd.tsx \
        web/src/components/ui/modal/ModalMachineEdit.tsx
git status   # confirm ONLY these two are staged
```

Commit:

```bash
git commit -m "$(cat <<'EOF'
fix: align modal log-path defaults with migrated location

- ModalMachineAdd: default and placeholder both /home/limited_user/logs/
  (line 24 nginxPaths intentionally untouched — out-of-scope per V02 plan).
- ModalMachineEdit: first service expanded by default so Path to Logs is
  visible without an extra click.

Refs: docs/20260517_PLAN_FIX_LOG_LOCATION_V02.md sections 2 and 3.

co-authored-by: claude (opus-4.7)
EOF
)"
```

Acceptance:

- [ ] `git log -1 --stat` shows exactly the two files above.
- [ ] `api/package-lock.json` and `api/.env-obe` remain unstaged and
      unchanged from the start of this TODO.

---

## 9. Phase G — Final verification checklist (mirror of plan §Verification checklist)

Run through every item. Each must be true before declaring done.

- [ ] `api/package.json` contains a `update-logs-paths` script.
- [ ] `.gitignore` contains `api/scripts/logs/` and the entry was committed
      BEFORE the first dry-run executed (verify by inspecting commit order
      via `git log --oneline -- .gitignore api/scripts/`).
- [ ] `npm run update-logs-paths` (no flag) runs as dry-run, prints banner,
      makes no writes.
- [ ] `npm run update-logs-paths -- --dry-run` matches the no-flag behaviour.
- [ ] `npm run update-logs-paths -- --apply` prints the diff and exits
      without writing.
- [ ] `npm run update-logs-paths -- --apply --confirm` wrote; post-run
      mongosh count query returns 0.
- [ ] `npm run update-logs-paths -- --apply --dry-run` errors and exits
      non-zero.
- [ ] Dry-run output is written to `api/scripts/logs/dry-run-*.txt` and is
      NOT tracked by git (`git status` shows nothing under
      `api/scripts/logs/`).
- [ ] No `userHomeDir`, `nginxStoragePathOptions`, or non-`pathToLogs`
      top-level field is mutated.
- [ ] No service field other than `pathToLogs` is mutated; spot-checking a
      migrated machine in mongosh shows `name`, `filename`, `filenameTimer`,
      `workingDirectory`, and `port` exactly matching the dry-run pre-image.
- [ ] Script reads with `.lean()` and writes with
      `Machine.collection.updateOne` (no `findByIdAndUpdate`, no `.save()`).
- [ ] `ModalMachineAdd.tsx` initial default AND placeholder both read
      `/home/limited_user/logs/`.
- [ ] `ModalMachineEdit.tsx` opens existing machines with the first service
      expanded and `Path to Logs` visible.
- [ ] Line 24 (`nginxPaths` default) is NOT changed in this PR.
- [ ] `api/package-lock.json` working-tree diff is byte-identical to its
      pre-TODO state.
- [ ] `api/.env-obe` remains untracked and unmodified.

---

## 10. Phase H — Rollback procedures

### 10.1 DB rollback

Use the inline-comment instructions at the bottom of
`api/scripts/update-logs-paths.js`. Briefly: create
`api/scripts/update-logs-paths-rollback.js` that flips both regexes
(`/^\/home\/limited_user\/logs\//` in the query, replacement back to
`/home/nick/logs/`), wire a parallel npm script, and run via the same
two-step. Operator approval required per Phase D rules.

### 10.2 Web rollback

`git revert` of the Phase F commit. The migration is independent and does
NOT need to be reverted to revert the UI changes.

### 10.3 Plumbing rollback

`git revert` of the Phase A commit. Note: reverting Phase A while migrated
data exists in the DB is safe — the script is dormant; only the data has
changed.

---

## 11. Things this TODO deliberately does NOT instruct you to do

- Do NOT add ESLint, Prettier, or formatting fixes outside the listed edits.
- Do NOT touch any file under `api/src/` (the script lives in `api/scripts/`,
  not under `src/`).
- Do NOT add automated UI tests for the modal changes. They are simple
  default-value edits; manual verification is the agreed bar per the plan.
- Do NOT modify `docs/20260517_PLAN_FIX_LOG_LOCATION_V02.md` or any other
  doc. This TODO is the operational artefact; the plan itself stays as the
  signed-off reference.
- Do NOT push to remote or open a PR without explicit operator instruction.

---

## 12. Final reporting requirements

When done, the agent must report to the operator:

1. The commit SHAs created (Phase A, optional Phase B, Phase F).
2. Confirmation that `api/package-lock.json` diff is unchanged.
3. Confirmation that `api/.env-obe` is still untracked.
4. The mongosh post-migration count (must be 0).
5. The path of every audit file produced under `api/scripts/logs/`.
6. Pass/fail for each acceptance checkbox in §9.

Stop after reporting. Do not push, do not open a PR, do not run `--apply
--confirm` a second time.
