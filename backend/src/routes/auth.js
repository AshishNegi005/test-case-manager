const router = require('express').Router();
const { register, login, getMe, getUsers, updateUserRole, registerValidation, loginValidation } = require('../controllers/authController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { validate, sanitizeBody } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [admin, test-lead, tester, read-only] }
 *     responses:
 *       201: { description: User created }
 */
router.post('/register', authLimiter, sanitizeBody, registerValidation, validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns token }
 */
router.post('/login', authLimiter, sanitizeBody, loginValidation, validate, login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, adminOnly, getUsers);
router.patch('/users/:id/role', authenticate, adminOnly, [body('role').isIn(['admin','test-lead','tester','read-only'])], validate, updateUserRole);

module.exports = router;
