const { pool } = require('../config/db');

/**
 * API 12: Create Project with Limit Check
 * Enforces multi-tenant isolation and subscription limits
 */
const createProject = async (req, res) => {
    const { name, description, status } = req.body;

    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    if (!name) {
        return res.status(400).json({ success: false, message: "Project name is required" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Mandatory transaction safety

        // 1. Verify tenant exists and get limits
        const limitQuery = await client.query(
            'SELECT max_projects FROM tenants WHERE id = $1',
            [tenantId]
        );

        if (limitQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Tenant not found. Please re-login." });
        }

        // 2. Count current projects for this tenant
        const countQuery = await client.query(
            'SELECT COUNT(*) FROM projects WHERE tenant_id = $1',
            [tenantId]
        );

        const maxProjects = limitQuery.rows[0].max_projects;
        const currentProjects = parseInt(countQuery.rows[0].count);

        // 3. Enforce Subscription Limit
        if (currentProjects >= maxProjects) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                message: `Project limit reached. Your plan is restricted to ${maxProjects} projects.`
            });
        }

        // 4. Create project
        const newProject = await client.query(
            `INSERT INTO projects (tenant_id, name, description, status, created_by) 
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, description, status, created_by as "createdBy", created_at as "createdAt"`,
            [tenantId, name, description, status || 'active', userId]
        );

        // 5. Audit Log (Mandatory)
        await client.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'CREATE_PROJECT', 'project', $3)`,
            [tenantId, userId, newProject.rows[0].id]
        );

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            data: {
                ...newProject.rows[0],
                tenantId
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        client.release();
    }
};

/**
 * API 13: List Projects
 * Enforces strict tenant isolation
 */
const getProjects = async (req, res) => {
    try {
        const { tenantId, role } = req.user;
        const { status, search } = req.query;

        // Build dynamic query with optional filters
        let baseQuery = `
                 SELECT p.id, p.name, p.description, p.status, p.created_at as "createdAt",
                     json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "createdBy",
                     (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as "taskCount",
                     (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as "completedTaskCount"
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE 1=1`;

        const params = [];

        // Apply tenant isolation for non-super admins
        if (role !== 'super_admin') {
            params.push(tenantId);
            baseQuery += ` AND p.tenant_id = $${params.length}`;
        }

        if (status) {
            params.push(status);
            baseQuery += ` AND p.status ILIKE $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            baseQuery += ` AND p.name ILIKE $${params.length}`;
        }

        // Pagination
        const page = parseInt(req.query.page || '1', 10);
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
        const offset = (page - 1) * limit;

        baseQuery += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const projects = await pool.query(baseQuery, params);
        // normalize task_count to integer
        const rows = projects.rows.map((r) => ({
            ...r,
            taskCount: parseInt(r.taskCount, 10),
            completedTaskCount: parseInt(r.completedTaskCount || 0, 10)
        }));

        // total count for pagination (apply same filters)
        let countQuery = `SELECT COUNT(*) FROM projects p WHERE 1=1`;
        const countParams = [];

        if (role !== 'super_admin') {
            countParams.push(tenantId);
            countQuery += ` AND p.tenant_id = $${countParams.length}`;
        }

        if (status) { countParams.push(status); countQuery += ` AND p.status ILIKE $${countParams.length}`; }
        if (search) { countParams.push(`%${search}%`); countQuery += ` AND p.name ILIKE $${countParams.length}`; }
        const countRes = await pool.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0].count, 10);

        res.json({
            success: true,
            data: {
                projects: rows,
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
 * API 14: Get Project Details
 */
const getProjectById = async (req, res) => {
    const { id } = req.params;
    try {
        const isSuperAdmin = req.user.role === 'super_admin';
        const projectRes = await pool.query(
            `SELECT p.id, p.name, p.description, p.status, p.tenant_id as "tenantId", p.created_at as "createdAt",
                    json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "createdBy"
             FROM projects p
             LEFT JOIN users u ON p.created_by = u.id
             WHERE p.id = $1 ${isSuperAdmin ? '' : 'AND p.tenant_id = $2'}`,
            isSuperAdmin ? [id] : [id, req.user.tenantId]
        );

        if (projectRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Project not found or unauthorized access" });
        }

        const project = projectRes.rows[0];

        // Fetch tasks for this project
        const tasksRes = await pool.query(
            `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date as "dueDate", t.created_at as "createdAt",
                    json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "assignedTo"
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to = u.id
             WHERE t.project_id = $1 AND t.tenant_id = $2
             ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC`,
            [id, project.tenantId]
        );

        project.tasks = tasksRes.rows;

        res.json({ success: true, data: project });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 15: Update Project
 * Supports name, description, and status updates
 */
const updateProject = async (req, res) => {
    const { id } = req.params;
    const { name, description, status } = req.body;
    try {
        // Authorization: tenant_admin or project creator
        const isSuperAdmin = req.user.role === 'super_admin';
        const projectRes = await pool.query(
            `SELECT created_by, tenant_id FROM projects WHERE id = $1 ${isSuperAdmin ? '' : 'AND tenant_id = $2'}`,
            isSuperAdmin ? [id] : [id, req.user.tenantId]
        );
        if (projectRes.rows.length === 0) return res.status(404).json({ success: false, message: "Project not found" });

        const isCreator = projectRes.rows[0].created_by === req.user.userId;
        if (!isSuperAdmin && req.user.role !== 'tenant_admin' && !isCreator) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const result = await pool.query(
            `UPDATE projects 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 ${isSuperAdmin ? '' : 'AND tenant_id = $5'} 
             RETURNING id, name, description, status, updated_at as "updatedAt"`,
            isSuperAdmin ? [name, description, status, id] : [name, description, status, id, req.user.tenantId]
        );

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
             VALUES ($1, $2, 'UPDATE_PROJECT', 'project', $3)`,
            [projectRes.rows[0].tenant_id || req.user.tenantId, req.user.userId, id]
        );

        res.json({ success: true, message: "Project updated successfully", data: result.rows[0] });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 16: Delete Project
 * Requirement: Must trigger CASCADE deletion of associated tasks
 */
const deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
        const isSuperAdmin = req.user.role === 'super_admin';
        const projectRes = await pool.query(
            `SELECT created_by, tenant_id FROM projects WHERE id = $1 ${isSuperAdmin ? '' : 'AND tenant_id = $2'}`,
            isSuperAdmin ? [id] : [id, req.user.tenantId]
        );
        if (projectRes.rows.length === 0) return res.status(404).json({ success: false, message: "Project not found" });

        const isCreator = projectRes.rows[0].created_by === req.user.userId;
        if (!isSuperAdmin && req.user.role !== 'tenant_admin' && !isCreator) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const result = await pool.query(
            `DELETE FROM projects WHERE id = $1 ${isSuperAdmin ? '' : 'AND tenant_id = $2'} RETURNING id`,
            isSuperAdmin ? [id] : [id, req.user.tenantId]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Project not found" });

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
             VALUES ($1, $2, 'DELETE_PROJECT', 'project', $3)`,
            [projectRes.rows[0].tenant_id || req.user.tenantId, req.user.userId, id]
        );

        res.json({ success: true, message: "Project and all associated tasks deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject };