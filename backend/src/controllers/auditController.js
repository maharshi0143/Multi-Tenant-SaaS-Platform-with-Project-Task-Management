const { pool } = require('../config/db');

const getAuditLogs = async (req, res) => {
    try {
        const logs = await pool.query(
            `SELECT a.*, u.full_name as "userName" 
             FROM audit_logs a 
             LEFT JOIN users u ON a.user_id = u.id 
             WHERE a.tenant_id = $1 
             ORDER BY a.created_at DESC LIMIT 50`,
            [req.user.tenantId]
        );
        res.json({ success: true, data: logs.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAuditLogs };