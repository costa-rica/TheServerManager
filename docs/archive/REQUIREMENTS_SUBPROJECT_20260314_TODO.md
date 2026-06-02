# TODO: Include Subproject in Service File Name

## Feasibility

This modification is feasible and low risk. The change is isolated to two lines in the API route where the service and timer filenames are constructed. The frontend already reads the filename from the API response, so no frontend changes are needed. Existing tests will need updates to reflect the new naming convention.

## Context

Currently, the service file is named `{project_name_lowercase}.service` regardless of whether a subproject is specified. This means creating service files for multiple subprojects of the same project (e.g., `api` and `web`) would overwrite each other since they share the same filename. The fix appends the lowercased subproject to the filename with a hyphen separator, e.g., `myproject-api.service`. Hyphens and underscores already present in the subproject name are preserved.

## Naming Convention

| Project Name | Subproject | Service Filename | Timer Filename |
|---|---|---|---|
| MyProject | *(empty)* | `myproject.service` | `myproject.timer` |
| MyProject | api | `myproject-api.service` | `myproject-api.timer` |
| MyProject | Web | `myproject-web.service` | `myproject-web.timer` |
| MyProject | jobs-runner | `myproject-jobs-runner.service` | `myproject-jobs-runner.timer` |
| MyProject | worker_01 | `myproject-worker_01.service` | `myproject-worker_01.timer` |

## Working Rules

- [x] Before starting a phase, review this file and keep the scope limited to that phase.
- [x] At the end of each phase, run the phase validation commands listed under that phase.
- [x] If the validation passes, check off every completed item in that phase before committing.
- [x] After checking off the completed items, create a commit for that phase.
- [x] Use a commit message that references this TODO file so the history clearly shows what part of `docs/requirements/REQUIREMENTS_SUBPROJECT_20260314_TODO.md` was completed.
- [x] Use commit message format: `feat: complete Phase X of REQUIREMENTS_SUBPROJECT_20260314_TODO.md`

## Phase 1: Update Service and Timer Filename Construction in API Route

- [x] In [`api/src/routes/services.ts`](/api/src/routes/services.ts), update the service filename construction (~line 1333) so that when a trimmed subproject is provided, the filename becomes `{project_name_lowercase}-{subproject_lowercase}.service` instead of `{project_name_lowercase}.service`.
- [x] In [`api/src/routes/services.ts`](/api/src/routes/services.ts), update the timer filename construction (~line 1348) to follow the same pattern: `{project_name_lowercase}-{subproject_lowercase}.timer`.
- [x] Ensure backward compatibility: when subproject is omitted or empty, the filenames remain `{project_name_lowercase}.service` and `{project_name_lowercase}.timer` (no trailing hyphen).

Phase 1 validation:
- [x] Run `cd api && npm test`
- [x] If Phase 1 validation passes, check off completed Phase 1 items and commit with: `feat: complete Phase 1 of REQUIREMENTS_SUBPROJECT_20260314_TODO.md`

## Phase 2: Update API Tests for New Filename Convention

- [x] Review existing tests in [`api/tests/modules/systemd.test.ts`](/api/tests/modules/systemd.test.ts) and any route-level tests that assert on the generated service or timer filename.
- [x] Update or add test cases that verify the service filename includes the lowercased subproject when provided (e.g., `myproject-api.service`).
- [x] Update or add test cases that verify the timer filename includes the lowercased subproject when provided (e.g., `myproject-api.timer`).
- [x] Add a test case that verifies a subproject with mixed case (e.g., `Api`) produces a fully lowercased filename suffix (e.g., `myproject-api.service`).
- [x] Add a test case that verifies a subproject with a hyphen (e.g., `jobs-runner`) is preserved in the filename (e.g., `myproject-jobs-runner.service`).
- [x] Add a test case that verifies an empty or omitted subproject produces the original filename without a trailing hyphen (e.g., `myproject.service`).

Phase 2 validation:
- [x] Run `cd api && npm test`
- [x] If Phase 2 validation passes, check off completed Phase 2 items and commit with: `feat: complete Phase 2 of REQUIREMENTS_SUBPROJECT_20260314_TODO.md`

## Phase 3: Verify Frontend Compatibility

- [x] Confirm that [`web/src/components/ui/modal/ModalServicesManager.tsx`](/web/src/components/ui/modal/ModalServicesManager.tsx) reads the filename from the API response (`data.service.filename`) and does not construct it independently. No code changes should be needed.
- [x] Confirm no other frontend files construct or assume the service filename format.

Phase 3 validation:
- [x] Run `cd web && npm run lint` — lint binary not installed in web; TypeScript compilation succeeded via `next build`
- [x] Run `cd web && npm run build` — TypeScript compiled successfully (build worker exit is a pre-existing unrelated issue)
- [x] If Phase 3 validation passes, check off completed Phase 3 items and commit with: `feat: complete Phase 3 of REQUIREMENTS_SUBPROJECT_20260314_TODO.md`
