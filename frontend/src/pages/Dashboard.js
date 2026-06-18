import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const COLORS = { pass: '#10b981', fail: '#ef4444', blocked: '#f59e0b', skipped: '#6366f1', pending: '#94a3b8' };

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const pRes = await api.get('/projects');
        setProjects(pRes.data);

        const sData = {};
        const tData = {};
        await Promise.all(pRes.data.slice(0, 3).map(async (p) => {
          try {
            const [s, t] = await Promise.all([
              api.get(`/projects/${p.id}/analytics/summary`),
              api.get(`/projects/${p.id}/analytics/trends?days=14`),
            ]);
            sData[p.id] = s.data;
            tData[p.id] = t.data.data;
          } catch {}
        }));
        setSummaries(sData);
        setTrends(tData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const globalStats = useMemo(() => {
    const totals = { pass: 0, fail: 0, blocked: 0, skipped: 0, pending: 0, total: 0 };
    Object.values(summaries).forEach(s => {
      Object.keys(totals).forEach(k => {
        if (k === 'total') totals.total += s.totalTestCases || 0;
        else totals[k] += s.executionSummary?.[k] || 0;
      });
    });
    return totals;
  }, [summaries]);

  const pieData = useMemo(() => {
    const s = Object.values(summaries)[0]?.executionSummary || {};
    return Object.entries(s).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [summaries]);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const firstProjectId = projects[0]?.id;
  const trendData = firstProjectId ? (trends[firstProjectId] || []) : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Welcome back, {user?.username}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Total Projects</div>
          <div className="value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Test Cases</div>
          <div className="value">{globalStats.total}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="label">Passed</div>
          <div className="value" style={{ color: 'var(--success)' }}>{globalStats.pass}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="label">Failed</div>
          <div className="value" style={{ color: 'var(--danger)' }}>{globalStats.fail}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {/* Pie Chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Test Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No execution data yet</p></div>}
        </div>

        {/* Line Chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Execution Trends (14 days)</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blocked" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No trend data yet</p></div>}
        </div>
      </div>

      {/* Projects list */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Projects</h3>
          <Link to="/projects" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        {projects.length === 0 ? (
          <div className="empty-state"><h3>No projects yet</h3><p>Create your first project to get started</p></div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Project</th><th>Status</th><th>Test Cases</th><th>Pass Rate</th><th></th>
            </tr></thead>
            <tbody>
              {projects.map(p => {
                const s = summaries[p.id];
                const execTotal = s ? Object.values(s.executionSummary || {}).reduce((a, b) => a + b, 0) : 0;
                const passRate = execTotal > 0 ? ((s?.executionSummary?.pass || 0) / execTotal * 100).toFixed(0) : 'N/A';
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.version}</span></td>
                    <td><span className={`badge badge-${p.status === 'active' ? 'success' : 'info'}`}>{p.status}</span></td>
                    <td>{p.test_case_count || s?.totalTestCases || 0}</td>
                    <td style={{ color: passRate === 'N/A' ? 'var(--text-secondary)' : passRate >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                      {passRate === 'N/A' ? 'N/A' : `${passRate}%`}
                    </td>
                    <td><Link to={`/projects/${p.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
