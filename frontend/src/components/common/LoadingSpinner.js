import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    gap: 14,
    pointerEvents: 'none',
  }}>
    <div className="spinner" style={{ width: 40, height: 40 }} />
    <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>{message}</p>
  </div>
);

export default LoadingSpinner;
