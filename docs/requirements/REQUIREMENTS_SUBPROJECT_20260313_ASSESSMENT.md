# Assessment: Optional Subproject Support for Service File Templates

## Objective

Enable TheServerManager to generate systemd service files for monorepo-style projects where the application lives in a subdirectory (e.g., `NewsNexus11/api`) rather than at the project root.

## Problem

Currently, all service file templates assume the application is at the project root:

```
WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}
EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}/.env
```

But monorepo projects like NewsNexus11 and TheServerManager itself have subprojects:

```
WorkingDirectory=/home/limited_user/applications/NewsNexus11/api
EnvironmentFile=/home/limited_user/applications/NewsNexus11/api/.env
```

The `/api` segment is not representable with the current template system.

## Real-World Example

`/etc/systemd/system/newsnexus11api.service` on nws-nn11prod:

```ini
WorkingDirectory=/home/limited_user/applications/NewsNexus11/api
EnvironmentFile=/home/limited_user/applications/NewsNexus11/api/.env
```

Here `NewsNexus11` is the PROJECT_NAME and `api` is the subproject.

## Recommendation: Add Optional `{{SUBPROJECT_PATH}}` Placeholder

**This is feasible with minimal changes.** The approach is an optional `subproject` field that, when provided, appends a path segment. When empty, behavior is identical to today.

## Approach: Resolved Path Segment (Not Nested Placeholder)

Rather than inserting `{{SUBPROJECT}}` literally into templates, compute a resolved path segment that includes the leading `/` only when a subproject is provided:

| User Input      | Resolved `subproject_path` | Template Result                                     |
| --------------- | -------------------------- | --------------------------------------------------- |
| `""` (empty)    | `""`                       | `{{USER_HOME}}/applications/{{PROJECT_NAME}}`       |
| `"api"`         | `"/api"`                   | `{{USER_HOME}}/applications/{{PROJECT_NAME}}/api`   |
| `"web"`         | `"/web"`                   | `{{USER_HOME}}/applications/{{PROJECT_NAME}}/web`   |

This avoids a trailing `/` or double `/` problem when no subproject is set.

## Changes Required

### 1. API — `src/modules/systemd.ts`

**TemplateVariables interface** — add optional field:

```typescript
subproject_path?: string;  // Resolved: "" or "/api", "/web", etc.
```

**replaceTemplatePlaceholders()** — add replacement:

```typescript
if (variables.subproject_path !== undefined) {
  content = content.replace(/\{\{SUBPROJECT_PATH\}\}/g, variables.subproject_path);
}
```

### 2. API — `src/routes/services.ts`

**POST /make-service-file handler** — accept optional `subproject` from request body, resolve it to `subproject_path`:

```typescript
const subproject_path = variables.subproject
  ? `/${variables.subproject.replace(/^\/+|\/+$/g, "")}`
  : "";

const completeVariables: TemplateVariables = {
  ...existing fields,
  subproject_path,
};
```

**Validation** — if provided, `subproject` must be a non-empty string with no path traversal (`..`), no leading/trailing slashes, and only alphanumeric characters, hyphens, and underscores.

### 3. Service File Templates (all 6 `.service` files)

Append `{{SUBPROJECT_PATH}}` after `{{PROJECT_NAME}}` in every path:

```ini
# Before
WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}
EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}/.env

# After
WorkingDirectory={{USER_HOME}}/applications/{{PROJECT_NAME}}{{SUBPROJECT_PATH}}
EnvironmentFile={{USER_HOME}}/applications/{{PROJECT_NAME}}{{SUBPROJECT_PATH}}/.env
```

For Python templates, only `WorkingDirectory` and `EnvironmentFile` need the change. `Environment="PATH=..."` and `ExecStart` reference the Python **environment** directory (which lives at `{{USER_HOME}}/environments/`, outside the project), so they are unaffected.

The `nextjs.service` template uses `.env.local` instead of `.env` — this difference is preserved.

Timer templates (`.timer` files) have no path references and are unaffected.

### 4. Web Frontend — `ModalServicesManager.tsx`

**New state**:

```typescript
const [subproject, setSubproject] = useState<string>("");
```

**New input field** — placed after "Project Name", before "Python Environment Name":

- Label: "Subproject (optional)"
- Placeholder: "e.g., api, web, worker"
- Helper text: "For monorepos — subdirectory within the project. Leave empty for single-project repos."

**Request body** — include in `variables`:

```typescript
const variables = {
  project_name: projectName.trim(),
  ...(subproject.trim() && { subproject: subproject.trim() }),
  ...other existing fields,
};
```

**Response interface** (`MakeServiceFileResponse`) — add `subproject_path?` to `variablesApplied`.

### 5. Tests — `tests/modules/systemd.test.ts`

Add test cases:

- `{{SUBPROJECT_PATH}}` replaced with `/api` when subproject is provided
- `{{SUBPROJECT_PATH}}` replaced with empty string when subproject is omitted
- No double slashes or trailing slashes in generated paths
- Path traversal values like `../etc` are rejected at the API validation layer
- Template content for each `.service` file contains `{{SUBPROJECT_PATH}}`

### 6. Existing Tests

Update `generateServiceFile` tests that assert on template output content — they need to account for `{{SUBPROJECT_PATH}}` being present in templates and pass `subproject_path: ""` in the variables.

## Files Modified

| File | Change | Complexity |
| --- | --- | --- |
| `api/src/modules/systemd.ts` | Interface + placeholder replacement | Low |
| `api/src/routes/services.ts` | Accept `subproject`, validate, resolve to path | Low |
| `api/src/templates/systemdServiceFiles/*.service` (6 files) | Append `{{SUBPROJECT_PATH}}` to paths | Low |
| `web/src/components/ui/modal/ModalServicesManager.tsx` | Add optional input + include in request | Low |
| `api/tests/modules/systemd.test.ts` | New test cases + update existing assertions | Low-Medium |

## Concerns and Risks

### 1. Existing Tests Will Need Updating (Low Risk)

The Phase 3 tests in `systemd.test.ts` assert that templates contain `{{USER_HOME}}` and not `/home/nick`. After this change, templates will also contain `{{SUBPROJECT_PATH}}`. The `generateServiceFile` tests that pass `user_home`/`user`/`group` will need to also pass `subproject_path: ""` to avoid unreplaced `{{SUBPROJECT_PATH}}` placeholders in the output.

### 2. Backward Compatibility (No Risk)

When `subproject` is not provided (or empty), `subproject_path` resolves to `""`. The placeholder `{{SUBPROJECT_PATH}}` becomes an empty string, and all paths are identical to today's behavior. No existing functionality changes.

### 3. Path Traversal / Injection (Low Risk, Mitigated)

The `subproject` value is user-provided and ends up in filesystem paths. Validation must reject:
- Path traversal: `..`, `.`
- Absolute paths: starts with `/`
- Special characters: only allow `[a-zA-Z0-9_-]`

This validation should happen at the API layer before the value reaches template processing.

### 4. No Conflict with Recent APP_USER Refactor (No Risk)

The `{{SUBPROJECT_PATH}}` placeholder is orthogonal to `{{USER_HOME}}`, `{{USER}}`, and `{{GROUP}}`. It goes **after** `{{PROJECT_NAME}}` in the path. The replacement function processes each placeholder independently, so order doesn't matter.

## Conclusion

This is a clean, low-risk addition. The key design choice — resolving `subproject` to a path segment (empty string or `/subdir`) before it reaches templates — avoids conditional logic in templates and ensures backward compatibility with zero behavior change when the field is not used.
