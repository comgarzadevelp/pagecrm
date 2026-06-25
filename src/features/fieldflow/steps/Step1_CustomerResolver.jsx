import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2, User, Landmark, PlusCircle, X, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFieldFlow } from '../FieldFlowContext';
import Fuse from 'fuse.js';

const OFICINA_ROLES = ['RH', 'Almacén', 'Compras', 'Facturación', 'Contabilidad', 'Legal', 'Dirección', 'Ventas', 'Asistente'];
const CAMPO_ROLES = ['Arquitecto', 'Contratista', 'Encargado de obra', 'Guardia de obra', 'Residente', 'Ingeniero'];

export default function Step1_CustomerResolver() {
  const { wizardState, updateEntity, paginate, cache, setCache } = useFieldFlow();

  // Estados para la sección de Empresa
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [isCreatingEmpresa, setIsCreatingEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState({ nombre: '', direccion: '', telefono: '' });
  const [empresaSearchActive, setEmpresaSearchActive] = useState(false);
  const [empresaResults, setEmpresaResults] = useState([]);

  // Estados para la sección de Contacto
  const [contactoSearch, setContactoSearch] = useState('');
  const [isCreatingContacto, setIsCreatingContacto] = useState(false);
  const [contactoForm, setContactoForm] = useState({ nombre: '', telefono: '', tiene_whatsapp: false, tipo: 'oficina', cargo: '', email: '', telefono_alt: '' });
  const [contactoSearchActive, setContactoSearchActive] = useState(false);
  const [contactoResults, setContactoResults] = useState([]);

  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // 1. Buscador local + remoto de Empresas
  useEffect(() => {
    if (empresaSearch.trim().length < 2) {
      setEmpresaResults(cache.empresas.slice(0, 4));
      return;
    }

    const fuse = new Fuse(cache.empresas, { keys: ['nombre'], threshold: 0.35 });
    const localRes = fuse.search(empresaSearch).map(r => r.item);
    setEmpresaResults(localRes);

    if (localRes.length < 3) {
      const timer = setTimeout(async () => {
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(empresaSearch.trim())}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.companies)) {
            const apiRes = data.companies.map(c => ({
              id: String(c.id),
              nombre: c.name || '',
              tipo: 'empresa',
              direccion: c.address || ''
            }));
            setEmpresaResults(prev => {
              const combined = [...prev, ...apiRes];
              const uniqueMap = new Map();
              combined.forEach(item => uniqueMap.set(item.id, item));
              return Array.from(uniqueMap.values());
            });
          }
        } catch (err) {
          console.error('Error searching companies:', err);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [empresaSearch, cache.empresas]);

  // 2. Buscador local + remoto de Contactos
  useEffect(() => {
    if (contactoSearch.trim().length < 2) {
      setContactoResults(cache.contactos.slice(0, 4));
      return;
    }

    const fuse = new Fuse(cache.contactos, { keys: ['nombre'], threshold: 0.35 });
    const localRes = fuse.search(contactoSearch).map(r => r.item);
    setContactoResults(localRes);

    if (localRes.length < 3) {
      const timer = setTimeout(async () => {
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/api/crm/contacts/search?q=${encodeURIComponent(contactoSearch.trim())}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.contacts)) {
            const apiRes = data.contacts.map(co => ({
              id: String(co.id),
              nombre: co.name || '',
              tipo: 'contacto',
              cargo: co.position || 'Contacto'
            }));
            setContactoResults(prev => {
              const combined = [...prev, ...apiRes];
              const uniqueMap = new Map();
              combined.forEach(item => uniqueMap.set(item.id, item));
              return Array.from(uniqueMap.values());
            });
          }
        } catch (err) {
          console.error('Error searching contacts:', err);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [contactoSearch, cache.contactos]);

  // Manejadores para vincular Empresa
  const handleSelectEmpresa = (empresa) => {
    updateEntity('empresa', empresa);
    setEmpresaSearchActive(false);
    setEmpresaSearch('');
  };

  const handleStartCreateEmpresa = () => {
    setIsCreatingEmpresa(true);
    setEmpresaSearchActive(false);
    setEmpresaForm({ nombre: empresaSearch, direccion: '', telefono: '' });
  };

  const handleConfirmCreateEmpresa = () => {
    if (!empresaForm.nombre.trim()) return;
    const tempId = `new-company-${Date.now()}`;
    const newEmp = {
      id: tempId,
      nombre: empresaForm.nombre.trim(),
      tipo: 'empresa',
      direccion: empresaForm.direccion.trim(),
      telefono: empresaForm.telefono.trim(),
      isNew: true
    };
    
    updateEntity('empresa', newEmp);
    setIsCreatingEmpresa(false);

    setCache(prev => ({
      ...prev,
      empresas: [newEmp, ...prev.empresas]
    }));
  };

  // Manejadores para vincular Contacto
  const handleSelectContacto = (contacto) => {
    updateEntity('contacto', contacto);
    setContactoSearchActive(false);
    setContactoSearch('');
  };

  const handleStartCreateContacto = () => {
    setIsCreatingContacto(true);
    setContactoSearchActive(false);
    setContactoForm({ nombre: contactoSearch, telefono: '', tiene_whatsapp: false, tipo: 'oficina', cargo: '', email: '', telefono_alt: '' });
  };

  const handleConfirmCreateContacto = () => {
    if (!contactoForm.nombre.trim() || !contactoForm.telefono.trim()) return;
    const tempId = `new-contact-${Date.now()}`;
    const newCont = {
      id: tempId,
      nombre: contactoForm.nombre.trim(),
      tipo: 'contacto',
      telefono: contactoForm.telefono.trim(),
      cargo: contactoForm.cargo || (contactoForm.tipo === 'oficina' ? 'Oficina' : 'Residente Campo'),
      email: contactoForm.email.trim(),
      telefono_alt: contactoForm.telefono_alt.trim(),
      whatsapp: contactoForm.tiene_whatsapp ? contactoForm.telefono.trim() : '',
      isNew: true
    };

    updateEntity('contacto', newCont);
    setIsCreatingContacto(false);

    setCache(prev => ({
      ...prev,
      contactos: [newCont, ...prev.contactos]
    }));
  };

  // Validación final para avanzar
  const isReadyToProceed = useMemo(() => {
    const empresaValid = isCreatingEmpresa ? !!empresaForm.nombre.trim() : !!wizardState.empresa;
    const contactoValid = isCreatingContacto ? (!!contactoForm.nombre.trim() && !!contactoForm.telefono.trim()) : !!wizardState.contacto;

    return empresaValid && contactoValid;
  }, [wizardState.empresa, wizardState.contacto, isCreatingEmpresa, isCreatingContacto, empresaForm.nombre, contactoForm.nombre, contactoForm.telefono]);

  const handleProceed = () => {
    if (isReadyToProceed) {
      paginate(1);
    }
  };

  return (
    <div className="fieldflow-step-container">
      <div className="fieldflow-step-content">
        <div className="step-title-block" style={{ marginBottom: '1.5rem' }}>
          <h3>Resolver Empresa y Contacto</h3>
          <p>Asocia o crea la constructora y el contacto clave para esta interacción de campo.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '5rem' }}>
          
          {/* ================= SECCIÓN EMPRESA ================= */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Building2 style={{ width: '16px', height: '16px', color: '#05393A' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Empresa / Constructora</span>
            </div>

            {/* Caso 1: Empresa Seleccionada */}
            {wizardState.empresa && !isCreatingEmpresa && (
              <div className="fieldflow-result-card" style={{ border: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.01)', cursor: 'default', margin: 0 }}>
                <div className="result-icon-box empresa">
                  <Building2 />
                </div>
                <div className="result-info">
                  <h4>{wizardState.empresa.nombre}</h4>
                  <p>{wizardState.empresa.direccion ? `${wizardState.empresa.direccion}` : 'Empresa / Constructora Registrada'}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => updateEntity('empresa', null)} 
                  className="btn-resolver-back" 
                  style={{ color: '#ef4444', borderColor: 'transparent' }}
                  title="Desvincular Empresa"
                >
                  <X style={{ width: '15px', height: '15px' }} />
                </button>
              </div>
            )}

            {/* Caso 2: Formulario de Creación de Nueva Empresa */}
            {isCreatingEmpresa && (
              <div className="resolver-create-container" style={{ padding: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.01)', borderRadius: '16px' }}>
                <div className="resolver-create-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
                  <button type="button" onClick={() => setIsCreatingEmpresa(false)} className="btn-resolver-back">
                    <ArrowLeft style={{ width: '13px', height: '13px' }} />
                  </button>
                  <h4 style={{ fontSize: '0.85rem' }}>Nueva Empresa / Constructora</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="resolver-field-group" style={{ marginBottom: 0 }}>
                    <label className="resolver-field-label">Nombre o Razón Social *</label>
                    <input 
                      type="text" 
                      value={empresaForm.nombre} 
                      onChange={(e) => setEmpresaForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="resolver-inline-input" 
                      placeholder="Ej: Constructora Garza S.A."
                      style={{ height: '36px', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div className="resolver-field-group" style={{ marginBottom: 0 }}>
                      <label className="resolver-field-label">Ubicación de oficinas (Dirección / URL Maps)</label>
                      <input 
                        type="text" 
                        value={empresaForm.direccion} 
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, direccion: e.target.value }))}
                        className="resolver-inline-input" 
                        placeholder="Ej. Av. Constitución 123..."
                        style={{ height: '36px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div className="resolver-field-group" style={{ marginBottom: 0 }}>
                      <label className="resolver-field-label">Teléfono</label>
                      <input 
                        type="tel" 
                        value={empresaForm.telefono} 
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, telefono: e.target.value }))}
                        className="resolver-inline-input" 
                        placeholder="8112345678"
                        style={{ height: '36px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleConfirmCreateEmpresa}
                    className="resolver-confirm-btn valid" 
                    style={{ height: '36px', marginTop: '0.25rem', fontSize: '0.75rem' }}
                  >
                    Vincular Nueva Empresa
                  </button>
                </div>
              </div>
            )}

            {/* Caso 3: Buscador de Empresa Activa */}
            {!wizardState.empresa && !isCreatingEmpresa && (
              <div style={{ position: 'relative' }}>
                <div className="resolver-field-input-wrapper">
                  <input
                    type="text"
                    value={empresaSearch}
                    onChange={(e) => {
                      setEmpresaSearch(e.target.value);
                      setEmpresaSearchActive(true);
                    }}
                    onFocus={() => setEmpresaSearchActive(true)}
                    placeholder="Buscar o escribir constructora..."
                    className="resolver-inline-input"
                    style={{ height: '38px', paddingLeft: '2.25rem', borderColor: 'rgba(0,0,0,0.08)' }}
                  />
                  <Search style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af' }} />
                  {empresaSearch && (
                    <button type="button" onClick={() => { setEmpresaSearch(''); setEmpresaSearchActive(false); }} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                      <X style={{ width: '13px', height: '13px' }} />
                    </button>
                  )}
                </div>

                {/* Dropdown flotante compacto de resultados */}
                {empresaSearchActive && (
                  <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', padding: '0.35rem' }}>
                    {empresaResults.length > 0 ? (
                      empresaResults.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectEmpresa(emp)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Building2 style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827', display: 'block' }}>{emp.nombre}</span>
                            <span style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block' }}>{emp.rfc ? `RFC: ${emp.rfc}` : 'Catálogo CRM'}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                        No se encontraron constructoras.
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleStartCreateEmpresa}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.5rem', marginTop: '0.25rem', background: 'rgba(5, 57, 58, 0.03)', border: '1px dashed rgba(5, 57, 58, 0.15)', borderRadius: '8px', color: '#05393A', fontSize: '0.75rem', fontWeight: '750', cursor: 'pointer' }}
                    >
                      <PlusCircle style={{ width: '13px', height: '13px' }} />
                      Registrar "{empresaSearch || 'Nueva Empresa'}" como constructora nueva
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= SECCIÓN CONTACTO ================= */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <User style={{ width: '16px', height: '16px', color: '#05393A' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Contacto de la Obra</span>
            </div>

            {/* Caso 1: Contacto Seleccionado */}
            {wizardState.contacto && !isCreatingContacto && (
              <div className="fieldflow-result-card" style={{ border: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(16, 185, 129, 0.01)', cursor: 'default', margin: 0 }}>
                <div className="result-icon-box contacto">
                  <User />
                </div>
                <div className="result-info">
                  <h4>{wizardState.contacto.nombre}</h4>
                  <p>{wizardState.contacto.cargo ? `${wizardState.contacto.cargo}` : 'Contacto Registrado'}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => updateEntity('contacto', null)} 
                  className="btn-resolver-back" 
                  style={{ color: '#ef4444', borderColor: 'transparent' }}
                  title="Desvincular Contacto"
                >
                  <X style={{ width: '15px', height: '15px' }} />
                </button>
              </div>
            )}

            {/* Caso 2: Formulario de Creación de Nuevo Contacto (Premium Apple-Style calco de Imagen 2) */}
            {isCreatingContacto && (
              <div className="resolver-create-container" style={{ padding: '1.15rem', border: '1px solid rgba(5, 57, 58, 0.15)', background: '#ffffff', borderRadius: '18px' }}>
                <div className="resolver-create-header" style={{ marginBottom: '1.15rem', paddingBottom: '0.65rem' }}>
                  <button type="button" onClick={() => setIsCreatingContacto(false)} className="btn-resolver-back">
                    <ArrowLeft style={{ width: '13px', height: '13px' }} />
                  </button>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#05393A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nuevo Contacto</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Fila 1: Nombre Completo */}
                  <div className="resolver-field-group">
                    <label className="resolver-field-label">Nombre Completo *</label>
                    <input 
                      type="text" 
                      value={contactoForm.nombre} 
                      onChange={(e) => setContactoForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="resolver-inline-input" 
                      placeholder="Nombre del contacto"
                      style={{ height: '38px', fontSize: '0.825rem' }}
                    />
                  </div>

                  {/* Fila 2: Tipo de Contacto (Segmented Control Pills exactas a Imagen 2) */}
                  <div className="resolver-field-group">
                    <label className="resolver-field-label">Tipo de Contacto</label>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '0.2rem', padding: '3px', background: '#f1f5f9', borderRadius: '10px', width: 'fit-content' }}>
                      <button
                        type="button"
                        onClick={() => setContactoForm(f => ({ ...f, tipo: 'oficina', cargo: '' }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: contactoForm.tipo === 'oficina' ? '#ffffff' : 'transparent',
                          color: contactoForm.tipo === 'oficina' ? '#05393A' : '#64748b',
                          fontWeight: contactoForm.tipo === 'oficina' ? '700' : '500',
                          boxShadow: contactoForm.tipo === 'oficina' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Building2 style={{ width: '13px', height: '13px' }} /> Oficina
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactoForm(f => ({ ...f, tipo: 'campo', cargo: '' }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: contactoForm.tipo === 'campo' ? '#ffffff' : 'transparent',
                          color: contactoForm.tipo === 'campo' ? '#b45309' : '#64748b',
                          fontWeight: contactoForm.tipo === 'campo' ? '700' : '500',
                          boxShadow: contactoForm.tipo === 'campo' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Landmark style={{ width: '13px', height: '13px' }} /> Campo / Obra
                      </button>
                    </div>
                  </div>

                  {/* Fila 3: Cargo y Correo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="resolver-field-group">
                      <label className="resolver-field-label">Cargo / Posición</label>
                      <select 
                        value={contactoForm.cargo} 
                        onChange={(e) => setContactoForm(prev => ({ ...prev, cargo: e.target.value }))}
                        className="resolver-inline-select"
                        style={{ height: '38px', fontSize: '0.825rem', paddingRight: '2rem' }}
                      >
                        <option value="">Selecciona un cargo...</option>
                        {(contactoForm.tipo === 'oficina' ? OFICINA_ROLES : CAMPO_ROLES).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div className="resolver-field-group">
                      <label className="resolver-field-label">Correo Electrónico</label>
                      <input 
                        type="email" 
                        value={contactoForm.email} 
                        onChange={(e) => setContactoForm(prev => ({ ...prev, email: e.target.value }))}
                        className="resolver-inline-input" 
                        placeholder="correo@empresa.com"
                        style={{ height: '38px', fontSize: '0.825rem' }}
                      />
                    </div>
                  </div>

                  {/* Fila 4: Teléfonos */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="resolver-field-group">
                      <label className="resolver-field-label">Teléfono Principal *</label>
                      <input 
                        type="tel" 
                        value={contactoForm.telefono} 
                        onChange={(e) => setContactoForm(prev => ({ ...prev, telefono: e.target.value }))}
                        className="resolver-inline-input" 
                        placeholder="81 1234 5678"
                        style={{ height: '38px', fontSize: '0.825rem' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.75rem', color: '#05393A', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={contactoForm.tiene_whatsapp}
                          onChange={(e) => setContactoForm(prev => ({ ...prev, tiene_whatsapp: e.target.checked }))}
                          style={{ accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        <i className="fab fa-whatsapp" style={{ color: '#10b981' }}></i>
                        ¿Este número tiene WhatsApp?
                      </label>
                    </div>
                    <div className="resolver-field-group">
                      <label className="resolver-field-label">Teléfono Alternativo</label>
                      <input 
                        type="tel" 
                        value={contactoForm.telefono_alt} 
                        onChange={(e) => setContactoForm(prev => ({ ...prev, telefono_alt: e.target.value }))}
                        className="resolver-inline-input" 
                        placeholder="Número alternativo"
                        style={{ height: '38px', fontSize: '0.825rem' }}
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleConfirmCreateContacto}
                    disabled={!contactoForm.nombre.trim() || !contactoForm.telefono.trim()}
                    className="resolver-confirm-btn valid" 
                    style={{ height: '40px', marginTop: '0.5rem', fontSize: '0.775rem' }}
                  >
                    Vincular Nuevo Contacto
                  </button>
                </div>
              </div>
            )}

            {/* Caso 3: Buscador de Contacto Activo */}
            {!wizardState.contacto && !isCreatingContacto && (
              <div style={{ position: 'relative' }}>
                <div className="resolver-field-input-wrapper">
                  <input
                    type="text"
                    value={contactoSearch}
                    onChange={(e) => {
                      setContactoSearch(e.target.value);
                      setContactoSearchActive(true);
                    }}
                    onFocus={() => setContactoSearchActive(true)}
                    placeholder="Buscar o escribir contacto..."
                    className="resolver-inline-input"
                    style={{ height: '38px', paddingLeft: '2.25rem', borderColor: 'rgba(0,0,0,0.08)' }}
                  />
                  <Search style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af' }} />
                  {contactoSearch && (
                    <button type="button" onClick={() => { setContactoSearch(''); setContactoSearchActive(false); }} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                      <X style={{ width: '13px', height: '13px' }} />
                    </button>
                  )}
                </div>

                {/* Dropdown flotante compacto de resultados */}
                {contactoSearchActive && (
                  <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', padding: '0.35rem' }}>
                    {contactoResults.length > 0 ? (
                      contactoResults.map(cont => (
                        <button
                          key={cont.id}
                          type="button"
                          onClick={() => handleSelectContacto(cont)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <User style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827', display: 'block' }}>{cont.nombre}</span>
                            <span style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block' }}>{cont.cargo ? cont.cargo : 'Personal de Obra'}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                        No se encontraron contactos.
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleStartCreateContacto}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.5rem', marginTop: '0.25rem', background: 'rgba(5, 57, 58, 0.03)', border: '1px dashed rgba(5, 57, 58, 0.15)', borderRadius: '8px', color: '#05393A', fontSize: '0.75rem', fontWeight: '750', cursor: 'pointer' }}
                    >
                      <PlusCircle style={{ width: '13px', height: '13px' }} />
                      Registrar "{contactoSearch || 'Nuevo Contacto'}" como contacto nuevo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Botón flotante inferior fijo */}
      <div className="fieldflow-footer-fixed" style={{ background: '#ffffff' }}>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!isReadyToProceed}
          className="fieldflow-btn-primary"
        >
          <span>Confirmar y Continuar a la Obra</span>
          <ChevronRight style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
}
