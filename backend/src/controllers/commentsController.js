const db = require('../config/database');

const getComments = async (req, res) => {
  const { caseId } = req.params;
  const result = await db.query(
    `SELECT c.id, c.comment, c.created_at, c.updated_at,
            u.username, u.role
     FROM test_case_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.test_case_id = $1
     ORDER BY c.created_at ASC`,
    [caseId]
  );
  res.json(result.rows);
};

const addComment = async (req, res) => {
  const { caseId } = req.params;
  const { comment } = req.body;
  if (!comment?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

  const result = await db.query(
    `INSERT INTO test_case_comments (test_case_id, user_id, comment) VALUES ($1, $2, $3)
     RETURNING id, comment, created_at, updated_at`,
    [caseId, req.user.id, comment.trim()]
  );
  const row = result.rows[0];
  row.username = req.user.username;
  row.role = req.user.role;
  res.status(201).json(row);
};

const updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { comment } = req.body;
  if (!comment?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

  const existing = await db.query('SELECT user_id FROM test_case_comments WHERE id = $1', [commentId]);
  if (!existing.rows.length) return res.status(404).json({ message: 'Comment not found' });
  if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You can only edit your own comments' });
  }

  const result = await db.query(
    `UPDATE test_case_comments SET comment = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, comment, created_at, updated_at`,
    [comment.trim(), commentId]
  );
  res.json(result.rows[0]);
};

const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const existing = await db.query('SELECT user_id FROM test_case_comments WHERE id = $1', [commentId]);
  if (!existing.rows.length) return res.status(404).json({ message: 'Comment not found' });
  if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You can only delete your own comments' });
  }

  await db.query('DELETE FROM test_case_comments WHERE id = $1', [commentId]);
  res.json({ message: 'Comment deleted' });
};

module.exports = { getComments, addComment, updateComment, deleteComment };
