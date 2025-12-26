import { useState } from "react";
import api from "../api/axios";
import "../pages/Projects.css";

export default function ProjectModal({ project, onClose, onSaved }) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [status, setStatus] = useState(project?.status || "active");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (project) {
        // Edit project
        await api.put(`/projects/${project.id}`, {
          name,
          description,
          status,
        });
      } else {
        // Create project
        await api.post("/projects", {
          name,
          description,
          status,
        });
      }

      // ✅ Only on SUCCESS
      onSaved();   // refresh projects list
      onClose();   // close modal
    } catch (err) {
      // ✅ Show backend error (project limit, etc.)
      const message =
        err.response?.data?.message ||
        "Unable to save project. Please try again.";

      alert(message);
    } finally {
      // ✅ Always stop loading
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form className="modal" onSubmit={handleSubmit}>
        <h3>{project ? "Edit Project" : "Create Project"}</h3>

        <input
          placeholder="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {project && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="completed">Completed</option>
          </select>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="primary-btn" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
