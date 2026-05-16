---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Nginx API

The nginx router tracks nginx configuration records, scans config directories, creates configs from templates, and edits on-disk nginx files.

All endpoints are prefixed with `/nginx`.

All endpoints in this file require a JWT bearer token because the router applies `authenticateToken` to every route.

## GET /nginx

Returns nginx configuration records populated with machine display data.

- Authentication required: JWT bearer token.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/nginx \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
[
  {
    "publicId": "5e51a1d8-7c62-4cb8-86a8-22e3b85d2f41",
    "serverName": "app.example.com",
    "serverNameArrayOfAdditionalServerNames": ["www.app.example.com"],
    "portNumber": 3000,
    "appHostServerMachinePublicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "nginxHostServerMachinePublicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "framework": "ExpressJs",
    "storeDirectory": "/etc/nginx/sites-available",
    "appHostMachineName": "server-01",
    "appHostLocalIpAddress": "192.168.1.25"
  }
]
```

### Error Responses

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch nginx files",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /nginx/scan-nginx-dir

Scans `PATH_ETC_NGINX_SITES_AVAILABLE`, parses nginx files, inserts new database records, and writes a CSV scan report.

- Authentication required: JWT bearer token.
- Side effect: reads nginx config files, writes rows to `nginxfiles`, and creates a status report.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/nginx/scan-nginx-dir \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "scanned": 3,
  "new": 1,
  "duplicates": 1,
  "errors": 1,
  "currentMachineIp": "192.168.1.25",
  "nginxHostMachinePublicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
  "reportPath": "/var/lib/the-server-manager/status_reports/nginx-scan.csv",
  "newEntries": [
    {
      "fileName": "app.example.com",
      "serverName": "app.example.com",
      "additionalServerNames": ["www.app.example.com"],
      "portNumber": 3000,
      "localIpAddress": "192.168.1.50",
      "framework": "ExpressJs",
      "appHostMachineFound": true,
      "publicId": "5e51a1d8-7c62-4cb8-86a8-22e3b85d2f41"
    }
  ],
  "duplicateEntries": [],
  "errorEntries": []
}
```

### Error Responses

#### Current machine not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Current machine not found in database",
    "details": "Current IP: 192.168.1.25",
    "status": 404
  }
}
```

#### Directory read failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to read nginx directory",
    "details": "/etc/nginx/sites-available: EACCES: permission denied",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to scan nginx directory",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /nginx/create-config-file

Creates an nginx config file from a bundled template and stores a database record.

- Authentication required: JWT bearer token.
- Side effect: writes an nginx config file and creates a row in `nginxfiles`.

### Parameters

- `templateFileName` (string, required): Template key. Allowed values are `expressJs` and `nextJsPython`.
- `serverNamesArray` (array of strings, required): Non-empty server names; the first item becomes `serverName`.
- `appHostServerMachinePublicId` (string, required): Machine public ID for the app host.
- `portNumber` (number, required): Port number from `1` through `65535`.
- `saveDestination` (string, required): Directory path where the config file should be saved.

### Sample Request

```bash
curl -X POST http://localhost:3000/nginx/create-config-file \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"templateFileName":"expressJs","serverNamesArray":["app.example.com","www.app.example.com"],"appHostServerMachinePublicId":"8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37","portNumber":3000,"saveDestination":"/etc/nginx/sites-available"}'
```

### Sample Response

```json
{
  "message": "Nginx config file created successfully",
  "filePath": "/etc/nginx/sites-available/app.example.com",
  "databaseRecord": {
    "publicId": "5e51a1d8-7c62-4cb8-86a8-22e3b85d2f41",
    "serverName": "app.example.com",
    "serverNameArrayOfAdditionalServerNames": ["www.app.example.com"],
    "portNumber": 3000,
    "appHostServerMachinePublicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "nginxHostServerMachinePublicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "framework": "ExpressJs",
    "storeDirectory": "/etc/nginx/sites-available"
  }
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "portNumber must be a number between 1 and 65535",
    "status": 400
  }
}
```

#### Not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Machine not found",
    "details": "Machine with specified appHostServerMachinePublicId not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create nginx config file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## DELETE /nginx/clear

Deletes every nginx configuration record from the database.

- Authentication required: JWT bearer token.
- Side effect: deletes all rows from the `nginxfiles` collection.

### Parameters

None.

### Sample Request

```bash
curl -X DELETE http://localhost:3000/nginx/clear \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "message": "NginxFiles collection cleared successfully",
  "deletedCount": 4
}
```

### Error Responses

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to clear nginx files",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /nginx/config-file/:nginxFilePublicId

Reads an nginx config file from disk for a tracked nginx record.

- Authentication required: JWT bearer token.
- Side effect: runs `sudo cat` for the config file path.

### Parameters

- `nginxFilePublicId` (string, required, URL parameter): UUID v4 public ID for an nginx file record.

### Sample Request

```bash
curl http://localhost:3000/nginx/config-file/5e51a1d8-7c62-4cb8-86a8-22e3b85d2f41 \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "content": "server {\n  server_name app.example.com;\n}\n",
  "filePath": "/etc/nginx/sites-available/app.example.com",
  "serverName": "app.example.com"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid nginxFilePublicId format",
    "details": "nginxFilePublicId must be a valid UUID v4",
    "status": 400
  }
}
```

#### Configuration not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Configuration not found",
    "details": "Nginx configuration with specified publicId not found",
    "status": 404
  }
}
```

#### File read failed (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to read nginx configuration file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /nginx/config-file/:nginxFilePublicId

Updates an nginx config file, validates it with `nginx -t`, and restores a backup if validation fails.

- Authentication required: JWT bearer token.
- Side effect: creates a backup, writes a staging file, moves it with `sudo mv`, runs `sudo nginx -t`, and may restore the backup.

### Parameters

- `nginxFilePublicId` (string, required, URL parameter): UUID v4 public ID for an nginx file record.
- `content` (string, required): Replacement nginx config content.

### Sample Request

```bash
curl -X POST http://localhost:3000/nginx/config-file/5e51a1d8-7c62-4cb8-86a8-22e3b85d2f41 \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"content":"server {\n  server_name app.example.com;\n}\n"}'
```

### Sample Response

```json
{
  "message": "Nginx configuration updated successfully",
  "filePath": "/etc/nginx/sites-available/app.example.com",
  "serverName": "app.example.com",
  "validationPassed": true
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nginx configuration validation failed",
    "details": "nginx -t failed: invalid nginx configuration",
    "status": 400
  }
}
```

#### Configuration not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Configuration not found",
    "details": "Nginx configuration with specified publicId not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to update nginx configuration file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

### Rollback

If `nginx -t` fails, the handler attempts to move the backup file back over the edited file before returning the validation error.

## DELETE /nginx/:publicId

Deletes an nginx config file from disk and deletes the matching database record.

- Authentication required: JWT bearer token.
- Side effect: removes a file from disk when present and deletes one row from `nginxfiles`.

### Parameters

- `publicId` (string, required, URL parameter): UUID v4 public ID for an nginx file record.

### Sample Request

```bash
curl -X DELETE http://localhost:3000/nginx/5e51a1d8-7c62-4cb8-86a8-22e3b85d2f41 \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "message": "Nginx configuration deleted successfully",
  "serverName": "app.example.com",
  "filePath": "/etc/nginx/sites-available/app.example.com"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid publicId format",
    "details": "publicId must be a valid UUID v4",
    "status": 400
  }
}
```

#### Configuration not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Configuration not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to delete nginx configuration",
    "details": "Unexpected error message",
    "status": 500
  }
}
```
