const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");

// Protect all dashboard routes
router.use(authenticate);

// GET /api/dashboard/stats
router.get("/stats", authenticate, getDashboardStats);

module.exports = router;
