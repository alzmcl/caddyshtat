const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateRegister = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'player']).withMessage('Invalid role'),
  body('player_id').optional().isInt().withMessage('Invalid player ID')
];

const validateChangePassword = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const { user, token } = await authService.login(username, password);

    // Set token in httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true only with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', requireAuth, requireRole('admin'), validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = authService.findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, validateChangePassword, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, oldPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const users = authService.getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// PATCH /api/auth/users/:id/toggle (admin only)
router.patch('/users/:id/toggle', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = authService.toggleUserStatus(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    authService.deleteUser(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
