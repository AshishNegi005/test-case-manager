const db = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateKey = async (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Key name is required' });

  const rawKey = crypto.randomBytes(32).toString('hex');
  const prefix = rawKey.substring(0, 8);
  const keyHash = await bcrypt.hash(rawKey, 10);

  const result = await db.query(
    `INSERT INTO api_keys (project_id, name, key_prefix, key_hash, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, key_prefix, created_at`,
    [projectId, name.trim(), prefix, keyHash, req.user.id]
  );

  res.status(201).json({
    ...result.rows[0],
    key: rawKey,
    message: 'Store this key securely — it will not be shown again',
  });
};

const listKeys = async (req, res) => {
  const { projectId } = req.params;
  const result = await db.query(
    `SELECT ak.id, ak.name, ak.key_prefix, ak.is_active, ak.last_used_at, ak.created_at,
            u.username AS created_by
     FROM api_keys ak
     LEFT JOIN users u ON ak.created_by = u.id
     WHERE ak.project_id = $1
     ORDER BY ak.created_at DESC`,
    [projectId]
  );
  res.json(result.rows);
};

const revokeKey = async (req, res) => {
  const { projectId, keyId } = req.params;
  await db.query(
    'UPDATE api_keys SET is_active = false WHERE id = $1 AND project_id = $2',
    [keyId, projectId]
  );
  res.json({ message: 'Key revoked' });
};

const deleteKey = async (req, res) => {
  const { projectId, keyId } = req.params;
  await db.query('DELETE FROM api_keys WHERE id = $1 AND project_id = $2', [keyId, projectId]);
  res.json({ message: 'Key deleted' });
};

// Middleware: authenticate by raw API key in X-API-Key header
const authenticateApiKey = async (req, res, next) => {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) return res.status(401).json({ message: 'API key required' });

  const prefix = rawKey.substring(0, 8);
  const keys = await db.query(
    `SELECT ak.*, p.id AS proj_id FROM api_keys ak
     JOIN projects p ON ak.project_id = p.id
     WHERE ak.key_prefix = $1 AND ak.is_active = true`,
    [prefix]
  );

  for (const k of keys.rows) {
    const match = await bcrypt.compare(rawKey, k.key_hash);
    if (match) {
      await db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [k.id]);
      req.apiKey = k;
      req.projectId = k.project_id;
      return next();
    }
  }

  res.status(401).json({ message: 'Invalid or inactive API key' });
};

// CI/CD: trigger a test suite run via API key
const ciTriggerRun = async (req, res) => {
  const { suiteId, executedBy } = req.body;
  const projectId = req.projectId;

  const suite = await db.query(
    `SELECT tsc.test_case_id FROM test_suite_cases tsc WHERE tsc.suite_id = $1`,
    [suiteId]
  );
  if (!suite.rows.length) return res.status(404).json({ message: 'Suite not found or empty' });

  const results = [];
  for (const { test_case_id } of suite.rows) {
    const r = await db.query(
      `INSERT INTO test_executions (test_case_id, project_id, suite_id, executed_by, status, comments)
       VALUES ($1, $2, $3, $4, 'pending', 'Triggered via CI/CD API')
       RETURNING id, status`,
      [test_case_id, projectId, suiteId, executedBy || null]
    );
    results.push(r.rows[0]);
  }

  res.status(201).json({
    message: `Triggered ${results.length} test executions`,
    run_id: results[0]?.id,
    executions: results,
  });
};

// CI/CD: update execution result
const ciUpdateResult = async (req, res) => {
  const { executionId } = req.params;
  const { status, comments, defect_id, defect_description } = req.body;
  const VALID = ['pass', 'fail', 'blocked', 'skipped', 'pending'];
  if (!VALID.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  const result = await db.query(
    `UPDATE test_executions SET status=$1, comments=$2, defect_id=$3, defect_description=$4
     WHERE id=$5 RETURNING id, status`,
    [status, comments || null, defect_id || null, defect_description || null, executionId]
  );
  if (!result.rows.length) return res.status(404).json({ message: 'Execution not found' });
  res.json(result.rows[0]);
};

module.exports = { generateKey, listKeys, revokeKey, deleteKey, authenticateApiKey, ciTriggerRun, ciUpdateResult };
