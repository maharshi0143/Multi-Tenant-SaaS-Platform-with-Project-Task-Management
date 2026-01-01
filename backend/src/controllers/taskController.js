const { pool } = require('../config/db');

/**
 * API 16: Create Task
 * Requirements: Verify project belongs to tenant, handle assignedTo validation
 */
const createTask = async (req, res) => {
    const { projectId } = req.params;
    let { title, description, assignedTo, priority, dueDate } = req.body;

    // FIX: Match JWT payload keys (tenant_id and id)
    const { tenant_id: tenantId, id: userId } = req.user;

    try {
        // 1. Verify project belongs to user's tenant
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1 AND tenant_id = $2',
            [projectId, tenantId]
        );
        if (projectCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Forbidden: Project not found in your tenant" });
        }

        // Normalize empty assignment -> null to avoid inserting empty string into UUID column
        if (!assignedTo) assignedTo = null;

        // 2. If assignedTo is provided, verify they belong to the same tenant
        if (assignedTo) {
            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [assignedTo, tenantId]);
            if (userCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: "Assigned user must belong to your company" });
            }
        }

        const newTask = await pool.query(
            `INSERT INTO tasks (project_id, tenant_id, title, description, assigned_to, priority, due_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo') 
             RETURNING id, title, description, priority, status, assigned_to as "assignedTo", due_date as "dueDate", created_at as "createdAt"`,
            [projectId, tenantId, title, description, assignedTo, priority || 'medium', dueDate]
        );

        res.status(201).json({ success: true, data: newTask.rows[0] });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 17: List Project Tasks
 * Requirements: Support search, filtering, and join for assignment info
 */
const getTasks = async (req, res) => {
    const { projectId } = req.params;
    const { status, assignedTo, priority, search } = req.query;
    const { tenant_id: tenantId, id: userId, role } = req.user; // FIX: Key mapping

    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 200);
        const offset = (page - 1) * limit;

        let baseQuery = `
            SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date as "dueDate", t.created_at as "createdAt",
            json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "assignedTo"
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.project_id = $1 AND t.tenant_id = $2`;

        const params = [projectId, tenantId];

        // Enforce isolation for regular users
        if (role === 'user') {
            params.push(userId);
            baseQuery += ` AND t.assigned_to = $${params.length}`;
        }

        if (status) { params.push(status); baseQuery += ` AND t.status = $${params.length}`; }
        // If regular user, assignedTo filter is redundant or must match their ID, but baseQuery handler above covers it
        if (assignedTo && role !== 'user') { params.push(assignedTo); baseQuery += ` AND t.assigned_to = $${params.length}`; }
        if (priority) { params.push(priority); baseQuery += ` AND t.priority = $${params.length}`; }
        if (search) { params.push(`%${search}%`); baseQuery += ` AND t.title ILIKE $${params.length}`; }

        const dataQuery = baseQuery + ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(dataQuery, params);

        // count with same filters
        let countQuery = `SELECT COUNT(*) FROM tasks t WHERE t.project_id = $1 AND t.tenant_id = $2`;
        const countParams = [projectId, tenantId];

        if (role === 'user') {
            countParams.push(userId);
            countQuery += ` AND t.assigned_to = $${countParams.length}`;
        }

        if (status) { countParams.push(status); countQuery += ` AND t.status = $${countParams.length}`; }
        if (assignedTo && role !== 'user') { countParams.push(assignedTo); countQuery += ` AND t.assigned_to = $${countParams.length}`; }
        if (priority) { countParams.push(priority); countQuery += ` AND t.priority = $${countParams.length}`; }
        if (search) { countParams.push(`%${search}%`); countQuery += ` AND t.title ILIKE $${countParams.length}`; }

        const countRes = await pool.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0].count, 10);

        res.json({ success: true, data: { tasks: result.rows, total, pagination: { page, limit, totalPages: Math.ceil(total / limit) } } });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 18: Quick Status Update
 * Requirement: Partial update for status only
 */
const updateTaskStatus = async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    const { tenant_id: tenantId, id: userId, role } = req.user;

    try {
        let query = `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $2 AND tenant_id = $3`;
        const params = [status, taskId, tenantId];

        // Authorization: Regular users can only update their own tasks
        if (role === 'user') {
            params.push(userId);
            query += ` AND assigned_to = $${params.length}`;
        }

        query += ` RETURNING id, title, status, updated_at as "updatedAt"`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Task not found" });

        // Log action in Audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'UPDATE_TASK_STATUS', 'task', $3)`,
            [tenantId, userId, taskId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 19: Full Task Update
 * Requirement: Allow updates to all task fields with tenant isolation
 */
const updateTask = async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body;
    const { tenant_id: tenantId, id: userId, role } = req.user;

    // Security: Regular users CANNOT reassign tasks
    if (role === 'user' && updates.assignedTo && updates.assignedTo !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden: You cannot reassign tasks." });
    }

    try {
        const fields = [];
        const params = [];
        const allowedUpdates = ['title', 'description', 'status', 'priority', 'assigned_to', 'due_date'];

        Object.keys(updates).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                params.push(updates[key]);
                // Map camelCase to snake_case for DB if necessary, but here we assume direct match
                const dbKey = key === 'assignedTo' ? 'assigned_to' : (key === 'dueDate' ? 'due_date' : key);
                fields.push(`${dbKey} = $${params.length}`);
            }
        });

        if (fields.length === 0) return res.status(400).json({ message: "No valid fields provided" });

        params.push(taskId, tenantId);
        let query = `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                       WHERE id = $${params.length - 1} AND tenant_id = $${params.length}`;

        // Authorization: Regular users can only update their own tasks
        if (role === 'user') {
            params.push(userId);
            query += ` AND assigned_to = $${params.length}`;
        }

        query += ` RETURNING id, title, description, status, priority, assigned_to as "assignedTo"`;

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Task not found" });

        // Audit Logging
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'UPDATE_TASK_FULL', 'task', $3)`,
            [tenantId, userId, taskId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 20: Delete Task
 * Path: DELETE /api/tasks/:taskId
 */
const deleteTask = async (req, res) => {
    const { taskId } = req.params;
    const { tenant_id: tenantId, id: userId, role } = req.user;

    // Security: Regular users cannot delete tasks
    if (role === 'user') {
        return res.status(403).json({ success: false, message: "Forbidden: Only admins can delete tasks." });
    }

    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [taskId, tenantId]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES ($1, $2, 'DELETE_TASK', 'task', $3)`,
            [tenantId, userId, taskId]
        );

        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API (opt): List all tasks for tenant (supports filters + pagination)
 * Endpoint: GET /api/tasks
 */
const getAllTasks = async (req, res) => {
    const { assignedTo, status, priority, search, page = 1, limit = 50 } = req.query;
    const { tenant_id: tenantId, id: userId, role } = req.user;

    try {
        const offset = (page - 1) * limit;
        let query = `
            SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date as "dueDate", t.created_at as "createdAt",
                         json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "assignedTo",
                         p.id as project_id, p.name as project_name,
                         te.name as tenant_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN tenants te ON t.tenant_id = te.id
            WHERE 1=1`;

        const params = [];

        // Apply tenant isolation for non-super admins
        if (role !== 'super_admin') {
            params.push(tenantId);
            query += ` AND t.tenant_id = $${params.length}`;
        }

        // Enforce user isolation
        if (role === 'user') {
            params.push(userId);
            query += ` AND t.assigned_to = $${params.length}`;
        }

        if (assignedTo && role !== 'user') { params.push(assignedTo); query += ` AND t.assigned_to = $${params.length}`; }
        if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
        if (priority) { params.push(priority); query += ` AND t.priority = $${params.length}`; }
        if (search) { params.push(`%${search}%`); query += ` AND t.title ILIKE $${params.length}`; }

        query += ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // total with same filters
        let countQuery = `SELECT COUNT(*) FROM tasks t WHERE 1=1`;
        const countParams = [];

        if (role !== 'super_admin') {
            countParams.push(tenantId);
            countQuery += ` AND t.tenant_id = $${countParams.length}`;
        }

        if (role === 'user') {
            countParams.push(userId);
            countQuery += ` AND t.assigned_to = $${countParams.length}`;
        }

        if (assignedTo && role !== 'user') { countParams.push(assignedTo); countQuery += ` AND t.assigned_to = $${countParams.length}`; }
        if (status) { countParams.push(status); countQuery += ` AND t.status = $${countParams.length}`; }
        if (priority) { countParams.push(priority); countQuery += ` AND t.priority = $${countParams.length}`; }
        if (search) { countParams.push(`%${search}%`); countQuery += ` AND t.title ILIKE $${countParams.length}`; }

        const countRes = await pool.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0].count, 10);

        res.json({ success: true, data: { tasks: result.rows, total, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createTask, getTasks, updateTaskStatus, updateTask, getAllTasks, deleteTask };