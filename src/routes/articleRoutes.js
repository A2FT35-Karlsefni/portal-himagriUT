const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public & optional auth for checking likes/bookmarks
router.get('/', optionalAuth, articleController.getArticles);
router.get('/user/bookmarks', authenticateToken, articleController.getMyBookmarks);
router.get('/:slug', optionalAuth, articleController.getArticleBySlug);

// Content creators: author, editor, admin
router.post(
  '/',
  authenticateToken,
  requireRole(['author', 'editor', 'admin']),
  upload.single('cover'),
  articleController.createArticle
);

router.put(
  '/:id',
  authenticateToken,
  requireRole(['author', 'editor', 'admin']),
  upload.single('cover'),
  articleController.updateArticle
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole(['author', 'editor', 'admin']),
  articleController.deleteArticle
);

// Reader / Authenticated interactions
router.post('/:id/like', authenticateToken, articleController.toggleLike);
router.post('/:id/bookmark', authenticateToken, articleController.toggleBookmark);

module.exports = router;
