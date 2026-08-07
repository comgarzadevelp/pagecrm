import React, { useState } from 'react';
import './MobileNavigation.css';

const DEFAULT_PREFERRED_KEYS = ['inicio', 'ventas', 'directory', 'quotes', 'dashboard', 'personal-agenda', 'agenda'];

const MobileNavigation = ({
  items = [],
  preferredKeys = DEFAULT_PREFERRED_KEYS,
  primaryCount = 3,
  activeTab,
  setActiveTab,
  handleLogout
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isClosingMoreMenu, setIsClosingMoreMenu] = useState(false);

  const closeMoreMenu = () => {
    setIsClosingMoreMenu(true);
    setTimeout(() => {
      setShowMoreMenu(false);
      setIsClosingMoreMenu(false);
    }, 250); // Matches CSS animation duration
  };

  // Ordenar los ítems recibidos según la prioridad preferida
  const sortedItems = [...items].sort((a, b) => {
    const idxA = preferredKeys.indexOf(a.key);
    const idxB = preferredKeys.indexOf(b.key);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const primaryMobileTabs = sortedItems.slice(0, primaryCount);
  const secondaryMobileTabs = sortedItems.slice(primaryCount);

  return (
    <>
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="crm-mobile-bottom-nav hide-on-print">
        {primaryMobileTabs.map(item => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.key);
                closeMoreMenu();
              }}
            >
              <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}

        {/* "Más" Button */}
        {secondaryMobileTabs.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item ${showMoreMenu ? 'active' : ''}`}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <i className="fas fa-ellipsis-h" />
            <span>Más</span>
          </button>
        )}
      </nav>

      {/* MOBILE MORE MENU DRAWER (BOTTOM SHEET) */}
      {showMoreMenu && (
        <div className={`crm-mobile-more-overlay ${isClosingMoreMenu ? 'closing' : ''}`} onClick={closeMoreMenu}>
          <div className={`crm-mobile-more-sheet glass ${isClosingMoreMenu ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <div className="sheet-handle" />
              <h3>Menú de Módulos</h3>
              <button type="button" className="btn-close-sheet" onClick={closeMoreMenu}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="sheet-content">
              {secondaryMobileTabs.length > 0 && (
                <div className="sheet-grid">
                  {secondaryMobileTabs.map(item => {
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`sheet-grid-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setActiveTab(item.key);
                          closeMoreMenu();
                        }}
                      >
                        <div className="icon-box">
                          <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
                        </div>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="sheet-actions">
                <button type="button" className="btn-sheet-action btn-logout" onClick={() => { handleLogout(); closeMoreMenu(); }}>
                  <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;
