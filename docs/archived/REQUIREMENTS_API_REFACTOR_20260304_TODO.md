# API Refactor: APP_USER Environment Variable

Refactor the api/ subproject so a single `APP_USER` environment variable (`"nick"` or `"limited_user"`) controls all user-specific paths and service file generation.

Reference: [ASSESSMENT_LIMITED_USER.md](./ASSESSMENT_LIMITED_USER.md)

---

## Phase 1: App User Config Module

Create a centralized config module that derives all user-specific paths from `APP_USER`.

- [ ] Create `src/config/appUser.ts` that exports:
  - `APP_USER` (from env, defaults to `"nick"`)
  - `APP_USER_HOME` (derived: `/home/${APP_USER}`)
  - `APP_USER_GROUP` (same as `APP_USER`)
  - `APPLICATIONS_DIR` (derived: `${APP_USER_HOME}/applications`)
  - `ENVIRONMENTS_DIR` (derived: `${APP_USER_HOME}/environments`)
  - `STAGING_DIR` (derived: `${APP_USER_HOME}`)
  - `SYSTEMCTL_CSV_PATH` (derived: `${APP_USER_HOME}/${APP_USER}-systemctl.csv`)
- [ ] Add `APP_USER` to `api/.env.example` with documentation comment
- [ ] Create `tests/modules/appUser.test.ts`:
  - Test: defaults to `"nick"` when `APP_USER` is not set
  - Test: derives correct paths for `APP_USER=nick`
  - Test: derives correct paths for `APP_USER=limited_user`
  - Test: all exported paths are absolute (start with `/`)
- [ ] Run tests: `npx jest tests/modules/appUser.test.ts`
- [ ] Commit: "feat: add appUser config module with derived paths"

---

## Phase 2: Template Placeholder Expansion

Add `{{USER_HOME}}`, `{{USER}}`, and `{{GROUP}}` placeholders to the template system.

- [ ] Update `TemplateVariables` interface in `src/modules/systemd.ts`:
  - Add `user_home?: string`
  - Add `user?: string`
  - Add `group?: string`
- [ ] Update `replaceTemplatePlaceholders()` in `src/modules/systemd.ts` to replace `{{USER_HOME}}`, `{{USER}}`, `{{GROUP}}`
- [ ] Create `tests/modules/systemd.test.ts`:
  - Test: `{{USER_HOME}}` replaced correctly in template content
  - Test: `{{USER}}` replaced correctly in template content
  - Test: `{{GROUP}}` replaced correctly in template content
  - Test: all placeholders replaced together in a realistic template string
  - Test: missing optional variables leave placeholders untouched (existing behavior preserved)
  - Test: existing placeholders (`{{PROJECT_NAME}}`, `{{PORT}}`, etc.) still work
- [ ] Run tests: `npx jest tests/modules/systemd.test.ts`
- [ ] Commit: "feat: add USER_HOME, USER, GROUP template placeholders"

---

## Phase 3: Update Service File Templates

Replace hardcoded `/home/nick/` and `User=nick` in all systemd service/timer templates.

- [ ] Update `src/templates/systemdServiceFiles/expressjs.service`:
  - `User={{USER}}`, `Group={{GROUP}}`
  - `WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}`
  - `EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}/.env`
- [ ] Update `src/templates/systemdServiceFiles/nextjs.service` (same pattern)
- [ ] Update `src/templates/systemdServiceFiles/flask.service`:
  - Same as above plus `Environment="PATH={{USER_HOME}}/environments/..."`
  - `ExecStart={{USER_HOME}}/environments/...`
- [ ] Update `src/templates/systemdServiceFiles/fastapi.service` (same as flask)
- [ ] Update `src/templates/systemdServiceFiles/pythonscript.service` (same as flask)
- [ ] Update `src/templates/systemdServiceFiles/nodejsscript.service`
- [ ] Update `src/templates/systemdServiceFiles/nodejsscript.timer`
- [ ] Update `src/templates/systemdServiceFiles/pythonscript.timer`
- [ ] Add tests to `tests/modules/systemd.test.ts`:
  - Test: `readTemplateFile()` for each template returns content with `{{USER_HOME}}` (no hardcoded `/home/nick`)
  - Test: `generateServiceFile()` with nick variables produces a valid service file with `/home/nick/` paths
  - Test: `generateServiceFile()` with limited_user variables produces a valid service file with `/home/limited_user/` paths
  - (Note: `generateServiceFile` calls `writeServiceFile` which touches the filesystem -- mock `fs.writeFile` and `execAsync` for these tests)
- [ ] Run tests: `npx jest tests/modules/systemd.test.ts`
- [ ] Commit: "refactor: parameterize service file templates with USER_HOME, USER, GROUP"

---

## Phase 4: Update Source Modules to Use Config

Replace hardcoded paths in source modules with imports from `appUser` config.

- [ ] Update `src/modules/git.ts`:
  - Remove `const BASE_APPLICATIONS_PATH = "/home/nick/applications"`
  - Import `APPLICATIONS_DIR` from `../config/appUser`
  - Use `APPLICATIONS_DIR` in place of `BASE_APPLICATIONS_PATH`
- [ ] Update `src/modules/npm.ts`:
  - Same change as git.ts
- [ ] Update `src/modules/machines.ts`:
  - Remove hardcoded `/home/nick/nick-systemctl.csv`
  - Import `SYSTEMCTL_CSV_PATH` from `../config/appUser`
- [ ] Update `src/modules/systemd.ts`:
  - Replace `const tmpPath = /home/nick/${filename}` with import from `STAGING_DIR`
- [ ] Create `tests/modules/git.test.ts`:
  - Test: git module uses config-derived applications path (mock `execAsync`, verify command includes correct path)
  - Test with `APP_USER=nick`: command references `/home/nick/applications`
  - Test with `APP_USER=limited_user`: command references `/home/limited_user/applications`
- [ ] Create `tests/modules/npm.test.ts`:
  - Test: npm module uses config-derived applications path (same pattern as git tests)
- [ ] Run tests: `npx jest tests/modules/`
- [ ] Commit: "refactor: replace hardcoded paths in modules with appUser config"

---

## Phase 5: Update Routes to Use Config

Replace hardcoded paths in route files.

- [ ] Update `src/routes/services.ts`:
  - Replace `const tmpPath = /home/nick/${filename}` with import from `STAGING_DIR`
- [ ] Update `src/routes/nginx.ts`:
  - Replace `path.join("/home/nick", fileName)` with import from `STAGING_DIR`
- [ ] Wire template generation calls in `src/routes/services.ts` to pass `user_home`, `user`, `group` from appUser config into `TemplateVariables`
- [ ] Add tests to `tests/modules/systemd.test.ts` or create `tests/routes/services.test.ts`:
  - Test: service creation route passes correct user/group/home to template variables
- [ ] Run tests: `npx jest tests/`
- [ ] Commit: "refactor: replace hardcoded paths in routes with appUser config"

---

## Phase 6: Verify CSV Path Convention

Ensure the systemctl CSV file naming works for limited_user.

- [ ] Verify or create the convention: CSV file is named `${APP_USER}-systemctl.csv` in `${APP_USER_HOME}/`
  - For nick: `/home/nick/nick-systemctl.csv` (existing)
  - For limited_user: `/home/limited_user/limited_user-systemctl.csv` (new)
- [ ] Document the CSV file requirement in `.env.example` alongside the `APP_USER` variable
- [ ] Commit: "docs: document systemctl CSV path convention for APP_USER"

---

## Phase 7: Full Test Suite and Cleanup

- [ ] Run the full test suite: `npm test`
- [ ] Verify no remaining hardcoded `/home/nick` references in `src/`:
  - Run: `grep -r "/home/nick" api/src/` -- should return zero results
- [ ] Update `api/AGENT.md` to document the `APP_USER` configuration
- [ ] Update `docs/requirements/ASSESSMENT_LIMITED_USER.md` to mark as implemented
- [ ] Commit: "docs: update AGENT.md and assessment for APP_USER refactor"
