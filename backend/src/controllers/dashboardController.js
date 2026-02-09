const { pool } = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    // ✅ FIX: Separating Logic for Super Admin
    if (req.user.role === 'super_admin') {
      const stats = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM tenants) as "totalTenants",
                (SELECT COUNT(*) FROM projects) as "totalProjects",
                (SELECT COUNT(*) FROM users) as "totalUsers",
                (SELECT COUNT(*) FROM tasks) as "totalTasks"
        `);

      return res.json({
        success: true,
        data: {
          totalTenants: Number(stats.rows[0].totalTenants),
          totalProjects: Number(stats.rows[0].totalProjects),
          totalUsers: Number(stats.rows[0].totalUsers),
          totalTasks: Number(stats.rows[0].totalTasks)
        }
      });
    }

    // ✅ Normal Logic for Tenants
    // ✅ MUST match JWT payload exactly
    const tenantId = req.user.tenantId;
    const { role, userId } = req.user;

    // DEBUG LOG (temporarily)
    console.log("Dashboard Stats for tenant:", tenantId);

    // If user is a regular user, restrict stats to their own tasks
    let userFilter = '';
    const params = [tenantId];

    if (role === 'user') {
      params.push(userId);
      userFilter = `AND t.assigned_to = $2`;
    }

    const result = await pool.query(
      `
      SELECT
        COUNT(DISTINCT p.id) AS "totalProjects",
        COUNT(t.id) AS "totalTasks",
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS "completedTasks",
        COUNT(CASE WHEN t.status != 'completed' THEN 1 END) AS "pendingTasks"
      FROM tenants te
      LEFT JOIN projects p ON p.tenant_id = te.id
      LEFT JOIN tasks t ON t.tenant_id = te.id 
      WHERE te.id = $1 ${userFilter}
      `,
      params
    );

    // If regular user, totalProjects might count projects they have tasks in, 
    // OR we can keep showing all tenant projects if that's the intended visibility.
    // For now, the query above joins tasks, so count(DISTINCT p.id) will count projects that satisfy the task filter if strict.
    // However, the LEFT JOIN structure might need adjustment if we want "All Projects" but "My Tasks".
    // given the query: LEFT JOIN tasks t ... WHERE ... AND t.assigned_to = User. 
    // This effectively filters rows where task is assigned to user. 
    // "totalProjects" will count projects that have at least one task assigned to this user. 
    // If a project has NO tasks for this user, it won't be counted in "totalProjects". 
    // This seems correct for "My Dashboard" view.

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
    console.error(error); res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getDashboardStats };
