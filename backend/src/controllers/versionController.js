const db = require('../config/database');

const getVersions = async (req, res) => {
  const { caseId } = req.params;
  const result = await db.query(
    `SELECT v.id, v.version_number, v.title, v.description, v.priority, v.type,
            v.preconditions, v.postconditions, v.tags, v.steps, v.change_reason,
            v.created_at, u.username AS changed_by
     FROM test_case_versions v
     LEFT JOIN users u ON v.changed_by = u.id
     WHERE v.test_case_id = $1
     ORDER BY v.version_number DESC`,
    [caseId]
  );
  res.json(result.rows);
};

const saveVersion = async (testCaseId, changedBy, changeReason) => {
  const tc = await db.query(
    `SELECT tc.*, COALESCE(
       json_agg(json_build_object('step_number', ts.step_number, 'action', ts.action, 'expected_result', ts.expected_result)
         ORDER BY ts.step_number) FILTER (WHERE ts.id IS NOT NULL), '[]'
     ) AS steps
     FROM test_cases tc
     LEFT JOIN test_steps ts ON tc.id = ts.test_case_id
     WHERE tc.id = $1
     GROUP BY tc.id`,
    [testCaseId]
  );
  if (!tc.rows.length) return;

  const { rows: versionRows } = await db.query(
    'SELECT COALESCE(MAX(version_number), 0) AS max_v FROM test_case_versions WHERE test_case_id = $1',
    [testCaseId]
  );
  const nextVersion = (versionRows[0].max_v || 0) + 1;
  const row = tc.rows[0];

  await db.query(
    `INSERT INTO test_case_versions
     (test_case_id, version_number, title, description, priority, type, preconditions, postconditions, tags, steps, changed_by, change_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [testCaseId, nextVersion, row.title, row.description, row.priority, row.type,
     row.preconditions, row.postconditions, row.tags, JSON.stringify(row.steps), changedBy, changeReason || null]
  );
};

const restoreVersion = async (req, res) => {
  const { caseId, versionId } = req.params;

  const vResult = await db.query('SELECT * FROM test_case_versions WHERE id = $1 AND test_case_id = $2', [versionId, caseId]);
  if (!vResult.rows.length) return res.status(404).json({ message: 'Version not found' });
  const v = vResult.rows[0];

  await saveVersion(caseId, req.user.id, `Restored from version ${v.version_number}`);

  await db.query(
    `UPDATE test_cases SET title=$1, description=$2, priority=$3, type=$4,
     preconditions=$5, postconditions=$6, tags=$7, updated_at=NOW()
     WHERE id=$8`,
    [v.title, v.description, v.priority, v.type, v.preconditions, v.postconditions, v.tags, caseId]
  );

  if (v.steps && v.steps.length) {
    await db.query('DELETE FROM test_steps WHERE test_case_id = $1', [caseId]);
    for (const s of v.steps) {
      await db.query(
        'INSERT INTO test_steps (test_case_id, step_number, action, expected_result) VALUES ($1,$2,$3,$4)',
        [caseId, s.step_number, s.action, s.expected_result]
      );
    }
  }

  res.json({ message: `Restored to version ${v.version_number}` });
};

module.exports = { getVersions, saveVersion, restoreVersion };
