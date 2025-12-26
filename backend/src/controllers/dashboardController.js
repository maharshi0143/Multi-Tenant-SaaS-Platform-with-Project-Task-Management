const { pool } = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    // ✅ MUST match JWT payload exactly
    const tenantId = req.user.tenant_id;

    // DEBUG LOG (temporarily)
    console.log("Dashboard Stats for tenant:", tenantId);

    const result = await pool.query(
      `
      SELECT
        COUNT(p.id) AS "totalProjects",
        COUNT(t.id) AS "totalTasks",
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS "completedTasks",
        COUNT(CASE WHEN t.status != 'completed' THEN 1 END) AS "pendingTasks"
      FROM tenants te
      LEFT JOIN projects p ON p.tenant_id = te.id
      LEFT JOIN tasks t ON t.tenant_id = te.id
      WHERE te.id = $1
      `,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        totalProjects: Number(result.rows[0].totalProjects),
        totalTasks: Number(result.rows[0].totalTasks),
        completedTasks: Number(result.rows[0].completedTasks),
        pendingTasks: Number(result.rows[0].pendingTasks),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
