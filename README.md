---

## 🔌 Socket.IO Features

The backend uses Socket.IO for real-time messaging, typing indicators, and message delivery status. Below are the main features and events:

### Socket Connection

- **Authentication**: Uses session cookies for authentication. If the session is invalid or missing, the connection is rejected.
- **User Room Join**: On connection, the user is joined to a room with their user ID and all their conversation rooms.

### Events

- **send-message**
  - **Client → Server**
  - Payload: `{ conversationId: string, content: string }`
  - Checks if the user is a member of the conversation.
  - If authorized, creates a message and emits `new-message` to the conversation room.
  - If unauthorized, emits `error` to the sender.

- **new-message**
  - **Server → Clients in conversation room**
  - Payload: Message object (see API response for message format)
  - Notifies all users in the conversation of a new message.

- **typing**
  - **Client → Server**
  - Payload: `{ conversationId: string }`
  - Notifies others in the conversation that the user is typing.
  - Server emits `user-typing` to other users in the conversation: `{ userId, conversationId }`

- **typing-stop**
  - **Client → Server**
  - Payload: `{ conversationId: string }`
  - Notifies others in the conversation that the user stopped typing.
  - Server emits `user-stop-typing` to other users in the conversation: `{ userId, conversationId }`

- **message-deliverd**
  - **Client → Server**
  - Payload: `{ messageId: string, conversationId: string }`
  - Marks a message as delivered for the user.
  - Server emits `message-status-updated` to the conversation room: `{ messageId, userId, status: "delivered" }`

- **error**
  - **Server → Client**
  - Payload: Error message string
  - Emitted on authentication or message errors.

### Example Usage

```js
const socket = io('http://localhost:3000', { withCredentials: true });
socket.on('connect', () => {
  console.log('Connected!');
});
socket.emit('send-message', { conversationId: 'abc123', content: 'Hello!' });
socket.on('new-message', (msg) => {
  console.log('New message:', msg);
});
socket.emit('typing', { conversationId: 'abc123' });
socket.on('user-typing', (data) => {
  console.log('User typing:', data);
});
socket.emit('typing-stop', { conversationId: 'abc123' });
socket.on('user-stop-typing', (data) => {
  console.log('User stopped typing:', data);
});
socket.emit('message-deliverd', { messageId: 'xyz789', conversationId: 'abc123' });
socket.on('message-status-updated', (data) => {
  console.log('Message status updated:', data);
});
socket.on('error', (err) => {
  console.error('Socket error:', err);
});
```

---
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


## 💬 Conversation Service Endpoints

### 1. Find Private Conversation
**GET** `/conversations/private?userId1=<id>&userId2=<id>`

Finds a private conversation between two users. Returns the conversation ID if found, otherwise null.

**Response Example:**
```json
{
  "id": 123
}
```

### 2. Create Private Conversation
**POST** `/conversations/private`

Creates a new private conversation between two users.

**Request:**
```json
{
  "userId1": "string",
  "userId2": "string"
}
```
**Response:**
```json
{
  "conversationId": 123
}
```

### 3. Get User Conversations List
**GET** `/conversations?userId=<id>`

Returns a list of conversations for a user, ordered by last message time.

**Response Example:**
```json
[
  {
    "id": 123,
    "is_group": false,
    "last_message_time": "2026-02-14T12:34:56.000Z"
  }
]
```

### 4. Get Messages
**GET** `/conversations/:conversationId/messages?page=1&limit=20`

Returns paginated messages for a conversation.

**Response Example:**
```json
[
  {
    "id": 1,
    "conversation_id": 123,
    "sender_id": "user1",
    "content": "Hello!",
    "created_at": "2026-02-14T12:34:56.000Z"
  }
]
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
