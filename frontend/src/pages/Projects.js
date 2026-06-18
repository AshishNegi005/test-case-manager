import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

const ProjectModal = ({ project, onClose, onSave }) => {
  const [form, setForm] = useState(project || { name: '', description: '', version: '', status: 'active' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) await api.put(`/projects/${project.id}`, form);
      else await api.post('/projects', form);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Project Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Version</label>
                <input className="form-control" value={form.version || ''} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v1.0.0" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const { projects, setProjects, fetchProjects, selectProject } = useProject();
  const { canWrite } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { await fetchProjects(); } finally { setLoading(false); }
  }, [fetchProjects]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this project? All test cases and data will be lost.')) return;
    await api.delete(`/projects/${id}`);
    setProjects(ps => ps.filter(p => p.id !== id));
  }, [setProjects]);

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        {canWrite() && (
          <button className="btn btn-primary" onClick={() => { setEditProject(null); setShowModal(true); }}>
            + New Project
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <h3>No projects yet</h3>
          <p>Create your first test project to get started</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {projects.map(p => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`badge badge-${p.status === 'active' ? 'success' : 'info'}`}>{p.status}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.version}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{p.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, minHeight: 36 }}>{p.description}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                <span>📋 {p.test_case_count || 0} tests</span>
                <span>👥 {p.member_count || 0} members</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/projects/${p.id}`} className="btn btn-primary btn-sm" onClick={() => selectProject(p)} style={{ flex: 1, justifyContent: 'center' }}>Open</Link>
                {canWrite() && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditProject(p); setShowModal(true); }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Del</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProjectModal project={editProject} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
};

export default Projects;
