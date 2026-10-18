const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, upload.single('avatar'), authController.updateProfile);
router.post('/switch-demo/:role', authController.switchDemoRole);
router.post('/logout', authController.logout);

module.exports = router;
