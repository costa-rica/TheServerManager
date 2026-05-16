---
created_at: 2026-05-16
updated_at: 2026-05-16
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# Users API

The users router handles registration, login, and password reset flows.

All endpoints are prefixed with `/users`.

## GET /users

Returns a simple text response for the users router.

### Parameters

None.

### Sample Request

```bash
curl http://localhost:3000/users
```

### Sample Response

```text
users endpoint
```

### Error Responses

None defined.

## POST /users/register

Creates a user and returns a JWT for the new account.

- Side effect: creates a row in the `users` collection.

### Parameters

- `email` (string, required): Email address for the user.
- `password` (string, required): Password to hash with bcrypt before storage.

### Sample Request

```bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"correct-horse-battery-staple"}'
```

### Sample Response

```json
{
  "message": "User created successfully",
  "token": "jwt-token",
  "user": {
    "username": "alex",
    "email": "alex@example.com",
    "isAdmin": false,
    "accessServersArray": [],
    "accessPagesArray": []
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
    "details": "Missing required fields: email",
    "status": 400
  }
}
```

#### User already exists (409)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "User already exists",
    "details": "A user with this email address is already registered",
    "status": 409
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unhandled registration error",
    "status": 500
  }
}
```

## POST /users/login

Authenticates a user and returns a JWT plus public user fields.

### Parameters

- `email` (string, required): Email address for the user.
- `password` (string, required): Password to compare with the stored bcrypt hash.

### Sample Request

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"correct-horse-battery-staple"}'
```

### Sample Response

```json
{
  "message": "User logged in successfully",
  "token": "jwt-token",
  "user": {
    "username": "alex",
    "email": "alex@example.com",
    "isAdmin": false,
    "accessServersArray": [],
    "accessPagesArray": []
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
    "details": "Missing required fields: password",
    "status": 400
  }
}
```

#### Invalid credentials (401)

```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials",
    "status": 401
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unhandled login error",
    "status": 500
  }
}
```

## POST /users/request-reset-password-email

Creates a one-hour reset token and emails it to the user.

- Side effect: sends email through the configured Nodemailer transport.

### Parameters

- `email` (string, required): Email address for the account that needs a reset link.

### Sample Request

```bash
curl -X POST http://localhost:3000/users/request-reset-password-email \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com"}'
```

### Sample Response

```json
{
  "message": "Email sent successfully"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "Email is required",
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
    "message": "Unhandled password reset email error",
    "status": 500
  }
}
```

## POST /users/reset-password-with-new-password

Verifies a reset token and updates the user password.

- Side effect: hashes and stores a new password on the user document.

### Parameters

- `token` (string, required): JWT reset token issued by `/users/request-reset-password-email`.
- `newPassword` (string, required): New password to hash and store.

### Sample Request

```bash
curl -X POST http://localhost:3000/users/reset-password-with-new-password \
  -H "Content-Type: application/json" \
  -d '{"token":"reset-jwt-token","newPassword":"new-correct-horse-battery-staple"}'
```

### Sample Response

```json
{
  "message": "Password reset successfully"
}
```

### Error Responses

#### Validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "Missing required fields: token",
    "status": 400
  }
}
```

#### Invalid or expired token (401)

```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid or expired token",
    "status": 401
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
    "message": "Failed to reset password",
    "details": "Unexpected error message",
    "status": 500
  }
}
```
