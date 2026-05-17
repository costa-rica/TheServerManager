---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Logging instructions assessment

## Summary

The new Node.js and Python logging instruction files establish the right overall goal: daily date-suffixed logs, local-time dates, bounded file sizes, and retention. Two details need correction before these files are used as implementation instructions for other agents.

## Substantive issues

1. The Node.js V08 file documents the wrong overflow filename for the recommended Winston config.

   `LOGGING_NODE_JS_V08.md` says `winston-daily-rotate-file` with:

   ```js
   filename: `${NAME_APP}-%DATE%.log`
   ```

   produces overflow files like:

   ```text
   {NAME_APP}-YYYY-MM-DD.1.log
   ```

   A local smoke test with `winston-daily-rotate-file@5.0.0` produced:

   ```text
   App-2026-05-17.log
   App-2026-05-17.log.1
   App-2026-05-17.log.2
   ```

   This means the doc's naming convention and TSM's planned resolver are currently misaligned with the actual Node.js library behavior.

2. The Python V07 two-sink Loguru example will duplicate file log records.

   `LOGGING_PYTHON_V07.md` instructs agents to register two file sinks pointing at the same dated file pattern:

   - one with `rotation="00:00"`
   - one with `rotation=f"{LOG_MAX_SIZE_IN_MB} MB"`

   Loguru sends every log record to every matching sink, so this writes each file log line twice. The official Loguru docs also state that a single sink's `rotation` argument accepts size or time limits, and recommends a custom rotation function when both are needed.

3. The Python V07 two-sink example does not produce the documented overflow naming.

   A local Loguru smoke test with the two-sink pattern produced names like:

   ```text
   PyApp-2026-05-17.2026-05-17_12-56-30_269989.log
   PyApp-2026-05-17.2026-05-17_12-56-30_270338.log
   PyApp-2026-05-17.log
   ```

   That does not match the documented `{NAME_APP}-YYYY-MM-DD.1.log` convention, so agents following the doc may generate logs that TSM will not discover unless TSM uses a much broader file matcher.

## Suggested corrections

1. For Node.js, either:

   - document the actual `winston-daily-rotate-file` behavior as `{NAME_APP}-YYYY-MM-DD.log.N`
   - or change the recommended config to use a filename without `.log` plus the library's `extension: ".log"` option, then verify the resulting names before publishing the convention

2. For Python, replace the two-sink file example with one file sink using a custom rotation callable that combines midnight and size checks.

3. Decide whether the cross-language convention allows multiple overflow naming styles or requires exactly one.

4. Align TSM's resolver with the final convention before creating the implementation TODO.
