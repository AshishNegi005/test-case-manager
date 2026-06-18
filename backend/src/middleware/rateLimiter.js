const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const testCaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { message: 'Test case rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

const executionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  message: { message: 'Execution rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { message: 'Analytics rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, testCaseLimiter, executionLimiter, analyticsLimiter };
