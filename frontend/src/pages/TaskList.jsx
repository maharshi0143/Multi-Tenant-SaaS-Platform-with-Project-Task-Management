import { useEffect, useState, useContext } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TaskList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return setLoading(false);
    const load = async (pageToLoad = page) => {
      setLoading(true);
      try {
        // Use tenant-wide endpoint to get tasks assigned to user
        const res = await api.get('/tasks', { params: { assignedTo: user.id, status: filter || undefined, page: pageToLoad, limit: 12 } });
        const data = res.data?.data || {};
        const rows = data.tasks || [];
        // map project name into projectName for compatibility
        const assigned = rows.map(r => ({ ...r, projectName: r.project_name || r.projectName }));
        setTasks(assigned);
        setPage(data.pagination?.page || pageToLoad);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    load(1);
  }, [user, filter]);

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>My Tasks</h2>
          <div className="controls-bar" style={{ display: 'flex', gap: 10 }}>
            <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>Status:</span>
            <select className="control-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All Tasks</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p>No tasks assigned to you.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {tasks.map(t => (
              <div key={t.id} className="task-card" onClick={() => navigate(`/projects/${t.project_id}`)} style={{ cursor: 'pointer' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className={`status ${t.status || 'todo'}`} style={{ fontSize: '0.7rem' }}>{t.status?.replace('_', ' ') || 'Todo'}</span>
                    {t.priority === 'high' && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>High Priority</span>}
                  </div>
                  <h4>{t.title}</h4>
                </div>

                <div className="task-meta">
                  <div className="task-meta-row">
                    <span className="task-meta-label">Project</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{t.projectName}</span>
                  </div>
                  <div className="task-meta-row">
                    <span className="task-meta-label">Due Date</span>
                    <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => { const p = page - 1; setPage(p); /* reload */ (async () => { setLoading(true); try { const res = await api.get('/tasks', { params: { assignedTo: user.id, status: filter || undefined, page: p, limit: 12 } }); const data = res.data?.data || {}; setTasks((data.tasks || []).map(r => ({ ...r, projectName: r.project_name || r.projectName }))); setPage(data.pagination?.page || p); setTotalPages(data.pagination?.totalPages || 1); } catch (e) { } finally { setLoading(false); } })() }}
          >
            ← Previous
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => { const p = page + 1; setPage(p); (async () => { setLoading(true); try { const res = await api.get('/tasks', { params: { assignedTo: user.id, status: filter || undefined, page: p, limit: 12 } }); const data = res.data?.data || {}; setTasks((data.tasks || []).map(r => ({ ...r, projectName: r.project_name || r.projectName }))); setPage(data.pagination?.page || p); setTotalPages(data.pagination?.totalPages || 1); } catch (e) { } finally { setLoading(false); } })() }}
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}

