const db = require('../config/database');
const cron = require('node-cron');

// In-memory registry of active cron jobs: scheduleId -> task
const activeTasks = new Map();

const isValidCron = (expr) => cron.validate(expr);

const runScheduledSuite = async (scheduleId, projectId, suiteId) => {
  try {
    const suite = await db.query(
      'SELECT test_case_id FROM test_suite_cases WHERE suite_id = $1',
      [suiteId]
    );
    for (const { test_case_id } of suite.rows) {
      await db.query(
        `INSERT INTO test_executions (test_case_id, project_id, suite_id, status, comments)
         VALUES ($1, $2, $3, 'pending', 'Scheduled run')`,
        [test_case_id, projectId, suiteId]
      );
    }
    await db.query(
      'UPDATE scheduled_runs SET last_run_at = NOW() WHERE id = $1',
      [scheduleId]
    );
    console.log(`[Scheduler] Ran schedule ${scheduleId}: ${suite.rows.length} cases`);
  } catch (err) {
    console.error(`[Scheduler] Error running schedule ${scheduleId}:`, err.message);
  }
};

const registerJob = (schedule) => {
  if (!isValidCron(schedule.cron_expression)) return;
  if (activeTasks.has(schedule.id)) {
    activeTasks.get(schedule.id).destroy();
  }
  const task = cron.schedule(schedule.cron_expression, () => {
    runScheduledSuite(schedule.id, schedule.project_id, schedule.suite_id);
  });
  activeTasks.set(schedule.id, task);
};

const unregisterJob = (scheduleId) => {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId).destroy();
    activeTasks.delete(scheduleId);
  }
};

// Load all active schedules on startup
const initScheduler = async () => {
  try {
    const result = await db.query('SELECT * FROM scheduled_runs WHERE is_active = true');
    for (const schedule of result.rows) {
      registerJob(schedule);
    }
    console.log(`[Scheduler] Loaded ${result.rows.length} schedule(s)`);
  } catch (err) {
    console.error('[Scheduler] Init error:', err.message);
  }
};

const getSchedules = async (req, res) => {
  const { projectId } = req.params;
  const result = await db.query(
    `SELECT sr.id, sr.name, sr.cron_expression, sr.is_active, sr.last_run_at, sr.next_run_at,
            sr.created_at, u.username AS created_by, ts.name AS suite_name, ts.id AS suite_id
     FROM scheduled_runs sr
     LEFT JOIN users u ON sr.created_by = u.id
     LEFT JOIN test_suites ts ON sr.suite_id = ts.id
     WHERE sr.project_id = $1
     ORDER BY sr.created_at DESC`,
    [projectId]
  );
  res.json(result.rows);
};

const createSchedule = async (req, res) => {
  const { projectId } = req.params;
  const { name, suiteId, cronExpression } = req.body;

  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  if (!suiteId) return res.status(400).json({ message: 'Suite is required' });
  if (!isValidCron(cronExpression)) return res.status(400).json({ message: 'Invalid cron expression' });

  const result = await db.query(
    `INSERT INTO scheduled_runs (project_id, suite_id, name, cron_expression, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [projectId, suiteId, name.trim(), cronExpression, req.user.id]
  );
  const schedule = result.rows[0];
  registerJob(schedule);
  res.status(201).json(schedule);
};

const updateSchedule = async (req, res) => {
  const { projectId, scheduleId } = req.params;
  const { name, isActive, cronExpression } = req.body;

  if (cronExpression && !isValidCron(cronExpression)) {
    return res.status(400).json({ message: 'Invalid cron expression' });
  }

  const existing = await db.query('SELECT * FROM scheduled_runs WHERE id = $1 AND project_id = $2', [scheduleId, projectId]);
  if (!existing.rows.length) return res.status(404).json({ message: 'Schedule not found' });

  const updated = await db.query(
    `UPDATE scheduled_runs SET
       name = COALESCE($1, name),
       cron_expression = COALESCE($2, cron_expression),
       is_active = COALESCE($3, is_active),
       updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [name || null, cronExpression || null, isActive !== undefined ? isActive : null, scheduleId]
  );
  const schedule = updated.rows[0];

  if (schedule.is_active) registerJob(schedule);
  else unregisterJob(scheduleId);

  res.json(schedule);
};

const deleteSchedule = async (req, res) => {
  const { projectId, scheduleId } = req.params;
  unregisterJob(scheduleId);
  await db.query('DELETE FROM scheduled_runs WHERE id = $1 AND project_id = $2', [scheduleId, projectId]);
  res.json({ message: 'Schedule deleted' });
};

module.exports = { getSchedules, createSchedule, updateSchedule, deleteSchedule, initScheduler };
