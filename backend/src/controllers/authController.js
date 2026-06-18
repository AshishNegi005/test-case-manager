const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../config/database');

const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 chars'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  body('role').optional().isIn(['admin', 'test-lead', 'tester', 'read-only']),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const register = async (req, res) => {
  try {
    const { username, email, password, role = 'tester' } = req.body;

    const exists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role, created_at`,
      [username, email, hashed, role]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const result = await db.query('UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING id, username, email, role', [role, id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, getUsers, updateUserRole, registerValidation, loginValidation };
