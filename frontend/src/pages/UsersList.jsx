import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import UserModal from "../components/UserModal";
import "./Users.css";

export default function UsersList() {
  const { user } = useContext(AuthContext);
  // restrict access
  if (!user) return (
    <>
      <Navbar />
      <p style={{ padding: 24 }}>Please login to manage users.</p>
    </>
  );

  if (user.role !== 'tenant_admin') return (
    <>
      <Navbar />
      <p style={{ padding: 24 }}>Access denied. Admins only.</p>
    </>
  );
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const tenantId = user?.tenantId;
      const res = tenantId
        ? await api.get(`/tenants/${tenantId}/users`, { params: { search: search || undefined, role: roleFilter || undefined } })
        : await api.get("/users", { params: { search: search || undefined, role: roleFilter || undefined } });
      const data = res.data?.data?.users || [];
      setUsers(data);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUsers();
  }, [user]);

  return (
    <>
      <Navbar />
      <div className="dashboard-container users-page">
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>Team Management</h1>
            <p style={{ color: 'var(--text-light)', marginTop: '5px' }}>Manage user access and roles.</p>
          </div>
          <button className='primary-btn' onClick={() => { setSelectedUser(null); setShowModal(true); }}>+ Add User</button>
        </header>

        <div className="users-card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f3f4f6' }}>
            <div className="controls-bar" style={{ marginBottom: 0 }}>
              <input
                className="control-input"
                placeholder='Search name or email...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '300px' }}
              />
              <select
                className="control-input"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value=''>All Roles</option>
                <option value='user'>User</option>
                <option value='tenant_admin'>Admin</option>
              </select>
              <button className="secondary-btn" onClick={fetchUsers}>Search</button>
            </div>
          </div>

          {loading ? (
            <p className="loading-text">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="empty-text">No users found.</p>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{u.email}</div>
                    </td>
                    <td><span className={`role-badge ${u.role}`}>{u.role.replace('_', ' ')}</span></td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: u.isActive ? 'var(--success-color)' : 'var(--text-light)',
                        marginRight: '6px'
                      }}></span>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="secondary-btn table-action-btn" onClick={() => { setSelectedUser(u); setShowModal(true); }}>Edit</button>
                        <button className="danger-btn table-action-btn" onClick={async () => {
                          if (!confirm('Delete user?')) return;
                          try {
                            await api.delete(`/users/${u.id}`);
                            fetchUsers();
                          } catch (e) {
                            alert(e.response?.data?.message || 'Failed to delete user');
                          }
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && <UserModal user={selectedUser} onClose={() => { setShowModal(false); setSelectedUser(null); fetchUsers(); }} onSaved={fetchUsers} />}
      </div>
    </>
  );
}
