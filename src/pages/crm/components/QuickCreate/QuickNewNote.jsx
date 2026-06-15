import React, { useState, useEffect } from 'react';
import { useUX } from '../../../../components/common/UXProvider';

export default function QuickNewNote({ API_BASE, onClose, userName, role }) {
  const { showToast } = useUX();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Entidad seleccionada (para vinculación)
  const [selectedEntity, setSelectedEntity] = useState(null); // null | { id, name, type, subtext, original }
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [allEntities, setAllEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar Clientes, Empresas y Contactos al montar
  useEffect(() => {
    const loadAllEntities = async () => {
      setLoadingEntities(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      try {
        const [resCust, resComp, resCont] = await Promise.all([
          fetch(`${API_BASE}/api/crm/customers`, { headers }),
          fetch(`${API_BASE}/api/crm/companies`, { headers }),
          fetch(`${API_BASE}/api/crm/contacts`, { headers })
        ]);
        
        const dataCust = await resCust.json();
        const dataComp = await resComp.json();
        const dataCont = await resCont.json();
        
        const list = [];
        
        // 1. Clientes
        if (dataCust.customers) {
          dataCust.customers.forEach(c => {
            list.push({
              id: c.id,
              name: c.name,
              subtext: c.company ? `Cliente de: ${c.company}` : 'Cliente Particular',
              type: 'client',
              original: c
            });
          });
        }
        
        // 2. Empresas
        if (dataComp.companies) {
          dataComp.companies.forEach(co => {
            list.push({
              id: co.id,
              name: co.name,
              subtext: co.alias ? `Empresa: ${co.alias}` : 'Empresa / Obra',
              type: 'company',
              original: co
            });
          });
        }
        
        // 3. Contactos
        if (dataCont.contacts) {
          dataCont.contacts.forEach(c => {
            list.push({
              id: c.id,
              name: c.name,
              subtext: c.position ? `Contacto: ${c.position}` : 'Contacto Físico',
              type: 'contact',
              original: c
            });
          });
        }
        
        setAllEntities(list);
      } catch (err) {
        console.error('Error cargando entidades para Nota Rápida:', err);
      } finally {
        setLoadingEntities(false);
      }
    };
    
    loadAllEntities();
  }, [API_BASE]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      showToast('Por favor completa el título y contenido de la nota.', 'warning');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('token');
    const linkedLabel = selectedEntity ? `${selectedEntity.name} (${selectedEntity.subtext})` : 'General / Ninguno';

    // 1. ESTRUCTURAR Y SUBIR ARCHIVO TXT (Contenedor de Recursos global)
    const fileContent = `==================================================
NOTA RÁPIDA / RECORDATORIO CRM
==================================================
Título: ${title.trim()}
Fecha de Creación: ${new Date().toLocaleString('es-MX')}
Creado por: ${userName || 'Usuario'} (${role || 'Ejecutivo'})
Vinculado a: ${linkedLabel}
--------------------------------------------------

Contenido:
${content.trim()}

==================================================`;

    try {
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const filename = `Nota_${(selectedEntity ? selectedEntity.name : 'General').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
      const file = new File([blob], filename, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', `Nota Rápida: ${title.trim()}`);
      formData.append('description', `Recordatorio rápido vinculado a: ${selectedEntity ? selectedEntity.name : 'General'}`);
      formData.append('category', 'general');

      const resFile = await fetch(`${API_BASE}/api/crm/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const fileData = await resFile.json();
      if (!resFile.ok) {
        throw new Error(fileData.message || 'Error al guardar la nota física en el contenedor.');
      }

      // 2. ACTUALIZAR TIMELINE / NOTAS DIRECTO EN DB (Doble Impacto Relacional)
      if (selectedEntity) {
        const newTimelineText = `[Nota Rápida]: ${title.trim()} - ${content.trim()}`;
        
        if (selectedEntity.type === 'client') {
          // timeline de Clientes
          const prevNotes = selectedEntity.original.notes || '';
          let general = '';
          let timeline = [];
          try {
            if (prevNotes.trim().startsWith('{')) {
              const parsed = JSON.parse(prevNotes);
              general = parsed.general || '';
              timeline = parsed.timeline || [];
            } else {
              general = prevNotes;
            }
          } catch (e) {
            general = prevNotes;
          }
          
          const updatedNotesPayload = JSON.stringify({
            general,
            timeline: [...timeline, {
              date: new Date().toISOString(),
              text: newTimelineText,
              author: userName || 'Ejecutivo'
            }]
          });

          await fetch(`${API_BASE}/api/crm/customers/${selectedEntity.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: selectedEntity.original.name,
              email: selectedEntity.original.email,
              phone: selectedEntity.original.phone,
              company: selectedEntity.original.company,
              project_type: selectedEntity.original.project_type,
              notes: updatedNotesPayload,
              status: selectedEntity.original.status || 'calificado'
            })
          });
          
        } else if (selectedEntity.type === 'company') {
          // timeline de Empresas
          const prevNotes = selectedEntity.original.notes || '';
          let general = '';
          let timeline = [];
          try {
            if (typeof prevNotes === 'object') {
              general = prevNotes.general || '';
              timeline = prevNotes.timeline || [];
            } else if (prevNotes.trim().startsWith('{')) {
              const parsed = JSON.parse(prevNotes);
              general = parsed.general || '';
              timeline = parsed.timeline || [];
            } else {
              general = prevNotes;
            }
          } catch (e) {
            general = prevNotes;
          }
          
          const updatedNotesPayload = JSON.stringify({
            general,
            timeline: [...timeline, {
              date: new Date().toISOString(),
              text: newTimelineText,
              author: userName || 'Ejecutivo'
            }]
          });

          await fetch(`${API_BASE}/api/crm/companies/${selectedEntity.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...selectedEntity.original,
              notes: updatedNotesPayload
            })
          });

        } else if (selectedEntity.type === 'contact') {
          // Notas planas de Contactos
          const prevNotes = selectedEntity.original.notes || '';
          const dateStr = new Date().toLocaleString('es-MX');
          const updatedNotes = `${prevNotes ? prevNotes + '\n\n' : ''}[Recordatorio Rápido - ${dateStr} por ${userName}]:\n${title.trim()} - ${content.trim()}`;

          await fetch(`${API_BASE}/api/crm/contacts/${selectedEntity.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: selectedEntity.original.name,
              position: selectedEntity.original.position,
              email: selectedEntity.original.email,
              phone: selectedEntity.original.phone,
              phone_alt: selectedEntity.original.phone_alt,
              whatsapp: selectedEntity.original.whatsapp,
              notes: updatedNotes
            })
          });
        }
      }

      showToast('¡Nota guardada y vinculada en el historial con éxito!', 'success');
      onClose(); // Cerrar modal

    } catch (err) {
      console.error('QuickNewNote error:', err);
      showToast(err.message || 'Error de conexión con el servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar entidades en base al buscador universal
  const filteredEntities = allEntities.filter(ent => {
    const term = searchQuery.toLowerCase();
    return (
      (ent.name && ent.name.toLowerCase().includes(term)) ||
      (ent.subtext && ent.subtext.toLowerCase().includes(term))
    );
  });

  return (
    <div className="quick-modal-fullscreen">
      <div className="quick-modal-header">
        <h3>Crear Nota Rápida</h3>
        <button type="button" className="quick-modal-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="quick-modal-body">
        <form onSubmit={handleSubmit} className="quick-form">
          <div className="quick-input-group">
            <label className="quick-input-label">Título de la Nota *</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Ej: Seguimiento llamada, Recordatorio cotización..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Buscador Universal con Autocomplete */}
          <div className="quick-input-group">
            <label className="quick-input-label">Vincular a Cliente, Obra, Contacto o Empresa</label>
            {selectedEntity ? (
              <div className="linked-badge">
                <div className="linked-badge-text">
                  <strong style={{ color: 'var(--color-brand-primary)' }}>{selectedEntity.name}</strong>
                  <span>{selectedEntity.subtext}</span>
                </div>
                <button
                  type="button"
                  className="linked-badge-remove"
                  onClick={() => {
                    setSelectedEntity(null);
                    setSearchQuery('');
                  }}
                  title="Desvincular"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="quick-input"
                  placeholder={loadingEntities ? "Cargando catálogo..." : "Escribe nombre de cliente, contacto o empresa..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  disabled={loadingEntities}
                />
                {showDropdown && searchQuery.trim() && (
                  <ul className="quick-autocomplete-dropdown">
                    {filteredEntities.length === 0 ? (
                      <li
                        className="quick-autocomplete-option"
                        style={{ cursor: 'pointer' }}
                        onMouseDown={() => {
                          setSelectedEntity({
                            id: 'temp',
                            name: searchQuery,
                            subtext: 'Texto Libre (Sin vincular a DB)',
                            type: 'free'
                          });
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                      >
                        Vincular como texto libre: <strong>"{searchQuery}"</strong>
                      </li>
                    ) : (
                      filteredEntities.slice(0, 10).map(ent => (
                        <li
                          key={`${ent.type}-${ent.id}`}
                          className="quick-autocomplete-option"
                          onMouseDown={() => {
                            setSelectedEntity(ent);
                            setSearchQuery('');
                            setShowDropdown(false);
                          }}
                        >
                          <strong>{ent.name}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {ent.type === 'client' && '👤 '}
                            {ent.type === 'company' && '🏢 '}
                            {ent.type === 'contact' && '👔 '}
                            {ent.subtext}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Cuerpo de la Nota / Recordatorio *</label>
            <textarea
              className="quick-input"
              rows="6"
              placeholder="Escribe aquí notas de la llamada, acuerdos o recordatorios comerciales..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="quick-tip-card">
            <i className="fas fa-file-alt" style={{ color: '#8b5cf6' }}></i>
            <span style={{ color: '#7c3aed' }}>
              <strong>Doble Impacto:</strong> Esta nota se convertirá en un archivo <strong>.txt</strong> en el Contenedor y además se guardará automáticamente en el historial/timeline del cliente, empresa o contacto seleccionado en la base de datos.
            </span>
          </div>
        </form>
      </div>

      <div className="quick-modal-footer">
        <button type="button" className="quick-btn-cancel" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="quick-btn-submit" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)' }} onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <div className="spinner-mini-fab"></div>
              <span>Creando Nota...</span>
            </>
          ) : (
            <>
              <i className="fas fa-file-signature"></i>
              <span>Crear Nota Rápida</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
