import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${id}`).then(r => setProject(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!project) return <div className="alert alert-error">Project not found</div>;

  const navCards = [
    { to: `/projects/${id}/testcases`, icon: '📋', label: 'Test Cases', color: '#6366f1' },
    { to: `/projects/${id}/suites`, icon: '📦', label: 'Test Suites', color: '#10b981' },
    { to: `/projects/${id}/executions`, icon: '▶️', label: 'Executions', color: '#f59e0b' },
    { to: `/projects/${id}/analytics`, icon: '📊', label: 'Analytics', color: '#ef4444' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to="/projects">Projects</Link> / {project.name}
          </div>
          <h1>{project.name}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{project.description}</p>
        </div>
        <span className={`badge badge-${project.status === 'active' ? 'success' : 'info'}`} style={{ padding: '6px 14px', fontSize: 13 }}>{project.status}</span>
      </div>

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

      {/* Team members */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Team Members ({project.members?.length || 0})</h3>
        {project.members?.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No members assigned</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {project.members?.map(m => (
              <div key={m.id} style={{ padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                <strong>{m.username}</strong>
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)' }}>{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
