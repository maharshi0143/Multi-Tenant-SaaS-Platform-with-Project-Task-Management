const { pool } = require('../config/db');

/**
 * API 12: Create Project with Limit Check
 * Enforces multi-tenant isolation and subscription limits
 */
const createProject = async (req, res) => {
    const { name, description } = req.body;

    // FIX: Match JWT payload keys (tenant_id and id)
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

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
            `INSERT INTO projects (tenant_id, name, description, status) 
             VALUES ($1, $2, $3, 'active') RETURNING id, name, description, status, created_at as "createdAt"`,
            [tenantId, name, description]
        );

        // 5. Audit Log (Mandatory)
        await client.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'CREATE_PROJECT', 'project', $3)`,
            [tenantId, userId, newProject.rows[0].id]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true, data: newProject.rows[0] });

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
        const { tenant_id: tenantId, role } = req.user;
        const { status, search } = req.query;

        // Build dynamic query with optional filters
        let baseQuery = `
            SELECT p.id, p.name, p.description, p.status, p.created_at as "createdAt", t.name as "tenantName",
                   json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "createdBy",
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN tenants t ON p.tenant_id = t.id
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
        const rows = projects.rows.map((r) => ({ ...r, task_count: parseInt(r.task_count, 10), completed_task_count: parseInt(r.completed_task_count || 0, 10) }));

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

        res.json({ success: true, data: { projects: rows, total, pagination: { page, limit, totalPages: Math.ceil(total / limit) } } });
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
        const projectRes = await pool.query(
            `SELECT p.id, p.name, p.description, p.status, p.created_at as "createdAt",
                    json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) as "createdBy"
             FROM projects p
             LEFT JOIN users u ON p.created_by = u.id
             WHERE p.id = $1 AND p.tenant_id = $2`,
            [id, req.user.tenant_id]
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
            [id, req.user.tenant_id]
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
        const result = await pool.query(
            `UPDATE projects 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 AND tenant_id = $5 
             RETURNING id, name, description, status, updated_at as "updatedAt"`,
            [name, description, status, id, req.user.tenant_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Project not found" });
        res.json({ success: true, data: result.rows[0] });
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
        const result = await pool.query(
            'DELETE FROM projects WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, req.user.tenant_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Project not found" });
        res.json({ success: true, message: "Project and all associated tasks deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject };