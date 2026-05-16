---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Services API

The services router manages systemd service state, logs, git branches, npm commands, generated service files, and environment files for services configured on the current machine.

All endpoints are prefixed with `/services`.

All endpoints in this file require a JWT bearer token because the router applies `authenticateToken` to every route.

## GET /services

Returns status information for every configured service on the current machine.

- Authentication required: JWT bearer token.
- Side effect: calls `systemctl` through service module helpers.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/services \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "servicesStatusArray": [
    {
      "name": "tsm-api",
      "filename": "tsm-api.service",
      "loaded": "loaded",
      "active": "active",
      "status": "running",
      "onStartStatus": "enabled",
      "timerLoaded": "loaded",
      "timerActive": "active",
      "timerStatus": "waiting",
      "timerOnStartStatus": "enabled",
      "timerTrigger": "Mon 2026-05-18 00:00:00 UTC"
    }
  ]
}
```

### Error Responses

#### Environment validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "This endpoint only works in production or testing environment on Ubuntu OS",
    "status": 400
  }
}
```

#### Machine or services not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Machine not found in database",
    "details": "Machine with name \"server-01\" not found in database",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch services status",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /services/control/:serviceFilename/:toggleStatus

Runs a systemd action on a configured service or timer and returns the updated status.

- Authentication required: JWT bearer token.
- Side effect: calls `systemctl` through `toggleService`.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `serviceFilename` (string, required, URL parameter): Configured service or timer filename, such as `tsm-api.service`.
- `toggleStatus` (string, required, URL parameter): One of `start`, `stop`, `restart`, `reload`, `enable`, or `disable`.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/control/tsm-api.service/restart \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "name": "tsm-api",
  "filename": "tsm-api.service",
  "loaded": "loaded",
  "active": "active",
  "status": "running",
  "onStartStatus": "enabled"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid toggleStatus",
    "details": "Invalid toggleStatus. Must be one of: start, stop, restart, reload, enable, disable",
    "status": 400
  }
}
```

#### Service not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service not found",
    "details": "Service with filename \"tsm-api.service\" is not configured in this machine's servicesArray",
    "status": 404
  }
}
```

#### Toggle failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to restart service",
    "details": "systemctl error output",
    "status": 500
  }
}
```

## GET /services/logs/:name

Returns the configured log file contents for a service.

- Authentication required: JWT bearer token.
- Response content type: `text/plain`.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.

### Sample Request

```bash
curl http://localhost:3000/services/logs/tsm-api \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```text
2026-05-16T19:00:00.000Z info API started
```

### Error Responses

#### Not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Log file not found or could not be read",
    "details": "ENOENT: no such file or directory",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to read log file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /services/git/:name

Fetches local branches, remote branches, and the current branch for a service git repository.

- Authentication required: JWT bearer token.
- Side effect: attempts `git fetch --prune` before listing branches.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.

### Sample Request

```bash
curl http://localhost:3000/services/git/tsm-api \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "gitBranchesLocalArray": ["main", "codex/api-docs"],
  "gitBranchesRemoteArray": ["origin/main", "origin/codex/api-docs"],
  "currentBranch": "main"
}
```

### Error Responses

#### Service not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service not found",
    "details": "Service with name \"tsm-api\" is not configured in this machine's servicesArray",
    "status": 404
  }
}
```

#### Git command failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to get remote branches",
    "details": "git error output",
    "status": 500
  }
}
```

## POST /services/git/:name/:action

Runs `git fetch` or `git pull` for a service repository.

- Authentication required: JWT bearer token.
- Side effect: executes a git command in the service repository.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.
- `action` (string, required, URL parameter): One of `fetch` or `pull`.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/git/tsm-api/pull \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "success": true,
  "action": "pull",
  "stdout": "Already up to date.",
  "stderr": ""
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid action",
    "details": "Invalid action. Must be one of: fetch, pull",
    "status": 400
  }
}
```

#### Git command failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to execute git pull",
    "details": "git error output",
    "status": 500
  }
}
```

## POST /services/git/checkout/:name/:branchName

Checks out a branch in a service repository.

- Authentication required: JWT bearer token.
- Side effect: executes `git checkout`.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.
- `branchName` (string, required, URL parameter): Branch name to check out.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/git/checkout/tsm-api/main \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "success": true,
  "branchName": "main",
  "stdout": "Switched to branch 'main'",
  "stderr": ""
}
```

### Error Responses

#### Checkout failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to checkout branch \"main\"",
    "details": "git error output",
    "status": 500
  }
}
```

## DELETE /services/git/delete-branch/:name/:branchName

Deletes a local git branch for a service repository.

- Authentication required: JWT bearer token.
- Side effect: executes branch deletion through the git module.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.
- `branchName` (string, required, URL parameter): Branch name to delete.

### Sample Request

```bash
curl -X DELETE http://localhost:3000/services/git/delete-branch/tsm-api/codex/api-docs \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "success": true,
  "branchName": "codex/api-docs",
  "stdout": "Deleted branch codex/api-docs",
  "stderr": ""
}
```

### Error Responses

#### Delete failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to delete branch \"codex/api-docs\"",
    "details": "git error output",
    "status": 500
  }
}
```

## POST /services/npm/:name/:action

Runs an npm operation for a service repository.

- Authentication required: JWT bearer token.
- Side effect: executes `npm install` or `npm run build`.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.
- `action` (string, required, URL parameter): One of `install` or `build`.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/npm/tsm-api/build \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "status": "success",
  "warnings": [],
  "failureReason": null
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid action",
    "details": "Invalid action. Must be one of: install, build",
    "status": 400
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to execute npm command",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /services/make-service-file

Generates systemd service and optional timer files from bundled templates.

- Authentication required: JWT bearer token.
- Side effect: writes generated service files to `PATH_TO_SERVICE_FILES`.

### Parameters

- `filenameServiceTemplate` (string, required): Service template filename; must be listed in `VALID_SERVICE_TEMPLATES`.
- `filenameTimerTemplate` (string, optional): Timer template filename; must be listed in `VALID_TIMER_TEMPLATES` when provided.
- `variables` (object, required): Template variables. `project_name` is required; optional fields include `python_env_name`, `port`, and `subproject`.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/make-service-file \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"filenameServiceTemplate":"expressjs.service","variables":{"project_name":"ExampleApp","port":3000,"subproject":"api"}}'
```

### Sample Response

```json
{
  "message": "Service file(s) created successfully",
  "service": {
    "template": "expressjs.service",
    "outputPath": "/etc/systemd/system/exampleapp-api.service",
    "filename": "exampleapp-api.service",
    "content": "[Unit]\nDescription=ExampleApp\n"
  },
  "variablesApplied": {
    "project_name": "ExampleApp",
    "project_name_lowercase": "exampleapp",
    "port": 3000,
    "subproject_path": "/home/nick/ExampleApp/api",
    "user_home": "/home/nick",
    "user": "nick",
    "group": "nick"
  }
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid service template",
    "details": "filenameServiceTemplate must be one of: expressjs.service, nextjs.service",
    "status": 400
  }
}
```

#### Configuration error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Server configuration error",
    "details": "PATH_TO_SERVICE_FILES environment variable is not set",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to generate service file(s)",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /services/service-file/:filename

Reads matching `.service` and `.timer` files from `PATH_TO_SERVICE_FILES`.

- Authentication required: JWT bearer token.
- Side effect: uses `sudo cat` to read service files.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `filename` (string, required, URL parameter): Service or timer filename with an extension, such as `tsm-api.service`.

### Sample Request

```bash
curl http://localhost:3000/services/service-file/tsm-api.service \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "status": "success",
  "filenameService": "tsm-api.service",
  "filenameTimer": "tsm-api.timer",
  "fileContentService": "[Unit]\nDescription=TSM API\n",
  "fileContentTimer": null
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid filename format",
    "details": "Filename must include extension (e.g., app.service or app.timer)",
    "status": 400
  }
}
```

#### Service files not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service files not found",
    "details": "Neither tsm-api.service nor tsm-api.timer found in /etc/systemd/system",
    "status": 404
  }
}
```

#### Configuration error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Server configuration error",
    "details": "PATH_TO_SERVICE_FILES environment variable is not set",
    "status": 500
  }
}
```

## POST /services/service-file/:filename

Updates a configured service or timer file.

- Authentication required: JWT bearer token.
- Side effect: writes to `STAGING_DIR` and moves the file to `PATH_TO_SERVICE_FILES` with `sudo mv`.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `filename` (string, required, URL parameter): Configured service or timer filename.
- `fileContents` (string, required): Replacement file contents.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/service-file/tsm-api.service \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"fileContents":"[Unit]\nDescription=TSM API\n"}'
```

### Sample Response

```json
{
  "status": "success",
  "message": "Service file updated successfully",
  "filename": "tsm-api.service"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Service file not configured for this machine",
    "details": "File \"tsm-api.service\" is not in this machine's servicesArray",
    "status": 400
  }
}
```

#### Service file not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service file not found",
    "details": "File \"tsm-api.service\" does not exist in /etc/systemd/system",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to update service file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /services/env-file/:name

Reads `.env` and `.env.local` from a configured service working directory.

- Authentication required: JWT bearer token.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.

### Sample Request

```bash
curl http://localhost:3000/services/env-file/tsm-api \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "status": "success",
  "env": "PORT=3000\n",
  "envStatus": true,
  "envLocal": null,
  "envLocalStatus": false,
  "workingDirectory": "/home/nick/TheServerManager/api"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Working directory not configured",
    "details": "Service \"tsm-api\" does not have workingDirectory configured in servicesArray",
    "status": 400
  }
}
```

#### Service not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Service not found",
    "details": "Service with name \"tsm-api\" not found in machine's servicesArray",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to read env file(s)",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /services/env-file/:name

Updates `.env` and/or `.env.local` for a configured service.

- Authentication required: JWT bearer token.
- Side effect: writes env files inside the service working directory.
- Environment restriction: `NODE_ENV` must be `production` or `testing`.

### Parameters

- `name` (string, required, URL parameter): Service name in the current machine `servicesArray`.
- `env` (string, optional): Replacement `.env` contents; allowed characters are alphanumeric plus `_ = # . - : / " ' @ , [ ] { }` whitespace, newlines, carriage returns, and tabs.
- `envLocal` (string, optional): Replacement `.env.local` contents with the same allowed character set. At least one of `env` or `envLocal` is required.

### Sample Request

```bash
curl -X POST http://localhost:3000/services/env-file/tsm-api \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"env":"PORT=3000\nNODE_ENV=production\n"}'
```

### Sample Response

```json
{
  "status": "success",
  "message": "Env file(s) updated successfully",
  "envWritten": true,
  "envLocalWritten": false,
  "workingDirectory": "/home/nick/TheServerManager/api"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid characters in .env file content",
    "details": "Only alphanumeric and these special characters are allowed: _ = # . - : / \" ' @ , [ ] { } space newline tab",
    "status": 400
  }
}
```

#### Write failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to write .env file",
    "details": "EACCES: permission denied",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to update env file(s)",
    "details": "Unexpected error message",
    "status": 500
  }
}
```
