const { pool } = require('../config/db'); // Path updated for backend/src structure
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// API 1: Tenant Registration
const registerTenant = async (req, res) => {
    const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;

    if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (adminPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain.toLowerCase())) {
        return res.status(400).json({ success: false, message: "Invalid subdomain format" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Mandatory transaction safety

        // 1. Create Tenant with default 'free' plan limits
        const tenantResult = await client.query(
            `INSERT INTO tenants (name, subdomain, status, subscription_plan, max_users, max_projects) 
            VALUES ($1, $2, 'active', 'free', 5, 3) 
            RETURNING id, name, subdomain, status`,
            [tenantName, subdomain.toLowerCase()]
        );

        const tenantId = tenantResult.rows[0].id;

        // 2. Hash Password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // 3. Create Tenant Admin User
        const userResult = await client.query(
            `INSERT INTO users (tenant_id, email, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4, 'tenant_admin') 
             RETURNING id, email, full_name, role`,
            [tenantId, adminEmail.toLowerCase().trim(), hashedPassword, adminFullName]
        );

        // 4. Create Audit Log
        await client.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'REGISTER_TENANT', 'tenant', $3)`,
            [tenantId, userResult.rows[0].id, tenantId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Tenant registered successfully",
            data: {
                tenantId: tenantResult.rows[0].id,
                subdomain: tenantResult.rows[0].subdomain,
                adminUser: {
                    id: userResult.rows[0].id,
                    email: userResult.rows[0].email,
                    fullName: userResult.rows[0].full_name,
                    role: userResult.rows[0].role
                }
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: "Subdomain or email already exists" });
        }
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        client.release();
    }
};

// API 2: User Login
const login = async (req, res) => {
    const { email, password, tenantSubdomain, tenantId } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : email;

    try {
        let user;

        // If tenantSubdomain is provided, authenticate within that tenant.
        // If omitted, allow authentication for system-level users (e.g. `super_admin`) who have no tenant association.
        if (!tenantSubdomain && !tenantId) {
            const userQuery = await pool.query(
                'SELECT * FROM users WHERE email = $1 AND role = $2',
                [normalizedEmail, 'super_admin']
            );
            if (userQuery.rows.length === 0) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            user = userQuery.rows[0];
        } else {
            // 1. Verify the Tenant exists and is active
            const tenantQuery = await pool.query(
                tenantSubdomain
                    ? 'SELECT id, status FROM tenants WHERE subdomain = $1'
                    : 'SELECT id, status FROM tenants WHERE id = $1',
                [tenantSubdomain || tenantId]
            );

            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Tenant not found" });
            }

            const tenant = tenantQuery.rows[0];
            if (tenant.status !== 'active' && tenant.status !== 'trial') {
                return res.status(403).json({ success: false, message: "Tenant account is suspended" });
            }

            // 2. Find User within this specific Tenant
            const userQuery = await pool.query(
                'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
                [normalizedEmail, tenant.id]
            );

            if (userQuery.rows.length === 0) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }

            user = userQuery.rows[0];
        }

        // 3. Verify Account Status
        if (user.is_active === false) {
            return res.status(403).json({ success: false, message: "Account is inactive" });
        }

        // 4. Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (user.is_active === false) {
            return res.status(403).json({ success: false, message: "Account is inactive" });
        }

        // 5. Generate JWT using your User-Defined Secret Key
        const token = jwt.sign(
            { userId: user.id, tenantId: user.tenant_id || null, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Mandatory: Log the login action in audit_logs
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'LOGIN', 'user', $2)`,
            [user.tenant_id || null, user.id]
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    tenantId: user.tenant_id
                },
                token,
                expiresIn: 86400
            }
        });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// API 3: Get Current User
const getMe = async (req, res) => {
    try {
        // Updated: Using LEFT JOIN to ensure super_admin (with NULL tenant_id) is still found
        const userQuery = await pool.query(
            `SELECT u.id, u.email, u.full_name as "fullName", u.role, u.is_active as "isActive",
             t.id as "tenantId", t.name as "tenantName", t.subdomain, t.subscription_plan as "subscriptionPlan",
             t.max_users as "maxUsers", t.max_projects as "maxProjects"
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = $1`,
            [req.user.userId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const row = userQuery.rows[0];
        res.json({
            success: true,
            data: {
                id: row.id,
                email: row.email,
                fullName: row.fullName,
                role: row.role,
                isActive: row.isActive,
                tenant: row.tenantId
                    ? {
                        id: row.tenantId,
                        name: row.tenantName,
                        subdomain: row.subdomain,
                        subscriptionPlan: row.subscriptionPlan,
                        maxUsers: row.maxUsers,
                        maxProjects: row.maxProjects
                    }
                    : null
            }
        });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });

        res.json({ success: true, message: "Reset link sent to your registered email." });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// API 4: Logout
const logout = async (req, res) => {
    const { tenantId, userId } = req.user;

    try {
        // Updated: Safely handle NULL tenant_id for super_admin logout
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'LOGOUT', 'user', $2)`,
            [tenantId || null, userId]
        );

        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { registerTenant, login, getMe, forgotPassword, logout };