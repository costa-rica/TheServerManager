# Assessment: Supporting limited_user Applications in TheServerManager API

## Objective

Determine whether managing applications under `/home/limited_user/` requires a new `api02/` subproject or can be achieved by modifying the existing `api/` subproject.

## Recommendation: Modify the Existing `api/` Project

**A separate `api02/` subproject is not warranted.** The changes needed are minimal and well-scoped. The existing `api/` can be extended to manage both `/home/nick/applications/` and `/home/limited_user/applications/` with a small set of targeted modifications.

## Rationale

### What Would Be Duplicated in api02/

If we created a full `api02/` subproject, we would duplicate:

- The entire Express.js application scaffolding (app.ts, server.ts, middleware)
- Authentication system (JWT, user model, login/register)
- MongoDB connection and all shared models (Machine, User, NginxFile)
- Porkbun DNS management (registrar routes)
- Nginx config scanning and report generation
- All error handling patterns, logging configuration, and utilities
- Test infrastructure and configuration

This amounts to ~95% code duplication for what is fundamentally a path-difference problem.

### What Actually Differs

The core difference is **which user account and home directory** an application runs under. The specific touchpoints are:

#### 1. Hardcoded `/home/nick/` Paths (5 locations)

| File                      | Line | Current Value                                        | Purpose                              |
| ------------------------- | ---- | ---------------------------------------------------- | ------------------------------------ |
| `src/modules/git.ts`      | 8    | `BASE_APPLICATIONS_PATH = "/home/nick/applications"` | Git operations on project dirs       |
| `src/modules/npm.ts`      | 8    | `BASE_APPLICATIONS_PATH = "/home/nick/applications"` | npm install/build in project dirs    |
| `src/modules/machines.ts` | 539  | `csvPath = "/home/nick/nick-systemctl.csv"`          | Systemd unit list                    |
| `src/modules/systemd.ts`  | 134  | `tmpPath = /home/nick/${filename}`                   | Staging dir for sudo mv              |
| `src/routes/services.ts`  | 1628 | `tmpPath = /home/nick/${filename}`                   | Staging dir for service file updates |
| `src/routes/nginx.ts`     | 635  | `tmpFilePath = path.join("/home/nick", fileName)`    | Staging dir for nginx config updates |

#### 2. Service File Templates (all hardcode `/home/nick/`)

All 6 service templates in `src/templates/systemdServiceFiles/` contain:

- `User=nick` or `User=app_runner` with `Group=nick`
- `WorkingDirectory=/home/nick/applications/{{PROJECT_NAME}}`
- `EnvironmentFile=/home/nick/applications/{{PROJECT_NAME}}/.env`
- Python templates also reference `/home/nick/environments/{{PYTHON_ENV_NAME}}/bin`

#### 3. Template Placeholder System

The `replaceTemplatePlaceholders()` function in `src/modules/systemd.ts` currently supports:

- `{{PROJECT_NAME}}`
- `{{PROJECT_NAME_LOWERCASE}}`
- `{{PYTHON_ENV_NAME}}`
- `{{PORT}}`

It does **not** have a `{{USER_HOME}}` or `{{USER}}` placeholder, but adding one is trivial.

#### 4. Machine Model

The `Machine` model already stores per-service metadata in `servicesArray` including `workingDirectory` and `pathToLogs`. This means the database already supports heterogeneous paths -- a service's working directory is read from its service file, not assumed.

## Proposed Modification Plan

### Phase 1: Make Paths Configurable (Minimal Changes)

**1a. Add new template placeholders**

Add `{{USER_HOME}}`, `{{USER}}`, and `{{GROUP}}` placeholders to `replaceTemplatePlaceholders()` in `src/modules/systemd.ts`. Update the `TemplateVariables` interface accordingly.

**1b. Update service file templates**

Replace hardcoded paths in all templates:

```ini
# Before
User=nick
Group=nick
WorkingDirectory=/home/nick/applications/{{PROJECT_NAME}}
EnvironmentFile=/home/nick/applications/{{PROJECT_NAME}}/.env

# After
User={{USER}}
Group={{GROUP}}
WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}
EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}/.env
```

For Python templates, also replace:

```ini
Environment="PATH={{USER_HOME}}/environments/{{PYTHON_ENV_NAME}}/bin"
ExecStart={{USER_HOME}}/environments/{{PYTHON_ENV_NAME}}/bin/python ...
```

**1c. Replace hardcoded BASE_APPLICATIONS_PATH**

In `git.ts` and `npm.ts`, derive the applications path from the service's `workingDirectory` (already stored in the Machine model's `servicesArray`) instead of a hardcoded constant. The `workingDirectory` field already contains the full path (e.g., `/home/limited_user/applications/MyApp`).

**1d. Make staging directory configurable**

In `systemd.ts`, `services.ts`, and `nginx.ts`, replace `/home/nick/` staging paths with an environment variable (e.g., `PATH_STAGING_DIR` or simply use `os.tmpdir()`). Using `/tmp/` or a configurable staging directory is actually more correct -- the current approach of staging in `/home/nick/` is a sudoers convenience, not a requirement.

**1e. Make CSV path configurable**

In `machines.ts`, replace the hardcoded `/home/nick/nick-systemctl.csv` with an environment variable `PATH_SYSTEMCTL_CSV`.

### Phase 2: Route Updates for Service Creation

When creating a new service file via the API, the request body or a configuration source must specify:

- Which user the service runs as (`nick` or `limited_user`)
- The corresponding home directory (`/home/nick` or `/home/limited_user`)
- The group (`nick` or `limited_user`)

This can be derived from the Machine model or passed explicitly in the service creation request. Since `limited_user` has `nologin`, the service file `User=` field is already the standard way systemd handles this -- no special treatment needed.

### Phase 3: Sudoers Permissions

The current sudoers rules allow `nick` to:

- `sudo systemctl start/stop/restart/status` for services
- `sudo mv /home/nick/* /etc/systemd/system/`
- `sudo mv /home/nick/* /etc/nginx/sites-available/`

For limited_user services, the same sudoers rules apply because `nick` (the admin user running the API) is the one executing these commands. The service files just specify `User=limited_user` so systemd runs the app as that user. **No sudoers changes are needed.**

### Phase 4: New Environment Variables

Add to `.env`:

```bash
# Staging directory for privileged file operations
PATH_STAGING_DIR=/home/nick
# Path to systemctl CSV
PATH_SYSTEMCTL_CSV=/home/nick/nick-systemctl.csv
```

These default to current behavior, preserving backward compatibility.

## Scope Estimate

| Change                                  | Files Modified                              | Complexity     |
| --------------------------------------- | ------------------------------------------- | -------------- |
| Template placeholders                   | 1 (`systemd.ts`)                            | Low            |
| Service file templates                  | 6 template files                            | Low            |
| Remove hardcoded BASE_APPLICATIONS_PATH | 2 (`git.ts`, `npm.ts`)                      | Low            |
| Configurable staging dir                | 3 (`systemd.ts`, `services.ts`, `nginx.ts`) | Low            |
| Configurable CSV path                   | 1 (`machines.ts`)                           | Low            |
| Service creation route updates          | 1 (`services.ts`)                           | Medium         |
| New environment variables               | 1 (`.env.example`)                          | Low            |
| **Total**                               | **~10 files**                               | **Low-Medium** |

## Why Not a Separate api02/

1. **95% code duplication** -- The auth, database, nginx scanning, DNS management, error handling, and logging are all identical regardless of which user's apps are managed.

2. **Single Machine model** -- The Machine document in MongoDB already stores per-service paths. Both nick and limited_user services can coexist in the same `servicesArray`.

3. **Same server, same API** -- Both sets of apps run on the same server. Having two separate APIs would mean two ports, two processes, two sets of logs, and twice the maintenance burden for identical functionality.

4. **Sudoers are the same** -- The `nick` user runs the API process and executes all privileged commands regardless of which user the managed apps run as. The service files simply declare `User=limited_user`.

5. **Templates already use placeholders** -- The template system is designed for variable substitution. Adding `{{USER_HOME}}` is a natural extension of the existing `{{PROJECT_NAME}}` pattern.

## Risks and Considerations

- **Backward compatibility**: All changes are additive. Existing nick-user services continue to work with no migration needed. New environment variables have sensible defaults.
- **Security**: The API already runs as `nick` with sudo privileges. Managing limited_user services doesn't expand the privilege surface -- `nick` already has full access to `/home/limited_user/` via group membership.
- **Testing**: Existing tests should continue to pass. New tests should cover template generation with limited_user variables.
