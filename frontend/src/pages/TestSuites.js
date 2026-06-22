import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';
import RightDrawer from '../components/common/RightDrawer';

const STATUS_OPTIONS = [
  { value: 'pass',    label: '✅ Pass',    color: '#10b981' },
  { value: 'fail',    label: '❌ Fail',    color: '#ef4444' },
  { value: 'blocked', label: '🚫 Blocked', color: '#f59e0b' },
  { value: 'skipped', label: '⏭ Skipped', color: '#6366f1' },
];

/* ─── Suite Run Content ─────────────────────────────────────────────────── */
const SuiteRunContent = ({ suite, testCases, projectId, onClose, onDone }) => {
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

  const passCount  = rows.filter(r => r.status === 'pass').length;
  const failCount  = rows.filter(r => r.status === 'fail').length;
  const blockCount = rows.filter(r => r.status === 'blocked').length;
  const skipCount  = rows.filter(r => r.status === 'skipped').length;

  return (
    <>
      {/* Bulk toolbar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 16,
      }}>
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

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {testCases.map((tc, idx) => {
        const row    = rows[idx];
        const option = STATUS_OPTIONS.find(s => s.value === row.status);
        const isOpen = expandedId === tc.id;

        return (
          <div key={tc.id} style={{
            border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12,
            borderLeft: `4px solid ${option.color}`,
          }}>
            {/* Header row */}
            <div
              style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                cursor: tc.steps?.length ? 'pointer' : 'default' }}
              onClick={() => tc.steps?.length && setExpandedId(isOpen ? null : tc.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
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
              </div>

              <div onClick={e => e.stopPropagation()}
                style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => updateRow(idx, 'status', s.value)}
                    style={{
                      padding: '3px 8px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
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

            {/* Steps table */}
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

            {/* Actual result */}
            <div style={{ padding: '0 16px 12px' }} onClick={e => e.stopPropagation()}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Actual Result <span style={{ color: 'var(--danger)' }}>*</span>
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

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>
          {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : '✔ Submit Results'}
        </button>
      </div>
    </>
  );
};

/* ─── Suite Create/Edit Form ─────────────────────────────────────────────── */
const SuiteForm = ({ suite, projectId, onClose, onSave }) => {
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
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Name *</label>
        <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea className="form-control" rows={3} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Suite'}</button>
      </div>
    </form>
  );
};

/* ─── Suite Detail Content ───────────────────────────────────────────────── */
const SuiteDetailContent = ({ suite, projectId, onClose, onExecute }) => {
  const [detail, setDetail]         = useState(null);
  const [allCases, setAllCases]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [adding, setAdding]         = useState(false);
  const [search, setSearch]         = useState('');
  const { canWrite, canExecute }    = useAuth();

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

  const suiteIds  = new Set((detail?.test_cases || []).map(tc => tc.id));
  const available = allCases
    .filter(tc => !suiteIds.has(tc.id))
    .filter(tc => !search || tc.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <>
      {suite.description && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{suite.description}</p>
      )}

      {/* Add test case row */}
      {canWrite() && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="form-control"
            placeholder="Search to filter..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedCaseId(''); }}
            style={{ flex: 1, minWidth: 130 }}
          />
          <select className="select" value={selectedCaseId}
            onChange={e => setSelectedCaseId(e.target.value)} style={{ flex: 2, minWidth: 180 }}>
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>
          Test Cases ({detail?.test_cases?.length || 0})
        </strong>
        {canExecute() && detail?.test_cases?.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={onExecute}>
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
              {canWrite() && <th style={{ width: 80 }}></th>}
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
  );
};

/* ─── Page ──────────────────────────────────────────────────────────────── */
const TestSuites = () => {
  const { id: projectId } = useParams();
  const { canWrite }      = useAuth();
  const [suites, setSuites]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editSuite, setEditSuite] = useState(null);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [viewSuite, setViewSuite] = useState(null);
  const [runSuite, setRunSuite]   = useState(null); // { suite, testCases }

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

  const handleExecuteRequest = async (suite) => {
    // Load suite detail (with steps) to pass into run drawer
    const res = await api.get(`/projects/${projectId}/suites/${suite.id}`);
    setViewSuite(null);
    setRunSuite({ suite, testCases: res.data.test_cases || [] });
  };

  const handleRunDone = () => {
    setRunSuite(null);
    alert(`Suite executed successfully! Results saved.`);
    load();
  };

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / Test Suites
          </div>
          <h1>Test Suites</h1>
        </div>
        {canWrite() && (
          <button className="btn btn-primary" onClick={() => { setEditSuite(null); setShowFormDrawer(true); }}>+ New Suite</button>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditSuite(s); setShowFormDrawer(true); }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Del</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Suite Drawer */}
      <RightDrawer
        open={showFormDrawer}
        onClose={() => setShowFormDrawer(false)}
        title={editSuite ? 'Edit Suite' : 'New Test Suite'}
        subtitle={editSuite ? `Editing: ${editSuite.name}` : 'Fill in the details to create a new test suite'}
      >
        <SuiteForm
          suite={editSuite}
          projectId={projectId}
          onClose={() => setShowFormDrawer(false)}
          onSave={() => { setShowFormDrawer(false); load(); }}
        />
      </RightDrawer>

      {/* View Suite Detail Drawer */}
      <RightDrawer
        open={!!viewSuite}
        onClose={() => setViewSuite(null)}
        title={viewSuite?.name || ''}
        subtitle="View and manage test cases in this suite"
        width={680}
      >
        {viewSuite && (
          <SuiteDetailContent
            suite={viewSuite}
            projectId={projectId}
            onClose={() => setViewSuite(null)}
            onExecute={() => handleExecuteRequest(viewSuite)}
          />
        )}
      </RightDrawer>

      {/* Execute Suite Drawer */}
      <RightDrawer
        open={!!runSuite}
        onClose={() => setRunSuite(null)}
        title={runSuite ? `▶ Execute: ${runSuite.suite.name}` : ''}
        subtitle="Review each test case's steps, then record the actual result"
        width={780}
      >
        {runSuite && (
          <SuiteRunContent
            suite={runSuite.suite}
            testCases={runSuite.testCases}
            projectId={projectId}
            onClose={() => setRunSuite(null)}
            onDone={handleRunDone}
          />
        )}
      </RightDrawer>
    </div>
  );
};

export default TestSuites;
