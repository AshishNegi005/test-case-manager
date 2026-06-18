const db = require('../config/database');
const { cache } = require('../config/redis');

const CACHE_TTL = 1800; // 30 minutes

const getSuites = async (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `suites:${projectId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await db.query(`
      SELECT ts.*, u.username as created_by_name,
             COUNT(tsc.test_case_id) as case_count
      FROM test_suites ts
      LEFT JOIN users u ON ts.created_by = u.id
      LEFT JOIN test_suite_cases tsc ON ts.id = tsc.suite_id
      WHERE ts.project_id = $1
      GROUP BY ts.id, u.username
      ORDER BY ts.created_at DESC
    `, [projectId]);

    await cache.set(cacheKey, result.rows, CACHE_TTL);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const suite = await db.query('SELECT * FROM test_suites WHERE id=$1', [id]);
    if (suite.rows.length === 0) return res.status(404).json({ message: 'Suite not found' });

    const cases = await db.query(`
      SELECT tc.*, u.username as created_by_name
      FROM test_cases tc
      JOIN test_suite_cases tsc ON tc.id = tsc.test_case_id
      LEFT JOIN users u ON tc.created_by = u.id
      WHERE tsc.suite_id = $1
    `, [id]);

    res.json({ ...suite.rows[0], test_cases: cases.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createSuite = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const result = await db.query(`
      INSERT INTO test_suites (project_id, name, description, created_by)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [projectId, name, description, req.user.id]);

    await cache.del(`suites:${projectId}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const result = await db.query(`
      UPDATE test_suites SET name=$1, description=$2, updated_at=NOW() WHERE id=$3 RETURNING *
    `, [name, description, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Suite not found' });
    await cache.del(`suites:${result.rows[0].project_id}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const s = await db.query('DELETE FROM test_suites WHERE id=$1 RETURNING project_id', [id]);
    if (s.rows.length > 0) await cache.del(`suites:${s.rows[0].project_id}`);
    res.json({ message: 'Suite deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const addCaseToSuite = async (req, res) => {
  try {
    const { id } = req.params;
    const { testCaseId } = req.body;
    await db.query('INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, testCaseId]);
    const suite = await db.query('SELECT project_id FROM test_suites WHERE id=$1', [id]);
    if (suite.rows.length > 0) await cache.del(`suites:${suite.rows[0].project_id}`);
    res.json({ message: 'Test case added to suite' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const removeCaseFromSuite = async (req, res) => {
  try {
    const { id, caseId } = req.params;
    await db.query('DELETE FROM test_suite_cases WHERE suite_id=$1 AND test_case_id=$2', [id, caseId]);
    res.json({ message: 'Test case removed from suite' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSuites, getSuite, createSuite, updateSuite, deleteSuite, addCaseToSuite, removeCaseFromSuite };
