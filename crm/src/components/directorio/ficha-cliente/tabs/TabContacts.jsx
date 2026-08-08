import React from 'react';

export default function TabContacts({
  currentCustomer,
  loadingLinkedContacts,
  linkedContacts,
  loadingLinkedCompanies,
  linkedCompanies
}) {
  return (
    <div className="customer-quotes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {currentCustomer.isCompany ? (
        <>
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
          ) : (() => {
            const oficinaContacts = linkedContacts.filter(lc => {
              const contact = lc.contact || lc;
              return contact.contact_type !== 'campo';
            });
            const campoContacts = linkedContacts.filter(lc => {
              const contact = lc.contact || lc;
              return contact.contact_type === 'campo';
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* SECCIÓN OFICINA */}
                <div>
                  <h5 style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.9rem',
                    color: 'var(--color-brand-primary)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '0.5rem'
                  }}>
                    <i className="fas fa-building" style={{ color: 'var(--color-brand-primary)' }}></i> Contactos de Oficina ({oficinaContacts.length})
                  </h5>
                  {oficinaContacts.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay contactos de oficina.</p>
                  ) : (
                    <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {oficinaContacts.map((lc, idx) => {
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
                              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{contact.name}</strong>
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
                                  <a
                                    href={`mailto:${(() => {
                                      const emailStr = contact.email.trim();
                                      const match = emailStr.match(/<([^>]+)>/);
                                      if (match && match[1]) return match[1].trim();
                                      const tokens = emailStr.replace(/[,;]/g, ' ').split(/\s+/);
                                      const firstEmail = tokens.find(t => t.includes('@'));
                                      return firstEmail ? firstEmail.trim() : emailStr;
                                    })()}`}
                                    style={{ color: 'inherit', textDecoration: 'none' }}
                                  >
                                    {contact.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SECCIÓN CAMPO */}
                <div>
                  <h5 style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: '0.9rem',
                    color: '#b45309',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '0.5rem'
                  }}>
                    <i className="fas fa-hard-hat" style={{ color: '#eab308' }}></i> Contactos de Campo / Obra ({campoContacts.length})
                  </h5>
                  {campoContacts.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay contactos de campo u obra.</p>
                  ) : (
                    <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {campoContacts.map((lc, idx) => {
                        const contact = lc.contact || lc;
                        const roleName = lc.role || 'Contacto';
                        return (
                          <div key={idx} className="contact-card glass" style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(234, 179, 8, 0.25)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(234, 179, 8, 0.05) 100%)',
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
                                background: '#eab308',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}>
                                {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{contact.name}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>
                                  {contact.position || roleName}
                                </span>
                              </div>
                            </div>
                            <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                              {contact.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <i className="fas fa-phone" style={{ color: '#eab308', width: '12px' }}></i>
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
                                  <i className="fas fa-envelope" style={{ color: '#eab308', width: '12px' }}></i>
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
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
            <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Empresas Vinculadas
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
            Constructoras, desarrolladoras o empresas asociadas a este cliente.
          </p>

          {loadingLinkedCompanies ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando empresas vinculadas...</p>
            </div>
          ) : linkedCompanies.length === 0 ? (
            <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <i className="fas fa-building" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
              <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay empresas vinculadas a este contacto.</p>
            </div>
          ) : (
            <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {linkedCompanies.map((lc, idx) => {
                const company = lc.company || lc;
                const roleName = lc.role || 'Representante';
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
                        {company.name ? company.name.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{company.name}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-primary)', fontWeight: '600' }}>
                          {roleName} {company.type ? `(${company.type})` : ''}
                        </span>
                      </div>
                    </div>
                    <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                      {company.phone_main && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fas fa-phone" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                          <span>{company.phone_main}</span>
                        </div>
                      )}
                      {company.email_main && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                          <i className="fas fa-envelope" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                          <span>{company.email_main}</span>
                        </div>
                      )}
                      {company.city && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                          <span>{company.city}, {company.state}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
