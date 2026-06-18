import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import api from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackButton from '../components/common/BackButton';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#94a3b8'];
const STATUS_COLORS = { pass: '#10b981', fail: '#ef4444', blocked: '#f59e0b', skipped: '#6366f1', pending: '#94a3b8' };

const Analytics = () => {
  const { id: projectId } = useParams();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [testers, setTesters] = useState([]);
  const [defects, setDefects] = useState([]);
  const [suiteReport, setSuiteReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [cacheInfo, setCacheInfo] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/projects/${projectId}/analytics/summary`),
      api.get(`/projects/${projectId}/analytics/trends?days=${days}`),
      api.get(`/projects/${projectId}/analytics/testers`),
      api.get(`/projects/${projectId}/analytics/defects`),
      api.get(`/projects/${projectId}/analytics/suites`),
    ]).then(([s, t, te, d, sr]) => {
      setSummary(s.data);
      setTrends(t.data.data || []);
      setTesters(te.data.data || []);
      setDefects(d.data.data || []);
      setSuiteReport(sr.data.data || []);
      setCacheInfo({
        summary: s.data.fromCache,
        trends: t.data.fromCache,
        testers: te.data.fromCache,
        defects: d.data.fromCache,
      });
    }).finally(() => setLoading(false));
  }, [projectId, days]);

  const pieData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.executionSummary || {}).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [summary]);

  const priorityData = useMemo(() => (summary?.priorityDistribution || []).map(r => ({
    name: r.priority.charAt(0).toUpperCase() + r.priority.slice(1),
    count: parseInt(r.count),
  })), [summary]);

  const testerBarData = useMemo(() => testers.map(t => ({
    name: t.username,
    passed: parseInt(t.passed),
    failed: parseInt(t.failed),
    total: parseInt(t.total),
  })), [testers]);

  if (loading) return <LoadingSpinner message="Loading analytics..." />;

  const execTotal = Object.values(summary?.executionSummary || {}).reduce((a, b) => a + b, 0);
  const passRate = execTotal > 0 ? ((summary?.executionSummary?.pass || 0) / execTotal * 100).toFixed(1) : 0;

  return (
    <div>
      <BackButton to={`/projects/${projectId}`} label="Back to Project" />
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <Link to={`/projects/${projectId}`}>Project</Link> / Analytics
          </div>
          <h1>Analytics & Reports</h1>
        </div>
        {Object.values(cacheInfo).some(Boolean) && (
          <span style={{ fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: 12 }}>
            ⚡ Cached (15min TTL)
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Total Test Cases</div>
          <div className="value">{summary?.totalTestCases || 0}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="label">Pass Rate</div>
          <div className="value" style={{ color: parseFloat(passRate) >= 80 ? 'var(--success)' : 'var(--danger)' }}>{passRate}%</div>
          <div className="sub">{execTotal} executions</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="label">Failures</div>
          <div className="value" style={{ color: 'var(--danger)' }}>{summary?.executionSummary?.fail || 0}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="label">Blocked</div>
          <div className="value" style={{ color: 'var(--warning)' }}>{summary?.executionSummary?.blocked || 0}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {/* Pie - Status Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Test Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={95} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No execution data yet</p></div>}
        </div>

        {/* Bar - Priority Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Test Cases by Priority</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Test Cases" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No data</p></div>}
        </div>
      </div>

      {/* Line - Trends */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Execution Trends</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 14, 30, 60].map(d => (
              <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
        </div>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={2} dot={false} name="Passed" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
              <Line type="monotone" dataKey="blocked" stroke="#f59e0b" strokeWidth={2} dot={false} name="Blocked" />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Total" />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="empty-state"><p>No trend data for this period</p></div>}
      </div>

      {/* Suite-level Report */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Suite Execution Report</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Suite</th>
              <th>Total Runs</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Blocked</th>
              <th>Skipped</th>
              <th>Pass Rate</th>
              <th>Last Run</th>
            </tr>
          </thead>
          <tbody>
            {suiteReport.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No suites found</td></tr>
            ) : suiteReport.map(s => {
              const rate = parseFloat(s.pass_rate) || 0;
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.total_runs}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{s.passed}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.failed}</td>
                  <td style={{ color: 'var(--warning)' }}>{s.blocked}</td>
                  <td style={{ color: 'var(--info)' }}>{s.skipped}</td>
                  <td>
                    {parseInt(s.total_runs) === 0
                      ? <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Not run</span>
                      : <span style={{ fontWeight: 600, color: rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                          {rate}%
                        </span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-2">
        {/* Tester Progress */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Execution by Tester</h3>
          {testerBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={testerBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" name="Passed" fill="#10b981" stackId="a" />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No data</p></div>}
        </div>

        {/* Defect Density */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Defect Density by Type</h3>
          <table className="table">
            <thead><tr><th>Type</th><th>Executions</th><th>Failures</th><th>Defect Rate</th></tr></thead>
            <tbody>
              {defects.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data</td></tr>
              ) : defects.map(d => (
                <tr key={d.type}>
                  <td>{d.type}</td>
                  <td>{d.total_executions}</td>
                  <td>{d.failures}</td>
                  <td>
                    <span style={{ color: parseFloat(d.defect_rate) > 20 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {d.defect_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
