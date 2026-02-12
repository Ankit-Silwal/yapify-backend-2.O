# Yapify Backend 2.0 API Documentation

A WhatsApp clone backend with TypeScript, Express, PostgreSQL, and Redis.

## 🚀 Quick Setup

```bash
# Install dependencies
pnpm install

# Setup .env file
POSTGRES_PASSWORD=your_password
DATABASE_NAME=yapify
REDIS_URL=redis://localhost:6379
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password

# Create database
CREATE DATABASE yapify;
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Run server
npm run dev
```

## 📚 API Endpoints

Base URL: `http://localhost:3000`

### Health Check

**GET** `/health`
```json
Response: { "success": true, "health": "fit as fuck sir" }
```

---

## 🔐 Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Creates a new user and sends OTP to email.

```json
Request:
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "conformPassword": "SecurePass123!"
}

Success (201):
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": { "id": 1, "email": "user@example.com", "username": "johndoe" }
}

Errors:
400 - Missing fields or passwords don't match
400 - Weak password (min 8 chars, uppercase, lowercase, number, special char)
409 - Email or username already exists
```

### 2. Verify Email
**POST** `/auth/verify`

Verifies email with OTP (5-minute expiry).

```json
Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Success (200):
{
  "success": true,
  "message": "The OTP was verified"
}

Errors:
400 - OTP expired or incorrect
404 - User not found
```

### 3. Resend OTP
**POST** `/auth/resend-otp`

```json
Request:
{ "email": "user@example.com" }

Success (200):
{ "success": true, "message": "The Resend Otp was sent" }

Errors:
400 - Email already verified
404 - User not found
```

### 4. Verify Resent OTP
**POST** `/auth/verify-resend-otp`

```json
Request:
{ "email": "user@example.com", "otp": "123456" }

Success (200):
{ "success": true, "message": "The Otp was verified" }
```

### 5. Login
**POST** `/auth/login`

Authenticates user and creates session (24-hour cookie).

```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Success (200):
{
  "success": true,
  "message": "Successfully logged in:)",
  "user": { "id": 1, "email": "user@example.com", "username": "johndoe" }
}

Response Headers:
Set-Cookie: sessionId=<token>; HttpOnly; Max-Age=86400

Errors:
400 - Invalid credentials
400 - Email not verified

Test Accounts (Dev):
- test1@gmail.com / password
- test2@gmail.com / password
```

### 6. Get Current User
**GET** `/auth/me` 🔒

Requires authentication cookie.

```json
Headers:
Cookie: sessionId=<token>

Success (200):
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "is_verified": true
  }
}

Errors:
401 - Unauthorized
404 - User not found
```

### 7. Change Password
**POST** `/auth/change-password` 🔒

Changes password for authenticated user.

```json
Headers:
Cookie: sessionId=<token>

Request:
{
  "currentPassword": "OldPass123!",
  "password": "NewPass123!",
  "conformPassword": "NewPass123!"
}

Success (200):
{ "success": true, "message": "The Password was changed successfully" }

Errors:
400 - Current password incorrect
400 - New password not strong enough
401 - Unauthorized
```

---

## 🔑 Forgot Password Flow

### 8. Request Password Reset
**POST** `/auth/forgot-password`

Sends OTP to email for password reset.

```json
Request:
{ "email": "user@example.com" }

Success (200):
{ "success": true, "message": "The OTP was sent successfully" }

Errors:
404 - User not found
```

### 9. Verify Forgot Password OTP
**POST** `/auth/verify-forgot-password`

Verifies OTP and grants 5-minute window to change password.

```json
Request:
{ "email": "user@example.com", "otp": "123456" }

Success (200):
{
  "success": true,
  "message": "The OTP was verified you can now change password within 5 minutes"
}

Errors:
400 - OTP expired or incorrect
404 - User not found
```

### 10. Resend Forgot Password OTP
**POST** `/auth/resend-forgot-password-otp`

```json
Request:
{ "email": "user@example.com" }

Success (200):
{ "success": true, "message": "The OTP was sent successfully" }
```

### 11. Verify Resent Forgot Password OTP
**POST** `/auth/verify-resend-forgot-password`

```json
Request:
{ "email": "user@example.com", "otp": "123456" }

Success (200):
{
  "success": true,
  "message": "The OTP was verified you can now change password within 5 minutes"
}
```

### 12. Change Forgot Password
**POST** `/auth/change-forgot-password`

Sets new password (must be within 5-minute window after OTP verification).

```json
Request:
{
  "email": "user@example.com",
  "password": "NewPass123!",
  "conformPassword": "NewPass123!"
}

Success (200):
{ "success": true, "message": "The password was changed successfully" }

Errors:
400 - Request timeout (5 minutes expired)
400 - Passwords don't match
400 - Password not strong enough
```

---

## 🖥️ Session Management

### 13. Get All Sessions
**GET** `/auth/sessions` 🔒

Returns all active sessions for current user.

```json
Headers:
Cookie: sessionId=<token>

Success (200):
{
  "success": true,
  "sessions": [
    {
      "sessionId": "abc123...",
      "userId": "1",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-02-12T10:30:00.000Z",
      "expiresAt": "2026-02-13T10:30:00.000Z"
    }
  ]
}

Errors:
401 - Unauthorized
```

### 14. Delete Specific Session
**DELETE** `/auth/sessions/:sessionId` 🔒

Logs out from specific device.

```json
Headers:
Cookie: sessionId=<token>

URL: /auth/sessions/abc123def456

Success (200):
{
  "success": true,
  "message": "Session abc123def456 deleted for 1"
}

Errors:
400 - Missing sessionId
401 - Unauthorized
404 - Session not found
```

---

## 📝 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* optional data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔒 Authentication

Protected routes (🔒) require session cookie:
```
Cookie: sessionId=<token>
```

Set automatically on login. Expires after 24 hours.

---

## 🛡️ Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*()_+-=[]{},.etc)

---

## 💾 Tech Stack

- **Runtime**: Bun / Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis (with in-memory fallback)
- **Email**: Nodemailer (Gmail SMTP)
- **Auth**: Session-based cookies
- **Password**: bcrypt hashing (10 rounds)

---

## 🧪 Quick Test

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"Test123!","conformPassword":"Test123!"}'

# Login (with test account)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@gmail.com","password":"password"}' \
  -c cookies.txt

# Get current user
curl http://localhost:3000/auth/me -b cookies.txt
```

---

## 📂 Project Structure

```
src/
├── config/          # Database, Redis, Nodemailer
├── middleware/      # checkSession
├── models/auth/     # Auth logic & routes
└── utils/           # OTP & password validation
```

---

**Repository**: [yapify-backend-2.O](https://github.com/Ankit-Silwal/yapify-backend-2.O)
