---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Plan log file reading assessment

## Summary

The plan is directionally right: TSM should support legacy `{name}.log` files and date-suffixed files. The main issue is that the proposed date-suffixed resolver is too narrow for the actual overflow filenames produced by the recommended Node.js rotation library, and the implementation question of whether TSM should read only the newest segment or combine same-day segments is not settled.

## Substantive issues

1. The regex does not match the Node.js overflow files produced by the recommended config.

   The plan says TSM should match:

   - `{name}-YYYY-MM-DD.log`
   - `{name}-YYYY-MM-DD.1.log`

   A local smoke test of `winston-daily-rotate-file@5.0.0` with `filename: 'App-%DATE%.log'`, `datePattern: 'YYYY-MM-DD'`, and `maxSize` produced:

   - `App-2026-05-17.log`
   - `App-2026-05-17.log.1`
   - `App-2026-05-17.log.2`

   Therefore the proposed regex `^{name}-\d{4}-\d{2}-\d{2}(\..+)?\.log$` would match the base daily file but not the size-rotated overflow files. If an overflow file is the active file, TSM can show stale or incomplete logs.

2. The plan should decide whether `/services/logs/:name` returns only one file or a merged view of the current day.

   Picking the newest `mtime` candidate is simple and useful for an active tail-like view, but it means that after size rotation the modal may show only the newest overflow segment and omit earlier log lines from the same day. If the operator expects "today's log", TSM should concatenate same-day segments in chronological order. If the operator expects "currently active segment", the plan should say that explicitly.

3. The fallback matching should allow the known library variants without becoming too broad.

   The resolver should at least consider these active and overflow forms:

   - `{name}-YYYY-MM-DD.log`
   - `{name}-YYYY-MM-DD.log.1`
   - `{name}-YYYY-MM-DD.1.log`

   The third form may still matter if Python or custom logging implementations are adjusted to produce that convention, but the Node.js path currently points to the second form.

## Suggested plan adjustment

1. Escape `name` before building the regex.
2. Match both overflow styles:

   ```text
   ^{escapedName}-\d{4}-\d{2}-\d{2}(?:\.log(?:\.\d+)?|\.\d+\.log)$
   ```

3. Decide one behavior:

   - newest-segment behavior: choose newest `mtime` and document that the endpoint returns the active segment
   - current-day behavior: choose the newest date, sort that date's segments numerically, concatenate them, and return the full current day's log content

4. Add focused tests for legacy, base daily, `.log.1`, `.1.log`, missing directory, and missing file cases.
