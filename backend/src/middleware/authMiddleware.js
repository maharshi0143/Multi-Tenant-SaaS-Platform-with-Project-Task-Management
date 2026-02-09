const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied. No token provided." });
  }

  try {
    // Verifies the token using your 32-character secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize payload keys to required spec
    req.user = {
      userId: decoded.userId || decoded.id,
      tenantId: decoded.tenantId ?? decoded.tenant_id ?? null,
      role: decoded.role
    };
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// Role-Based Access Control (RBAC)
const authorize = (...roles) => {
  return (req, res, next) => {
    // Safety check: Ensure authenticate middleware was called first
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions." });
    }
    next();
  };
};

module.exports = { authenticate, authorize };