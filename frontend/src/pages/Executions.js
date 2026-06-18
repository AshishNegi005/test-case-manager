import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';

const Executions = () => {
  const { id: projectId } = useParams();
  const [executions, setExecutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [suiteFilter, setSuiteFilter] = useState('');
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    api.get(`/projects/${projectId}/suites`).then(r => setSuites(r.data)).catch(() => {});
  }, [projectId]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit });
    if (filter) params.set('status', filter);
    if (suiteFilter) params.set('suiteId', suiteFilter);
    api.get(`/projects/${projectId}/executions?${params}`)
      .then(r => { setExecutions(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [projectId, page, filter, suiteFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const statusCounts = executions.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} label="Back to Project" />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / Executions
          </div>
          <h1>Test Executions <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>({total})</span></h1>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {['pass', 'fail', 'blocked', 'skipped'].map(s => (
          <div key={s} className="stat-card" style={{ cursor: 'pointer', borderLeft: `3px solid ${s === 'pass' ? 'var(--success)' : s === 'fail' ? 'var(--danger)' : s === 'blocked' ? 'var(--warning)' : 'var(--info)'}` }}
            onClick={() => { setFilter(filter === s ? '' : s); setPage(1); }}>
            <div className="label">{s.toUpperCase()}</div>
            <div className="value">{statusCounts[s] || 0}</div>
            {filter === s && <div className="sub">✓ filtered</div>}
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['', 'pass', 'fail', 'blocked', 'skipped', 'pending'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter(s); setPage(1); }}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
        {suites.length > 0 && (
          <select
            className="select"
            style={{ width: 'auto', marginLeft: 'auto' }}
            value={suiteFilter}
            onChange={e => { setSuiteFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Suites</option>
            {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : executions.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><h3>No executions found</h3></div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Test Case</th><th>Suite</th><th>Status</th><th>Executed By</th><th>Date</th><th>Comments</th><th>Defect</th>
            </tr></thead>
            <tbody>
              {executions.map(e => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/projects/${projectId}/testcases/${e.test_case_id}`} style={{ fontWeight: 500 }}>
                      {e.test_case_title}
                    </Link>
                  </td>
                  <td>
                    {e.suite_name
                      ? <span style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10, color: 'var(--text-secondary)' }}>{e.suite_name}</span>
                      : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                  </td>
                  <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                  <td>{e.executed_by_name}</td>
                  <td style={{ fontSize: 12 }}>{new Date(e.executed_at).toLocaleString()}</td>
                  <td style={{ fontSize: 12, maxWidth: 200 }}>{e.comments}</td>
                  <td>{e.defect_id ? <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>{e.defect_id}</span> : '—'}</td>
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
          <span style={{ padding: '6px 12px', fontSize: 13 }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  );
};

export default Executions;
