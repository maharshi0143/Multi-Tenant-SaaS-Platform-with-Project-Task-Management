const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * API 8: Add User to Tenant
 * Requirements: Check maxUsers limit, hash password, log in audit
 */
const createUser = async (req, res) => {
    const { email, password, fullName, role } = req.body;

    // Extracting from JWT payload (ensure these keys match authController signing)
    const tenantId = req.params.tenantId || req.user.tenantId;
    const adminId = req.user.userId;

    if (!email || !password || !fullName) {
        return res.status(400).json({ success: false, message: "Email, password, and fullName are required." });
    }

    if (role && !['user', 'tenant_admin'].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Transaction safety

        // 1. Authorization: Only admins can add users
        if (req.user.role !== 'tenant_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Only admins can add users." });
        }

        // 2. Fetch Tenant Limits
        const tenantResult = await client.query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
        if (tenantResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: "Tenant not found." });
        }
        const maxUsers = tenantResult.rows[0].max_users;

        // 3. Enforce Subscription Limit
        const countResult = await client.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
        if (parseInt(countResult.rows[0].count) >= maxUsers) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: "Limit reached: Please upgrade your plan to add more users." });
        }

        // 4. Hash Password and Insert User
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await client.query(
            `INSERT INTO users (tenant_id, email, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, email, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt"`,
            [tenantId, email.toLowerCase().trim(), hashedPassword, fullName, role || 'user']
        );

        // 5. Audit Log (Mandatory)
        await client.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'CREATE_USER', 'user', $3)`,
            [tenantId, adminId, newUser.rows[0].id]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: "User created successfully", data: newUser.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: "A user with this email already exists." });
        }
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        client.release();
    }
};

/**
 * API 9: List Tenant Users
 * Supports: Search and role filtering
 */
const getUsers = async (req, res) => {
    const { search, role } = req.query;
    const tenantId = req.params.tenantId || req.user.tenantId; // Multi-tenant isolation

    try {
        let query = `SELECT id, email, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt"
                 FROM users WHERE tenant_id = $1`;
        const params = [tenantId];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
        }

        if (role) {
            params.push(role);
            query += ` AND role = $${params.length}`;
        }

        query += ` ORDER BY created_at DESC`;

        const page = parseInt(req.query.page || '1', 10);
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
        const offset = (page - 1) * limit;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        let countQuery = `SELECT COUNT(*) FROM users WHERE tenant_id = $1`;
        const countParams = [tenantId];
        if (search) {
            countParams.push(`%${search}%`);
            countQuery += ` AND (full_name ILIKE $${countParams.length} OR email ILIKE $${countParams.length})`;
        }
        if (role) {
            countParams.push(role);
            countQuery += ` AND role = $${countParams.length}`;
        }
        const countRes = await pool.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0].count, 10);

        res.json({
            success: true,
            data: {
                users: result.rows,
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
 * API 10: Update User
 * Requirements: Self-update for names; Admin-update for roles/status
 */
const updateUser = async (req, res) => {
    const { userId } = req.params;
    const { fullName, role, isActive } = req.body;
    const { tenantId, userId: requesterId, role: requesterRole } = req.user;

    try {
        const isAdmin = requesterRole === 'tenant_admin' || requesterRole === 'super_admin';
        const isSelf = userId === requesterId;

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ success: false, message: "Unauthorized: You can only update your own profile." });
        }

        const updates = [];
        const params = [];

        if (fullName) { params.push(fullName); updates.push(`full_name = $${params.length}`); }

        // Only admins can change roles or activation status
        if (isAdmin) {
            if (role) {
                if (!['user', 'tenant_admin', 'super_admin'].includes(role)) {
                    return res.status(400).json({ success: false, message: "Invalid role" });
                }
                if (requesterRole !== 'super_admin' && role === 'super_admin') {
                    return res.status(403).json({ success: false, message: "Only super admins can assign super_admin role" });
                }
                params.push(role); updates.push(`role = $${params.length}`);
            }
            if (isActive !== undefined) { params.push(isActive); updates.push(`is_active = $${params.length}`); }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields provided for update." });
        }

        const isSuperAdmin = requesterRole === 'super_admin';
        params.push(userId);
        let query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`;

        if (!isSuperAdmin) {
            params.push(tenantId);
            query += ` AND tenant_id = $${params.length}`;
        }

        query += ` RETURNING id, email, full_name as "fullName", role, is_active as "isActive", tenant_id`;

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });

        const updatedUser = result.rows[0];

        // SYNC: If Tenant Admin status changed, update Tenant status
        if (updatedUser.role === 'tenant_admin' && isActive !== undefined) {
            const newTenantStatus = isActive ? 'active' : 'suspended';
            await pool.query('UPDATE tenants SET status = $1 WHERE id = $2', [newTenantStatus, updatedUser.tenant_id]);
        }

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
             VALUES ($1, $2, 'UPDATE_USER', 'user', $3)`,
            [updatedUser.tenant_id || tenantId, requesterId, userId]
        );

        res.json({ success: true, message: "User updated successfully", data: updatedUser });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * API 11: Delete User
 * Requirements: Admin only, cannot delete self
 */
const deleteUser = async (req, res) => {
    const { userId } = req.params;
    const { tenantId, userId: requesterId, role: requesterRole } = req.user;

    try {
        if (requesterRole !== 'tenant_admin' && requesterRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
        }

        if (userId === requesterId) {
            return res.status(403).json({ success: false, message: "Security error: You cannot delete your own account." });
        }

        // Allow Super Admin to delete any user; Tenant Admin can only delete users in their tenant
        let query, params;
        if (req.user.role === 'super_admin') {
            query = 'DELETE FROM users WHERE id = $1 RETURNING id, tenant_id';
            params = [userId];
        } else {
            query = 'DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id';
            params = [userId, tenantId];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found or belongs to another tenant." });
        }

        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
             VALUES ($1, $2, 'DELETE_USER', 'user', $3)`,
            [result.rows[0].tenant_id || tenantId, requesterId, userId]
        );

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        // Fallback: If FK error persists, try manual cleanup
        if (error.code === '23503') {
            try {
                // Manually unlink dependencies to allow deletion
                await pool.query('BEGIN');
                await pool.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
                await pool.query('UPDATE projects SET created_by = NULL WHERE created_by = $1', [userId]);
                await pool.query('UPDATE audit_logs SET user_id = NULL WHERE user_id = $1', [userId]);

                // Retry Delete
                let query, params;
                if (req.user.role === 'super_admin') {
                    query = 'DELETE FROM users WHERE id = $1';
                    params = [userId];
                } else {
                    query = 'DELETE FROM users WHERE id = $1 AND tenant_id = $2';
                    params = [userId, tenantId];
                }
                await pool.query(query, params);
                await pool.query('COMMIT');

                return res.json({ success: true, message: "User account has been removed (dependencies unlinked)." });
            } catch (cleanupError) {
                await pool.query('ROLLBACK');
                return res.status(500).json({ success: false, message: "Force delete failed: " + cleanupError.message });
            }
        }
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { createUser, getUsers, updateUser, deleteUser };