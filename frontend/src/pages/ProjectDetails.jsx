import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const ProjectDetails = () => {
    const { id: projectId } = useParams();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [users, setUsers] = useState([]);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' });
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [assignedFilter, setAssignedFilter] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // API 14: Get single project details
                const res = await api.get(`/projects/${projectId}`);
                const projectData = res.data.data;
                setProject(projectData);
                setTasks(projectData.tasks || []);
                // fetch tenant users for assignment dropdown
                try {
                    const tenantId = projectData.tenantId;
                    const u = tenantId ? await api.get(`/tenants/${tenantId}/users`) : await api.get('/users');
                    // FIX: users endpoint returns { users: [], count: ... }
                    setUsers(u.data?.data?.users || []);
                } catch (e) {
                    setUsers([]);
                }
            } catch (err) {
                console.error("Error loading project details", err?.response?.status, err?.response?.data || err.message || err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [projectId]);

    const fetchTasks = async () => {
        try {
            const params = { page: 1, limit: 200 };
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (assignedFilter) params.assignedTo = assignedFilter;
            const res = await api.get(`/projects/${projectId}/tasks`, { params });
            const data = res.data?.data || {};
            setTasks(data.tasks || []);
        } catch (e) {
            console.error('Failed to fetch tasks', e?.response?.status, e?.response?.data || e.message || e);
        }
    };

    useEffect(() => {
        if (projectId) fetchTasks();
    }, [projectId, statusFilter, priorityFilter, assignedFilter]);

    if (loading) return (<><Navbar /><div className="dashboard-container">Loading details...</div></>);

    if (!project) {
        return (
            <>
            <Navbar />
            <div className="dashboard-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2>Project Not Found</h2>
                <p>The project you are looking for does not exist or has been deleted.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                    <button className="secondary-btn" onClick={() => window.location.href = '/dashboard'}>Back to Dashboard</button>
                    <button className="primary-btn" onClick={() => window.location.href = '/projects'}>View All Projects</button>
                </div>
            </div>
            </>
        );
    }

    return (
        <>
        <Navbar />
        <div className="dashboard-container">
            <header style={{ marginBottom: '30px' }}>
                <span className={`status-badge status-${project?.status || 'active'}`}>{project?.status}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {!editingName ? (
                        <h1 style={{ marginTop: '10px', cursor: 'pointer' }} onDoubleClick={() => { setEditingName(true); setNameDraft(project?.name || '') }}>{project?.name}</h1>
                    ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                            <button className="primary-btn" onClick={async () => {
                                try {
                                    await api.put(`/projects/${projectId}`, { name: nameDraft });
                                    const res = await api.get(`/projects/${projectId}`);
                                    setProject(res.data.data);
                                    setEditingName(false);
                                } catch (e) { alert('Failed to update project name'); }
                            }}>Save</button>
                            <button onClick={() => { setEditingName(false); setNameDraft(''); }}>Cancel</button>
                        </div>
                    )}
                </div>
                <p style={{ color: 'var(--text-light)' }}>{project?.description}</p>
            </header>

            <section className="auth-card" style={{ maxWidth: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Project Tasks</h3>
                    <div>
                        <button className="primary-btn" onClick={() => setShowAddTask(true)}>+ Add Task</button>
                    </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                    <div className="controls-bar">
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Filter:</span>
                        <select
                            className="control-input"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All status</option>
                            <option value="todo">Todo</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select
                            className="control-input"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="">All priority</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select
                            className="control-input"
                            value={assignedFilter}
                            onChange={(e) => setAssignedFilter(e.target.value)}
                        >
                            <option value="">All assignees</option>
                            {users.map(u => (<option key={u.id} value={u.id}>{u.fullName || u.email}</option>))}
                        </select>
                    </div>

                    {tasks.length === 0 ? (
                        <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No tasks created yet.</p>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="project-item" style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 18, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                        {task.assignedTo?.fullName ? task.assignedTo.fullName.split(' ').map(s => s[0]).slice(0, 2).join('') : (task.assignedTo?.email ? task.assignedTo.email[0].toUpperCase() : '—')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <strong>{task.title}</strong>
                                        <p style={{ fontSize: '0.85rem' }}>Priority: {task.priority} • Assigned: {task.assignedTo?.fullName || task.assignedTo?.email || '—'}</p>
                                    </div>
                                    <div style={{ width: 180, textAlign: 'right' }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <label>Status:</label>
                                    <select defaultValue={task.status} onChange={(e) => task._newStatus = e.target.value}>
                                        <option value="todo">Todo</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                    <button onClick={async () => {
                                        const newStatus = task._newStatus || task.status;
                                        try {
                                            await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
                                            // refresh tasks
                                            await fetchTasks();
                                        } catch (e) {
                                            console.error('Failed to update task status', e?.response?.status, e?.response?.data || e.message || e);
                                            alert('Failed to update status');
                                        }
                                    }}>Update</button>

                                    <button onClick={() => { setEditTask(task); setShowEdit(true); }}>Edit</button>
                                    <button onClick={async () => {
                                        if (!confirm('Delete this task?')) return;
                                        try {
                                            await api.delete(`/tasks/${task.id}`);
                                            await fetchTasks();
                                        } catch (e) {
                                            console.error('Failed to delete task', e?.response?.status, e?.response?.data || e.message || e);
                                            alert('Failed to delete task');
                                        }
                                    }}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
            {showEdit && editTask && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Edit Task</h2>

                        <div className="form-group">
                            <label>Title</label>
                            <input
                                value={editTask.title || ''}
                                onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                rows={4}
                                value={editTask.description || ''}
                                onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={editTask.priority || 'medium'}
                                onChange={(e) => setEditTask({ ...editTask, priority: e.target.value })}
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Assign To</label>
                            <select
                                value={editTask.assignedTo?.id || ''}
                                onChange={(e) => setEditTask({ ...editTask, assignedTo: { id: e.target.value } })}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={editTask.status || 'todo'}
                                onChange={(e) => setEditTask({ ...editTask, status: e.target.value })}
                            >
                                <option value="todo">Todo</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Due Date</label>
                            <input
                                type="date"
                                value={editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={() => { setShowEdit(false); setEditTask(null); }}>Cancel</button>
                            <button type="submit" className="primary-btn" onClick={async () => {
                                try {
                                    const payload = {
                                        title: editTask.title,
                                        description: editTask.description,
                                        priority: editTask.priority,
                                        status: editTask.status,
                                        assignedTo: editTask.assignedTo?.id || null,
                                        dueDate: editTask.dueDate || null
                                    };
                                    await api.put(`/tasks/${editTask.id}`, payload);
                                    const res = await api.get(`/projects/${projectId}`);
                                    setTasks(res.data.data.tasks || []);
                                    setShowEdit(false);
                                    setEditTask(null);
                                } catch (e) {
                                    console.error('Failed to save edited task', e?.response?.status, e?.response?.data || e.message || e);
                                    alert('Failed to save task');
                                }
                            }}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
            {showAddTask && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Add New Task</h2>

                        <div className="form-group">
                            <label>Title</label>
                            <input
                                placeholder="Task title"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                placeholder="Task details..."
                                rows={4}
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Assign To</label>
                            <select
                                value={newTask.assignedTo}
                                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (<option key={u.id} value={u.id}>{u.fullName || u.email}</option>))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Due Date</label>
                            <input
                                type="date"
                                value={newTask.dueDate}
                                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setShowAddTask(false)}>Cancel</button>
                            <button type="submit" className="primary-btn" onClick={async () => {
                                if (!newTask.title) return alert('Title is required');
                                try {
                                    await api.post(`/projects/${projectId}/tasks`, {
                                        title: newTask.title,
                                        description: newTask.description,
                                        priority: newTask.priority,
                                        assignedTo: newTask.assignedTo,
                                        dueDate: newTask.dueDate || null
                                    });
                                    await fetchTasks();
                                    setShowAddTask(false);
                                    setNewTask({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' });
                                } catch (e) {
                                    console.error('Failed to create task', e?.response?.status, e?.response?.data || e.message || e);
                                    alert('Failed to create task');
                                }
                            }}>Create Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default ProjectDetails;