const express = require('express');
const router = express.Router();
const {
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

/**
 * API 10: Update User
 */
router.put('/:userId', updateUser);

/**
 * API 11: Delete User
 */
router.delete('/:userId', deleteUser);

module.exports = router;
