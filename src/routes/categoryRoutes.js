const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', categoryController.getCategories);
router.get('/tags', categoryController.getTags);
router.get('/:slug', categoryController.getCategoryBySlug);

router.post('/', authenticateToken, requireRole(['editor', 'admin']), categoryController.createCategory);
router.put('/:id', authenticateToken, requireRole(['editor', 'admin']), categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireRole(['admin']), categoryController.deleteCategory);

module.exports = router;
