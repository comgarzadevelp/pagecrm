import React from 'react';
import styles from './SearchInput.module.css';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  style = {},
  onClear
}) {
  return (
    <div className={`${styles.searchContainer} ${className}`} style={style}>
      <i className={`fas fa-search ${styles.searchIcon}`} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
      />
      {value && onClear && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClear}
          title="Limpiar búsqueda"
        >
          <i className="fas fa-times" />
        </button>
      )}
    </div>
  );
}
