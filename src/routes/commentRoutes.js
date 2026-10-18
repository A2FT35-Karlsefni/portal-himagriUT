const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/article/:articleId', commentController.getCommentsByArticle);
router.post('/', authenticateToken, commentController.addComment);
router.delete('/:id', authenticateToken, commentController.deleteComment);

// Admin & Editor moderation
router.get('/', authenticateToken, requireRole(['editor', 'admin']), commentController.getAllComments);
router.put('/:id/status', authenticateToken, requireRole(['editor', 'admin']), commentController.moderateComment);

module.exports = router;
