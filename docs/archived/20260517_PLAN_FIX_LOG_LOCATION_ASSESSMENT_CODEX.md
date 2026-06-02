---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Assessment: Fix Log Location Plan

The plan is directionally correct, but it has one moderate execution issue that should be fixed before handing it to an implementation agent.

## Moderate issue

1. The migration command in the plan will not run as written.

   The plan says to create `scripts/update-logs-paths.js` and run:

   ```bash
   cd api
   npm run update-logs-paths -- --dry-run
   npm run update-logs-paths -- --apply
   ```

   But `api/package.json` has no `update-logs-paths` script, and the plan's file table does not include an edit to `api/package.json`. An implementation that follows the plan exactly will create the migration script and then fail at the documented verification/execution step with a missing npm script.

   Recommended fix: either add `api/package.json` to the files-to-modify list with a script such as:

   ```json
   "update-logs-paths": "node scripts/update-logs-paths.js"
   ```

   and place the script at `api/scripts/update-logs-paths.js`, or change the usage instructions to call the script directly with `node` from the actual location where it is created.

## Minor notes

- The `ModalMachineAdd.tsx` placeholder for the log path still shows `/home/nick/logs/` in the current code. If the implementation changes the default value, it should update the placeholder at the same time for consistency.
- The planned nginx path change from `/home/nick` to `/home/limited_user` is not part of the log-path bug. It may be intentional for this host, but it should be treated as a separate config default change rather than justified only by log-path consistency.
