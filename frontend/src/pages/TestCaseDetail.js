import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';

// ---------- Comments Section ----------
const CommentsSection = ({ projectId, caseId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    api.get(`/projects/${projectId}/testcases/${caseId}/comments`).then(r => setComments(r.data));
  }, [projectId, caseId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    await api.post(`/projects/${projectId}/testcases/${caseId}/comments`, { comment: text.trim() });
    setText('');
    load();
    setSubmitting(false);
  };

  const saveEdit = async (id) => {
    await api.put(`/projects/${projectId}/testcases/${caseId}/comments/${id}`, { comment: editText });
    setEditId(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    await api.delete(`/projects/${projectId}/testcases/${caseId}/comments/${id}`);
    load();
  };

  const ROLE_COLORS = { admin: '#dc2626', 'test-lead': '#d97706', tester: '#1d4ed8', 'read-only': '#475569' };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>💬 Comments ({comments.length})</h3>
      {comments.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>No comments yet. Be the first to add one.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {comments.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>{c.username}</strong>
                <span style={{ fontSize: 11, color: ROLE_COLORS[c.role] || '#475569', fontWeight: 600 }}>{c.role}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(c.created_at).toLocaleString()}</span>
                {c.updated_at !== c.created_at && <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>(edited)</span>}
              </div>
              {(c.username === user?.username || user?.role === 'admin') && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditId(c.id); setEditText(c.comment); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Del</button>
                </div>
              )}
            </div>
            {editId === c.id ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-control" value={editText} onChange={e => setEditText(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c.id)}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
              </div>
            ) : (
              <p style={{ fontSize: 13, margin: 0 }}>{c.comment}</p>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input className="form-control" placeholder="Add a comment..." value={text} onChange={e => setText(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit" disabled={submitting || !text.trim()}>Post</button>
      </form>
    </div>
  );
};

// ---------- Version History Section ----------
const VersionHistory = ({ projectId, caseId, onRestore }) => {
  const { canWrite } = useAuth();
  const [versions, setVersions] = useState([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    api.get(`/projects/${projectId}/testcases/${caseId}/versions`).then(r => setVersions(r.data));
  }, [projectId, caseId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const restore = async (versionId, vNum) => {
    if (!window.confirm(`Restore version ${vNum}? Current state will be saved as a new version.`)) return;
    await api.post(`/projects/${projectId}/testcases/${caseId}/versions/${versionId}/restore`);
    onRestore();
    load();
  };

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>🕐 Version History {versions.length > 0 && `(${versions.length})`}</h3>
        <span style={{ fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          {versions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No versions saved yet. Versions are created automatically on each update.</p>
          ) : (
            versions.map(v => (
              <div key={v.id} style={{ border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                  onClick={() => setExpanded(ex => ex === v.id ? null : v.id)}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>v{v.version_number}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.title}</span>
                    <span className={`badge badge-${v.priority}`}>{v.priority}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.changed_by} • {new Date(v.created_at).toLocaleString()}</span>
                    {v.change_reason && <span style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{v.change_reason}"</span>}
                    {canWrite() && <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); restore(v.id, v.version_number); }}>Restore</button>}
                  </div>
                </div>
                {expanded === v.id && (
                  <div style={{ padding: 12, fontSize: 13 }}>
                    {v.description && <p style={{ marginBottom: 8 }}><strong>Description:</strong> {v.description}</p>}
                    {v.preconditions && <p style={{ marginBottom: 8 }}><strong>Preconditions:</strong> {v.preconditions}</p>}
                    {v.steps?.length > 0 && (
                      <div>
                        <strong>Steps:</strong>
                        <ol style={{ paddingLeft: 20, marginTop: 4 }}>
                          {v.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s.action} → {s.expected_result}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

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
      <BackButton to={`/projects/${projectId}/testcases`} label="Back to Test Cases" />
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

      <CommentsSection projectId={projectId} caseId={caseId} />
      <VersionHistory projectId={projectId} caseId={caseId} onRestore={load} />

      {showExecute && (
        <ExecuteModal testCase={tc} projectId={projectId} onClose={() => setShowExecute(false)} onSave={() => { setShowExecute(false); load(); }} />
      )}
    </div>
  );
};

export default TestCaseDetail;
