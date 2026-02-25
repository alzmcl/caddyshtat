const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

// JWT secret from env or default (change in production!)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

class AuthService {
  // Generate JWT token
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      player_id: user.player_id
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Compare password
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Find user by username
  findUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
    return stmt.get(username);
  }

  // Find user by email
  findUserByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
    return stmt.get(email);
  }

  // Find user by ID
  findUserById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
    return stmt.get(id);
  }

  // Login user
  async login(username, password) {
    // Find user
    const user = this.findUserByUsername(username);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await this.comparePassword(password, user.password_hash);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    const updateStmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    updateStmt.run(user.id);

    // Generate token
    const token = this.generateToken(user);

    // Return user (without password) and token
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  // Register new user (admin only operation)
  async register(userData) {
    const { username, email, password, role = 'player', player_id = null } = userData;

    // Check if username exists
    if (this.findUserByUsername(username)) {
      throw new Error('Username already exists');
    }

    // Check if email exists
    if (this.findUserByEmail(email)) {
      throw new Error('Email already exists');
    }

    // Hash password
    const password_hash = await this.hashPassword(password);

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, player_id, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(username, email, password_hash, role, player_id);

    // Return new user (without password)
    const newUser = this.findUserById(result.lastInsertRowid);
    const { password_hash: _, ...userWithoutPassword } = newUser;

    return userWithoutPassword;
  }

  // Change password
  async changePassword(userId, oldPassword, newPassword) {
    const user = this.findUserById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await this.comparePassword(oldPassword, user.password_hash);
    
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(newPasswordHash, userId);

    return true;
  }

  // Get all users (admin only)
  getAllUsers() {
    const stmt = db.prepare(`
      SELECT 
        u.id, u.username, u.email, u.role, u.player_id, u.is_active, 
        u.created_at, u.last_login, p.name as player_name
      FROM users u
      LEFT JOIN players p ON u.player_id = p.id
      ORDER BY u.created_at DESC
    `);
    return stmt.all();
  }

  // Toggle user active status (admin only)
  toggleUserStatus(userId) {
    const stmt = db.prepare('UPDATE users SET is_active = NOT is_active WHERE id = ?');
    stmt.run(userId);
    return this.findUserById(userId);
  }

  // Delete user (admin only)
  deleteUser(userId) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(userId);
    return true;
  }
}

module.exports = new AuthService();
