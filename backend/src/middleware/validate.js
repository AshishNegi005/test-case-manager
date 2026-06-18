const { validationResult } = require('express-validator');
const xss = require('xss');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Sanitize string fields recursively to prevent XSS
const sanitizeBody = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') return xss(obj);
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]));
    }
    return obj;
  };
  req.body = sanitize(req.body);
  next();
};

module.exports = { validate, sanitizeBody };
