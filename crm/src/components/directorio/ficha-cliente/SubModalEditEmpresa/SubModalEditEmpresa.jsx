import React from 'react';
import './SubModalEditEmpresa.css';

export default function SubModalEditEmpresa({
  setShowEditCompanyModal,
  selectedCompanyId,
  setSelectedCompanyId,
  currentCustomer,
  companyNameInput,
  setCompanyNameInput,
  isLoadingCompanySuggestions,
  showCompanySuggestions,
  companySuggestions,
  handleSelectCompanySuggestion,
  companyRfcInput,
  setCompanyRfcInput,
  companyAddressInput,
  setCompanyAddressInput,
  companyCityInput,
  setCompanyCityInput,
  companyStateInput,
  setCompanyStateInput,
  handleUpdateCompany,
  isSavingCompany
}) {
  return (
    <div className="client-submodal-overlay" onClick={() => setShowEditCompanyModal(false)}>
      <div className="client-submodal-container" onClick={(e) => e.stopPropagation()}>
        <header className="submodal-header">
          <h3>Editar Datos de Empresa</h3>
          <button type="button" className="submodal-close" onClick={() => setShowEditCompanyModal(false)}>&times;</button>
        </header>
        <form onSubmit={handleUpdateCompany} className="submodal-form">
          {(selectedCompanyId || currentCustomer?.company_id) && (
            <div className="edit-company-warning-box">
              <i className="fas fa-exclamation-triangle edit-company-warning-icon" />
              <div>
                <strong className="edit-company-warning-title">Estás editando una empresa existente</strong>
                <p className="edit-company-warning-text">
                  Cualquier cambio en el RFC, dirección o nombre afectará <strong>globalmente</strong> a esta empresa y a todos los demás contactos vinculados a ella.
                </p>
              </div>
            </div>
          )}
          <div className="form-group-grid">
            <div className="form-group full-width">
              <label>Razón Social o Nombre comercial</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  value={companyNameInput}
                  onChange={(e) => {
                    setCompanyNameInput(e.target.value);
                    if (selectedCompanyId) setSelectedCompanyId(null);
                  }}
                  placeholder="Busca una empresa existente o escribe una nueva..."
                  autoComplete="off"
                />
                {isLoadingCompanySuggestions && (
                  <div className="suggestion-loading">Buscando empresas...</div>
                )}
                {showCompanySuggestions && (
                  <div className="autocomplete-suggestions">
                    {companySuggestions.map((comp) => (
                      <div
                        key={comp.id}
                        className="suggestion-item"
                        onClick={() => handleSelectCompanySuggestion(comp)}
                      >
                        <span className="suggestion-name">{comp.name}</span>
                        {comp.rfc && (
                          <span className="suggestion-meta">RFC: {comp.rfc}</span>
                        )}
                        {comp.address && (
                          <span className="suggestion-meta">{comp.address}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedCompanyId && (
                <span className="badge-existing-link">
                  <i className="fas fa-link" /> Empresa existente seleccionada (Se vinculará a esta)
                </span>
              )}
            </div>
            <div className="form-group full-width">
              <label>RFC</label>
              <input
                type="text"
                value={companyRfcInput}
                onChange={(e) => setCompanyRfcInput(e.target.value)}
                placeholder="RFC de la constructora"
              />
            </div>
            <div className="form-group full-width">
              <label>Dirección Fiscal / Oficina (Calle y número)</label>
              <input
                type="text"
                value={companyAddressInput}
                onChange={(e) => setCompanyAddressInput(e.target.value)}
                placeholder="Calle, Número Ext/Int, Colonia"
              />
            </div>
            <div className="form-group">
              <label>Municipio</label>
              <input
                type="text"
                value={companyCityInput}
                onChange={(e) => setCompanyCityInput(e.target.value)}
                placeholder="Ciudad o Delegación"
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <input
                type="text"
                value={companyStateInput}
                onChange={(e) => setCompanyStateInput(e.target.value)}
                placeholder="Estado de la república"
              />
            </div>
          </div>
          <footer className="submodal-footer">
            <button type="button" className="submodal-btn secondary" onClick={() => setShowEditCompanyModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="submodal-btn primary" disabled={isSavingCompany}>
              {isSavingCompany ? 'Guardando...' : 'Guardar Empresa'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
