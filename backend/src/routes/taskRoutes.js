const express = require('express');
const router = express.Router();
const { 
    createTask, 
    getTasks, 
    updateTaskStatus, 
    updateTask,
    getAllTasks
} = require('../controllers/taskController');
const { deleteTask } = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');

// All task routes require a valid JWT token
router.use(authenticate);

/**
 * API 16: Create Task
 * Path: POST /api/tasks/projects/:projectId
 */
router.post('/projects/:projectId', createTask);

/**
 * API 17: List Project Tasks
 * Path: GET /api/tasks/projects/:projectId
 */
router.get('/projects/:projectId', getTasks);

// Optional: tenant-wide tasks listing
router.get('/', getAllTasks);

/**
 * API 18: Quick Status Update
 * Path: PATCH /api/tasks/:taskId/status
 */
router.patch('/:taskId/status', updateTaskStatus);

/**
 * API 19: Full Task Update
 * Path: PUT /api/tasks/:taskId
 */
router.put('/:taskId', updateTask);

/**
 * API 20: Delete Task
 */
router.delete('/:taskId', deleteTask);

module.exports = router;