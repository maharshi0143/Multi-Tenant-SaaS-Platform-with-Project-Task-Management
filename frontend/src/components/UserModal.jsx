import { useState, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function UserModal({ user, onClose, onSaved }) {
  const { user: me } = useContext(AuthContext);
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'user');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!email || !fullName) return alert('Email and full name are required');
    setLoading(true);
    try {
      if (user) {
        const payload = { fullName, isActive };
        if (role) payload.role = role;
        if (password) payload.password = password; // Enable password update
        await api.put(`/users/${user.id}`, payload);
      } else {
        if (!password) return alert('Password is required');
        await api.post('/users', { email, password, fullName, role });
      }
      onSaved();
      onClose();
    } catch (e) { alert('Failed to save user'); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{user ? 'Edit User' : 'Add User'}</h3>

        <div className="form-group">
          <label>Email Address</label>
          <input
            placeholder='name@company.com'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!user} // Email usually shouldn't change
          />
        </div>

        <div className="form-group">
          <label>Full Name</label>
          <input
            placeholder='John Doe'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password {user && <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#666' }}>(Leave blank to keep current)</span>}</label>
          <input
            placeholder={user ? 'New Password (Optional)' : 'Secure Password'}
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!user}
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value='user'>User</option>
            <option value='tenant_admin'>Tenant Admin</option>
          </select>
        </div>

        <div className="checkbox" style={{ marginTop: '1rem' }}>
          <input
            type="checkbox"
            id="userActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="userActive" style={{ margin: 0 }}>Active Account</label>
        </div>

        <div className='modal-actions'>
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button className='primary-btn' onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

