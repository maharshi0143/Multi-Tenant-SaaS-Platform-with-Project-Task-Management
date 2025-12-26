const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

/**
 * API 9: List Tenant Users
 * GET /api/users
 * tenant derived from JWT
 */
router.get('/', getUsers);

/**
 * API 8: Add User
 * POST /api/users
 */
router.post('/', createUser);

/**
 * API 10: Update User
 */
router.put('/:userId', updateUser);

/**
 * API 11: Delete User
 */
router.delete('/:userId', deleteUser);

module.exports = router;
