const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/audit - View company history
router.get('/', authenticate, getAuditLogs);

module.exports = router;