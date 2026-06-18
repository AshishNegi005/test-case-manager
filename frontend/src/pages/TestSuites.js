import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';

const STATUS_OPTIONS = [
  { value: 'pass',    label: '✅ Pass',    color: '#10b981' },
  { value: 'fail',    label: '❌ Fail',    color: '#ef4444' },
  { value: 'blocked', label: '🚫 Blocked', color: '#f59e0b' },
  { value: 'skipped', label: '⏭ Skipped', color: '#6366f1' },
];

/* ─── Suite Run Modal ───────────────────────────────────────────────────── */
const SuiteRunModal = ({ suite, testCases, projectId, onClose, onDone }) => {
  // One row per test case: { status, comments }
  const [rows, setRows] = useState(() =>
    testCases.map(tc => ({ testCaseId: tc.id, status: 'pass', comments: '' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const setAll = (status) =>
    setRows(r => r.map(row => ({ ...row, status })));

  const updateRow = (idx, field, value) =>
    setRows(r => { const copy = [...r]; copy[idx] = { ...copy[idx], [field]: value }; return copy; });

  const handleSubmit = async () => {
    const missing = rows.findIndex(r => !r.comments.trim());
    if (missing !== -1) {
      setError(`Please enter an actual result for "${testCases[missing].title}"`);
      setExpandedId(testCases[missing].id);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/projects/${projectId}/executions/suite`, {
        suiteId: suite.id,
        results: rows,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Execution failed');
      setSubmitting(false);
    }
  };

  const passCount   = rows.filter(r => r.status === 'pass').length;
  const failCount   = rows.filter(r => r.status === 'fail').length;
  const blockCount  = rows.filter(r => r.status === 'blocked').length;
  const skipCount   = rows.filter(r => r.status === 'skipped').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>▶ Execute Suite: {suite.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              Review each test case's steps, then record the actual result.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, alignSelf: 'flex-start' }}>×</button>
        </div>

        {/* Bulk actions + progress */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-secondary)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 }}>Set all:</span>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} className="btn btn-sm btn-secondary" onClick={() => setAll(s.value)}
              style={{ fontSize: 12 }}>{s.label}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ color: '#10b981' }}>✅ {passCount}</span>
            <span style={{ color: '#ef4444' }}>❌ {failCount}</span>
            <span style={{ color: '#f59e0b' }}>🚫 {blockCount}</span>
            <span style={{ color: '#6366f1' }}>⏭ {skipCount}</span>
          </div>
        </div>

        {/* Test case rows — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
          {error && (
            <div className="alert alert-error" style={{ margin: '12px 0' }}>{error}</div>
          )}

          {testCases.map((tc, idx) => {
            const row    = rows[idx];
            const option = STATUS_OPTIONS.find(s => s.value === row.status);
            const isOpen = expandedId === tc.id;

            return (
              <div key={tc.id} style={{
                border: '1px solid var(--border)', borderRadius: 8, margin: '12px 0',
                borderLeft: `4px solid ${option.color}`,
              }}>
                {/* Test case header — click to expand/collapse steps */}
                <div
                  style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                    cursor: tc.steps?.length ? 'pointer' : 'default' }}
                  onClick={() => tc.steps?.length && setExpandedId(isOpen ? null : tc.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>{idx + 1}. {tc.title}</strong>
                      <span className={`badge badge-${tc.priority}`}>{tc.priority}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tc.type}</span>
                    </div>
                    {tc.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{tc.description}</p>
                    )}
                    {tc.steps?.length > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'inline-block' }}>
                        {isOpen ? '▲ Hide' : '▼ Show'} {tc.steps.length} step{tc.steps.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {tc.steps?.length === 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'inline-block' }}>
                        No steps defined
                      </span>
                    )}
                  </div>

                  {/* Status picker — stop click from toggling expand */}
                  <div onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => updateRow(idx, 'status', s.value)}
                        style={{
                          padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                          border: `2px solid ${s.color}`,
                          background: row.status === s.value ? s.color : 'transparent',
                          color: row.status === s.value ? '#fff' : s.color,
                          fontWeight: 600,
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Steps — expanded */}
                {isOpen && tc.steps?.length > 0 && (
                  <div style={{ margin: '0 16px 12px', background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--border)' }}>
                          <th style={{ padding: '6px 10px', width: 32, textAlign: 'left', color: 'var(--text-secondary)' }}>#</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)' }}>Action</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)' }}>Expected Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tc.steps.map(step => (
                          <tr key={step.step_number} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontSize: 11 }}>{step.step_number}</td>
                            <td style={{ padding: '6px 10px' }}>{step.action}</td>
                            <td style={{ padding: '6px 10px', color: '#10b981' }}>{step.expected_result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Actual result textarea */}
                <div style={{ padding: '0 16px 12px' }} onClick={e => e.stopPropagation()}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Actual Result <span style={{ color: 'var(--danger)' }}>*</span>
                    <span style={{ fontWeight: 400, marginLeft: 6 }}>
                      — what happened when you ran this test?
                    </span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder={
                      row.status === 'pass'    ? 'e.g. Login successful, redirected to dashboard as expected.' :
                      row.status === 'fail'    ? 'e.g. Error 500 on submit. Expected redirect did not occur.' :
                      row.status === 'blocked' ? 'e.g. Could not run — test environment is down.' :
                                                 'e.g. Skipping — feature not yet deployed in this build.'
                    }
                    value={row.comments}
                    onChange={e => updateRow(idx, 'comments', e.target.value)}
                    style={{ fontSize: 13, resize: 'vertical' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : '✔ Submit Results'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Suite Create/Edit Modal ───────────────────────────────────────────── */
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

/* ─── Suite Detail Modal ────────────────────────────────────────────────── */
const SuiteDetail = ({ suite, projectId, onClose }) => {
  const [detail, setDetail]           = useState(null);
  const [allCases, setAllCases]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [adding, setAdding]           = useState(false);
  const [search, setSearch]           = useState('');
  const { canWrite, canExecute }      = useAuth();

  const loadDetail = useCallback(() =>
    api.get(`/projects/${projectId}/suites/${suite.id}`).then(r => setDetail(r.data)),
  [projectId, suite.id]);

  useEffect(() => {
    Promise.all([
      loadDetail(),
      api.get(`/projects/${projectId}/testcases?limit=200`).then(r => setAllCases(r.data.data || [])),
    ]).finally(() => setLoading(false));
  }, [projectId, suite.id, loadDetail]);

  const addCase = async () => {
    if (!selectedCaseId) return;
    setAdding(true);
    try {
      await api.post(`/projects/${projectId}/suites/${suite.id}/cases`, { testCaseId: selectedCaseId });
      setSelectedCaseId('');
      await loadDetail();
    } finally {
      setAdding(false);
    }
  };

  const removeCase = async (caseId) => {
    await api.delete(`/projects/${projectId}/suites/${suite.id}/cases/${caseId}`);
    await loadDetail();
  };

  const handleRunDone = () => {
    setShowRunModal(false);
    alert(`Suite "${suite.name}" executed successfully! Results saved.`);
    loadDetail();
  };

  const suiteIds  = new Set((detail?.test_cases || []).map(tc => tc.id));
  const available = allCases
    .filter(tc => !suiteIds.has(tc.id))
    .filter(tc => !search || tc.title.toLowerCase().includes(search.toLowerCase()));

  if (showRunModal && detail?.test_cases?.length > 0) {
    return (
      <SuiteRunModal
        suite={suite}
        testCases={detail.test_cases}
        projectId={projectId}
        onClose={() => setShowRunModal(false)}
        onDone={handleRunDone}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{suite.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body">
          {loading ? <LoadingSpinner /> : (
            <>
              {suite.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{suite.description}</p>
              )}

              {/* Add test case */}
              {canWrite() && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="form-control"
                    placeholder="Search test cases to add..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSelectedCaseId(''); }}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                  <select className="select" value={selectedCaseId}
                    onChange={e => setSelectedCaseId(e.target.value)} style={{ flex: 2, minWidth: 200 }}>
                    <option value="">-- Select test case --</option>
                    {available.map(tc => (
                      <option key={tc.id} value={tc.id}>[{tc.priority}] {tc.title}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={addCase} disabled={adding || !selectedCaseId}>
                    {adding ? 'Adding...' : '+ Add'}
                  </button>
                </div>
              )}

              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>
                  Test Cases in Suite ({detail?.test_cases?.length || 0})
                </strong>
                {canExecute() && detail?.test_cases?.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowRunModal(true)}>
                    ▶ Execute Suite
                  </button>
                )}
              </div>

              {detail?.test_cases?.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p style={{ marginBottom: 4 }}>No test cases in this suite yet.</p>
                  {canWrite() && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Use the dropdown above to add test cases.</p>}
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th><th>Priority</th><th>Type</th><th>Steps</th>
                      {canWrite() && <th style={{ width: 70 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.test_cases.map(tc => (
                      <tr key={tc.id}>
                        <td>
                          <Link to={`/projects/${projectId}/testcases/${tc.id}`} onClick={onClose}>
                            {tc.title}
                          </Link>
                        </td>
                        <td><span className={`badge badge-${tc.priority}`}>{tc.priority}</span></td>
                        <td style={{ fontSize: 12 }}>{tc.type}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {tc.steps?.length > 0 ? `${tc.steps.length} step${tc.steps.length > 1 ? 's' : ''}` : '—'}
                        </td>
                        {canWrite() && (
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => removeCase(tc.id)}>Remove</button>
                          </td>
                        )}
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

/* ─── Page ──────────────────────────────────────────────────────────────── */
const TestSuites = () => {
  const { id: projectId } = useParams();
  const { canWrite }      = useAuth();
  const [suites, setSuites]     = useState([]);
  const [loading, setLoading]   = useState(true);
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
