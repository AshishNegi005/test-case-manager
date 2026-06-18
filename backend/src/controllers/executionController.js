const db = require('../config/database');
const { cache } = require('../config/redis');

const getExecutions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20, status, testCaseId, suiteId } = req.query;

    let where = ['te.project_id = $1'];
    let params = [projectId];
    let idx = 2;

    if (status) { where.push(`te.status = $${idx++}`); params.push(status); }
    if (testCaseId) { where.push(`te.test_case_id = $${idx++}`); params.push(testCaseId); }
    if (suiteId) { where.push(`te.suite_id = $${idx++}`); params.push(suiteId); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countRes = await db.query(`SELECT COUNT(*) FROM test_executions te WHERE ${where.join(' AND ')}`, params);
    const total = parseInt(countRes.rows[0].count);

    const result = await db.query(`
      SELECT te.*, tc.title as test_case_title, u.username as executed_by_name,
             ts.name as suite_name
      FROM test_executions te
      JOIN test_cases tc ON te.test_case_id = tc.id
      LEFT JOIN users u ON te.executed_by = u.id
      LEFT JOIN test_suites ts ON te.suite_id = ts.id
      WHERE ${where.join(' AND ')}
      ORDER BY te.executed_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(limit), offset]);

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createExecution = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { testCaseId, suiteId, status, comments, defectId, defectDescription } = req.body;

    const result = await db.query(`
      INSERT INTO test_executions (test_case_id, project_id, suite_id, executed_by, status, comments, defect_id, defect_description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [testCaseId, projectId, suiteId || null, req.user.id, status, comments, defectId, defectDescription]);

    await cache.delPattern(`analytics:${projectId}:*`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const executeSuite = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { suiteId, results } = req.body; // results: [{testCaseId, status, comments}]

    const executions = [];
    for (const r of results) {
      const res2 = await db.query(`
        INSERT INTO test_executions (test_case_id, project_id, suite_id, executed_by, status, comments)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [r.testCaseId, projectId, suiteId, req.user.id, r.status, r.comments || '']);
      executions.push(res2.rows[0]);
    }

    await cache.delPattern(`analytics:${projectId}:*`);
    res.status(201).json({ message: 'Suite executed', executions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getExecutions, createExecution, executeSuite };
