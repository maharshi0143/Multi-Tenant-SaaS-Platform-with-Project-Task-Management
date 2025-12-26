const express = require('express');
const router = express.Router();
const { registerTenant, login, getMe, forgotPassword, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware'); // 

router.post('/register-tenant', registerTenant);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/logout', authenticate, logout); // API 4
router.get('/me', authenticate, getMe);

module.exports = router;