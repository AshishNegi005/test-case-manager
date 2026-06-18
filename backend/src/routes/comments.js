const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const { getComments, addComment, updateComment, deleteComment } = require('../controllers/commentsController');

router.get('/', authenticate, getComments);
router.post('/', authenticate, addComment);
router.put('/:commentId', authenticate, updateComment);
router.delete('/:commentId', authenticate, deleteComment);

module.exports = router;
