const express = require('express');
const router = express.Router();
const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
} = require('../controllers/projectController');
// CRITICAL FIX: Import Task Controller functions to avoid ReferenceError
const { createTask, getTasks } = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// API 12: Create Project
router.post('/', createProject);

// API 13: List Projects
router.get('/', getProjects);

// API 14: Get Project Details
router.get('/:id', getProjectById);

// API 14: Update Project
router.put('/:id', updateProject);

// API 15: Delete Project
router.delete('/:id', deleteProject);

// API 16 & 17: Task Management (Nested under Project ID)
// Fixes 404 in image_579d49.png
router.post('/:projectId/tasks', createTask);
router.get('/:projectId/tasks', getTasks);

module.exports = router;