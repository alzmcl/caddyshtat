const authService = require('../services/authService');

// Middleware to require authentication
function requireAuth(req, res, next) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Add user to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to require specific role
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Middleware to check if user owns the resource
function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      // Admin can access anything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the owner ID of the resource
      const ownerId = await getResourceOwnerId(req);

      // Check if user owns the resource via player_id
      if (req.user.player_id !== ownerId) {
        return res.status(403).json({ error: 'You can only access your own resources' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Error checking ownership' });
    }
  };
}

// Optional auth - doesn't fail if no token, just adds user if present
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (token) {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireOwnership,
  optionalAuth
};
