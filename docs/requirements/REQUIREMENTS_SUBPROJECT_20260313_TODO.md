# TODO: Optional Subproject Support for Service File Templates

## Feasibility

This modification is feasible and low risk in the current codebase. The required changes map cleanly onto existing implementation points in the API service-file generator, the systemd templates, the web service-file modal, and the existing API Jest coverage.

## Working Rules

- [ ] Before starting a phase, review this file and keep the scope limited to that phase.
- [ ] At the end of each phase, run the phase validation commands listed under that phase.
- [ ] If the validation passes, check off every completed item in that phase before committing.
- [ ] After checking off the completed items, create a commit for that phase.
- [ ] Use a commit message that references this TODO file so the history clearly shows what part of `docs/requirements/REQUIREMENTS_SUBPROJECT_20260313_TODO.md` was completed.
- [ ] Use commit message format: `feat: complete Phase X of REQUIREMENTS_SUBPROJECT_20260313_TODO.md`

## Phase 1: API Contract and Path Resolution

- [ ] Update [`api/src/modules/systemd.ts`](/home/limited_user/applications/TheServerManager/api/src/modules/systemd.ts) `TemplateVariables` to support `subproject_path`.
- [ ] Update [`api/src/modules/systemd.ts`](/home/limited_user/applications/TheServerManager/api/src/modules/systemd.ts) `replaceTemplatePlaceholders()` to replace `{{SUBPROJECT_PATH}}`.
- [ ] Update [`api/src/routes/services.ts`](/home/limited_user/applications/TheServerManager/api/src/routes/services.ts) to accept optional `variables.subproject`.
- [ ] Add API-layer validation in [`api/src/routes/services.ts`](/home/limited_user/applications/TheServerManager/api/src/routes/services.ts) so `subproject`, when provided, rejects empty values, `.` / `..`, leading or trailing slashes, path traversal, and characters outside `[a-zA-Z0-9_-]`.
- [ ] Resolve validated `subproject` input into `subproject_path` as either `""` or `"/<value>"`.
- [ ] Include `subproject_path` in the generated `completeVariables` object and response payload so the frontend can see what was applied.
- [ ] Keep backward compatibility: when `subproject` is omitted, generated paths must remain identical to today.

Phase 1 validation:
- [ ] Run `cd api && npm test`
- [ ] If Phase 1 validation passes, check off completed Phase 1 items and commit with: `feat: complete Phase 1 of REQUIREMENTS_SUBPROJECT_20260313_TODO.md`

## Phase 2: Service Template Updates

- [ ] Update [`api/src/templates/systemdServiceFiles/expressjs.service`](/home/limited_user/applications/TheServerManager/api/src/templates/systemdServiceFiles/expressjs.service) to append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}` in project-root paths.
- [ ] Update [`api/src/templates/systemdServiceFiles/flask.service`](/home/limited_user/applications/TheServerManager/api/src/templates/systemdServiceFiles/flask.service) to append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}` in `WorkingDirectory` and `EnvironmentFile`.
- [ ] Update [`api/src/templates/systemdServiceFiles/fastapi.service`](/home/limited_user/applications/TheServerManager/api/src/templates/systemdServiceFiles/fastapi.service) to append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}` in `WorkingDirectory` and `EnvironmentFile`.
- [ ] Update [`api/src/templates/systemdServiceFiles/nextjs.service`](/home/limited_user/applications/TheServerManager/api/src/templates/systemdServiceFiles/nextjs.service) to append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}` while preserving `.env.local`.
- [ ] Update [`api/src/templates/systemdServiceFiles/nodejsscript.service`](/home/limited_user/applications/TheServerManager/api/src/templates/systemdServiceFiles/nodejsscript.service) to append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}`.
- [ ] Update [`api/src/templates/systemdServiceFiles/pythonscript.service`](/home/limited_user/applications/TheServerManager/api/src/templates/systemdServiceFiles/pythonscript.service) to append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}` in `WorkingDirectory` and `EnvironmentFile`.
- [ ] Confirm no `.timer` templates need modification.

Phase 2 validation:
- [ ] Run `cd api && npm test`
- [ ] If Phase 2 validation passes, check off completed Phase 2 items and commit with: `feat: complete Phase 2 of REQUIREMENTS_SUBPROJECT_20260313_TODO.md`

## Phase 3: API Test Coverage

- [ ] Update [`api/tests/modules/systemd.test.ts`](/home/limited_user/applications/TheServerManager/api/tests/modules/systemd.test.ts) to cover `{{SUBPROJECT_PATH}}` replacement when a subproject is provided.
- [ ] Update [`api/tests/modules/systemd.test.ts`](/home/limited_user/applications/TheServerManager/api/tests/modules/systemd.test.ts) to cover `{{SUBPROJECT_PATH}}` replacement with an empty string when no subproject is provided.
- [ ] Update existing `generateServiceFile` tests in [`api/tests/modules/systemd.test.ts`](/home/limited_user/applications/TheServerManager/api/tests/modules/systemd.test.ts) so they pass `subproject_path: ""` and assert that no unresolved placeholder remains.
- [ ] Add template assertions in [`api/tests/modules/systemd.test.ts`](/home/limited_user/applications/TheServerManager/api/tests/modules/systemd.test.ts) confirming all `.service` templates contain `{{SUBPROJECT_PATH}}`.
- [ ] Add or extend API validation tests so invalid `subproject` values such as `../etc`, `/api`, `api/`, and `.` are rejected before template generation.
- [ ] Add assertions that generated paths do not contain double slashes caused by an empty `subproject_path`.

Phase 3 validation:
- [ ] Run `cd api && npm test`
- [ ] If Phase 3 validation passes, check off completed Phase 3 items and commit with: `feat: complete Phase 3 of REQUIREMENTS_SUBPROJECT_20260313_TODO.md`

## Phase 4: Web Form and Frontend Contract

- [ ] Update [`web/src/components/ui/modal/ModalServicesManager.tsx`](/home/limited_user/applications/TheServerManager/web/src/components/ui/modal/ModalServicesManager.tsx) to add `subproject` state for the create-service form.
- [ ] Add a new optional form field in [`web/src/components/ui/modal/ModalServicesManager.tsx`](/home/limited_user/applications/TheServerManager/web/src/components/ui/modal/ModalServicesManager.tsx) after Project Name and before Python Environment Name.
- [ ] Use helper text in the new field that explains it is for monorepo subdirectories such as `api`, `web`, or `worker`.
- [ ] Update the request body in [`web/src/components/ui/modal/ModalServicesManager.tsx`](/home/limited_user/applications/TheServerManager/web/src/components/ui/modal/ModalServicesManager.tsx) so `variables.subproject` is only sent when non-empty after trimming.
- [ ] Update the `MakeServiceFileResponse` type in [`web/src/components/ui/modal/ModalServicesManager.tsx`](/home/limited_user/applications/TheServerManager/web/src/components/ui/modal/ModalServicesManager.tsx) to include `subproject_path`.
- [ ] Reset the new field after a successful create action.
- [ ] Confirm the existing create flow still works for single-project repos with the field left blank.

Phase 4 validation:
- [ ] Run `cd web && npm run lint`
- [ ] Run `cd web && npm run build`
- [ ] If Phase 4 validation passes, check off completed Phase 4 items and commit with: `feat: complete Phase 4 of REQUIREMENTS_SUBPROJECT_20260313_TODO.md`

## Phase 5: Final Integrated Verification

- [ ] Run an end-to-end manual check from the web UI against a development-safe target to confirm blank `subproject` produces existing root-based paths.
- [ ] Run an end-to-end manual check from the web UI against a development-safe target to confirm `subproject=api` produces paths like `/home/limited_user/applications/<Project>/api`.
- [ ] Verify the generated service content for a Next.js template still points to `.env.local`.
- [ ] Verify Python templates still keep virtual-environment paths under `/home/limited_user/environments/` and only project-root paths gain `{{SUBPROJECT_PATH}}`.
- [ ] Verify no existing service-file generation flow regresses for non-monorepo projects.
- [ ] Update this TODO file to reflect the final completion state of all phases.

Phase 5 validation:
- [ ] Run `cd api && npm test`
- [ ] Run `cd web && npm run lint`
- [ ] Run `cd web && npm run build`
- [ ] If Phase 5 validation passes, check off completed Phase 5 items and commit with: `feat: complete Phase 5 of REQUIREMENTS_SUBPROJECT_20260313_TODO.md`
