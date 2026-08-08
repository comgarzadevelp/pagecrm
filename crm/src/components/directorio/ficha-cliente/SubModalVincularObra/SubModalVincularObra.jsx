import React from 'react';

export default function SubModalVincularObra({
  setShowEditObraModal,
  obraSearchInput,
  setObraSearchInput,
  selectedObraId,
  setSelectedObraId,
  isLoadingObraSuggestions,
  showObraSuggestions,
  obraSuggestions,
  handleSelectObraSuggestion,
  obraAddressInput,
  setObraAddressInput,
  obraStatusInput,
  setObraStatusInput,
  handleSaveObra,
  isSavingObra
}) {
  return (
    <div className="client-submodal-overlay" onClick={() => setShowEditObraModal(false)}>
      <div className="client-submodal-container" onClick={(e) => e.stopPropagation()}>
        <header className="submodal-header">
          <h3>Vincular o Agregar Obra / Proyecto</h3>
          <button type="button" className="submodal-close" onClick={() => setShowEditObraModal(false)}>&times;</button>
        </header>
        <form onSubmit={handleSaveObra} className="submodal-form">
          <div className="form-group-grid">
            <div className="form-group full-width">
              <label>Nombre de la Obra o Proyecto</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  value={obraSearchInput}
                  onChange={(e) => {
                    setObraSearchInput(e.target.value);
                    if (selectedObraId) setSelectedObraId(null);
                  }}
                  placeholder="Busca una obra existente o escribe una nueva..."
                  autoComplete="off"
                />
                {isLoadingObraSuggestions && (
                  <div className="suggestion-loading">Buscando obras...</div>
                )}
                {showObraSuggestions && (
                  <div className="autocomplete-suggestions">
                    {obraSuggestions.map((o) => (
                      <div
                        key={o.id}
                        className="suggestion-item"
                        onClick={() => handleSelectObraSuggestion(o)}
                      >
                        <span className="suggestion-name">{o.name}</span>
                        {o.address && (
                          <span className="suggestion-meta">{o.address}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedObraId && (
                <span className="badge-existing-link">
                  <i className="fas fa-link" /> Obra existente seleccionada (Se vinculará a esta)
                </span>
              )}
            </div>
            <div className="form-group full-width">
              <label>Dirección Física de la Obra</label>
              <input
                type="text"
                value={obraAddressInput}
                onChange={(e) => setObraAddressInput(e.target.value)}
                placeholder="Calle, Número, Colonia, Municipio"
                disabled={!!selectedObraId}
              />
            </div>
            {!selectedObraId && (
              <div className="form-group full-width">
                <label>Estado de la Obra</label>
                <select
                  value={obraStatusInput}
                  onChange={(e) => setObraStatusInput(e.target.value)}
                >
                  <option value="En Construcción">En Construcción</option>
                  <option value="Preventa">Preventa</option>
                  <option value="Concluida">Concluida</option>
                  <option value="Detenida">Detenida</option>
                </select>
              </div>
            )}
          </div>
          <footer className="submodal-footer">
            <button type="button" className="submodal-btn secondary" onClick={() => setShowEditObraModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="submodal-btn primary" disabled={isSavingObra}>
              {isSavingObra ? 'Guardando...' : 'Vincular Obra'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
