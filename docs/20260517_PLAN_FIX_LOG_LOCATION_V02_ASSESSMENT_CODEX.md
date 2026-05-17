---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Assessment: Fix Log Location Plan V02

V02 resolves the prior Codex concerns: it places the migration under `api/`,
wires `api/package.json`, updates the Add modal placeholder, and defers the
unrelated nginx default change.

One material flaw remains before implementation.

## Material issue

1. The migration can accidentally drop service fields if implemented with a
   minimal Mongoose schema and whole-array replacement.

   V02 says to use an inline minimal Mongoose schema with only the fields the
   migration reads/writes, then write each machine with:

   ```js
   { $set: { servicesArray: updatedServices } }
   ```

   The real API schema stores more than `pathToLogs` in each service:
   `name`, `filename`, `filenameTimer`, `workingDirectory`, `port`, and
   `pathToLogs` in `api/src/models/machine.ts`. If the one-off schema only
   models the migration fields, an implementation that maps hydrated Mongoose
   documents and replaces the full `servicesArray` risks stripping unknown
   service fields, especially `workingDirectory`.

   Exact fix: do one of these before replacing `servicesArray`:

   - Prefer the native collection API or `.lean()` so the script works with raw
     documents, then update by `_id`:

     ```js
     const machines = await Machine.find(query).lean();
     await Machine.collection.updateOne(
       { _id: machine._id },
       { $set: { servicesArray: updatedServices } }
     );
     ```

   - Or define the inline service schema with all current service fields
     (`name`, `filename`, `filenameTimer`, `workingDirectory`, `port`,
     `pathToLogs`) and preserve each service by object spread:

     ```js
     const updatedServices = machine.servicesArray.map((service) => ({
       ...service,
       pathToLogs: service.pathToLogs.replace(
         /^\/home\/nick\/logs\//,
         "/home/limited_user/logs/"
       ),
     }));
     ```

   Also make the update call explicit in the plan:

   ```js
   await Machine.findByIdAndUpdate(
     machine._id,
     { $set: { servicesArray: updatedServices } },
     { runValidators: false }
   );
   ```

   The important requirement is that the migration rewrites only
   `servicesArray[].pathToLogs` and preserves every other field in every
   service object exactly as stored.

## Minor execution note

V02 says the script writes `api/scripts/logs/dry-run-*.txt`, but `.gitignore`
does not currently ignore that path. Add `api/scripts/logs/` to `.gitignore`
or write the audit files somewhere already ignored before running the script.
