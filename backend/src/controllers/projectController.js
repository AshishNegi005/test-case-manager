const db = require('../config/database');
const { cache } = require('../config/redis');

const CACHE_TTL = 3600; // 1 hour

const getProjects = async (req, res) => {
  try {
    const cacheKey = `projects:user:${req.user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    let query, params;
    if (req.user.role === 'admin') {
      query = `
        SELECT p.*, u.username as created_by_name,
               COUNT(DISTINCT pm.user_id) as member_count,
               COUNT(DISTINCT tc.id) as test_case_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN test_cases tc ON p.id = tc.project_id
        GROUP BY p.id, u.username
        ORDER BY p.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT p.*, u.username as created_by_name,
               COUNT(DISTINCT pm2.user_id) as member_count,
               COUNT(DISTINCT tc.id) as test_case_count
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_members pm2 ON p.id = pm2.project_id
        LEFT JOIN test_cases tc ON p.id = tc.project_id
        GROUP BY p.id, u.username
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await db.query(query, params);
    await cache.set(cacheKey, result.rows, CACHE_TTL);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT p.*, u.username as created_by_name FROM projects p
      LEFT JOIN users u ON p.created_by = u.id WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Project not found' });

    const members = await db.query(`
      SELECT u.id, u.username, u.email, u.role, pm.assigned_at
      FROM project_members pm JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `, [id]);

    res.json({ ...result.rows[0], members: members.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, description, version, status = 'active' } = req.body;
    const result = await db.query(`
      INSERT INTO projects (name, description, version, status, created_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [name, description, version, status, req.user.id]);

    const project = result.rows[0];
    // Auto-add creator as member
    await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [project.id, req.user.id, req.user.role]);

    await cache.delPattern(`projects:*`);
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, version, status } = req.body;
    const result = await db.query(`
      UPDATE projects SET name=$1, description=$2, version=$3, status=$4, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [name, description, version, status, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
    await cache.delPattern(`projects:*`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM projects WHERE id=$1', [id]);
    await cache.delPattern(`projects:*`);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'tester' } = req.body;
    await db.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET role=$3`,
      [id, userId, role]);
    await cache.delPattern(`projects:*`);
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    await db.query('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2', [id, userId]);
    await cache.delPattern(`projects:*`);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember };
