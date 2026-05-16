---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Machines API

The machines router manages registered servers and machine-level diagnostics.

All endpoints are prefixed with `/machines`.

## GET /machines/name

Returns the current host machine name, local IP address, and user home directory.

- Authentication required: JWT bearer token.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/machines/name \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "machineName": "server-01",
  "localIpAddress": "192.168.1.25",
  "userHomeDir": "/home/nick"
}
```

### Error Responses

#### Missing token (401)

```json
{
  "message": "Token is required"
}
```

#### Invalid token (403)

```json
{
  "message": "Invalid token"
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve machine information",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /machines/syslog

Reads `/var/log/syslog` and returns its full text.

- Authentication required: JWT bearer token.
- Response content type: `text/plain`.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/machines/syslog \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```text
May 16 12:00:00 server-01 systemd[1]: Started The Server Manager API.
```

### Error Responses

#### File not found (404)

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Syslog file not found",
    "details": "The file /var/log/syslog does not exist",
    "status": 404
  }
}
```

#### Permission denied (403)

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Permission denied to read syslog file",
    "details": "Insufficient permissions to read /var/log/syslog",
    "status": 403
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to read syslog file",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /machines/check-nick-systemctl

Builds the service configuration array from `nick-systemctl.csv`.

- Authentication required: JWT bearer token.
- Side effect: reads local service-control configuration files.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/machines/check-nick-systemctl \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "message": "Services array built successfully from nick-systemctl.csv",
  "servicesArray": [
    {
      "name": "tsm-api",
      "filename": "tsm-api.service",
      "pathToLogs": "/var/log/tsm-api.log"
    }
  ],
  "userHomeDir": "/home/nick"
}
```

### Error Responses

#### Module error (400 or 500)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Module validation failed",
    "status": 400
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to build services array",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /machines

Returns machines visible to the authenticated user.

- Authentication required: JWT bearer token.
- Admin users receive every machine; non-admin users receive only machines listed in `accessServersArray`.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/machines \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "result": true,
  "existingMachines": [
    {
      "publicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
      "machineName": "server-01",
      "urlApiForTsmNetwork": "http://server-01.local:3000",
      "localIpAddress": "192.168.1.25",
      "userHomeDir": "/home/nick",
      "nginxStoragePathOptions": ["/etc/nginx/sites-available"],
      "servicesArray": []
    }
  ]
}
```

### Error Responses

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve machines",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /machines

Creates a machine document from request data and current host information.

- Authentication required: JWT bearer token.
- Side effect: creates a row in the `machines` collection.

### Parameters

- `urlApiForTsmNetwork` (string, required): API URL used to reach this machine from the TSM network.
- `nginxStoragePathOptions` (array of strings, required): Allowed nginx storage directories.
- `servicesArray` (array, optional): Service objects. Each item requires `filename` and `pathToLogs`; `filenameTimer` and `workingDirectory` are strings when present, and `port` is a number when present.

### Sample Request

```bash
curl -X POST http://localhost:3000/machines \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"urlApiForTsmNetwork":"http://server-01.local:3000","nginxStoragePathOptions":["/etc/nginx/sites-available"],"servicesArray":[{"filename":"tsm-api.service","pathToLogs":"/var/log/tsm-api.log","port":3000}]}'
```

### Sample Response

```json
{
  "message": "Machine created successfully",
  "machine": {
    "publicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "id": "662f9de14fdb5fc8a1c00001",
    "machineName": "server-01",
    "urlApiForTsmNetwork": "http://server-01.local:3000",
    "localIpAddress": "192.168.1.25",
    "userHomeDir": "/home/nick",
    "nginxStoragePathOptions": ["/etc/nginx/sites-available"],
    "servicesArray": [
      {
        "name": "tsm-api",
        "filename": "tsm-api.service",
        "pathToLogs": "/var/log/tsm-api.log",
        "port": 3000
      }
    ],
    "createdAt": "2026-05-16T19:00:00.000Z",
    "updatedAt": "2026-05-16T19:00:00.000Z"
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
    "details": "nginxStoragePathOptions must be an array of strings",
    "status": 400
  }
}
```

#### Service validation error (400 or 500)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Service validation failed",
    "status": 400
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create machine",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## PATCH /machines/:publicId

Updates selected editable fields on a machine.

- Authentication required: JWT bearer token.

### Parameters

- `publicId` (string, required, URL parameter): Machine public ID.
- `urlApiForTsmNetwork` (string, optional): Replacement API URL; must be non-empty when provided.
- `nginxStoragePathOptions` (array of strings, optional): Replacement nginx storage directory list.
- `servicesArray` (array, optional): Replacement service array with the same validation rules as `POST /machines`.

### Sample Request

```bash
curl -X PATCH http://localhost:3000/machines/8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37 \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"urlApiForTsmNetwork":"http://server-01.local:3000","nginxStoragePathOptions":["/etc/nginx/sites-available"]}'
```

### Sample Response

```json
{
  "message": "Machine updated successfully",
  "machine": {
    "publicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "id": "662f9de14fdb5fc8a1c00001",
    "machineName": "server-01",
    "urlApiForTsmNetwork": "http://server-01.local:3000",
    "localIpAddress": "192.168.1.25",
    "nginxStoragePathOptions": ["/etc/nginx/sites-available"],
    "servicesArray": [],
    "createdAt": "2026-05-16T19:00:00.000Z",
    "updatedAt": "2026-05-16T19:05:00.000Z"
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
    "details": "At least one field must be provided for update (urlApiForTsmNetwork, nginxStoragePathOptions, or servicesArray)",
    "status": 400
  }
}
```

#### Machine not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Machine not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to update machine",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## DELETE /machines/:publicId

Deletes a machine document.

- Authentication required: JWT bearer token.
- Side effect: deletes one row from the `machines` collection.

### Parameters

- `publicId` (string, required, URL parameter): Machine public ID; must be a non-empty string.

### Sample Request

```bash
curl -X DELETE http://localhost:3000/machines/8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37 \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "message": "Machine deleted successfully",
  "deletedMachine": {
    "publicId": "8f15c02e-f2a4-4c74-b04f-7fdbfe7e2b37",
    "machineName": "server-01"
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
    "details": "publicId parameter must be a non-empty string",
    "status": 400
  }
}
```

#### Machine not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Machine not found",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to delete machine",
    "details": "Unexpected error message",
    "status": 500
  }
}
```
