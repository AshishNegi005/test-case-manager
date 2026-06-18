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
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { canWrite, canExecute } = useAuth();
  const [executing, setExecuting] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const loadDetail = useCallback(() => {
    return api.get(`/projects/${projectId}/suites/${suite.id}`).then(r => setDetail(r.data));
  }, [projectId, suite.id]);

  useEffect(() => {
    Promise.all([
      loadDetail(),
      api.get(`/projects/${projectId}/testcases?limit=200`).then(r => setAllCases(r.data.data || [])),
    ]).finally(() => setLoading(false));
  }, [projectId, suite.id, loadDetail]);

  const executeAll = async () => {
    const reason = window.prompt(
      `Execute all ${detail.test_cases.length} test case(s) in "${suite.name}" as PASS?\n\nEnter a reason (required):`
    );
    if (reason === null) return; // cancelled
    if (!reason.trim()) { alert('A reason is required to record batch execution.'); return; }
    setExecuting(true);
    const results = detail.test_cases.map(tc => ({ testCaseId: tc.id, status: 'pass', comments: reason.trim() }));
    try {
      await api.post(`/projects/${projectId}/executions/suite`, { suiteId: suite.id, results });
      alert(`Suite executed: ${results.length} test case(s) marked as PASS.`);
    } finally {
      setExecuting(false);
    }
  };

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

  // Test cases not yet in this suite, filtered by search
  const suiteIds = new Set((detail?.test_cases || []).map(tc => tc.id));
  const available = allCases
    .filter(tc => !suiteIds.has(tc.id))
    .filter(tc => !search || tc.title.toLowerCase().includes(search.toLowerCase()));

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

              {/* Add test case row — admin/test-lead only */}
              {canWrite() && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="form-control"
                    placeholder="Search test cases to add..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSelectedCaseId(''); }}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                  <select
                    className="select"
                    value={selectedCaseId}
                    onChange={e => setSelectedCaseId(e.target.value)}
                    style={{ flex: 2, minWidth: 200 }}
                  >
                    <option value="">-- Select test case --</option>
                    {available.map(tc => (
                      <option key={tc.id} value={tc.id}>
                        [{tc.priority}] {tc.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={addCase}
                    disabled={adding || !selectedCaseId}
                  >
                    {adding ? 'Adding...' : '+ Add'}
                  </button>
                </div>
              )}

              {/* Existing test cases in suite */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>
                  Test Cases in Suite ({detail?.test_cases?.length || 0})
                </strong>
                {canExecute() && detail?.test_cases?.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={executeAll} disabled={executing}>
                    {executing ? 'Executing...' : '▶ Execute All'}
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
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Type</th>
                      {canWrite() && <th style={{ width: 70 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {detail?.test_cases?.map(tc => (
                      <tr key={tc.id}>
                        <td>
                          <Link to={`/projects/${projectId}/testcases/${tc.id}`} onClick={onClose}>
                            {tc.title}
                          </Link>
                        </td>
                        <td><span className={`badge badge-${tc.priority}`}>{tc.priority}</span></td>
                        <td style={{ fontSize: 12 }}>{tc.type}</td>
                        {canWrite() && (
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => removeCase(tc.id)}
                              title="Remove from suite"
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
