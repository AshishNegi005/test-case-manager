import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (userId, role) => {
    setUpdating(userId);
    try {
      await api.patch(`/auth/users/${userId}/role`, { role });
      setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u));
    } finally {
      setUpdating(null);
    }
  };

  const roleBadge = {
    'admin': { bg: '#fee2e2', color: '#dc2626' },
    'test-lead': { bg: '#fef3c7', color: '#d97706' },
    'tester': { bg: '#dbeafe', color: '#1d4ed8' },
    'read-only': { bg: '#f1f5f9', color: '#475569' },
  };

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : (
          <table className="table">
            <thead><tr>
              <th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Change Role</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span style={{ ...roleBadge[u.role], padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <select className="select" style={{ width: 130 }} value={u.role} onChange={e => updateRole(u.id, e.target.value)} disabled={updating === u.id}>
                      <option value="admin">Admin</option>
                      <option value="test-lead">Test Lead</option>
                      <option value="tester">Tester</option>
                      <option value="read-only">Read Only</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Users;
