const { pool } = require('../config/db');

/**
 * API 16: Create Task
 * Requirements: Verify project belongs to tenant, handle assignedTo validation
 */
const createTask = async (req, res) => {
    const { projectId } = req.params;
    let { title, description, assignedTo, priority, dueDate } = req.body;

    // FIX: Match JWT payload keys (tenant_id and id)
    const { tenantId, userId, role } = req.user;

    try {
        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        // 1. Verify project belongs to user's tenant
        const projectCheck = await pool.query(
            'SELECT id, tenant_id FROM projects WHERE id = $1',
            [projectId]
        );
        if (projectCheck.rows.length === 0 || (role !== 'super_admin' && projectCheck.rows[0].tenant_id !== tenantId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Project not found in your tenant" });
        }
        const projectTenantId = projectCheck.rows[0].tenant_id;

        // Normalize empty assignment -> null to avoid inserting empty string into UUID column
        if (!assignedTo) assignedTo = null;

        // 2. If assignedTo is provided, verify they belong to the same tenant
        if (assignedTo) {
            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [assignedTo, projectTenantId]);
            if (userCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: "Assigned user must belong to your company" });
            }
        }

        const newTask = await pool.query(
            `INSERT INTO tasks (project_id, tenant_id, title, description, assigned_to, priority, due_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo') 
             RETURNING id, title, description, priority, status, assigned_to as "assignedTo", due_date as "dueDate", created_at as "createdAt"`,
            [projectId, projectTenantId, title, description, assignedTo, priority || 'medium', dueDate]
        );

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
             VALUES ($1, $2, 'CREATE_TASK', 'task', $3)`,
            [projectTenantId, userId, newTask.rows[0].id]
        );

        res.status(201).json({
            success: true,
            data: {
                ...newTask.rows[0],
                projectId,
                tenantId: projectTenantId
            }
        });
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
    const { tenantId, role } = req.user;

    try {
        const projectRes = await pool.query('SELECT tenant_id FROM projects WHERE id = $1', [projectId]);
        if (projectRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        const projectTenantId = projectRes.rows[0].tenant_id;
        if (role !== 'super_admin' && projectTenantId !== tenantId) {
            return res.status(403).json({ success: false, message: "Forbidden: Project not found in your tenant" });
        }

        const page = parseInt(req.query.page || '1', 10);
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 200);
        const offset = (page - 1) * limit;

        let baseQuery = `
            SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date as "dueDate", t.created_at as "createdAt",
            json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "assignedTo"
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.project_id = $1 AND t.tenant_id = $2`;

        const params = [projectId, role === 'super_admin' ? projectTenantId : tenantId];

        if (status) { params.push(status); baseQuery += ` AND t.status = $${params.length}`; }
        if (assignedTo) { params.push(assignedTo); baseQuery += ` AND t.assigned_to = $${params.length}`; }
        if (priority) { params.push(priority); baseQuery += ` AND t.priority = $${params.length}`; }
        if (search) { params.push(`%${search}%`); baseQuery += ` AND t.title ILIKE $${params.length}`; }

        const dataQuery = baseQuery + ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(dataQuery, params);

        // count with same filters
        let countQuery = `SELECT COUNT(*) FROM tasks t WHERE t.project_id = $1 AND t.tenant_id = $2`;
        const countParams = [projectId, role === 'super_admin' ? projectTenantId : tenantId];

        if (status) { countParams.push(status); countQuery += ` AND t.status = $${countParams.length}`; }
        if (assignedTo) { countParams.push(assignedTo); countQuery += ` AND t.assigned_to = $${countParams.length}`; }
        if (priority) { countParams.push(priority); countQuery += ` AND t.priority = $${countParams.length}`; }
        if (search) { countParams.push(`%${search}%`); countQuery += ` AND t.title ILIKE $${countParams.length}`; }

        const countRes = await pool.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0].count, 10);

        res.json({
            success: true,
            data: {
                tasks: result.rows,
                total,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    limit
                }
            }
        });
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
    const { tenantId, userId, role } = req.user;

    try {
        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        let query = `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $2`;
        const params = [status, taskId];

        let taskTenantId = tenantId;
        if (role !== 'super_admin') {
            query += ` AND tenant_id = $3`;
            params.push(tenantId);
        } else {
            const taskRes = await pool.query('SELECT tenant_id FROM tasks WHERE id = $1', [taskId]);
            if (taskRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Task not found" });
            }
            taskTenantId = taskRes.rows[0].tenant_id;
        }

        query += ` RETURNING id, title, status, updated_at as "updatedAt"`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Task not found" });

        // Log action in Audit
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'UPDATE_TASK_STATUS', 'task', $3)`,
            [taskTenantId, userId, taskId]
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
    const { tenantId, userId, role } = req.user;

    try {
        const fields = [];
        const params = [];
        const allowedUpdates = ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate'];

        Object.keys(updates).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                params.push(updates[key]);
                const dbKey = key === 'assignedTo' ? 'assigned_to' : (key === 'dueDate' ? 'due_date' : key);
                fields.push(`${dbKey} = $${params.length}`);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields provided" });
        }

        let taskTenantId = tenantId;
        if (role === 'super_admin') {
            const taskRes = await pool.query('SELECT tenant_id FROM tasks WHERE id = $1', [taskId]);
            if (taskRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Task not found" });
            }
            taskTenantId = taskRes.rows[0].tenant_id;
        }

        // If assignedTo provided, verify they belong to tenant
        if (updates.assignedTo) {
            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [updates.assignedTo, taskTenantId]);
            if (userCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: "Assigned user must belong to your company" });
            }
        }

        params.push(taskId);
        let query = `UPDATE tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                       WHERE id = $${params.length}`;

        if (role !== 'super_admin') {
            params.push(tenantId);
            query += ` AND tenant_id = $${params.length}`;
        }

        query += ` RETURNING id, title, description, status, priority, assigned_to as "assignedTo", due_date as "dueDate"`;

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Task not found" });

        let assignedToUser = null;
        if (result.rows[0].assignedTo) {
            const userRes = await pool.query(
                'SELECT id, full_name as "fullName", email FROM users WHERE id = $1',
                [result.rows[0].assignedTo]
            );
            assignedToUser = userRes.rows[0] || null;
        }

        // Audit Logging
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'UPDATE_TASK_FULL', 'task', $3)`,
            [taskTenantId, userId, taskId]
        );

        res.json({
            success: true,
            message: "Task updated successfully",
            data: {
                ...result.rows[0],
                assignedTo: assignedToUser
            }
        });
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
    const { tenantId, userId, role } = req.user;

    // Security: Regular users cannot delete tasks
    if (role === 'user') {
        return res.status(403).json({ success: false, message: "Forbidden: Only admins can delete tasks." });
    }

    try {
        let taskTenantId = tenantId;
        if (role === 'super_admin') {
            const taskRes = await pool.query('SELECT tenant_id FROM tasks WHERE id = $1', [taskId]);
            if (taskRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            taskTenantId = taskRes.rows[0].tenant_id;
        }

        const result = await pool.query(
            role === 'super_admin'
                ? 'DELETE FROM tasks WHERE id = $1 RETURNING id'
                : 'DELETE FROM tasks WHERE id = $1 AND tenant_id = $2 RETURNING id',
            role === 'super_admin' ? [taskId] : [taskId, tenantId]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES ($1, $2, 'DELETE_TASK', 'task', $3)`,
            [taskTenantId, userId, taskId]
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
    const { tenantId, userId, role } = req.user;

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

        res.json({
            success: true,
            data: {
                tasks: result.rows,
                total,
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages: Math.ceil(total / limit),
                    limit: parseInt(limit, 10)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createTask, getTasks, updateTaskStatus, updateTask, getAllTasks, deleteTask };