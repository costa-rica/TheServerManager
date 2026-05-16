---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# The Server Manager API Reference

The Server Manager API is an Express 5 REST API written in TypeScript with MongoDB persistence through Mongoose.

This file is the top-level index for the generated API documentation. Each mounted router has its own resource file under `./endpoints/`.

- [Index](./endpoints/index.md)
- [Users](./endpoints/users.md)
- [Machines](./endpoints/machines.md)
- [Services](./endpoints/services.md)
- [Nginx](./endpoints/nginx.md)
- [Admin](./endpoints/admin.md)
- [Registrar](./endpoints/registrar.md)

## File naming

Endpoint files use lowercase, hyphen-separated names that match the router URL prefix. For example, a router mounted at `/contract-users-teams` becomes `endpoints/contract-users-teams.md`. The root router mounted at `/` is documented as `endpoints/index.md`.

## Endpoint documentation format

Every endpoint file follows this structure:

1. YAML frontmatter with `created_at`, `updated_at`, `created_by`, and `modified_by`.
2. A `# <Resource> API` heading.
3. A one-sentence description of what the router handles.
4. A shared-prefix line formatted as `All endpoints are prefixed with` `/<prefix>`.
5. One `## <METHOD> /<router-prefix>/<endpoint-path>` section per endpoint, in source order.

Every endpoint section follows this structure:

1. A short description sentence.
2. A bullet list of only the flags that apply, such as authentication, side effects, content type, or external services.
3. `### Parameters`
4. `### Sample Request`
5. `### Sample Response`
6. `### Error Responses`
7. One optional extra section for non-standard notes such as streaming or rollback behavior.

Formatting rules:

- Avoid bold text in section headings or at the start of list items.
- Use inline code for parameter names, header names, environment variables, URL paths, table names, and HTTP method names.
- Prefer fenced code blocks for structured payloads.
- Keep prose descriptions to one or two sentences.
