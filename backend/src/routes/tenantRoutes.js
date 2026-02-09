const express = require('express');
const router = express.Router();

const { 
  getTenantDetails, 
  updateTenantProfile,
  getAllTenants
} = require('../controllers/tenantController');

const { createUser, getUsers } = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const tenantAccess = require('../middleware/tenantAccess');

// All tenant routes require authentication
router.use(authenticate);

// API 7: List All Tenants (Super Admin Only)
router.get('/', getAllTenants);

// API 5: Get Specific Tenant Details
router.get('/:tenantId', tenantAccess, getTenantDetails);

// API 6: Update Tenant Profile
router.put('/:tenantId', tenantAccess, updateTenantProfile);

// API 8: Add User to Tenant
router.post('/:tenantId/users', tenantAccess, createUser);

// API 9: List Tenant Users
router.get('/:tenantId/users', tenantAccess, getUsers);

module.exports = router;
