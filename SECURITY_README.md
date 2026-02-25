# 🔒 Security & Authentication Guide

## Overview

Stats Tracker now includes JWT-based authentication with role-based access control, rate limiting, and security headers.

---

## 🔑 Default Credentials

**Two admin accounts have been created:**

### Account 1: Generic Admin
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Admin

### Account 2: Alan's Account
- **Username:** `alan`
- **Password:** `changeme123`
- **Role:** Admin
- **Linked to Player:** Alan McLaughlin

⚠️ **IMPORTANT: Change these passwords immediately after first login!**

---

## 🛡️ Security Features

### 1. **JWT Authentication**
- Tokens expire after 7 days
- Stored in httpOnly cookies (secure)
- Can also use Authorization header: `Bearer <token>`

### 2. **Role-Based Access Control**
- **Admin:** Full access to all resources
- **Player:** Can only view/edit own rounds

### 3. **Rate Limiting**
- 100 requests per 15 minutes per IP
- Applies to all `/api/*` routes

### 4. **Security Headers**
- Helmet.js middleware
- XSS protection
- Click-jacking prevention

### 5. **CORS Protection**
- Restricted to allowed origins only
- See `.env` file for configuration

---

## 📋 API Endpoints

### Authentication Routes

#### POST /api/auth/login
Login with username and password.
```json
{
  "username": "alan",
  "password": "changeme123"
}
```

**Response:**
```json
{
  "user": {
    "id": 2,
    "username": "alan",
    "email": "alan@summerhill.local",
    "role": "admin",
    "player_id": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/logout
Logout (clears cookie).

#### GET /api/auth/me
Get current user info (requires auth).

#### POST /api/auth/change-password
Change password (requires auth).
```json
{
  "oldPassword": "changeme123",
  "newPassword": "newSecurePassword123"
}
```

#### POST /api/auth/register (Admin Only)
Create new user.
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "player",
  "player_id": 1
}
```

#### GET /api/auth/users (Admin Only)
Get all users.

#### PATCH /api/auth/users/:id/toggle (Admin Only)
Enable/disable user account.

#### DELETE /api/auth/users/:id (Admin Only)
Delete user account.

---

## 🚀 Testing Authentication

### 1. Start the server
```bash
cd /home/alan/dev/stats-tracker/server
npm start
```

### 2. Test login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alan","password":"changeme123"}'
```

### 3. Test authenticated endpoint
```bash
# Save token from login response
TOKEN="your-token-here"

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🌐 Production Deployment

### 1. Update .env for Production

```env
NODE_ENV=production
ALLOWED_ORIGIN=https://summerhill.ddns.net
```

### 2. Enable HTTPS on UniFi Dream Machine

1. Navigate to **Network > Advanced > SSL Certificate**
2. Add Let's Encrypt certificate for `summerhill.ddns.net`
3. Port forward: `443 → 3000`

### 3. Security Checklist

- [ ] Change default passwords
- [ ] Update `ALLOWED_ORIGIN` in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Enable UniFi Threat Management
- [ ] Enable Intrusion Detection/Prevention
- [ ] Configure GeoIP blocking (optional)
- [ ] Set up regular database backups

---

## 👥 User Management

### Creating New Users (Admin)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "newplayer",
    "email": "player@example.com",
    "password": "securePassword123",
    "role": "player",
    "player_id": 2
  }'
```

### Linking Users to Players

When creating a user, set `player_id` to link them to a player record:
- User can only edit rounds for their linked player
- Admin can edit all rounds

---

## 🔧 Protecting Routes

### Example: Protect a route

```javascript
const { requireAuth, requireRole } = require('../middleware/auth');

// Require authentication
router.get('/protected', requireAuth, (req, res) => {
  // req.user contains decoded token
  res.json({ message: 'Authenticated!', user: req.user });
});

// Require admin role
router.delete('/admin-only', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin access!' });
});
```

---

## 🛠️ Troubleshooting

### "Authentication required" error
- Check if token is expired (7 days)
- Verify token is in cookie or Authorization header
- Try logging in again

### "Insufficient permissions" error
- User role doesn't have access
- Contact admin to update your role

### "Too many requests" error
- Rate limit exceeded (100 req/15min)
- Wait 15 minutes or use different IP

### CORS errors
- Add your origin to `ALLOWED_ORIGIN` in `.env`
- Restart server after changing `.env`

---

## 📝 Environment Variables

Required in `server/.env`:

```env
# JWT Secret - Generate with: openssl rand -hex 32
JWT_SECRET=your-secret-key-here

# Token expiry
JWT_EXPIRY=7d

# Allowed origins (comma-separated)
ALLOWED_ORIGIN=https://summerhill.ddns.net

# Node environment
NODE_ENV=production
```

---

## 🔐 Best Practices

1. **Strong Passwords**
   - Minimum 8 characters
   - Mix of letters, numbers, symbols

2. **Regular Password Changes**
   - Change default passwords immediately
   - Update passwords every 3-6 months

3. **Secure Token Storage**
   - Never expose tokens in logs
   - Don't share tokens
   - Logout when done

4. **Monitor Access**
   - Check server logs regularly
   - Review active users
   - Disable inactive accounts

5. **Database Backups**
   - Regular backups of `golf.db`
   - Store backups securely
   - Test restoration process

---

## 📊 Future Enhancements

Planned security features:
- [ ] Two-factor authentication (2FA)
- [ ] Password reset via email
- [ ] Session management dashboard
- [ ] Audit logging
- [ ] IP whitelist/blacklist
- [ ] OAuth2 (Google/Facebook login)

---

## 🆘 Support

For security issues or questions:
1. Check this guide
2. Review server logs: `journalctl -u stats-tracker -f`
3. Test with curl commands above

**Never share your JWT_SECRET or user passwords!**
