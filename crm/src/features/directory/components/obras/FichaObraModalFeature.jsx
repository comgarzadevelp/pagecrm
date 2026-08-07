import React, { useState, useEffect } from 'react';
import { useUX } from '../../../../components/common/UXProvider';
import RegistrarVisitaModal from '../../../../pages/crm/components/RegistrarVisitaModal';

export default function FichaObraModal({ obra, onClose, API_BASE, onObraUpdated }) {
  const { showToast } = useUX();
  const [details, setDetails] = useState(obra);
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'history'
  const [leadsHistory, setLeadsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showVisitaModal, setShowVisitaModal] = useState(false);

  useEffect(() => {
    setDetails(obra);
  }, [obra]);

  useEffect(() => {
    if (activeTab === 'history' && details?.id) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_BASE}/api/crm/obras/${details.id}/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setLeadsHistory(data.leads || []);
          } else {
            showToast('Error al cargar historial.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Error de conexión al cargar historial.', 'error');
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, details?.id, API_BASE]);

  return (
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '96%', padding: '1.5rem' }}>
        <button className="close-modal-btn" onClick={onClose} style={{ top: '1.25rem', right: '1.25rem' }}>&times;</button>
        
        <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand-primary, #05393a)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-hard-hat" style={{ color: 'var(--color-brand-accent, #d4a359)' }}></i> 
              {details.name}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Detalles y Ficha Técnica de la Obra</p>
          </div>
          <button className="btn-primary-golden" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowVisitaModal(true)}>
            <i className="fas fa-map-marker-alt" /> Registrar Visita
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem', gap: '1.5rem' }}>
          <button 
            type="button" 
            onClick={() => setActiveTab('details')}
            style={{
              padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'details' ? '3px solid var(--color-brand-primary, #05393a)' : '3px solid transparent', color: activeTab === 'details' ? 'var(--color-brand-primary, #05393a)' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i> Detalles Generales
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '3px solid var(--color-brand-primary, #05393a)' : '3px solid transparent', color: activeTab === 'history' ? 'var(--color-brand-primary, #05393a)' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-history" style={{ marginRight: '6px' }}></i> Historial de Visitas / Prospectos
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {activeTab === 'details' && (
            <>
              {/* Evidencia Fotográfica (Actual) */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>Última Foto de Evidencia</h4>
                {details.evidence_photo_url ? (
                  <a href={details.evidence_photo_url.startsWith('http') ? details.evidence_photo_url : `${API_BASE}${details.evidence_photo_url}`} target="_blank" rel="noreferrer">
                    <img 
                      src={details.evidence_photo_url.startsWith('http') ? details.evidence_photo_url : `${API_BASE}${details.evidence_photo_url}`} 
                      alt="Evidencia" 
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </a>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>
                    <i className="fas fa-camera" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay foto de evidencia cargada directamente.</p>
                  </div>
                )}
                {details.evidence_text && (
                  <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                    <strong>Notas:</strong> {details.evidence_text}
                  </p>
                )}
              </div>

              {/* Ubicación GPS */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>📍 Ubicación GPS de la Obra</h4>
                {details.latitude && details.longitude ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-map-marker-alt" style={{ color: '#ef4444', fontSize: '1.5rem' }}></i>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Lat: {details.latitude}, Lng: {details.longitude}</div>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${details.latitude},${details.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 'bold', display: 'inline-block', marginTop: '2px' }}>
                        Abrir en Google Maps
                      </a>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>No se capturó ubicación GPS.</p>
                )}
              </div>

              {/* Empresas Vinculadas */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>🏢 Empresas que trabajan en esta Obra</h4>
                {details.obra_companies && details.obra_companies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {details.obra_companies.map(oc => (
                      <div key={oc.company.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <i className="fas fa-building" style={{ color: 'var(--color-brand-primary)' }}></i>
                        <strong style={{ color: '#0f172a' }}>{oc.company.name}</strong>
                        {oc.role && <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>({oc.role})</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>No hay empresas vinculadas.</p>
                )}
              </div>

              {/* Contactos Vinculados */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>👤 Persona Encargada / Contactos</h4>
                {details.obra_contacts && details.obra_contacts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {details.obra_contacts.map(oc => (
                      <div key={oc.contact.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <i className="fas fa-user" style={{ color: 'var(--color-brand-primary)' }}></i>
                          <strong style={{ color: '#0f172a' }}>{oc.contact.name}</strong>
                          {oc.role && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({oc.role})</span>}
                          {oc.company && (
                            <span style={{ 
                              fontSize: '0.725rem', 
                              background: '#f1f5f9', 
                              color: '#334155', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              border: '1px solid #e2e8f0',
                              marginLeft: 'auto',
                              fontWeight: '600'
                            }}>
                              <i className="fas fa-building" style={{ marginRight: '4px', fontSize: '0.7rem' }}></i>
                              {oc.company.name}
                            </span>
                          )}
                        </div>
                        {oc.contact.phone && <div style={{ fontSize: '0.8rem', color: '#475569', marginLeft: '1.25rem' }}><strong>Tel:</strong> {oc.contact.phone}</div>}
                        {oc.contact.email && <div style={{ fontSize: '0.8rem', color: '#475569', marginLeft: '1.25rem' }}><strong>Email:</strong> {oc.contact.email}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>No hay contactos vinculados.</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>Cargando historial de la obra...</p>
                </div>
              ) : leadsHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <i className="fas fa-history" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '10px' }}></i>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>No hay visitas ni prospectos registrados para esta obra aún.</p>
                </div>
              ) : (
                <div className="crm-timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {leadsHistory.map((lead) => {
                    const reqTitle = lead.notes?.requirement_title || 'Requerimiento General';
                    const generalNote = lead.notes?.general || '';
                    
                    // Find evidence nodes in lead's notes timeline
                    const timelineNodes = lead.notes?.timeline || [];
                    const evidenceNode = timelineNodes.find(node => node.type === 'evidence');
                    
                    const eventDate = new Date(lead.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <div key={lead.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '4px' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}><i className="fas fa-calendar-alt"></i> {eventDate}</span>
                            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: '600' }}>
                              Estatus: {lead.status?.toUpperCase() || 'NUEVO'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '500' }}>
                            <i className="fas fa-user-tie"></i> Vendedor: <strong>{lead.assigned_to?.name || 'N/A'}</strong>
                          </span>
                        </div>

                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                          <h5 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>
                            🛍️ {reqTitle}
                          </h5>
                          <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span><strong>Empresa:</strong> {lead.company || 'Particular'}</span>
                            <span><strong>Contacto:</strong> {lead.name} ({lead.phone})</span>
                          </div>
                          {generalNote && (
                            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '8px', borderRadius: '4px', borderLeft: '3px solid var(--color-brand-accent, #d4a359)', fontStyle: 'italic' }}>
                              "{generalNote}"
                            </p>
                          )}
                        </div>

                        {/* Specific Visit Evidence */}
                        {evidenceNode && (
                          <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {evidenceNode.allPhotos && evidenceNode.allPhotos.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {evidenceNode.allPhotos.map((url, i) => (
                                  <a key={i} href={url.startsWith('http') ? url : `${API_BASE}${url}`} target="_blank" rel="noreferrer" style={{ width: '80px', height: '60px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                    <img src={url.startsWith('http') ? url : `${API_BASE}${url}`} alt="visita" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                              <i className="fas fa-map-marker-alt" style={{ color: evidenceNode.gps ? '#16a34a' : '#ef4444' }}></i>
                              <span>
                                {evidenceNode.gps 
                                  ? `GPS Registrado en visita (Lat: ${evidenceNode.gps.lat.toFixed(4)}, Lng: ${evidenceNode.gps.lng.toFixed(4)})`
                                  : `GPS Omitido en visita: ${evidenceNode.text || 'Sin detalles'}`
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>

        <RegistrarVisitaModal
          isOpen={showVisitaModal}
          onClose={() => setShowVisitaModal(false)}
          entityType="obra"
          entityId={details.id}
          entityName={details.name}
        />
      </div>
    </div>
  );
}
