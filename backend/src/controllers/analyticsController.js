const db = require('../config/database');
const { cache } = require('../config/redis');

const CACHE_TTL = 900; // 15 minutes

const getSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `analytics:${projectId}:summary`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const [statusRes, totalRes, priorityRes, typeRes] = await Promise.all([
      db.query(`
        SELECT status, COUNT(*) as count
        FROM test_executions WHERE project_id=$1
        AND executed_at >= NOW() - INTERVAL '30 days'
        GROUP BY status
      `, [projectId]),
      db.query(`SELECT COUNT(*) as total FROM test_cases WHERE project_id=$1`, [projectId]),
      db.query(`SELECT priority, COUNT(*) as count FROM test_cases WHERE project_id=$1 GROUP BY priority`, [projectId]),
      db.query(`SELECT type, COUNT(*) as count FROM test_cases WHERE project_id=$1 GROUP BY type`, [projectId]),
    ]);

    const statusMap = { pass: 0, fail: 0, blocked: 0, skipped: 0, pending: 0 };
    statusRes.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });

    const data = {
      totalTestCases: parseInt(totalRes.rows[0].total),
      executionSummary: statusMap,
      priorityDistribution: priorityRes.rows,
      typeDistribution: typeRes.rows,
    };

    await cache.set(cacheKey, data, CACHE_TTL);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTrends = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { days = 30 } = req.query;
    const cacheKey = `analytics:${projectId}:trends:${days}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ data: cached, fromCache: true });

    const result = await db.query(`
      SELECT DATE(executed_at) as date,
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'pass') as passed,
             COUNT(*) FILTER (WHERE status = 'fail') as failed,
             COUNT(*) FILTER (WHERE status = 'blocked') as blocked
      FROM test_executions
      WHERE project_id=$1 AND executed_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(executed_at)
      ORDER BY date ASC
    `, [projectId]);

    await cache.set(cacheKey, result.rows, CACHE_TTL);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getTesterProgress = async (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `analytics:${projectId}:testers`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ data: cached, fromCache: true });

    const result = await db.query(`
      SELECT u.username, u.id,
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE te.status = 'pass') as passed,
             COUNT(*) FILTER (WHERE te.status = 'fail') as failed
      FROM test_executions te
      JOIN users u ON te.executed_by = u.id
      WHERE te.project_id=$1
      GROUP BY u.id, u.username
      ORDER BY total DESC
    `, [projectId]);

    await cache.set(cacheKey, result.rows, CACHE_TTL);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getDefectDensity = async (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `analytics:${projectId}:defects`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ data: cached, fromCache: true });

    const result = await db.query(`
      SELECT tc.type,
             COUNT(*) as total_executions,
             COUNT(*) FILTER (WHERE te.status = 'fail') as failures,
             ROUND(100.0 * COUNT(*) FILTER (WHERE te.status = 'fail') / NULLIF(COUNT(*),0), 2) as defect_rate
      FROM test_executions te
      JOIN test_cases tc ON te.test_case_id = tc.id
      WHERE te.project_id=$1
      GROUP BY tc.type
    `, [projectId]);

    await cache.set(cacheKey, result.rows, CACHE_TTL);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSuiteReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `analytics:${projectId}:suites`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ data: cached, fromCache: true });

    const result = await db.query(`
      SELECT ts.id, ts.name,
             COUNT(te.id) as total_runs,
             COUNT(te.id) FILTER (WHERE te.status = 'pass') as passed,
             COUNT(te.id) FILTER (WHERE te.status = 'fail') as failed,
             COUNT(te.id) FILTER (WHERE te.status = 'blocked') as blocked,
             COUNT(te.id) FILTER (WHERE te.status = 'skipped') as skipped,
             MAX(te.executed_at) as last_run_at,
             ROUND(100.0 * COUNT(te.id) FILTER (WHERE te.status = 'pass') / NULLIF(COUNT(te.id), 0), 1) as pass_rate
      FROM test_suites ts
      LEFT JOIN test_executions te ON te.suite_id = ts.id AND te.project_id = $1
      WHERE ts.project_id = $1
      GROUP BY ts.id, ts.name
      ORDER BY last_run_at DESC NULLS LAST, ts.name ASC
    `, [projectId]);

    await cache.set(cacheKey, result.rows, CACHE_TTL);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSummary, getTrends, getTesterProgress, getDefectDensity, getSuiteReport };
