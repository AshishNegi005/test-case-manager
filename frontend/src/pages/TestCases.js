import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';

const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];
const TYPES = ['', 'functional', 'integration', 'regression', 'smoke', 'ui', 'api'];

const TestCaseModal = ({ testCase, projectId, onClose, onSave }) => {
  const [form, setForm] = useState(testCase || {
    title: '', description: '', priority: 'medium', type: 'functional',
    preconditions: '', postconditions: '', tags: '', steps: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => setForm(f => ({ ...f, steps: [...(f.steps || []), { action: '', expected_result: '' }] }));
  const updateStep = (i, field, val) => setForm(f => {
    const steps = [...(f.steps || [])];
    steps[i] = { ...steps[i], [field]: val };
    return { ...f, steps };
  });
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags };
      if (testCase) await api.put(`/projects/${projectId}/testcases/${testCase.id}`, payload);
      else await api.post(`/projects/${projectId}/testcases`, payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const tagsStr = Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{testCase ? 'Edit Test Case' : 'New Test Case'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Priority</label>
                <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.slice(1).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TYPES.slice(1).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Preconditions</label>
              <textarea className="form-control" value={form.preconditions || ''} onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Postconditions</label>
              <textarea className="form-control" value={form.postconditions || ''} onChange={e => setForm(f => ({ ...f, postconditions: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input className="form-control" value={tagsStr} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="login, auth, smoke" />
            </div>

            {/* Test Steps */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 14 }}>Test Steps</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addStep}>+ Add Step</button>
              </div>
              {(form.steps || []).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, padding: '10px 6px', color: 'var(--text-secondary)' }}>{i + 1}</span>
                  <input className="form-control" placeholder="Action" value={step.action || ''} onChange={e => updateStep(i, 'action', e.target.value)} style={{ flex: 1 }} />
                  <input className="form-control" placeholder="Expected Result" value={step.expected_result || ''} onChange={e => updateStep(i, 'expected_result', e.target.value)} style={{ flex: 1 }} />
                  <button type="button" onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '8px 4px' }}>×</button>
                </div>
              ))}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TestCases = () => {
  const { id: projectId } = useParams();
  const { canWrite } = useAuth();
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', priority: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCase, setEditCase] = useState(null);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const importRef = useRef();

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (filters.search) params.set('search', filters.search);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.type) params.set('type', filters.type);
      const res = await api.get(`/projects/${projectId}/testcases?${params}`);
      setCases(res.data.data);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (caseId) => {
    if (!window.confirm('Delete this test case?')) return;
    await api.delete(`/projects/${projectId}/testcases/${caseId}`);
    load();
  }, [projectId, load]);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} test cases?`)) return;
    await api.post(`/projects/${projectId}/testcases/bulk`, { ids: selected, action: 'delete' });
    setSelected([]);
    load();
  };

  const totalPages = Math.ceil(total / limit);

  const handleExport = async (format) => {
    try {
      const res = await api.get(`/projects/${projectId}/testcases/export/${format}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'test-cases.csv' : 'test-cases.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    const format = file.name.endsWith('.xlsx') ? 'excel' : 'csv';
    try {
      const res = await api.post(`/projects/${projectId}/testcases/import/${format}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(`${res.data.message}${res.data.errors?.length ? '\n\nErrors:\n' + res.data.errors.join('\n') : ''}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const filterBar = useMemo(() => (
    <div className="search-bar">
      <input className="form-control" placeholder="Search test cases..." value={filters.search}
        onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
      <select className="select" style={{ width: 'auto' }} value={filters.priority}
        onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
        {PRIORITIES.map(p => <option key={p} value={p}>{p || 'All Priorities'}</option>)}
      </select>
      <select className="select" style={{ width: 'auto' }} value={filters.type}
        onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}>
        {TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
      </select>
    </div>
  ), [filters]);

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} label="Back to Project" />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / Test Cases
          </div>
          <h1>Test Cases <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>({total})</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selected.length > 0 && canWrite() && (
            <button className="btn btn-danger" onClick={handleBulkDelete}>Delete ({selected.length})</button>
          )}
          <button className="btn btn-secondary" onClick={() => handleExport('csv')} title="Export CSV">⬇ CSV</button>
          <button className="btn btn-secondary" onClick={() => handleExport('excel')} title="Export Excel">⬇ Excel</button>
          {canWrite() && (
            <>
              <input ref={importRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleImport} />
              <button className="btn btn-secondary" onClick={() => importRef.current.click()} disabled={importing} title="Import CSV/Excel">
                {importing ? 'Importing...' : '⬆ Import'}
              </button>
              <button className="btn btn-primary" onClick={() => { setEditCase(null); setShowModal(true); }}>+ New Test Case</button>
            </>
          )}
        </div>
      </div>

      {filterBar}

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : cases.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><h3>No test cases found</h3></div>
        ) : (
          <table className="table">
            <thead><tr>
              {canWrite() && <th><input type="checkbox" onChange={e => setSelected(e.target.checked ? cases.map(c => c.id) : [])} /></th>}
              <th>Title</th><th>Priority</th><th>Type</th><th>Tags</th><th>Last Status</th><th></th>
            </tr></thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id}>
                  {canWrite() && <td><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(s => e.target.checked ? [...s, c.id] : s.filter(id => id !== c.id))} /></td>}
                  <td>
                    <Link to={`/projects/${projectId}/testcases/${c.id}`} style={{ fontWeight: 500 }}>{c.title}</Link>
                    {c.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.description.slice(0, 60)}</div>}
                  </td>
                  <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                  <td><span style={{ fontSize: 12 }}>{c.type}</span></td>
                  <td>{(c.tags || []).map(t => <span key={t} className="tag">{t}</span>)}</td>
                  <td>{c.last_status ? <span className={`badge badge-${c.last_status}`}>{c.last_status}</span> : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Not run</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canWrite() && <button className="btn btn-secondary btn-sm" onClick={() => { setEditCase(c); setShowModal(true); }}>Edit</button>}
                      {canWrite() && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Del</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
          })}
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}

      {showModal && (
        <TestCaseModal testCase={editCase} projectId={projectId} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
};

export default TestCases;
