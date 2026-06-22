import React, { useEffect } from 'react';

const RightDrawer = ({ open, onClose, title, subtitle, width = 480, children, footer }) => {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: Math.min(width, window.innerWidth - 60),
        zIndex: 201,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 6, width: 32, height: 32, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)',
              flexShrink: 0, marginLeft: 12,
            }}
          >×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            flexShrink: 0, background: 'var(--bg-secondary)',
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default RightDrawer;
