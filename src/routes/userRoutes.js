const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public author profile
router.get('/author/:id', userController.getPublicAuthorProfile);

// Admin user management
router.get('/', authenticateToken, requireRole('admin'), userController.getUsers);
router.post('/', authenticateToken, requireRole('admin'), userController.createUser);
router.put('/:id/role', authenticateToken, requireRole('admin'), userController.updateUserRole);
router.put('/:id/status', authenticateToken, requireRole('admin'), userController.updateUserStatus);
router.delete('/:id', authenticateToken, requireRole('admin'), userController.deleteUser);

module.exports = router;
