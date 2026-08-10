import React from 'react';
import styles from './PageHeader.module.css';

export default function PageHeader({
  icon,
  iconColor,
  title,
  subtitle,
  children,
  actionButton
}) {
  return (
    <header className={styles.headerContainer}>
      <div className={styles.titleGroup}>
        <h2 className={styles.title}>
          {icon && (
            <i 
              className={icon.startsWith('fa-') ? `fas ${icon}` : icon} 
              style={iconColor ? { color: iconColor } : undefined} 
            />
          )}
          <span>{title}</span>
        </h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {(children || actionButton) && (
        <div className={styles.actionGroup}>
          {children}
          {actionButton}
        </div>
      )}
    </header>
  );
}
