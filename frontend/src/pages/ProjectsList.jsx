import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import "./Projects.css";
import ProjectModal from "../components/ProjectModal";
import { useNavigate } from "react-router-dom";

export default function ProjectsList() {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjects = async (pageToLoad = page) => {
    setLoading(true); // ✅ START loading
    try {
      const res = await api.get("/projects", { params: { status: statusFilter || undefined, search: search || undefined, page: pageToLoad, limit: 12 } });
      const result = res.data.data;

      setProjects(Array.isArray(result.projects) ? result.projects : []);
      setPage(result.pagination?.page || pageToLoad);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      setProjects([]);
    } finally {
      setLoading(false); // ✅ STOP loading (CRITICAL FIX)
    }
  };

  useEffect(() => {
    fetchProjects(1);
  }, []);

  return (
    <>
      <Navbar />

      <div className="projects-page">
        <div className="projects-header">
          <h2>Projects</h2>

          <div className="controls-bar">
            <input
              className="control-input search-input"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: '240px' }}
            />
            <select
              className="control-input status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="completed">Completed</option>
            </select>
            <button className="secondary-btn" onClick={() => fetchProjects(1)}>
              Search
            </button>

            {user?.role === "tenant_admin" && (
              <button
                className="primary-btn"
                onClick={() => setShowModal(true)}
              >
                + Create Project
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p>No projects yet. Create your first project.</p>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <h3>{project.name}</h3>
                <p>{(project.description || "").length > 140 ? project.description.slice(0, 140) + '...' : (project.description || 'No description')}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0 }}>Tasks: {project.task_count ?? 0}</p>
                    {project.createdBy && <p style={{ margin: 0, fontSize: 12, color: '#666' }}>By: {project.createdBy.fullName || project.createdBy.email}</p>}
                    <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className={`status ${project.status}`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                {user?.role === "tenant_admin" && (
                  <div className="card-actions">
                    <button onClick={() => navigate(`/projects/${project.id}`)}>View</button>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="danger"
                      onClick={async () => {
                        if (confirm("Delete this project?")) {
                          await api.delete(`/projects/${project.id}`);
                          fetchProjects();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pagination-container">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => fetchProjects(page - 1)}
          >
            ← Previous
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => fetchProjects(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {showModal && (
        <ProjectModal
          project={selectedProject}
          onClose={() => {
            setShowModal(false);
            setSelectedProject(null);
          }}
          onSaved={fetchProjects} // ✅ refresh list after save
        />
      )}
    </>
  );
}
