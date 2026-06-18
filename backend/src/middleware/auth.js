const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

// Shorthand role groups
const adminOnly = authorize('admin');
const adminOrLead = authorize('admin', 'test-lead');
const canExecute = authorize('admin', 'test-lead', 'tester');
const allRoles = authorize('admin', 'test-lead', 'tester', 'read-only');

module.exports = { authenticate, authorize, adminOnly, adminOrLead, canExecute, allRoles };
