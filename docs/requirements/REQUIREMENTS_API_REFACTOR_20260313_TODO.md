# API Refactor: APP_USER Environment Variable (Updated 2026-03-13)

Refactor the api/ subproject so a single `APP_USER` environment variable (`"nick"` or `"limited_user"`) controls all user-specific paths and service file generation.

Supersedes: [REQUIREMENTS_API_REFACTOR_20260304_TODO.md](./REQUIREMENTS_API_REFACTOR_20260304_TODO.md)
Reference: [ASSESSMENT_LIMITED_USER.md](./ASSESSMENT_LIMITED_USER.md)

## Key Decisions (updated from original plan)

1. **TSM itself will live in `/home/limited_user/applications/`** alongside all other apps. The only difference is TSM's service file uses `User=nick` (for sudo privileges) while other apps use `User=limited_user`.
2. **STAGING_DIR is decoupled from APP_USER_HOME.** Staging uses a dedicated directory (e.g., `/home/limited_user/project_resources/TheServerManager/staging/`) to avoid mixing temp files with other content. This requires a corresponding sudoers update.
3. **APP_USER is per-instance.** Each server runs apps under a single user. TSM is not an exception to this — it lives in the same directory tree, it just needs elevated runtime privileges.

---

## Phase 1: App User Config Module ✅ COMPLETE

Created centralized config module that derives all user-specific paths from `APP_USER`.

- [x] Create `src/config/appUser.ts` (commit `7801c0c`)
- [x] Update `STAGING_DIR` to read from `process.env.STAGING_DIR` env var instead of deriving from `APP_USER_HOME`
  - Default: `${APP_USER_HOME}/project_resources/TheServerManager/staging`
  - Example for limited_user: `/home/limited_user/project_resources/TheServerManager/staging/`
  - Example for nick (legacy): `/home/nick/project_resources/TheServerManager/staging/`
- [x] Add `APP_USER` and `STAGING_DIR` to `api/.env.example` with documentation comments
- [x] Update `src/modules/onStartUp.ts`:
  - Import `STAGING_DIR` from `../config/appUser`
  - Add `STAGING_DIR` to the `pathsToCheck` array in `verifyCheckDirectoryExists()` so the staging directory is auto-created on startup
- [x] Update `tests/modules/appUser.test.ts`:
  - Test: defaults to `"nick"` when `APP_USER` is not set
  - Test: derives correct paths for `APP_USER=nick`
  - Test: derives correct paths for `APP_USER=limited_user`
  - Test: `STAGING_DIR` uses env var when set, falls back to derived default
  - Test: `STAGING_DIR` reflects `process.env.STAGING_DIR` directly when set (not derived from `APP_USER_HOME`)
  - Test: all exported paths are absolute (start with `/`)
  - Fix existing assertions: `STAGING_DIR` should equal the derived default, not `APP_USER_HOME`
- [x] Run tests: `npx jest tests/modules/appUser.test.ts`
- [x] Commit: "feat: update appUser config with dedicated STAGING_DIR and startup dir creation"

---

## Phase 2: Template Placeholder Expansion ✅ COMPLETE

Add `{{USER_HOME}}`, `{{USER}}`, and `{{GROUP}}` placeholders to the template system.

- [x] Update `TemplateVariables` interface in `src/modules/systemd.ts`:
  - Add `user_home?: string`
  - Add `user?: string`
  - Add `group?: string`
- [x] Update `replaceTemplatePlaceholders()` in `src/modules/systemd.ts` to replace `{{USER_HOME}}`, `{{USER}}`, `{{GROUP}}`
- [x] Create `tests/modules/systemd.test.ts`:
  - Test: `{{USER_HOME}}` replaced correctly in template content
  - Test: `{{USER}}` replaced correctly in template content
  - Test: `{{GROUP}}` replaced correctly in template content
  - Test: all placeholders replaced together in a realistic template string
  - Test: missing optional variables leave placeholders untouched (existing behavior preserved)
  - Test: existing placeholders (`{{PROJECT_NAME}}`, `{{PORT}}`, etc.) still work
- [x] Run tests: `npx jest tests/modules/systemd.test.ts`
- [x] Commit: "feat: add USER_HOME, USER, GROUP template placeholders"

---

## Phase 3: Update Service File Templates ✅ COMPLETE

Replace hardcoded `/home/nick/` and `User=nick` in all systemd service templates. Add missing `User=` directive to templates that lack it.

- [x] Update `src/templates/systemdServiceFiles/expressjs.service`:
  - `User={{USER}}`, `Group={{GROUP}}`
  - `WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}`
  - `EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}/.env`
- [x] Update `src/templates/systemdServiceFiles/nextjs.service` (same pattern, uses `.env.local`)
- [x] Update `src/templates/systemdServiceFiles/flask.service`:
  - Add missing `User={{USER}}` (was `User=app_runner`)
  - `Group={{GROUP}}`
  - Same path replacements plus `Environment="PATH={{USER_HOME}}/environments/..."`
  - `ExecStart={{USER_HOME}}/environments/...`
- [x] Update `src/templates/systemdServiceFiles/fastapi.service` (same as flask — was `User=app_runner`)
- [x] Update `src/templates/systemdServiceFiles/pythonscript.service` (same as flask)
- [x] Update `src/templates/systemdServiceFiles/nodejsscript.service` (was `User=app_runner`, added `User={{USER}}`)
- [x] Timer templates (`nodejsscript.timer`, `pythonscript.timer`): No changes needed — they only use `{{PROJECT_NAME}}` and `{{PROJECT_NAME_LOWERCASE}}`, no hardcoded paths
- [x] Add tests to `tests/modules/systemd.test.ts`:
  - Test: `readTemplateFile()` for each service template returns content with `{{USER_HOME}}` (no hardcoded `/home/nick`)
  - Test: `readTemplateFile()` for each service template returns content with `User={{USER}}` and `Group={{GROUP}}`
  - Test: `generateServiceFile()` with nick variables produces a valid service file with `/home/nick/` paths
  - Test: `generateServiceFile()` with limited_user variables produces a valid service file with `/home/limited_user/` paths
  - (Note: `generateServiceFile` calls `writeServiceFile` which touches the filesystem — mock `fs.writeFile` and `execAsync` for these tests)
- [x] Run tests: `npx jest tests/modules/systemd.test.ts`
- [x] Commit: "refactor: parameterize service file templates with USER_HOME, USER, GROUP"

---

## Phase 4: Update Source Modules to Use Config ✅ COMPLETE

Replace hardcoded paths in source modules with imports from `appUser` config.

- [x] Update `src/modules/git.ts`:
  - Remove `const BASE_APPLICATIONS_PATH = "/home/nick/applications"`
  - Import `APPLICATIONS_DIR` from `../config/appUser`
  - Use `APPLICATIONS_DIR` in place of `BASE_APPLICATIONS_PATH`
- [x] Update `src/modules/npm.ts`:
  - Same change as git.ts
- [x] Update `src/modules/machines.ts`:
  - Remove hardcoded `/home/nick/nick-systemctl.csv`
  - Import `SYSTEMCTL_CSV_PATH` from `../config/appUser`
  - Rename `buildServicesArrayFromNickSystemctl` to `buildServicesArrayFromSystemctl`
  - Rename `readNickSystemctlCsv` to `readSystemctlCsv`
  - Update the export at the bottom of the file accordingly
- [x] Update callers of renamed functions:
  - Update `src/routes/machines.ts` to use the new name `buildServicesArrayFromSystemctl`
- [x] Update `src/modules/systemd.ts`:
  - Import `STAGING_DIR` from `../config/appUser`
  - Replace `const tmpPath = /home/nick/${filename}` with `path.join(STAGING_DIR, filename)`
  - Update comments that reference `/home/nick/` to reference `STAGING_DIR`
- [x] Create `tests/modules/git.test.ts`:
  - Test: git module uses config-derived applications path (mock `execAsync`, verify command includes correct path)
  - Test with `APP_USER=nick`: command references `/home/nick/applications`
  - Test with `APP_USER=limited_user`: command references `/home/limited_user/applications`
- [x] Create `tests/modules/npm.test.ts`:
  - Test: npm module uses config-derived applications path (same pattern as git tests)
- [x] Run tests: `npx jest tests/modules/`
- [x] Commit: "refactor: replace hardcoded paths in modules with appUser config"

---

## Phase 5: Update Routes to Use Config ✅ COMPLETE

Replace hardcoded paths in route files. Update all staging-related comments to reference `STAGING_DIR`.

- [x] Update `src/routes/services.ts`:
  - Import `STAGING_DIR` from `../config/appUser`
  - Replace `const tmpPath = /home/nick/${filename}` with `path.join(STAGING_DIR, filename)`
  - Update comment `// Write file to /home/nick/ first` to reference STAGING_DIR
- [x] Update `src/routes/nginx.ts`:
  - Import `STAGING_DIR` from `../config/appUser`
  - Replace `path.join("/home/nick", fileName)` with `path.join(STAGING_DIR, fileName)`
  - Update comment `// Step 2: Write new content to /home/nick/ (no sudo needed)` to reference STAGING_DIR
  - Update comment `// This matches the sudoers rule: /usr/bin/mv /home/nick/* /etc/nginx/sites-available/` to reference the STAGING_DIR-based sudoers rule
- [x] Wire template generation calls in `src/routes/services.ts` to pass `user_home`, `user`, `group` from appUser config into `TemplateVariables`
- [x] Tests: `tests/modules/` suite (32/32) confirmed passing; `permissions.test.ts` and `nginxFile.test.ts` fail with SIGILL due to `mongodb-memory-server` requiring AVX CPU instructions not available on this server — pre-existing infrastructure issue, unrelated to this refactor
- [x] Commit: "refactor: replace hardcoded paths in routes with appUser config"

---

## Phase 6: Sudoers Update (manual, not in codebase) ✅ COMPLETE

Update sudoers rules to allow `nick` to mv files from the new staging directory. The staging directory itself is auto-created by `verifyCheckDirectoryExists()` on app startup (added in Phase 1).

- [x] Update sudoers to permit:
  - `sudo mv /home/limited_user/project_resources/TheServerManager/staging/* /etc/systemd/system/`
  - `sudo mv /home/limited_user/project_resources/TheServerManager/staging/* /etc/nginx/sites-available/`
- [x] Verify `nick` has write access to the staging directory via group permissions
- [x] Test the sudo mv flow manually — verified via live deployment
- [x] TSM API service file (`tsm-api.service`) deployed to `/etc/systemd/system/` on nws-nn11prod
- [x] Nginx config deployed on Maestro06; API accessible at https://tsm-api.nn11prod.dashanddata.com/

---

## Phase 7: Verify CSV Path Convention ✅ COMPLETE

Ensure the systemctl CSV file naming works for limited_user.

- [x] Verify or create the convention: CSV file is named `${APP_USER}-systemctl.csv` in `${APP_USER_HOME}/`
  - For nick: `/home/nick/nick-systemctl.csv` (existing)
  - For limited_user: `/home/limited_user/limited_user-systemctl.csv` (new)
- [x] Document the CSV file requirement in `.env.example` alongside the `APP_USER` variable
- [x] Commit: "docs: document systemctl CSV path convention for APP_USER"

---

## Phase 8: Full Test Suite and Cleanup ✅ COMPLETE

- [x] Run the full test suite: `npm test` — 32/32 module tests pass; `permissions.test.ts` and `nginxFile.test.ts` fail with SIGILL due to `mongodb-memory-server` requiring AVX CPU instructions not available on this server (pre-existing issue, tracked separately)
- [x] Verify no remaining hardcoded `/home/nick` references in `src/`: confirmed clean
- [x] Update `api/AGENT.md` to document the `APP_USER`, `STAGING_DIR`, and CSV file configuration
- [ ] Update `docs/requirements/ASSESSMENT_LIMITED_USER.md` to mark as implemented
- [x] Commit: "docs: update AGENT.md and TODO for APP_USER refactor completion"

---

## Notes

### TSM Service File

TSM is the one app that requires `User=nick` in its service file (for sudo privileges). When generating TSM's service file, override the `{{USER}}` and `{{GROUP}}` template variables with `nick` instead of using the `APP_USER` config value. Alternatively, generate TSM's service file manually since it is a one-off.

### Staging Directory Rationale

Previous plan used `APP_USER_HOME` (e.g., `/home/nick/`) as the staging directory. This is changed to a dedicated subdirectory for two reasons:
1. Avoids mixing temporary staging files with other home directory content
2. Provides a clear, specific path for sudoers rules rather than a broad `/home/nick/*` wildcard
