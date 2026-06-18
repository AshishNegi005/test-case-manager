import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/common/BackButton';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday 9 AM', value: '0 9 * * 1' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
];

const Schedules = () => {
  const { id: projectId } = useParams();
  const { canWrite } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', suiteId: '', cronExpression: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/projects/${projectId}/schedules`),
      api.get(`/projects/${projectId}/suites`),
    ]).then(([sr, ss]) => {
      setSchedules(sr.data);
      setSuites(ss.data);
    }).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/schedules`, {
        name: form.name,
        suiteId: form.suiteId,
        cronExpression: form.cronExpression,
      });
      setForm({ name: '', suiteId: '', cronExpression: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s) => {
    await api.put(`/projects/${projectId}/schedules/${s.id}`, { isActive: !s.is_active });
    load();
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete schedule "${s.name}"?`)) return;
    await api.delete(`/projects/${projectId}/schedules/${s.id}`);
    load();
  };

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} label="Back to Project" />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / Schedules
          </div>
          <h1>Test Run Scheduling</h1>
        </div>
        {canWrite() && (
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ New Schedule'}
          </button>
        )}
      </div>

      {/* New schedule form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New Scheduled Run</h3>
          {formError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{formError}</div>}
          <form onSubmit={save}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Schedule Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Nightly Smoke Tests" required />
              </div>
              <div className="form-group">
                <label>Test Suite *</label>
                <select className="select" value={form.suiteId} onChange={e => setForm(f => ({ ...f, suiteId: e.target.value }))} required>
                  <option value="">-- Select a suite --</option>
                  {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Cron Expression *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {CRON_PRESETS.map(p => (
                  <button key={p.value} type="button" className={`btn btn-sm ${form.cronExpression === p.value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, cronExpression: p.value }))}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input className="form-control" value={form.cronExpression} onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                placeholder="*/30 * * * * (minute hour day month weekday)" required />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Format: minute hour day-of-month month day-of-week. Example: <code>0 9 * * 1</code> = every Monday at 9 AM
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Schedule'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingSpinner /> : schedules.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p style={{ fontSize: 32, marginBottom: 8 }}>🕐</p>
            <h3>No schedules yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Create a schedule to automatically run test suites on a cron schedule.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.map(s => (
            <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 14 }}>{s.name}</strong>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.is_active ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {s.is_active ? '● Active' : '○ Paused'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Suite: <strong>{s.suite_name}</strong> &nbsp;|&nbsp;
                  Schedule: <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 3 }}>{s.cron_expression}</code>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Last run: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'} &nbsp;|&nbsp;
                  Created by: {s.created_by} &nbsp;|&nbsp; {new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
              {canWrite() && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`btn btn-sm ${s.is_active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggle(s)}>
                    {s.is_active ? '⏸ Pause' : '▶ Enable'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(s)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Schedules;
