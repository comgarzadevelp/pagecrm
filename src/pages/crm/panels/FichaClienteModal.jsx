import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import TabPerfil from '../components/FichaCliente/TabPerfil';
import TabCotizaciones from '../components/FichaCliente/TabCotizaciones';
import TabHistorial from '../components/FichaCliente/TabHistorial';
import '../components/FichaCliente/FichaCliente.css';

export default function FichaClienteModal({
  selectedCustomer,
  onClose,
  role,
  API_BASE,
  fetchCustomers,
  handleLoadPastQuote
}) {
  const { showToast } = useUX();
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [loadingCustomerQuotes, setLoadingCustomerQuotes] = useState(false);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [loadingLinkedContacts, setLoadingLinkedContacts] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState('profile');
  const [currentCustomer, setCurrentCustomer] = useState(selectedCustomer);

  useEffect(() => {
    if (selectedCustomer) {
      setCurrentCustomer(selectedCustomer);
      fetchCustomerQuotes(selectedCustomer.id);
      fetchLinkedContacts(selectedCustomer.id);
      setActiveCustomerTab('profile');
    }
  }, [selectedCustomer]);

  const fetchLinkedContacts = async (companyOrCustomerId) => {
    const isCompany = currentCustomer?.isCompany || selectedCustomer?.isCompany;
    if (!isCompany) {
      setLinkedContacts([]);
      return;
    }
    setLoadingLinkedContacts(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies/${companyOrCustomerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLinkedContacts(data.linkedContacts || []);
      } else {
        setLinkedContacts([]);
      }
    } catch (err) {
      console.error('Error fetching linked contacts:', err);
      setLinkedContacts([]);
    } finally {
      setLoadingLinkedContacts(false);
    }
  };

  const fetchCustomerQuotes = async (customerId) => {
    setLoadingCustomerQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCustomerQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Error fetching customer quotes:', err);
    } finally {
      setLoadingCustomerQuotes(false);
    }
  };

  if (!currentCustomer) return null;

  return (
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content customer-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '96%' }}>
        <button className="close-modal-btn" onClick={onClose}>&times;</button>

        <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`channel-badge contact_form`} style={{ background: 'var(--color-brand-primary)', color: '#ffffff' }}>
              Ficha de Cliente
            </span>
            <span className={`status-badge-timeline ${currentCustomer.status || 'calificado'}`} style={currentCustomer.status === 'pendiente_revision' ? { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' } : {}}>
              {currentCustomer.status === 'pendiente_revision' ? 'PENDIENTE DE REVISIÓN' : (currentCustomer.status || 'Calificado').toUpperCase()}
            </span>
            {currentCustomer.id && currentCustomer.id.startsWith('sae-') && (
              <span style={{
                fontSize: '0.7rem',
                background: 'rgba(212, 163, 89, 0.12)',
                color: 'var(--color-brand-primary)',
                border: '1px solid rgba(212, 163, 89, 0.3)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-database" style={{ fontSize: '0.65rem' }}></i> SINCRONIZADO DESDE SAE
              </span>
            )}
          </div>
          <h2 style={{ marginTop: '0.5rem', fontFamily: 'var(--font-primary)' }}>{currentCustomer.name}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            {currentCustomer.company ? `Constructora: ${currentCustomer.company}` : 'Particular / Consumidor'}
          </p>
        </div>

        {/* TAB SELECTOR HEADER */}
        <div className="customer-modal-tabs">
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('profile')}
          >
            <i className="fas fa-user-edit"></i> Perfil
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('contacts')}
          >
            <i className="fas fa-users"></i> Contactos Vinculados ({linkedContacts.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('quotes')}
          >
            <i className="fas fa-file-invoice-dollar"></i> Cotizaciones B2B ({customerQuotes.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('notes')}
          >
            <i className="fas fa-comment-alt"></i> Notas / Historial
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: '320px', paddingTop: '1rem' }}>

          {/* TAB 1: PROFILE & EDIT */}
          {activeCustomerTab === 'profile' && (
            <TabPerfil 
              currentCustomer={currentCustomer}
              setCurrentCustomer={setCurrentCustomer}
              fetchCustomers={fetchCustomers}
              API_BASE={API_BASE}
              role={role}
            />
          )}

          {/* TAB 2: NESTED QUOTES */}
          {activeCustomerTab === 'quotes' && (
            <TabCotizaciones
              loadingCustomerQuotes={loadingCustomerQuotes}
              customerQuotes={customerQuotes}
              handleLoadPastQuote={handleLoadPastQuote}
              onClose={onClose}
            />
          )}

          {/* TAB 3: CONTACTOS VINCULADOS */}
          {activeCustomerTab === 'contacts' && (
            <div className="customer-quotes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                <i className="fas fa-users" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Contactos Vinculados
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                Representantes y personas de contacto asociadas a esta empresa según el SAE y la DB CRM.
              </p>

              {loadingLinkedContacts ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando contactos vinculados...</p>
                </div>
              ) : linkedContacts.length === 0 ? (
                <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                  <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                  <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay contactos vinculados a esta empresa.</p>
                </div>
              ) : (
                <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {linkedContacts.map((lc, idx) => {
                    const contact = lc.contact || lc;
                    const roleName = lc.role || 'Contacto';
                    return (
                      <div key={idx} className="contact-card glass" style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(212, 163, 89, 0.15)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(212, 163, 89, 0.02) 100%)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--color-brand-primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}>
                            {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)' }}>{contact.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-primary)', fontWeight: '600' }}>
                              {contact.position || roleName}
                            </span>
                          </div>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                          {contact.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <i className="fas fa-phone" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                              <span>{contact.phone}</span>
                              <a
                                href={`https://wa.me/52${contact.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ marginLeft: 'auto', color: '#25d366', fontSize: '0.85rem' }}
                                title="Enviar WhatsApp"
                              >
                                <i className="fab fa-whatsapp"></i>
                              </a>
                            </div>
                          )}
                          {contact.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                              <i className="fas fa-envelope" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                              <a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contact.email}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: OBSERVACIONES Y NOTAS */}
          {activeCustomerTab === 'notes' && (
            <TabHistorial 
              currentCustomer={currentCustomer}
              setCurrentCustomer={setCurrentCustomer}
              fetchCustomers={fetchCustomers}
              API_BASE={API_BASE}
              role={role}
            />
          )}

        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
