---
created_at: 2026-02-11
updated_at: 2026-06-01
created_by: unknown
modified_by: claude (opus-4.8)
---

# Agent Server Access

This document is the operational reference for how The Server Manager API interacts with the Ubuntu 24.04 LTS host: passwordless `sudo` privileges, the system commands the API runs, and the environment variables that control them.

It is written so that an AI agent operating on the server can understand which privileged commands are available, the exact syntax that satisfies the sudoers rules, and how to extend them safely. For ecosystem/architecture context see [The_Server_Manager_Overview.md](The_Server_Manager_Overview.md).

---

## For AI Agents: Quick Start

1. The API runs as a regular user (the sudoers user, `nick`) and never as root. Privileged actions are a fixed allowlist of `NOPASSWD` `sudo` commands.
2. The allowlist is generated from a CSV at `/home/nick/nick-systemctl.csv` and installed to `/etc/sudoers.d/nick-systemctl`.
3. Sudo matches commands literally. The binary path, arguments, and trailing slashes must match the rule exactly or you get `sudo: a password is required`.
4. Files destined for system directories are first written to `STAGING_DIR` (a normal, non-sudo write), then moved with a single `sudo mv`.
5. To add a capability you edit the CSV and run the update script — you do not hand-edit the sudoers file.

### Environment variables that control behavior

These are read from `api/.env` (see `api/.env.example`). An agent should inspect them before assuming any path:

| Variable                          | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `APP_USER`                        | System user whose home dir holds managed apps (e.g. `nick`, `limited_user`). Drives `/home/<APP_USER>/applications` and `/home/<APP_USER>/environments`. |
| `STAGING_DIR`                     | Writable scratch dir where files are staged before `sudo mv` to system dirs. Required. Auto-created on startup. |
| `PATH_TO_SERVICE_FILES`           | Destination for generated/edited systemd unit files (typically `/etc/systemd/system`). |
| `PATH_AND_NAME_PRIVILIGE_CSV_FILE`| Path to the systemctl CSV (`/home/nick/nick-systemctl.csv`). Used to discover managed services. Intentionally independent of `APP_USER`. |
| `PATH_ETC_NGINX_SITES_AVAILABLE`  | nginx config directory (`/etc/nginx/sites-available`).                   |

`APP_USER` and the sudoers user are decoupled on purpose: services may run as `limited_user`, but passwordless sudo is always managed through `nick` and `/home/nick/nick-systemctl.csv`. Do not create or depend on `/home/limited_user/limited_user-systemctl.csv`.

### Passwordless command quick-reference

Every privileged command the API issues, and the sudoers row that permits it. `${STAGING_DIR}` is the literal value of the `STAGING_DIR` env var (sudoers does not expand variables — substitute the real path in the CSV).

| Action                       | Command the API runs                                              | CSV row (command,action,unit)                                  |
| ---------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Install systemd unit         | `sudo mv "${STAGING_DIR}/x.service" "/etc/systemd/system/"`       | `/usr/bin/mv,${STAGING_DIR}/*.service,/etc/systemd/system/`    |
| Install systemd timer        | `sudo mv "${STAGING_DIR}/x.timer" "/etc/systemd/system/"`         | `/usr/bin/mv,${STAGING_DIR}/*.timer,/etc/systemd/system/`      |
| Read systemd unit/timer      | `sudo cat "/etc/systemd/system/x.service"`                       | `/usr/bin/cat,/etc/systemd/system/*.service,`                  |
| Control a service            | `sudo systemctl restart x.service`                              | `/usr/bin/systemctl,restart,x.service` (one row per action)    |
| Read service status          | `sudo systemctl status x.service`                              | `/usr/bin/systemctl,status,x.service`                          |
| Read nginx config            | `sudo cat "/etc/nginx/sites-available/x"`                       | `/usr/bin/cat,/etc/nginx/sites-available/*,`                   |
| Back up nginx config         | `sudo cp "/etc/nginx/sites-available/x" "...x.backup.<ts>"`      | `/usr/bin/cp,/etc/nginx/sites-available/*,/etc/nginx/sites-available/*.backup.*` |
| Install nginx config         | `sudo mv "${STAGING_DIR}/x" "/etc/nginx/sites-available/"`       | `/usr/bin/mv,${STAGING_DIR}/*,/etc/nginx/sites-available/`     |
| Enable nginx site (symlink)  | `sudo ln -s <available> <enabled>`                              | `/usr/bin/ln,-s,*`                                             |
| Validate nginx               | `sudo nginx -t`                                                 | `/usr/sbin/nginx,-t,`                                          |
| Reload nginx                 | `sudo systemctl reload nginx`                                   | `/usr/bin/systemctl,reload,nginx`                             |
| Request/reinstall cert       | `sudo certbot --nginx --reinstall -d <domain>`                  | `/usr/bin/certbot,--nginx,*`                                   |
| Remove nginx backup/config   | `sudo rm "/etc/nginx/sites-available/x.backup.*"`               | `/usr/bin/rm,/etc/nginx/sites-available/*.backup.*,`          |

Reverse-proxy servers get the nginx/symlink/reload/certbot rows; app-only servers omit them (see below).

---

## Sudoers Privilege Management

### Overview

The API requires elevated privileges to manage systemd services and write system configuration files. Rather than running as root, we grant passwordless `sudo` for a specific set of commands to the `nick` user.

### CSV-Driven Privilege Configuration

Sudo privileges are defined in a CSV at `/home/nick/nick-systemctl.csv`, discovered via:

```bash
PATH_AND_NAME_PRIVILIGE_CSV_FILE=/home/nick/nick-systemctl.csv
```

This value is intentionally independent of `APP_USER`.

Each row has six fields:

- `user`: the user granted the privilege (e.g. `nick`).
- `runas`: execution context (e.g. `ALL=(root)`).
- `tag`: permission modifier (e.g. `NOPASSWD:`).
- `command`: full path to the binary (e.g. `/usr/bin/systemctl`, `/usr/bin/mv`).
- `action`: the systemctl action, command argument, or source path pattern.
- `unit`: the service/timer file, destination directory, or final argument.

> Replace `${STAGING_DIR}` below with the literal value of your `STAGING_DIR` env var. The `mv` source must match wherever the API stages files; `api/.env.example` documents this requirement.

#### Reverse Proxy Servers

For servers that host nginx reverse-proxy configs, manage `sites-available`/`sites-enabled`, validate/reload nginx, and run certbot:

```csv
user,runas,tag,command,action,unit
nick,ALL=(root),NOPASSWD:,/usr/bin/mv,${STAGING_DIR}/*.service,/etc/systemd/system/
nick,ALL=(root),NOPASSWD:,/usr/bin/mv,${STAGING_DIR}/*.timer,/etc/systemd/system/
nick,ALL=(root),NOPASSWD:,/usr/bin/cat,/etc/systemd/system/*.service,
nick,ALL=(root),NOPASSWD:,/usr/bin/cat,/etc/systemd/system/*.timer,
nick,ALL=(root),NOPASSWD:,/usr/bin/cat,/etc/nginx/sites-available/*,
nick,ALL=(root),NOPASSWD:,/usr/bin/cp,/etc/nginx/sites-available/*,/etc/nginx/sites-available/*.backup.*
nick,ALL=(root),NOPASSWD:,/usr/bin/mv,${STAGING_DIR}/*,/etc/nginx/sites-available/
nick,ALL=(root),NOPASSWD:,/usr/bin/mv,/etc/nginx/sites-available/*.backup.*,/etc/nginx/sites-available/*
nick,ALL=(root),NOPASSWD:,/usr/bin/rm,/etc/nginx/sites-available/*.backup.*,
nick,ALL=(root),NOPASSWD:,/usr/bin/rm,/etc/nginx/sites-available/*,
nick,ALL=(root),NOPASSWD:,/usr/bin/rm,/etc/nginx/sites-enabled/*,
nick,ALL=(root),NOPASSWD:,/usr/sbin/nginx,-t,
nick,ALL=(root),NOPASSWD:,/usr/bin/ln,-s,*
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,reload,nginx
nick,ALL=(root),NOPASSWD:,/usr/bin/certbot,--nginx,*
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,restart,tsm-api.service
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,status,tsm-api.service
```

#### Non-Reverse Proxy Servers

For app-only servers that manage systemd services but do not host nginx config. Omit the nginx, symlink, reload, and certbot rows:

```csv
user,runas,tag,command,action,unit
nick,ALL=(root),NOPASSWD:,/usr/bin/mv,${STAGING_DIR}/*.service,/etc/systemd/system/
nick,ALL=(root),NOPASSWD:,/usr/bin/mv,${STAGING_DIR}/*.timer,/etc/systemd/system/
nick,ALL=(root),NOPASSWD:,/usr/bin/cat,/etc/systemd/system/*.service,
nick,ALL=(root),NOPASSWD:,/usr/bin/cat,/etc/systemd/system/*.timer,
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,restart,tsm-api.service
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,status,tsm-api.service
```

### Update Script

The executable POSIX script at `/home/nick/update-nick-systemctl.sh` converts the CSV into a sudoers file:

```bash
#!/usr/bin/env bash
set -euo pipefail

CSV="/home/nick/nick-systemctl.csv"
DEST="/etc/sudoers.d/nick-systemctl"
TMP="$(mktemp)"

tail -n +2 "$CSV" | tr -d '\r' | \
while IFS=, read -r user runas tag cmd action unit || [[ -n "$user" ]]; do
  echo "$user $runas $tag $cmd $action $unit"
done > "$TMP"

sudo visudo -cf "$TMP"
sudo install -m 440 "$TMP" "$DEST"
rm -f "$TMP"
```

How it works:

1. Reads the CSV, skipping the header row.
2. Removes Windows line endings if present.
3. Emits space-separated sudoers rules.
4. Validates syntax with `visudo -c` (prevents breaking sudo).
5. Installs to `/etc/sudoers.d/nick-systemctl` with mode 440.
6. Cleans up the temp file.

Usage — after editing `nick-systemctl.csv`:

```bash
/home/nick/update-nick-systemctl.sh
```

### Why This Approach

Security: app runs as a regular user, only specific commands are allowed, wildcards are constrained, the CSV is auditable, and syntax is validated automatically.

Operational: easy to add service-specific permissions, no manual sudoers editing, fewer typos, consistent formatting.

---

## Service File Generation

### POST /services/make-service-file

Generates systemd `.service` (and optional `.timer`) files from templates in `src/templates/systemdServiceFiles/`, then installs them to `PATH_TO_SERVICE_FILES` (typically `/etc/systemd/system/`).

### Write Strategy

1. Read the chosen template (validated against `VALID_SERVICE_TEMPLATES` / `VALID_TIMER_TEMPLATES`).
2. Substitute placeholders (`project_name`, `port`, `user`, `group`, `user_home`, `subproject_path`, etc.).
3. Auto-generate a lowercase filename, e.g. `NewsNexusRequesterGoogleRss02` → `newsnexusrequestergooglerss02.service` (an optional `subproject` adds a `-suffix`).
4. Write the file into `STAGING_DIR` (no sudo — the API can write there directly).
5. Move it into place: `sudo mv "${STAGING_DIR}/<file>" "/etc/systemd/system/"`.

### Exact Command Matching

Sudo is strict. This rule:

```
nick ALL=(root) NOPASSWD: /usr/bin/mv ${STAGING_DIR}/*.service /etc/systemd/system/
```

matches:

```bash
sudo mv "${STAGING_DIR}/file.service" "/etc/systemd/system/"
```

but NOT:

```bash
sudo mv "${STAGING_DIR}/file.service" "/etc/systemd/system/file.service"
```

The destination must be the directory (trailing slash), not the full file path. That is why the code moves to `"/etc/systemd/system/"`.

---

## Service Control

### POST /services/control/:serviceFilename/:toggleStatus

Controls systemd services via `systemctl`. Valid actions: `start`, `stop`, `restart`, `reload`, `enable`, `disable`.

### Sudo Requirements

Service control requires explicit per-service, per-action rows (no wildcards). Example for `newsnexus-requestergnews02.timer`:

```csv
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,start,newsnexus-requestergnews02.timer
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,stop,newsnexus-requestergnews02.timer
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,restart,newsnexus-requestergnews02.timer
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,status,newsnexus-requestergnews02.timer
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,enable,newsnexus-requestergnews02.timer
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,disable,newsnexus-requestergnews02.timer
```

### Execution Flow

1. Validate the action is allowed.
2. Validate the service (by `filename` or `filenameTimer`) exists in the machine's `servicesArray` in MongoDB.
3. Execute `sudo systemctl <action> <serviceFilename>`.
4. Query `sudo systemctl status <serviceFilename>` and parse the result.
5. If the service has a timer, also query the timer status and next trigger.

### Critical Service Protection

`tsm-api.service` and `tsm-nextjs.service` are protected: a `start`/`stop`/`restart` request on either is forced to `restart`, so the API and web UI cannot be taken down by a control request.

### Adding a New Controllable Service

1. Add 6 rows to `nick-systemctl.csv` (start, stop, restart, status, enable, disable).
2. Run `/home/nick/update-nick-systemctl.sh`.
3. Add the service to the machine's `servicesArray` in MongoDB.

---

## Service File Management

### GET /services/service-file/:filename and POST /services/service-file/:filename

Read and update existing systemd unit/timer files in `PATH_TO_SERVICE_FILES`.

- GET: parses the base name, then `sudo cat`s both the `.service` and `.timer` variants, returning whichever exist (`null` for missing).
- POST: only updates files that already exist and are listed in the machine's `servicesArray`. Writes to `STAGING_DIR` then `sudo mv "${STAGING_DIR}/<file>" "${PATH_TO_SERVICE_FILES}/"`.

Sudo rows required: the `cat` read rules and the `mv` install rules from the CSV above.

Typical workflow: GET current contents → edit → POST → `systemctl daemon-reload` → restart the service.

---

## Nginx Configuration Management

The `nginx` router reads, scans, creates, edits, and deletes reverse-proxy configs. Privileged steps (all on reverse-proxy servers):

1. Read: `sudo cat "/etc/nginx/sites-available/<file>"`.
2. Back up before edit: `sudo cp "<file>" "<file>.backup.<timestamp>"`.
3. Stage then install: write to `STAGING_DIR`, then `sudo mv "${STAGING_DIR}/<file>" "/etc/nginx/sites-available/"`.
4. Enable site: `sudo ln -s` from `sites-available` into `sites-enabled`.
5. Validate: `sudo nginx -t`. On failure the original is restored from the backup with `sudo mv`.
6. Reload: `sudo systemctl reload nginx`.
7. Certificate: `sudo certbot --nginx --reinstall -d <domain>`.
8. Cleanup: `sudo rm` for backups and removed configs/symlinks.

All of these are covered by the reverse-proxy CSV rows. App-only servers do not get these rules.

---

## Environment File Management (no sudo)

### GET /services/env-file/:name and POST /services/env-file/:name

Read/update `.env` and `.env.local` in a service's `workingDirectory` (from `servicesArray`). These live in user-owned directories, so they use the Node `fs` API directly — no sudo, no shell.

- GET returns `env`, `envStatus`, `envLocal`, `envLocalStatus`, and `workingDirectory`. Either file may be missing.
- POST accepts `{ env, envLocal }` (at least one). Each value is validated against a character whitelist before writing: alphanumeric plus `_ = # . - : / " ' @ , [ ] { }` and space/newline/tab/carriage-return. Invalid characters are rejected.

Restart the service afterward to load the new values.

---

## Other Service Operations (no sudo)

The `services` router also runs non-privileged shell operations scoped to a service's git repository / working directory (validated against `servicesArray`):

- Git: `GET /services/git/:name` (local + remote branches, current branch; prunes stale refs first), `POST /services/git/:name/:action` (`fetch`/`pull`), `POST /services/git/checkout/:name/:branchName`, `DELETE /services/git/delete-branch/:name/:branchName`.
- npm: `POST /services/npm/:name/:action` (`install`/`build`).
- Logs: `GET /services/logs/:name` reads the service's `pathToLogs` file and returns it as plain text.

These do not require sudoers entries, but they do require the service to exist in MongoDB and the API to run in `production` or `testing` `NODE_ENV`.

---

## Best Practices

### Adding a New Service

1. Generate unit files via `POST /services/make-service-file`.
2. Add the 6 systemctl rows to `nick-systemctl.csv`.
3. Run `/home/nick/update-nick-systemctl.sh`.
4. Add the service to the machine's `servicesArray` in MongoDB.
5. Enable and start it via the control endpoint.

### Security Considerations

- Never use `ALL` (e.g. `nick ALL=(ALL) NOPASSWD: ALL` is dangerous).
- Always use full binary paths.
- Use wildcards sparingly and only for low-risk operations.
- Review CSV changes before running the update script; it validates syntax automatically.
- Limit control permissions to services managed by The Server Manager.

### Troubleshooting

`sudo: a password is required`

- The command does not match a sudoers rule exactly. Check the logged command, including the destination path format (trailing slash) and the `mv` source matching `STAGING_DIR`.

Permission denied writing unit/config files

- Ensure `STAGING_DIR` exists and is writable by the API user, and that the `mv` rule's source pattern matches `STAGING_DIR`.

Service control fails

- Confirm the per-action rows exist in `nick-systemctl.csv`.
- Confirm `PATH_AND_NAME_PRIVILIGE_CSV_FILE=/home/nick/nick-systemctl.csv` is set.
- Run `sudo visudo -c -f /etc/sudoers.d/nick-systemctl`.
- Confirm the service exists in the machine's `servicesArray`.
