import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'tester' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = useCallback((e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [form, register, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧪</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Join TestCase Manager</p>
        </div>
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input name="username" className="form-control" value={form.username} onChange={handleChange} required minLength={3} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} required minLength={8} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" className="select" value={form.role} onChange={handleChange}>
                <option value="tester">Tester</option>
                <option value="test-lead">Test Lead</option>
                <option value="read-only">Read Only</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
