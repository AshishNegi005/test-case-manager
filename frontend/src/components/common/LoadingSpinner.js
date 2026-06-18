import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '16px' }}>
    <div className="spinner" />
    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{message}</p>
  </div>
);

export default LoadingSpinner;
