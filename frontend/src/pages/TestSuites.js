import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';

const SuiteModal = ({ suite, projectId, onClose, onSave }) => {
  const [form, setForm] = useState(suite || { name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (suite) await api.put(`/projects/${projectId}/suites/${suite.id}`, form);
      else await api.post(`/projects/${projectId}/suites`, form);
      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{suite ? 'Edit Suite' : 'New Test Suite'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group"><label>Description</label>
              <textarea className="form-control" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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

const SuiteDetail = ({ suite, projectId, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const { canExecute } = useAuth();
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    api.get(`/projects/${projectId}/suites/${suite.id}`).then(r => setDetail(r.data)).finally(() => setLoading(false));
  }, [suite.id, projectId]);

  const executeAll = async () => {
    if (!window.confirm('Execute all test cases in this suite?')) return;
    setExecuting(true);
    const results = detail.test_cases.map(tc => ({ testCaseId: tc.id, status: 'pass', comments: 'Batch execution' }));
    try {
      await api.post(`/projects/${projectId}/executions/suite`, { suiteId: suite.id, results });
      alert('Suite executed successfully!');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{suite.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body">
          {loading ? <LoadingSpinner /> : (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{suite.description}</p>
              {canExecute() && detail?.test_cases?.length > 0 && (
                <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={executeAll} disabled={executing}>
                  {executing ? 'Executing...' : '▶ Execute All'}
                </button>
              )}
              {detail?.test_cases?.length === 0 ? (
                <div className="empty-state"><p>No test cases in this suite</p></div>
              ) : (
                <table className="table">
                  <thead><tr><th>Title</th><th>Priority</th><th>Type</th></tr></thead>
                  <tbody>
                    {detail?.test_cases?.map(tc => (
                      <tr key={tc.id}>
                        <td><Link to={`/projects/${projectId}/testcases/${tc.id}`} onClick={onClose}>{tc.title}</Link></td>
                        <td><span className={`badge badge-${tc.priority}`}>{tc.priority}</span></td>
                        <td>{tc.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TestSuites = () => {
  const { id: projectId } = useParams();
  const { canWrite } = useAuth();
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSuite, setEditSuite] = useState(null);
  const [viewSuite, setViewSuite] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/projects/${projectId}/suites`).then(r => setSuites(r.data)).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this suite?')) return;
    await api.delete(`/projects/${projectId}/suites/${id}`);
    load();
  };

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} label="Back to Project" />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / Test Suites
          </div>
          <h1>Test Suites</h1>
        </div>
        {canWrite() && (
          <button className="btn btn-primary" onClick={() => { setEditSuite(null); setShowModal(true); }}>+ New Suite</button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : suites.length === 0 ? (
        <div className="empty-state card"><h3>No suites yet</h3></div>
      ) : (
        <div className="grid grid-3">
          {suites.map(s => (
            <div key={s.id} className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{s.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{s.description || 'No description'}</p>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>📋 {s.case_count || 0} test cases</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setViewSuite(s)} style={{ flex: 1, justifyContent: 'center' }}>View</button>
                {canWrite() && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditSuite(s); setShowModal(true); }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Del</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <SuiteModal suite={editSuite} projectId={projectId} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
      {viewSuite && <SuiteDetail suite={viewSuite} projectId={projectId} onClose={() => setViewSuite(null)} />}
    </div>
  );
};

export default TestSuites;
