---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Admin API

The admin router manages user permissions and downloadable status report files.

All endpoints are prefixed with `/admin`.

All endpoints in this file require a JWT bearer token because the router applies `authenticateToken` to every route.

## GET /admin/users

Returns all users and their access permissions.

- Authentication required: JWT bearer token.
- Admin required: `isAdmin` middleware.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/admin/users \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "success": true,
  "users": [
    {
      "publicId": "07ef7c75-58ef-4ffe-af61-97876546a8e1",
      "email": "admin@example.com",
      "username": "admin",
      "isAdmin": true,
      "accessServersArray": [],
      "accessPagesArray": []
    }
  ]
}
```

### Error Responses

#### Authentication required (401)

```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Authentication required",
    "status": 401
  }
}
```

#### Admin access required (403)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required",
    "status": 403
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve users",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## PATCH /admin/user/:userId/access-servers

Replaces the machine access list for one user.

- Authentication required: JWT bearer token.
- Admin required: `isAdmin` middleware.
- Side effect: updates a user document.

### Parameters

- `userId` (string, required, URL parameter): User `publicId`.
- `accessServersArray` (array of strings, required): Machine public IDs. Every ID must exist when the array is non-empty.

### Sample Request

```bash
curl -X PATCH http://localhost:3000/admin/user/07ef7c75-58ef-4ffe-af61-97876546a8e1/access-servers \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"accessServersArray":["8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37"]}'
```

### Sample Response

```json
{
  "success": true,
  "message": "Server access updated",
  "user": {
    "publicId": "07ef7c75-58ef-4ffe-af61-97876546a8e1",
    "email": "alex@example.com",
    "accessServersArray": ["8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37"]
  }
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid machine publicIds",
    "details": "The following publicIds do not exist: missing-id",
    "status": 400
  }
}
```

#### User not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to update server access",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## PATCH /admin/user/:userId/access-pages

Replaces the page access list for one user.

- Authentication required: JWT bearer token.
- Admin required: `isAdmin` middleware.
- Side effect: updates a user document.

### Parameters

- `userId` (string, required, URL parameter): User `publicId`.
- `accessPagesArray` (array of strings, required): Page paths. Each path must contain no spaces and only `/`, `-`, `.`, or alphanumeric characters.

### Sample Request

```bash
curl -X PATCH http://localhost:3000/admin/user/07ef7c75-58ef-4ffe-af61-97876546a8e1/access-pages \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"accessPagesArray":["/servers/services","/dns/nginx"]}'
```

### Sample Response

```json
{
  "success": true,
  "message": "Page access updated",
  "user": {
    "publicId": "07ef7c75-58ef-4ffe-af61-97876546a8e1",
    "email": "alex@example.com",
    "accessPagesArray": ["/servers/services", "/dns/nginx"]
  }
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid page path",
    "details": "Page path \"/bad path\" is invalid. Must contain no spaces and only \"/\", \"-\", \".\", or alphanumerics.",
    "status": 400
  }
}
```

#### User not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to update page access",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /admin/downloads

Lists files under the status reports directory.

- Authentication required: JWT bearer token.
- Side effect: reads `PATH_PROJECT_RESOURCES/status_reports`.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/admin/downloads \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "directory": "/var/lib/the-server-manager/status_reports",
  "fileCount": 1,
  "files": [
    {
      "fileName": "nginx-scan.csv",
      "size": 2048,
      "sizeKB": "2.00",
      "modifiedDate": "2026-05-16T19:00:00.000Z",
      "isFile": true
    }
  ]
}
```

### Error Responses

#### Directory not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Status reports directory not found",
    "details": "Path: /var/lib/the-server-manager/status_reports",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to list download files",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /admin/downloads/:filename

Streams a status report file as a download.

- Authentication required: JWT bearer token.
- Response content type: `application/octet-stream`.
- Side effect: reads a file from `PATH_PROJECT_RESOURCES/status_reports`.

### Parameters

- `filename` (string, required, URL parameter): File name to download. It cannot contain `..`, `/`, or `\`.

### Sample Request

```bash
curl http://localhost:3000/admin/downloads/nginx-scan.csv \
  -H "Authorization: Bearer jwt-token" \
  -o nginx-scan.csv
```

### Sample Response

The response is binary file content with `Content-Disposition: attachment`.

```text
fileName,serverName,portNumber
site.example.com,site.example.com,3000
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid filename",
    "details": "Filename cannot contain path traversal characters",
    "status": 400
  }
}
```

#### File not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "File not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to download file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```
