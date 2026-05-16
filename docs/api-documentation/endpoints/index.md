---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Index API

The index router serves the API landing HTML template.

All endpoints are prefixed with `/`.

## GET /

Returns the compiled `index.html` template as an HTML response.

- Response content type: `text/html`.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/
```

### Sample Response

The response is HTML.

```html
<!doctype html>
<html>
  <body>...</body>
</html>
```

### Error Responses

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to serve index page",
    "details": "ENOENT: no such file or directory",
    "status": 500
  }
}
```
