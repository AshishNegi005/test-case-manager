const db = require('../config/database');
const { cache } = require('../config/redis');

const getTestCases = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { priority, type, search, page = 1, limit = 20, suiteId } = req.query;

    let where = ['tc.project_id = $1'];
    let params = [projectId];
    let idx = 2;

    if (priority) { where.push(`tc.priority = $${idx++}`); params.push(priority); }
    if (type) { where.push(`tc.type = $${idx++}`); params.push(type); }
    if (search) { where.push(`(tc.title ILIKE $${idx} OR tc.description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (suiteId) {
      where.push(`tc.id IN (SELECT test_case_id FROM test_suite_cases WHERE suite_id = $${idx++})`);
      params.push(suiteId);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countRes = await db.query(`SELECT COUNT(*) FROM test_cases tc WHERE ${where.join(' AND ')}`, params);
    const total = parseInt(countRes.rows[0].count);

    const result = await db.query(`
      SELECT tc.*, u.username as created_by_name, a.username as assigned_to_name,
             (SELECT status FROM test_executions WHERE test_case_id = tc.id ORDER BY executed_at DESC LIMIT 1) as last_status
      FROM test_cases tc
      LEFT JOIN users u ON tc.created_by = u.id
      LEFT JOIN users a ON tc.assigned_to = a.id
      WHERE ${where.join(' AND ')}
      ORDER BY tc.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, parseInt(limit), offset]);

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT tc.*, u.username as created_by_name, a.username as assigned_to_name
      FROM test_cases tc
      LEFT JOIN users u ON tc.created_by = u.id
      LEFT JOIN users a ON tc.assigned_to = a.id
      WHERE tc.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Test case not found' });

    const steps = await db.query('SELECT * FROM test_steps WHERE test_case_id=$1 ORDER BY step_number', [id]);
    const executions = await db.query(`
      SELECT te.*, u.username as executed_by_name
      FROM test_executions te LEFT JOIN users u ON te.executed_by = u.id
      WHERE te.test_case_id=$1 ORDER BY te.executed_at DESC LIMIT 10
    `, [id]);

    res.json({ ...result.rows[0], steps: steps.rows, executions: executions.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createTestCase = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, type, preconditions, postconditions, tags = [], steps = [], assignedTo } = req.body;

    const result = await db.query(`
      INSERT INTO test_cases (project_id, title, description, priority, type, preconditions, postconditions, tags, created_by, assigned_to)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [projectId, title, description, priority || 'medium', type || 'functional', preconditions, postconditions, tags, req.user.id, assignedTo || null]);

    const tc = result.rows[0];

    if (steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        await db.query('INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1,$2,$3,$4)',
          [tc.id, i + 1, steps[i].action, steps[i].expected_result]);
      }
    }

    await cache.delPattern(`analytics:${projectId}:*`);
    res.status(201).json(tc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, type, preconditions, postconditions, tags, steps, assignedTo } = req.body;

    const result = await db.query(`
      UPDATE test_cases SET title=$1, description=$2, priority=$3, type=$4, preconditions=$5,
      postconditions=$6, tags=$7, assigned_to=$8, updated_at=NOW() WHERE id=$9 RETURNING *
    `, [title, description, priority, type, preconditions, postconditions, tags, assignedTo || null, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });

    if (steps) {
      await db.query('DELETE FROM test_steps WHERE test_case_id=$1', [id]);
      for (let i = 0; i < steps.length; i++) {
        await db.query('INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1,$2,$3,$4)',
          [id, i + 1, steps[i].action, steps[i].expected_result]);
      }
    }

    const tc = result.rows[0];
    await cache.delPattern(`analytics:${tc.project_id}:*`);
    res.json(tc);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const tc = await db.query('DELETE FROM test_cases WHERE id=$1 RETURNING project_id', [id]);
    if (tc.rows.length > 0) await cache.delPattern(`analytics:${tc.rows[0].project_id}:*`);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkUpdate = async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'ids array required' });

    if (action === 'delete') {
      await db.query('DELETE FROM test_cases WHERE id = ANY($1)', [ids]);
    } else if (action === 'priority') {
      await db.query('UPDATE test_cases SET priority=$1, updated_at=NOW() WHERE id = ANY($2)', [value, ids]);
    } else if (action === 'assign_suite') {
      for (const id of ids) {
        await db.query('INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [value, id]);
      }
    }

    res.json({ message: 'Bulk operation completed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTestCases, getTestCase, createTestCase, updateTestCase, deleteTestCase, bulkUpdate };
