const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, statsController.getDashboardStats);
router.get('/settings', statsController.getSettings);
router.put('/settings', authenticateToken, requireRole('admin'), statsController.updateSettings);

module.exports = router;
