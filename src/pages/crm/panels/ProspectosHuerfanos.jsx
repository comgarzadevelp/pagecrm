import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const ProspectosHuerfanos = ({ onAssignSuccess }) => {
  const [crmOrphans, setCrmOrphans] = useState([]);
  const [saeOrphans, setSaeOrphans] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [selectedSellerForLead, setSelectedSellerForLead] = useState({});

  useEffect(() => {
    fetchOrphansAndSellers();
  }, []);

  const fetchOrphansAndSellers = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      // 1. Fetch Orphans
      const resOrphans = await fetch(`${API_BASE}/api/crm/leads/orphans/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataOrphans = await resOrphans.json();
      if (resOrphans.ok) {
        setCrmOrphans(dataOrphans.crmOrphans || []);
        setSaeOrphans(dataOrphans.saeOrphans || []);
      } else {
        throw new Error(dataOrphans.message || 'Error al obtener leads huérfanos.');
      }

      // 2. Fetch Sellers
      const resSellers = await fetch(`${API_BASE}/api/crm/sellers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataSellers = await resSellers.json();
      if (resSellers.ok) {
        setSellers(dataSellers.sellers || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLead = async (leadId, isSaeOrphan, rawSaeKey) => {
    const sellerId = selectedSellerForLead[leadId];
    if (!sellerId) {
      alert('Por favor selecciona un vendedor antes de asignar.');
      return;
    }

    setAssigningId(leadId);
    const token = localStorage.getItem('token');

    try {
      if (isSaeOrphan) {
        // Para prospectos del SAE huérfanos, primero debemos crearlos en la base de datos CRM leads (como tipo crm_customer)
        // y asociarlos a este vendedor.
        const orphanItem = saeOrphans.find(o => o.id === leadId);
        
        // 1. Crear el lead a partir del cliente SAE
        const resCreate = await fetch(`${API_BASE}/api/crm/customers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: orphanItem.name,
            email: orphanItem.email,
            phone: orphanItem.phone,
            company: orphanItem.company,
            project: orphanItem.notes,
            notes: `Asignado manualmente desde leads huérfanos SAE. Clave SAE: ${rawSaeKey}`
          })
        });

        const dataCreate = await resCreate.json();
        if (!resCreate.ok) throw new Error(dataCreate.message || 'Error al crear cliente CRM desde SAE.');

        const createdLeadId = dataCreate.customer?.id;

        // 2. Asignar el lead recién creado al vendedor elegido
        const resAssign = await fetch(`${API_BASE}/api/crm/leads/${createdLeadId}/assign`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sellerId })
        });

        if (!resAssign.ok) {
          const dataAssign = await resAssign.json();
          throw new Error(dataAssign.message || 'Error al asignar prospecto.');
        }

        alert('Cliente del SAE importado y asignado exitosamente al vendedor.');
      } else {
        // Para prospectos del CRM huérfanos ya existentes, simplemente llamamos al endpoint de asignación normal
        const resAssign = await fetch(`${API_BASE}/api/crm/leads/${leadId}/assign`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sellerId })
        });

        if (!resAssign.ok) {
          const dataAssign = await resAssign.json();
          throw new Error(dataAssign.message || 'Error al asignar prospecto.');
        }

        alert('Prospecto asignado exitosamente al vendedor.');
      }

      // Volver a cargar la lista de huérfanos
      fetchOrphansAndSellers();
      if (onAssignSuccess) onAssignSuccess();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Ocurrió un error al realizar la asignación.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleSellerChange = (leadId, sellerId) => {
    setSelectedSellerForLead(prev => ({
      ...prev,
      [leadId]: sellerId
    }));
  };

  if (loading) {
    return (
      <div className="crm-loading-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner-mini" style={{ display: 'inline-block', width: '30px', height: '30px' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Cargando prospectos huérfanos...</p>
      </div>
    );
  }

  return (
    <div className="crm-orphans-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* SECCIÓN A: LEADS HUÉRFANOS DEL CRM */}
      <section className="crm-table-container glass">
        <div className="crm-table-header" style={{ marginBottom: '1rem' }}>
          <h2>Prospectos del CRM Sin Asignar</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Prospectos registrados a través de la web o WhatsApp que no tienen un asesor de ventas asignado.
          </p>
        </div>

        {error && (
          <div className="crm-login-error" style={{ margin: '1rem 0' }}>
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="crm-table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre del Prospecto</th>
                <th>Empresa / Origen</th>
                <th>Contacto</th>
                <th>Asignar a Asesor</th>
              </tr>
            </thead>
            <tbody>
              {crmOrphans.map(lead => (
                <tr key={lead.id} className="crm-row-item">
                  <td className="lead-date" style={{ fontSize: '0.8rem' }}>
                    {new Date(lead.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="lead-identity">
                    <strong>{lead.name || 'Prospecto Anónimo'}</strong>
                    <span className={`channel-badge-table ${lead.type}`} style={{ display: 'block', width: 'fit-content', marginTop: '4px', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>
                      {lead.type === 'popup_whatsapp' ? 'WhatsApp' : 'Formulario Web'}
                    </span>
                  </td>
                  <td className="lead-biz">
                    <span>{lead.company || 'Consumidor Final'}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div><i className="fas fa-phone-alt" style={{ fontSize: '0.75rem', color: 'var(--color-brand-accent)', marginRight: '4px' }}></i> {lead.phone}</div>
                    {lead.email && <div><i className="fas fa-envelope" style={{ fontSize: '0.75rem', color: 'var(--color-brand-accent)', marginRight: '4px' }}></i> {lead.email}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        className="seller-assign-select"
                        value={selectedSellerForLead[lead.id] || ''}
                        onChange={(e) => handleSellerChange(lead.id, e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', fontSize: '0.8rem', minWidth: '160px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">-- Seleccionar Asesor --</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn-primary-golden"
                        onClick={() => handleAssignLead(lead.id, false, null)}
                        disabled={assigningId === lead.id || !selectedSellerForLead[lead.id]}
                        style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        {assigningId === lead.id ? 'Asignando...' : 'Asignar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {crmOrphans.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#22c55e', marginBottom: '0.5rem', display: 'block' }}></i>
                    No hay prospectos huérfanos del CRM. ¡Excelente control!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECCIÓN B: CLIENTES HUÉRFANOS DEL SAE */}
      <section className="crm-table-container glass">
        <div className="crm-table-header" style={{ marginBottom: '1rem' }}>
          <h2>Clientes del SAE Sin Vendedor Asignado</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Clientes sincronizados desde la base de datos de Aspel SAE que no cuentan con clave de vendedor asociada en el sistema administrativo.
          </p>
        </div>

        <div className="crm-table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Clave SAE</th>
                <th>Razón Social (SAE)</th>
                <th>Contacto Registrado</th>
                <th>Estado de Cuentas</th>
                <th>Asignar y Crear en CRM</th>
              </tr>
            </thead>
            <tbody>
              {saeOrphans.map(lead => (
                <tr key={lead.id} className="crm-row-item">
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--color-brand-primary)' }}>
                    {lead.raw_sae_key}
                  </td>
                  <td className="lead-identity">
                    <strong>{lead.name}</strong>
                    <span style={{ display: 'block', width: 'fit-content', marginTop: '4px', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(212, 163, 89, 0.1)', color: 'var(--color-brand-primary)', fontWeight: 'bold' }}>
                      <i className="fas fa-sync"></i> Espejo Aspel SAE
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {lead.phone && <div><i className="fas fa-phone-alt" style={{ fontSize: '0.75rem', color: 'var(--color-brand-accent)', marginRight: '4px' }}></i> {lead.phone}</div>}
                    {lead.email && <div><i className="fas fa-envelope" style={{ fontSize: '0.75rem', color: 'var(--color-brand-accent)', marginRight: '4px' }}></i> {lead.email}</div>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {lead.notes}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        className="seller-assign-select"
                        value={selectedSellerForLead[lead.id] || ''}
                        onChange={(e) => handleSellerChange(lead.id, e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', fontSize: '0.8rem', minWidth: '160px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">-- Seleccionar Asesor --</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn-primary-golden"
                        onClick={() => handleAssignLead(lead.id, true, lead.raw_sae_key)}
                        disabled={assigningId === lead.id || !selectedSellerForLead[lead.id]}
                        style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        {assigningId === lead.id ? 'Asignando...' : 'Asignar Asesor'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {saeOrphans.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#22c55e', marginBottom: '0.5rem', display: 'block' }}></i>
                    No hay clientes huérfanos en Aspel SAE. ¡Todos tienen un vendedor asignado!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};

export default ProspectosHuerfanos;
