# DNS Nginx Setup Automation Plan

Date: 2026-05-07
Server context: maestro06 on the Rochester Data Center network.

## Goal

When `/dns/nginx` creates a new nginx config in `/etc/nginx/sites-available/{filename}`, the API should optionally finish the operational setup:

1. Create a symlink from `/etc/nginx/sites-available/{filename}` to `/etc/nginx/sites-enabled/{filename}`.
2. Run `sudo systemctl reload nginx`.
3. Run `sudo certbot --nginx -d {filename}`.
4. Record setup status on the `NginxFile` database record.

## Feasibility

This is feasible without breaking legacy records if the new fields are optional.

The current `NginxFile` Mongoose schema does not require every field beyond the existing core fields, and MongoDB documents can omit newly added fields. Old records will continue to load if the API response maps missing values to `null` or the web UI renders missing values as `n/a`.

Recommended database fields:

- `symlink`: `"yes" | "failed" | null`
- `certbot`: `"yes" | "failed" | null`

I recommend also adding:

- `nginxReload`: `"yes" | "failed" | null`

Reason: reload is a separate setup step with a separate failure mode. If symlink succeeds but reload fails, the user needs to know that the file exists but nginx was not reloaded.

## Compatibility Plan

1. Update `api/src/models/nginxFile.ts` with optional enum fields:
   - `symlink`
   - `nginxReload`
   - `certbot`
2. Update `api/src/modules/nginxParseConfig.ts` so `/nginx` responses include these fields, using `fileObj.syslink ?? null`, etc.
3. Update the web `NginxFile` TypeScript interfaces in:
   - `web/src/app/(dashboard)/dns/nginx/page.tsx`
   - `web/src/components/tables/TableNginxFiles.tsx`
4. Add compact status display in `TableNginxFiles.tsx`:
   - `yes` for success
   - `failed` for attempted failure
   - `n/a` for `null` or missing legacy values
5. Keep old records untouched. Do not backfill them unless there is a separate migration decision.

## API Flow Plan

In `POST /nginx/create-config-file`, after `createNginxConfigFromTemplate` succeeds:

1. Create the `NginxFile` record with setup fields initialized to `null`.
2. Run symlink command:
   - If `/etc/nginx/sites-enabled/{filename}` already points to the expected target, record `symlink: "yes"`.
   - If the symlink must be created, run `sudo ln -s "/etc/nginx/sites-available/{filename}" "/etc/nginx/sites-enabled/{filename}"`.
   - On success, set `symlink: "yes"`.
   - On failure, set `symlink: "failed"` and stop the remaining setup steps.
3. Run `sudo systemctl reload nginx`.
   - On success, set `nginxReload: "yes"`.
   - On failure, set `nginxReload: "failed"` and stop before certbot.
4. Run `sudo certbot --nginx -d "{filename}"`.
   - On success, set `certbot: "yes"`.
   - On failure, set `certbot: "failed"`.
5. Return the created record and a setup summary so the UI/API caller can see partial failures immediately.

This preserves the existing behavior where the config file and database record can still be created even if later operational setup fails.

## Command Safety Recommendations

Validate `{filename}` as a domain-style nginx config name before using it in shell commands. The existing UI validates domain/subdomain input, but the API should also enforce it server-side because these values will now reach privileged commands.

Use `execFile` or `spawn` with argument arrays instead of interpolated shell strings for the new commands. The existing route has some interpolated sudo commands for config editing; the new privileged operations should be stricter because certbot and symlink paths are directly domain-derived.

Prefer the primary server name only for `certbot --nginx -d {filename}` if that is the intended certificate. If additional server names should be on the same certificate, the certbot command should include each domain as its own `-d` argument.

## Sudo CSV Changes Made

Updated `/home/nick/nick-systemctl.csv` with these non-service-specific rows near the top:

```csv
nick,ALL=(root),NOPASSWD:,/usr/bin/ln,-s,*
nick,ALL=(root),NOPASSWD:,/usr/bin/systemctl,reload,nginx
nick,ALL=(root),NOPASSWD:,/usr/bin/certbot,--nginx,*
```

These changes still need to be applied to sudoers by running:

```bash
/home/nick/update-nick-systemctl.sh
```

## Concerns For Nick To Address

The certbot sudo rule uses a wildcard domain argument. This is practical for automation but broad. A safer long-term design is to add a small root-owned wrapper script that validates domain names and then runs certbot, and only allow that wrapper through sudoers.

Certbot can be interactive depending on first-run state, terms-of-service acceptance, email configuration, and redirect prompts. The implementation may need non-interactive flags after we confirm the preferred certbot account/email behavior for maestro06.

The requested certbot command only certifies `{filename}`. If nginx configs can include additional server names, decide whether those should be included in the same certificate.

The current config creation helper writes directly to the selected destination with normal filesystem permissions. On maestro06, this works only if the API user can write there or if the chosen destination is a writable staging path. If `/etc/nginx/sites-available` is not writable by the API process, the existing create flow may need to stage then `sudo mv`, matching the edit flow.

The status field name is `symlink`.

## Recommended Implementation Order

1. Add optional database fields and response mapping.
2. Add frontend display with `n/a` fallback.
3. Add command helper functions for symlink, reload, and certbot using argument arrays.
4. Integrate the setup sequence into `POST /nginx/create-config-file`.
5. Add focused tests for legacy null/missing fields and partial setup failures.
6. Apply sudoers from the updated CSV and test on maestro06 with one disposable domain.

## Nick comments

1. I made a mistake using syslink, it shoudl be symlink.
2. can we make the certbot implementation assume we've already added the email and accepted the terms - meaning I will have done it one time and it will be new. If it's possible to do the recertification meaning the certification already happened then we want to select the `1: Attempt to reinstall this existing certificate` option.
3. use the `sudo mv` approach for `/etc/nginx/sites-available`

## Implementation Notes

Implemented on 2026-05-07:

1. Added optional `symlink`, `nginxReload`, and `certbot` fields to `NginxFile`.
2. Updated `/nginx` response mapping and the web nginx table to show `yes`, `failed`, or `n/a`.
3. Updated `POST /nginx/create-config-file` to write config files to `STAGING_DIR` first when the destination is `/etc/nginx/sites-available`, then move them with `sudo mv`.
4. Added setup automation after database record creation:
   - `sudo /usr/bin/ln -s /etc/nginx/sites-available/{filename} /etc/nginx/sites-enabled/{filename}`
   - `sudo /usr/bin/systemctl reload nginx`
   - `sudo /usr/bin/certbot --nginx --reinstall -d {filename}`
5. Certbot uses `--reinstall` to handle the existing-certificate path without an interactive prompt.
6. The `ln` and `certbot` sudo CSV rows were corrected to wildcard command-argument specs because the CSV converter only supports one `action` and one `unit` field after the command path:
   - `nick,ALL=(root),NOPASSWD:,/usr/bin/ln,-s,*`
   - `nick,ALL=(root),NOPASSWD:,/usr/bin/certbot,--nginx,*`

Remaining server action:

```bash
/home/nick/update-nick-systemctl.sh
```
