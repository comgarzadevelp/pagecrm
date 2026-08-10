import React from 'react';
import styles from './PremiumSegmentedFilter.module.css';

export default function PremiumSegmentedFilter({
  options = [],
  activeKey,
  onChange,
  label = ''
}) {
  return (
    <div className={styles.segmentedFilterContainer}>
      {label && <span className={styles.filterLabel}>{label}</span>}
      <div className={styles.segmentedFilterPills}>
        {options.map((opt) => {
          const isActive = activeKey === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              className={`${styles.pillBtn} ${isActive ? styles.active : ''}`}
              onClick={() => onChange(opt.key)}
              style={{
                '--active-color': opt.color || '#05393A',
                '--active-bg': opt.bgActive || 'rgba(5, 57, 58, 0.08)'
              }}
            >
              {opt.key !== 'all' && opt.color && (
                <span 
                  className={styles.indicatorDot} 
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span className={styles.pillLabel}>{opt.label}</span>
              {typeof opt.count === 'number' && (
                <span className={styles.countBadge}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
