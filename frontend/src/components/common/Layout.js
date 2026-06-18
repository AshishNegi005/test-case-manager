import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/projects', icon: '📁', label: 'Projects' },
  ];

  const roleBadge = {
    'admin': { bg: '#fee2e2', color: '#dc2626' },
    'test-lead': { bg: '#fef3c7', color: '#d97706' },
    'tester': { bg: '#dbeafe', color: '#1d4ed8' },
    'read-only': { bg: '#f1f5f9', color: '#475569' },
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 60,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🧪</span>
          {sidebarOpen && <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>TCM System</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            })}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </NavLink>
          ))}
          {isAdmin() && (
            <NavLink to="/users" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            })}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>👥</span>
              {sidebarOpen && 'Users'}
            </NavLink>
          )}
        </nav>

        {/* User info */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          {sidebarOpen && user && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{user.email}</div>
              <span style={{
                ...roleBadge[user.role],
                padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              }}>{user.role}</span>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
            <span>🚪</span>{sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: 56, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)' }}>☰</button>
          <div style={{ flex: 1 }} />
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>

        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
