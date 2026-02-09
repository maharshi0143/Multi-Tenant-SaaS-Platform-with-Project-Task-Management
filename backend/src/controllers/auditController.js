const { pool } = require('../config/db');

const getAuditLogs = async (req, res) => {
    try {
        const isSuperAdmin = req.user.role === 'super_admin';
        const logs = await pool.query(
            `SELECT a.*, u.full_name as "userName" 
             FROM audit_logs a 
             LEFT JOIN users u ON a.user_id = u.id 
             ${isSuperAdmin ? '' : 'WHERE a.tenant_id = $1'}
             ORDER BY a.created_at DESC LIMIT 50`,
            isSuperAdmin ? [] : [req.user.tenantId]
        );
        res.json({ success: true, data: logs.rows });
    } catch (error) {
        console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { getAuditLogs };