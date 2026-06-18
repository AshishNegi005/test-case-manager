import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ExecuteModal = ({ testCase, projectId, onClose, onSave }) => {
  const [form, setForm] = useState({ status: 'pass', comments: '', defectId: '', defectDescription: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/executions`, { testCaseId: testCase.id, ...form });
      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Execute: {testCase.title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Result *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['pass', 'fail', 'blocked', 'skipped'].map(s => (
                  <button key={s} type="button"
                    className={`btn ${form.status === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, status: s }))}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Comments</label>
              <textarea className="form-control" value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} placeholder="Notes about this execution..." />
            </div>
            {form.status === 'fail' && (
              <>
                <div className="form-group">
                  <label>Defect ID</label>
                  <input className="form-control" value={form.defectId} onChange={e => setForm(f => ({ ...f, defectId: e.target.value }))} placeholder="BUG-123" />
                </div>
                <div className="form-group">
                  <label>Defect Description</label>
                  <textarea className="form-control" value={form.defectDescription} onChange={e => setForm(f => ({ ...f, defectDescription: e.target.value }))} />
                </div>
              </>
            )}
            <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Record Result'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TestCaseDetail = () => {
  const { id: projectId, caseId } = useParams();
  const { canExecute } = useAuth();
  const [tc, setTc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExecute, setShowExecute] = useState(false);

  const load = useCallback(() => {
    api.get(`/projects/${projectId}/testcases/${caseId}`).then(r => setTc(r.data)).finally(() => setLoading(false));
  }, [projectId, caseId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (!tc) return <div className="alert alert-error">Test case not found</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / <Link to={`/projects/${projectId}/testcases`}>Test Cases</Link> / {tc.title}
          </div>
          <h1>{tc.title}</h1>
        </div>
        {canExecute() && (
          <button className="btn btn-primary" onClick={() => setShowExecute(true)}>▶ Execute</button>
        )}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100 }}>Priority:</span>
              <span className={`badge badge-${tc.priority}`}>{tc.priority}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100 }}>Type:</span>
              <span style={{ fontSize: 13 }}>{tc.type}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100 }}>Created by:</span>
              <span style={{ fontSize: 13 }}>{tc.created_by_name}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 100 }}>Assigned to:</span>
              <span style={{ fontSize: 13 }}>{tc.assigned_to_name || 'Unassigned'}</span>
            </div>
            {tc.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {tc.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Description</h3>
          <p style={{ fontSize: 13, marginBottom: 12 }}>{tc.description || 'No description'}</p>
          {tc.preconditions && <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Preconditions</h3>
            <p style={{ fontSize: 13, marginBottom: 8 }}>{tc.preconditions}</p>
          </>}
          {tc.postconditions && <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Postconditions</h3>
            <p style={{ fontSize: 13 }}>{tc.postconditions}</p>
          </>}
        </div>
      </div>

      {/* Steps */}
      {tc.steps?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Test Steps</h3>
          <table className="table">
            <thead><tr><th>#</th><th>Action</th><th>Expected Result</th></tr></thead>
            <tbody>
              {tc.steps.map(s => (
                <tr key={s.id}>
                  <td style={{ width: 40 }}>{s.step_number}</td>
                  <td>{s.action}</td>
                  <td>{s.expected_result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Execution History */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Execution History</h3>
        {tc.executions?.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No executions yet</p>
        ) : (
          <table className="table">
            <thead><tr><th>Status</th><th>Executed By</th><th>Date</th><th>Comments</th><th>Defect</th></tr></thead>
            <tbody>
              {tc.executions?.map(e => (
                <tr key={e.id}>
                  <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                  <td>{e.executed_by_name}</td>
                  <td>{new Date(e.executed_at).toLocaleString()}</td>
                  <td style={{ fontSize: 12 }}>{e.comments}</td>
                  <td style={{ fontSize: 12 }}>{e.defect_id ? <span style={{ color: 'var(--danger)' }}>{e.defect_id}</span> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showExecute && (
        <ExecuteModal testCase={tc} projectId={projectId} onClose={() => setShowExecute(false)} onSave={() => { setShowExecute(false); load(); }} />
      )}
    </div>
  );
};

export default TestCaseDetail;
