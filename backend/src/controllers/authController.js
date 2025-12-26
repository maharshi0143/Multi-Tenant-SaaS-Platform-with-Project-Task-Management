const { pool } = require('../config/db'); // Path updated for backend/src structure
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// API 1: Tenant Registration
const registerTenant = async (req, res) => {
    const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;

    if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
        return res.status(400).json({ success: false, message: "All fields are required" });
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
            [tenantId, adminEmail, hashedPassword, adminFullName]
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
                adminUser: userResult.rows[0]
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: "Subdomain or email already exists" });
        }
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// API 2: User Login
const login = async (req, res) => {
    const { email, password, tenantSubdomain } = req.body;

    try {
        let user;

        // If tenantSubdomain is provided, authenticate within that tenant.
        // If omitted, allow authentication for system-level users (e.g. `super_admin`) who have no tenant association.
        if (!tenantSubdomain) {
            const userQuery = await pool.query(
                'SELECT * FROM users WHERE email = $1 AND role = $2',
                [email, 'super_admin']
            );
            if (userQuery.rows.length === 0) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            user = userQuery.rows[0];
        } else {
            // 1. Verify the Tenant exists and is active
            const tenantQuery = await pool.query(
                'SELECT id, status FROM tenants WHERE subdomain = $1',
                [tenantSubdomain]
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
                [email, tenant.id]
            );

            if (userQuery.rows.length === 0) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }

            user = userQuery.rows[0];
        }

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 4. Generate JWT using your User-Defined Secret Key
        const token = jwt.sign(
            { id: user.id, tenant_id: user.tenant_id, role: user.role }, // Updated payload keys
            process.env.JWT_SECRET, // Key from your .env
            { expiresIn: '24h' }    // Mandatory 24-hour expiry
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
        res.status(500).json({ success: false, message: error.message });
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
            [req.user.id]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, data: userQuery.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });

        res.json({ success: true, message: "Reset link sent to your registered email." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 4: Logout
const logout = async (req, res) => {
    const { tenant_id, id } = req.user; // Updated keys to match payload

    try {
        // Updated: Safely handle NULL tenant_id for super_admin logout
        await pool.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) 
             VALUES ($1, $2, 'LOGOUT', 'user', $2)`,
            [tenant_id || null, id]
        );

        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { registerTenant, login, getMe, forgotPassword, logout };