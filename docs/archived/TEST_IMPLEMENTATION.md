# TEST_IMPLEMENTATION

This document explains how to implement API tests in this repository using the same style and architecture already in place. The goal is predictable, isolated tests that validate behavior without coupling tests to infrastructure details.

## Core principles

- Test behavior, not implementation details.
- Keep tests deterministic by mocking external dependencies.
- Prefer small app instances for domain route tests.
- Keep bootstrap smoke tests minimal and stable.
- Add both success and failure-path assertions.

## Test types in this API

1. Smoke tests
- Purpose: confirm the app boots and baseline routes respond.
- Scope: app-level behavior only.
- Location: `tests/smoke`.

2. Route contract tests
- Purpose: validate request and response contracts for a route group.
- Scope: status code, payload shape, and key side effects.
- Location: domain folders like `tests/users`, `tests/reports`, `tests/articles`, `tests/analysis`.

3. Middleware tests
- Purpose: validate security and control-flow behavior of middleware.
- Scope: pass-through, rejection, and edge cases.
- Location: `tests/middleware`.

4. Module utility tests
- Purpose: validate pure or mostly-pure helper logic.
- Scope: transformations and error handling.
- Location: `tests/modules` and related domain folders.

## Standard implementation workflow

1. Choose the right folder
- Put each test file in the matching domain folder under `tests/`.
- Name files `*.test.ts` so Jest discovers them.

2. Build a minimal test app when testing a route module
- Create a local Express app in the test file.
- Mount only the router under test.
- Use `supertest` for HTTP calls.

3. Mock dependencies at module boundaries
- Mock logger, mailer, auth, db models, and rate limiters as needed.
- Keep mocks local to the test file unless shared setup is clearly reusable.
- Reset mocks in `beforeEach` with `jest.clearAllMocks()`.

4. Set required environment variables in test setup
- Use `beforeEach` to set env vars required by the code path under test.
- For bootstrap tests, use `tests/helpers/testApp.ts` so env overrides happen before importing the app.

5. Write behavior-first assertions
- Assert status code first.
- Assert response contract next (fields, types, and key values).
- Assert critical side effects (for example, model calls or update/save calls).

6. Cover positive and negative paths
- Include at least one happy-path case.
- Include validation failures, auth failures, and dependency failure cases where applicable.

7. Keep tests isolated and order-independent
- Do not rely on execution order.
- Avoid global mutable state across test files.
- Recreate app instances in each test or test block where necessary.

## Mocking guidance

- Mock db-model operations directly with `jest.fn()` objects.
- Prefer explicit mock return values per test over shared implicit defaults.
- For middleware not under test, replace with pass-through stubs to focus on route behavior.
- When mocking async functions, use `mockResolvedValue` and `mockRejectedValue` explicitly.

## Assertion guidance

- Verify contract shape using `toEqual(expect.objectContaining(...))` when partial matching is enough.
- Use exact equality only when payload must be strict.
- For HTML/text responses, assert `content-type` and key markers in `response.text`.
- For JSON responses, assert semantic keys instead of full snapshots unless the payload is stable.

## TypeScript and IDE support

- Main API TypeScript config excludes tests by design.
- Use `tests/tsconfig.json` for test-file type checking and Jest globals.
- If the IDE stops recognizing `jest`, `describe`, `test`, or `expect`, reload the TypeScript server.

## Commands engineers should use

1. Run all tests
- `npm test`

2. Run smoke tests only
- `npm run test:endpoints`

3. Run a single test file
- `npx jest tests/<domain>/<file>.test.ts`

4. Validate test TypeScript project
- `npx tsc -p tests/tsconfig.json --noEmit`

## Definition of done for a new test file

- File is placed in the correct `tests/` domain folder.
- Test names describe behavior clearly.
- Happy path and failure path are both covered.
- External dependencies are mocked or intentionally exercised.
- Assertions validate contract and key side effects.
- Test passes locally with `npm test`.
