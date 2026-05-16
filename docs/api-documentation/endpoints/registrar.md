---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Registrar API

The registrar router wraps Porkbun DNS API calls for listing domains, creating subdomains, listing DNS records, and deleting DNS records.

All endpoints are prefixed with `/registrar`.

## GET /registrar/get-all-porkbun-domains

Fetches Porkbun domains and returns their domain names and statuses.

- Authentication required: JWT bearer token.
- Side effect: calls `https://api.porkbun.com/api/json/v3/domain/listAll`.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/registrar/get-all-porkbun-domains \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "domainsArray": [
    {
      "domain": "example.com",
      "status": "ACTIVE"
    }
  ]
}
```

### Error Responses

#### Credentials not configured (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "DNS service credentials not configured",
    "details": "Porkbun API credentials not configured",
    "status": 500
  }
}
```

#### DNS service error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "DNS service error",
    "details": "Porkbun API error: Invalid API key",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch domains",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## POST /registrar/create-subdomain

Creates a DNS record through Porkbun.

- Authentication required: JWT bearer token.
- Side effect: calls `https://api.porkbun.com/api/json/v3/dns/create/:domain`.

### Parameters

- `domain` (string, required): Root domain in Porkbun.
- `subdomain` (string, required): DNS record name.
- `publicIpAddress` (string, required): DNS record content.
- `type` (string, required): DNS record type, such as `A` or `CNAME`.

### Sample Request

```bash
curl -X POST http://localhost:3000/registrar/create-subdomain \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com","subdomain":"app","publicIpAddress":"203.0.113.10","type":"A"}'
```

### Sample Response

```json
{
  "message": "Subdomain created successfully",
  "recordId": "123456789",
  "domain": "example.com",
  "subdomain": "app",
  "type": "A",
  "publicIpAddress": "203.0.113.10",
  "ttl": 600
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "Missing required fields: publicIpAddress",
    "status": 400
  }
}
```

#### DNS service error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "DNS service error",
    "details": "Porkbun API error: Record already exists",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create subdomain",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## GET /registrar/get-all-porkbun-subdomains/:domain

Fetches DNS records for a Porkbun domain.

- Authentication required: JWT bearer token.
- Side effect: calls `https://api.porkbun.com/api/json/v3/dns/retrieve/:domain`.

### Parameters

- `domain` (string, required, URL parameter): Root domain to query.

### Sample Request

```bash
curl http://localhost:3000/registrar/get-all-porkbun-subdomains/example.com \
  -H "Authorization: Bearer jwt-token"
```

### Sample Response

```json
{
  "subdomainsArray": [
    {
      "name": "app.example.com",
      "type": "A",
      "content": "203.0.113.10"
    }
  ]
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "Domain parameter is required",
    "status": 400
  }
}
```

#### DNS service error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "DNS service error",
    "details": "Porkbun API error: Unknown domain",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to fetch DNS records",
    "details": "Unexpected error message",
    "status": 500
  }
}
```

## DELETE /registrar/porkbun-subdomain

Deletes a DNS record by domain, type, and subdomain through Porkbun.

- Authentication required: JWT bearer token.
- Side effect: calls `https://api.porkbun.com/api/json/v3/dns/deleteByNameType/:domain/:type/:subdomain`.

### Parameters

- `domain` (string, required): Root domain in Porkbun.
- `type` (string, required): DNS record type.
- `subdomain` (string, required): DNS record name to delete.

### Sample Request

```bash
curl -X DELETE http://localhost:3000/registrar/porkbun-subdomain \
  -H "Authorization: Bearer jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com","type":"A","subdomain":"app"}'
```

### Sample Response

```json
{
  "message": "DNS record deleted successfully",
  "domain": "example.com",
  "type": "A",
  "subdomain": "app"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "Missing required fields: subdomain",
    "status": 400
  }
}
```

#### DNS service error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "DNS service error",
    "details": "Porkbun API error: Record not found",
    "status": 500
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to delete DNS record",
    "details": "Unexpected error message",
    "status": 500
  }
}
```
