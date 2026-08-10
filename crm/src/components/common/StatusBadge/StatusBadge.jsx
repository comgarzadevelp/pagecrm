import React from 'react';
import styles from './StatusBadge.module.css';

const VARIANT_MAP = {
  success: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  warning: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  danger: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  info: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  neutral: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  brand: { bg: 'rgba(5, 57, 58, 0.08)', color: '#05393a', border: 'rgba(5, 57, 58, 0.2)' }
};

export default function StatusBadge({
  label,
  variant = 'neutral',
  icon,
  customColor,
  customBg,
  className = '',
  size = 'medium' // 'small' | 'medium' | 'large'
}) {
  const preset = VARIANT_MAP[variant] || VARIANT_MAP.neutral;

  const badgeStyle = {
    backgroundColor: customBg || preset.bg,
    color: customColor || preset.color,
    borderColor: customBg ? `${customBg}55` : preset.border
  };

  const sizeClass = styles[size] || styles.medium;

  return (
    <span className={`${styles.badge} ${sizeClass} ${className}`} style={badgeStyle}>
      {icon && (
        <i 
          className={icon.startsWith('fa-') ? `fas ${icon}` : icon} 
          style={{ fontSize: '0.7em', marginRight: '4px' }} 
        />
      )}
      <span>{label}</span>
    </span>
  );
}
