const { pool } = require('../config/db');

/**
 * API 5: Get Tenant Details
 * Requirement: Must return nested stats object
 */
const getTenantDetails = async (req, res) => {
    const { tenantId } = req.params;
    try {
        // Access Check: User must belong to this tenant OR be super_admin
        if (req.user.tenant_id !== tenantId && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const result = await pool.query(`
            SELECT id, name, subdomain, status, subscription_plan as "subscriptionPlan", 
                   max_users as "maxUsers", max_projects as "maxProjects", created_at as "createdAt",
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as total_users,
            (SELECT COUNT(*) FROM projects WHERE tenant_id = t.id) as total_projects,
            (SELECT COUNT(*) FROM tasks WHERE tenant_id = t.id) as total_tasks
            FROM tenants t WHERE id = $1`, [tenantId]);

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Tenant not found" });

        const row = result.rows[0];
        
        res.json({
            success: true,
            data: {
                id: row.id,
                name: row.name,
                subdomain: row.subdomain,
                status: row.status,
                subscriptionPlan: row.subscriptionPlan,
                maxUsers: row.maxUsers,
                maxProjects: row.maxProjects,
                createdAt: row.createdAt,
                stats: {
                    totalUsers: parseInt(row.total_users),
                    totalProjects: parseInt(row.total_projects),
                    totalTasks: parseInt(row.total_tasks)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * API 6: Update Tenant Profile
 * Requirement: Tenant admins can only update 'name'
 */
const updateTenantProfile = async (req, res) => {
    const { tenantId } = req.params;
    const { name, status, subscriptionPlan, maxUsers, maxProjects } = req.body;
    const isSuperAdmin = req.user.role === 'super_admin';

    try {
        if (req.user.tenant_id !== tenantId && !isSuperAdmin) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        // Requirement: Return 403 if tenant_admin tries to update restricted fields
        if (!isSuperAdmin && (status || subscriptionPlan || maxUsers || maxProjects)) {
            return res.status(403).json({ 
                success: false, 
                message: "Tenant admins can only update organization name" 
            });
        }

        let query, params;
        if (isSuperAdmin) {
            // Super admins can update everything
            query = `UPDATE tenants SET name = COALESCE($1, name), status = COALESCE($2, status), 
                     subscription_plan = COALESCE($3, subscription_plan), max_users = COALESCE($4, max_users),
                     max_projects = COALESCE($5, max_projects), updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $6 RETURNING *`;
            params = [name, status, subscriptionPlan, maxUsers, maxProjects, tenantId];
        } else {
            // Tenant admins can ONLY update name
            query = `UPDATE tenants SET name = $1, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $2 RETURNING *`;
            params = [name, tenantId];
        }

        const result = await pool.query(query, params);
        
        // Audit log for security tracking
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'UPDATE_TENANT', 'tenant', $1)`,
            [tenantId, req.user.id]
        );

        res.json({ success: true, message: "Tenant updated successfully", data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * API 7: List All Tenants (Super Admin Only)
 */
const getAllTenants = async (req, res) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: "Access denied: Super Admin privileges required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Requirement: Calculate totalUsers and totalProjects for each tenant
        const result = await pool.query(`
            SELECT id, name, subdomain, status, subscription_plan as "subscriptionPlan", created_at as "createdAt",
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as "totalUsers",
            (SELECT COUNT(*) FROM projects WHERE tenant_id = t.id) as "totalProjects"
            FROM tenants t 
            ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
        
        const countRes = await pool.query('SELECT COUNT(*) FROM tenants');
        const totalTenants = parseInt(countRes.rows[0].count);

        res.json({ 
            success: true, 
            data: { 
                tenants: result.rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalTenants / limit),
                    totalTenants: totalTenants,
                    limit: limit
                }
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { upgradeTenant: () => {}, updateTenantProfile, getAllTenants, getTenantDetails };