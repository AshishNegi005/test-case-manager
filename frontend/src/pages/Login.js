import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_USERS = [
  { label: 'Admin', email: 'admin@demo.com', password: 'Test@1234', color: '#fee2e2', textColor: '#dc2626' },
  { label: 'Test Lead', email: 'testlead@demo.com', password: 'Test@1234', color: '#fef3c7', textColor: '#d97706' },
  { label: 'Tester', email: 'tester@demo.com', password: 'Test@1234', color: '#dbeafe', textColor: '#1d4ed8' },
  { label: 'Read Only', email: 'readonly@demo.com', password: 'Test@1234', color: '#f1f5f9', textColor: '#475569' },
];

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = useCallback((e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [form, login, navigate]);

  const quickLogin = useCallback(async (demo) => {
    setForm({ email: demo.email, password: demo.password });
    setLoading(true);
    try {
      await login(demo.email, demo.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Demo login failed — ensure backend and seed are run');
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧪</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>TestCase Manager</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to your account</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} required placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            Don't have an account? <Link to="/register">Register</Link>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>DEMO QUICK LOGIN</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_USERS.map(d => (
              <button key={d.label} onClick={() => quickLogin(d)} disabled={loading}
                style={{ padding: '10px', border: `1px solid ${d.color}`, background: d.color, color: d.textColor, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {d.label}<br /><span style={{ fontSize: 10, fontWeight: 400 }}>{d.email}</span>
              </button>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>All demo passwords: Test@1234</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
