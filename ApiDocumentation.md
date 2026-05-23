# Authentication API Documentation

Base URL: `/api/v1/auth`

This document describes the authentication-related endpoints for the application.  
All authentication is cookie-based. On successful login or registration, the backend sets `accessToken` and `refreshToken` as HTTP-only cookies. Frontend requests must include credentials.

---

## Frontend Setup

### fetch

```js
fetch("/api/v1/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier, password }),
});
```

### axios

```js
axios.defaults.withCredentials = true;
```

---

## General Rules

- All auth cookies are set as HTTP-only cookies.
- Frontend should not store tokens in localStorage.
- Use `credentials: 'include'` for fetch requests.
- Use `withCredentials: true` for axios requests.
- Invalid credentials always return the same message to prevent user enumeration.
- CAPTCHA / Turnstile becomes required after repeated failed login attempts.
- `refreshToken` is read automatically from the HttpOnly cookie on refresh endpoint.
- Some endpoints invalidate all sessions and clear cookies on success.

---

# 1. Register

## Endpoint

`POST /api/v1/auth/register`

## Purpose

Create a new user account.

## Request Body

| Field        | Type   | Required | Rules                                                     |
| ------------ | ------ | -------- | --------------------------------------------------------- |
| username     | string | Yes      | 3–20 chars, letters/numbers/underscore only               |
| email        | string | Yes      | Valid email address                                       |
| password     | string | Yes      | Min 8 chars, must include uppercase, number, special char |
| referralCode | string | No       | Referral code from another user                           |
| inviteCode   | string | Yes      | 8 chars Invite code required during early phase           |

## Example Request

```json
{
  "username": "satoshi",
  "email": "sat@mail.com",
  "password": "Secure@123",
  "referralCode": "ABC123",
  "inviteCode": "ddddffff"
}
```

## Responses

### 201 Created

Sets `accessToken` cookie and `refreshToken` cookie. Returns user object.

```json
{
  "success": true,
  "message": "Registered successfully",
  "data": {
    "user": {
      "id": "1",
      "username": "satoshi",
      "email": "sat@mail.com",
      "role": "user",
      "referralCode": "XY9AB2"
    }
  }
}
```

### 400 Bad Request

Validation failed.

```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "errors": {
    "username": ["Must be at least 3 characters"],
    "password": ["Must contain uppercase", "Must contain number"]
  }
}
```

### 409 Conflict

Username or email already taken.

```json
{
  "success": false,
  "message": "Username or email already taken",
  "statusCode": 409
}
```

---

# 2. Login

## Endpoint

`POST /api/v1/auth/login`

## Purpose

Authenticate a user and create session cookies.

## Request Body

| Field        | Type   | Required    | Rules                            |
| ------------ | ------ | ----------- | -------------------------------- |
| identifier   | string | Yes         | Username or email                |
| password     | string | Yes         | Account password                 |
| captchaToken | string | Conditional | Required after repeated failures |

## Example Request

```json
{
  "identifier": "satoshi",
  "password": "Secure@123",
  "captchaToken": "turnstile-token-here"
}
```

## CAPTCHA Rule

- After 3 failed attempts, `captchaToken` becomes required.
- If the response includes `captchaRequired: true`, the frontend should show the Turnstile widget before the next attempt.

## Responses

### 200 OK

Sets `accessToken` cookie and `refreshToken` cookie.

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "1",
      "username": "satoshi",
      "email": "sat@mail.com",
      "role": "user",
      "referralCode": "XY9AB2"
    }
  }
}
```

### 401 Unauthorized

Invalid credentials.

```json
{
  "success": false,
  "message": "Invalid credentials",
  "statusCode": 401
}
```

### 401 Unauthorized after third attempt

```json
{
  "success": false,
  "message": "Invalid credentials",
  "statusCode": 401,
  "captchaRequired": true
}
```

### 429 Too Many Requests

Too many attempts. Includes lockout duration in the message.

```json
{
  "success": false,
  "message": "Too many attempts. Try again in 15 minutes.",
  "statusCode": 429
}
```

### 403 Forbidden

IP/VPN blocked. Cookies are cleared automatically.

```json
{
  "success": false,
  "message": "IP/VPN blocked",
  "statusCode": 403
}
```

---

# 3. Refresh Token

## Endpoint

`POST /api/v1/auth/refresh`

## Purpose

Rotate the access token and refresh token using the refresh token cookie.

## Request Body

None. The `refreshToken` cookie is sent automatically by the browser.

## Notes

- Use `credentials: 'include'` or `withCredentials: true`.
- This endpoint only reads the HttpOnly refresh cookie.

## Responses

### 200 OK

Rotates `accessToken` cookie and `refreshToken` cookie.

```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

### 403 Forbidden

Refresh token invalid or expired.

```json
{
  "success": false,
  "message": "Refresh token invalid or expired",
  "statusCode": 403
}
```

---

# 4. Logout

## Endpoint

`POST /api/v1/auth/logout`

## Purpose

Clear authentication cookies and end the current session.

## Request Body

None.

## Responses

### 200 OK

Clears `accessToken` and `refreshToken`.

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 401 Unauthorized

Not authenticated.

```json
{
  "success": false,
  "message": "Not authenticated",
  "statusCode": 401
}
```

---

# 5. Send Email Verification OTP

## Endpoint

`POST /api/v1/auth/verify-email/send`

## Purpose

Send a 6-digit verification OTP to the user’s email.

## Rules

- User must already be authenticated.
- User must have an email on account.
- OTP expires in 10 minutes.
- Max 5 wrong attempts before account is blocked.

## Request Body

None. User is identified from auth cookie.

## Responses

### 200 OK

OTP sent successfully.

```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### 400 Bad Request

Email already verified or no email on account.

```json
{
  "success": false,
  "message": "Email already verified or no email on account",
  "statusCode": 400
}
```

---

# 6. Verify Email OTP

## Endpoint

`POST /api/v1/auth/verify-email/confirm`

## Purpose

Verify the email OTP and mark the email as verified.

## Request Body

| Field | Type   | Required | Rules                |
| ----- | ------ | -------- | -------------------- |
| otp   | string | Yes      | 6-digit numeric code |

## Example Request

```json
{
  "otp": "482910"
}
```

## Responses

### 200 OK

Email verified successfully.

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 400 Bad Request

Invalid OTP or OTP expired.

```json
{
  "success": false,
  "message": "Invalid OTP or OTP expired",
  "statusCode": 400
}
```

### 403 Forbidden

Account blocked due to too many failed attempts.

```json
{
  "success": false,
  "message": "Account blocked — too many failed attempts",
  "statusCode": 403
}
```

---

# 7. Password Reset - Request OTP

## Endpoint

`POST /api/v1/auth/forgot-password/`

## Purpose

Request a password reset OTP without revealing whether the account exists.

## Request Body

| Field | Type   | Required | Rules |
| ----- | ------ | -------- | ----- |
| email | string | Yes      | Email |

## Example Request

```json
{
  "email": "satoshi@mail.com"
}
```

## Response

Always return the same success message to prevent user enumeration.

### 200 OK

```json
{
  "success": true,
  "message": "OTP has been sent to the email"
}
```

---

# 8. Password Reset - Verify OTP

## Endpoint

`POST /api/v1/auth/forgot-password/verify-otp`

## Purpose

Verify the OTP and return a temporary `resetToken`.

## Request Body

| Field | Type   | Required | Rules                            |
| ----- | ------ | -------- | -------------------------------- |
| email | email  | Yes      | Same email used in previous step |
| otp   | string | Yes      | 6-digit code from email          |

## Example Request

```json
{
  "email": "satoshi@mail.com",
  "otp": "193847"
}
```

## Responses

### 200 OK

Returns reset token valid for 15 minutes.

```json
{
  "success": true,
  "message": "OTP verified",
  "data": {
    "resetToken": "abc123..."
  }
}
```

### 400 Bad Request

Invalid or expired OTP.

```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "statusCode": 400
}
```

### 403 Forbidden

Too many failed attempts — account blocked.

```json
{
  "success": false,
  "message": "Too many failed attempts — account blocked",
  "statusCode": 403
}
```

---

# 9. Password Reset - Confirm New Password

## Endpoint

`POST /api/v1/auth/forgot-password/reset`

## Purpose

Set a new password using the reset token.

## Request Body

| Field       | Type   | Required | Rules                                        |
| ----------- | ------ | -------- | -------------------------------------------- |
| resetToken  | string | Yes      | Token received from verify-otp step          |
| newPassword | string | Yes      | Min 8 chars, uppercase, number, special char |

## Example Request

```json
{
  "resetToken": "abc123...",
  "newPassword": "NewPass@99"
}
```

## Responses

### 200 OK

Password reset successful. All sessions are invalidated and cookies are cleared. User must log in again.

```json
{
  "success": true,
  "message": "Password reset successfully. Please log in again."
}
```

### 400 Bad Request

Reset token expired or invalid.

```json
{
  "success": false,
  "message": "Reset token expired or invalid",
  "statusCode": 400
}
```

---

# 10. Early Access - Request Early Access

## Endpoint

`POST /api/v1/auth/early-access/`

## Purpose

Get Early access to the system.

## Request Body

| Field | Type   | Required | Rules |
| ----- | ------ | -------- | ----- |
| email | string | Yes      | Email |

## Example Request

```json
{
  "email": "satoshi@mail.com"
}
```

## Responses

### 200 OK

If eligible, you will receive an invite code via email

```json
{
  "success": true,
  "data":{}
  "message": "If eligible, you will receive an invite code via email"
}
```

---

# 11. Check Username

## Endpoint

`POST /api/v1/auth/check-username`

## Purpose

Check Username Availability

## Request Body

| Field    | Type   | Required | Rules                                       |
| -------- | ------ | -------- | ------------------------------------------- |
| username | string | Yes      | 3–20 chars, letters/numbers/underscore only |

## Example Request

```json
{
  "username": "coolUser_67"
}
```

## Responses

Response contains available boolean. True when available, False for taken

### 200 OK

```json
{
  "success": true,
  "data":{
    "available":boolean
  }
  "message": "Username is available/taken"
}
```

# Error Response Format

All validation errors should follow this structure:

```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "errors": {
    "username": ["Must be at least 3 characters"],
    "password": ["Must contain uppercase", "Must contain number"]
  }
}
```

---

# Frontend Behavior Notes

## Login flow

- Submit `identifier` + `password`.
- If response contains `captchaRequired: true`, render Turnstile before next attempt.
- Always send requests with credentials enabled.

## Session handling

- Cookies are managed by the browser.
- Do not manually store access/refresh tokens in localStorage.
- Call refresh endpoint when access token expires.

## Auth check

- Frontend should call an auth-check endpoint on page load if needed.
- Example: `GET /api/auth/me` or equivalent, if available.

---

# Recommended Client Config

## fetch

```js
fetch("/api/auth/v1/login", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    identifier,
    password,
  }),
});
```

## axios

```js
axios.defaults.withCredentials = true;
```

---

# Security Notes

- Use HTTP-only cookies for auth tokens.
- Use SameSite and Secure cookie flags in production.
- Apply rate limiting on login, register, and password reset endpoints.
- Use Turnstile after repeated failed attempts.
- Return generic auth errors to prevent user enumeration.
- Invalidate all sessions after password reset.
