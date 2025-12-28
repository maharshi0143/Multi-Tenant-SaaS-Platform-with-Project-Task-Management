import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // ==========================
  // LOAD DASHBOARD DATA
  // ==========================
  const loadDashboard = async () => {
    try {
      // 1️⃣ Stats
      const statsRes = await api.get("/dashboard/stats");
      setStats(statsRes.data?.data ?? null);

      const projectsRes = await api.get("/projects");

      const projects = Array.isArray(projectsRes.data?.data)
        ? projectsRes.data.data
        : Array.isArray(projectsRes.data?.data?.projects)
          ? projectsRes.data.data.projects
          : [];

      // Sort newest → oldest
      const sortedProjects = [...projects].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setRecentProjects(sortedProjects.slice(0, 5));



      // 3️⃣ Tasks (Efficient Single Call)
      try {
        const taskParams = {
          limit: 5,
          status: taskFilter || undefined
        };

        if (user.role !== 'super_admin') {
          taskParams.assignedTo = user.id;
        }

        const tasksRes = await api.get('/tasks', {
          params: taskParams
        });

        const tasks = tasksRes.data?.data?.tasks || [];

        // Map project_name to projectName to match component expectation
        const formattedTasks = tasks.map(t => ({
          ...t,
          projectName: t.project_name || t.projectName
        }));

        setMyTasks(formattedTasks);
      } catch (error) {
        console.error("Failed to load tasks", error);
        setMyTasks([]);
      }
    } catch (error) {
      console.error("Dashboard load failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, []);


  if (loading) {
    return (
      <>
        <Navbar />
        <p style={{ padding: "20px" }}>Loading dashboard...</p>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="dashboard-page">
        <h2>Dashboard</h2>

        {/* ======================
            STATISTICS CARDS
        ====================== */}
        <div className="stats-grid">
          {user.role === 'super_admin' ? (
            <>
              <div className="card clickable" onClick={() => navigate("/tenants")}>
                <h3>Total Organizations</h3>
                <p>{stats?.totalTenants ?? 0}</p>
              </div>
              <div className="card">
                <h3>Total Users</h3>
                <p>{stats?.totalUsers ?? 0}</p>
              </div>
              <div className="card">
                <h3>Total Projects</h3>
                <p>{stats?.totalProjects ?? 0}</p>
              </div>
              <div className="card">
                <h3>Total Tasks</h3>
                <p>{stats?.totalTasks ?? 0}</p>
              </div>
            </>
          ) : (
            <>
              <div className="card clickable" onClick={() => navigate("/projects")}>
                <h3>Total Projects</h3>
                <p>{stats?.totalProjects ?? 0}</p>
              </div>

              <div className="card clickable" onClick={() => navigate("/tasks")}>
                <h3>Total Tasks</h3>
                <p>{stats?.totalTasks ?? 0}</p>
              </div>

              <div className="card card-success clickable">
                <h3>Completed Tasks</h3>
                <p>{stats?.completedTasks ?? 0}</p>
              </div>

              <div className="card card-warning clickable">
                <h3>Pending Tasks</h3>
                <p>{stats?.pendingTasks ?? 0}</p>
              </div>
            </>
          )}
        </div>

        {/* ======================
            RECENT PROJECTS
        ====================== */}
        <section className="dashboard-section">
          <h3>Recent Projects</h3>

          {recentProjects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            <div className="recent-projects">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="recent-project-card"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <h4>{project.name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span className={`status ${project.status}`}>{project.status}</span>
                    <small style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tasks: {project.task_count ?? 0}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ======================
            MY TASKS
        ====================== */}
        <section className="dashboard-section">
          <h3>{user.role === 'super_admin' ? 'Recent System Tasks' : 'My Tasks'}</h3>

          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {myTasks.length === 0 ? (
            <p>{user.role === 'super_admin' ? 'No system tasks found.' : 'No tasks assigned to you.'}</p>
          ) : (
            <div className="task-list">
              {myTasks
                .filter(
                  (task) => !taskFilter || task.status === taskFilter
                )
                .map((task) => (
                  <div key={task.id} className="task-card">
                    <h4>{task.title}</h4>
                    {task.tenant_name && <p style={{ fontSize: '0.85rem', color: '#666' }}>Tenant: {task.tenant_name}</p>}
                    <p>Project: {task.projectName}</p>
                    <p>Priority: {task.priority}</p>
                    <p>
                      Due Date:{" "}
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "Not set"}
                    </p>
                    <span className={`status ${task.status}`}>
                      {task.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
