import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ to }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '5px 12px',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        marginBottom: 16,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Back
    </button>
  );
};

export default BackButton;
