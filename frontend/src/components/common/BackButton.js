import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ to, label }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        marginBottom: 16,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-secondary)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      ← {label || 'Back'}
    </button>
  );
};

export default BackButton;
