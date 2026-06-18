import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/common/BackButton';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CiCd = () => {
  const { id: projectId } = useParams();
  const { canWrite } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/projects/${projectId}/api-keys`).then(r => setKeys(r.data)).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const generate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setGenerating(true);
    try {
      const res = await api.post(`/projects/${projectId}/api-keys`, { name: newKeyName.trim() });
      setRevealedKey(res.data);
      setNewKeyName('');
      load();
    } finally {
      setGenerating(false);
    }
  };

  const revoke = async (keyId, name) => {
    if (!window.confirm(`Revoke API key "${name}"?`)) return;
    await api.patch(`/projects/${projectId}/api-keys/${keyId}/revoke`);
    load();
  };

  const deleteKey = async (keyId, name) => {
    if (!window.confirm(`Delete API key "${name}"? This is irreversible.`)) return;
    await api.delete(`/projects/${projectId}/api-keys/${keyId}`);
    load();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const baseUrl = window.location.origin.replace('3000', '5001');

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} label="Back to Project" />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / CI/CD Integration
          </div>
          <h1>CI/CD Integration</h1>
        </div>
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 8, color: '#92400e' }}>⚠ Save your API key now — it will not be shown again</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ background: '#fff', padding: '8px 12px', borderRadius: 4, flex: 1, fontSize: 13, wordBreak: 'break-all' }}>
              {revealedKey.key}
            </code>
            <button className="btn btn-secondary" onClick={() => copyToClipboard(revealedKey.key)}>Copy</button>
            <button className="btn btn-secondary" onClick={() => setRevealedKey(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* API Keys */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>API Keys</h2>

        {canWrite() && (
          <form onSubmit={generate} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input className="form-control" placeholder="Key name (e.g., GitHub Actions, Jenkins)" value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)} style={{ flex: 1 }} required />
            <button className="btn btn-primary" type="submit" disabled={generating}>
              {generating ? 'Generating...' : '+ Generate Key'}
            </button>
          </form>
        )}

        {loading ? <LoadingSpinner /> : keys.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No API keys yet. Generate one to integrate with CI/CD pipelines.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Prefix</th><th>Status</th><th>Last Used</th><th>Created By</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td><strong>{k.name}</strong></td>
                  <td><code style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{k.key_prefix}...</code></td>
                  <td><span style={{ fontSize: 12, fontWeight: 600, color: k.is_active ? 'var(--success)' : 'var(--danger)' }}>
                    {k.is_active ? '● Active' : '● Revoked'}
                  </span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
                  <td style={{ fontSize: 13 }}>{k.created_by}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(k.created_at).toLocaleDateString()}</td>
                  <td>
                    {canWrite() && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {k.is_active && <button className="btn btn-secondary btn-sm" onClick={() => revoke(k.id, k.name)}>Revoke</button>}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteKey(k.id, k.name)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage Documentation */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📖 How to Use</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>1. Trigger a Test Suite Run</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Use your API key in the <code>X-API-Key</code> header:</p>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 6, fontSize: 12, overflow: 'auto' }}>
{`curl -X POST ${baseUrl}/api/ci/run \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"suiteId": "SUITE_UUID"}'`}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>2. Update Execution Result</h3>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 6, fontSize: 12, overflow: 'auto' }}>
{`curl -X PATCH ${baseUrl}/api/ci/executions/EXECUTION_ID \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "pass", "comments": "All assertions passed"}'`}
            </pre>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>3. GitHub Actions Example</h3>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 6, fontSize: 12, overflow: 'auto' }}>
{`# .github/workflows/test.yml
- name: Trigger TCM Test Suite
  run: |
    curl -X POST ${baseUrl}/api/ci/run \\
      -H "X-API-Key: \${{ secrets.TCM_API_KEY }}" \\
      -H "Content-Type: application/json" \\
      -d '{"suiteId": "\${{ vars.SMOKE_SUITE_ID }}"}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CiCd;
