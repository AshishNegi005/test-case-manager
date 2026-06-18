import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ROLE_COLORS = {
  'admin':     { bg: '#fee2e2', color: '#dc2626' },
  'test-lead': { bg: '#fef3c7', color: '#d97706' },
  'tester':    { bg: '#dbeafe', color: '#1d4ed8' },
  'read-only': { bg: '#f1f5f9', color: '#475569' },
};

const ProjectDetail = () => {
  const { id } = useParams();
  const { canWrite, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add-member state
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('tester');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/projects/${id}`)
      .then(r => setProject(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Fetch all users so admin/lead can pick from a dropdown
  useEffect(() => {
    if (canWrite()) {
      api.get('/auth/users').then(r => setAllUsers(r.data)).catch(() => {});
    }
  }, [canWrite]);

  const handleAddMember = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setAdding(true);
    setAddError('');
    try {
      await api.post(`/projects/${id}/members`, { userId: selectedUser, role: selectedRole });
      setSelectedUser('');
      setSelectedRole('tester');
      load(); // refresh project + members
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }, [id, selectedUser, selectedRole, load]);

  const handleRemoveMember = useCallback(async (userId, username) => {
    if (!window.confirm(`Remove ${username} from this project?`)) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      load();
    } catch (err) {
      alert('Failed to remove member');
    }
  }, [id, load]);

  if (loading) return <LoadingSpinner />;
  if (!project) return <div className="alert alert-error">Project not found</div>;

  // Users not already in this project
  const memberIds = new Set(project.members?.map(m => m.id) || []);
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  const navCards = [
    { to: `/projects/${id}/testcases`, icon: '📋', label: 'Test Cases',   color: '#6366f1' },
    { to: `/projects/${id}/suites`,    icon: '📦', label: 'Test Suites',  color: '#10b981' },
    { to: `/projects/${id}/executions`,icon: '▶️', label: 'Executions',   color: '#f59e0b' },
    { to: `/projects/${id}/analytics`, icon: '📊', label: 'Analytics',    color: '#ef4444' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to="/projects">Projects</Link> / {project.name}
          </div>
          <h1>{project.name}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{project.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {project.version && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{project.version}</span>}
          <span className={`badge badge-${project.status === 'active' ? 'success' : 'info'}`}
            style={{ padding: '6px 14px', fontSize: 13 }}>{project.status}</span>
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {navCards.map(c => (
          <Link key={c.to} to={c.to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer', borderTop: `3px solid ${c.color}`, transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: c.color }}>{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Team Members */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>
            Team Members <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>({project.members?.length || 0})</span>
          </h3>
        </div>

        {/* Member list */}
        {project.members?.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>No members yet. Add members below.</p>
        ) : (
          <table className="table" style={{ marginBottom: 20 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role in Project</th>
                {canWrite() && <th style={{ width: 80 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {project.members?.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.username}</strong></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.email}</td>
                  <td>
                    <span style={{
                      ...ROLE_COLORS[m.role] || ROLE_COLORS['tester'],
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    }}>
                      {m.role}
                    </span>
                  </td>
                  {canWrite() && (
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveMember(m.id, m.username)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add member form — only admin/test-lead */}
        {canWrite() && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add Member to Project</h4>

            {addError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{addError}</div>}

            {availableUsers.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All registered users are already in this project.</p>
            ) : (
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* User dropdown */}
                <div style={{ flex: 2, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Select User
                  </label>
                  <select
                    className="select"
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    required
                  >
                    <option value="">-- Choose a user --</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email}) — {u.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role dropdown */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Assign Role
                  </label>
                  <select
                    className="select"
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="test-lead">Test Lead</option>
                    <option value="tester">Tester</option>
                    <option value="read-only">Read Only</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" disabled={adding || !selectedUser}>
                  {adding ? 'Adding...' : '+ Add Member'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
