import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFieldFlow } from '../FieldFlowContext';
import EntityResolver from '../engine/EntityResolver';
import { Building2, User, CheckCircle2, Link as LinkIcon, Edit2 } from 'lucide-react';
import Fuse from 'fuse.js';

export default function Step2_EmpresaContacto() {
  const { wizardState, updateEntity, paginate, cache } = useFieldFlow();
  
  // UX Vertical: 'empresa' | 'contacto'
  const [activeBlock, setActiveBlock] = useState('empresa');
  
  // Búsquedas locales
  const [empresaQuery, setEmpresaQuery] = useState('');
  const [contactoQuery, setContactoQuery] = useState('');

  // Estado para la alerta de vinculación
  const [pendingContacto, setPendingContacto] = useState(null);

  // --- Lógica Empresa ---
  const empresaResults = useMemo(() => {
    if (wizardState.empresa && !wizardState.empresa.isNew && empresaQuery === '') {
      const found = cache.empresas.find(e => e.id === wizardState.empresa.id);
      return found ? [found] : [];
    }
    if (wizardState.empresa?.isNew && empresaQuery === '') return [];
    if (empresaQuery.length < 2) return cache.empresas.slice(0, 3);
    const fuse = new Fuse(cache.empresas, { keys: ['nombre', 'rfc'], threshold: 0.3 });
    return fuse.search(empresaQuery).map(r => r.item);
  }, [empresaQuery, wizardState.empresa, cache.empresas]);

  // --- Lógica Contacto ---
  const contactoResults = useMemo(() => {
    if (wizardState.contacto && !wizardState.contacto.isNew && contactoQuery === '') {
      const found = cache.contactos.find(c => c.id === wizardState.contacto.id);
      return found ? [found] : [];
    }
    if (wizardState.contacto?.isNew && contactoQuery === '') return [];
    if (contactoQuery.length < 2) return cache.contactos.slice(0, 4);
    const fuse = new Fuse(cache.contactos, { keys: ['nombre'], threshold: 0.3 });
    return fuse.search(contactoQuery).map(r => r.item);
  }, [contactoQuery, wizardState.contacto, cache.contactos]);

  // Handlers
  const handleEmpresaResolve = (entity) => {
    updateEntity('empresa', entity);
    setActiveBlock('contacto');
  };

  const handleContactoResolve = (entity) => {
    // Regla crítica: Lógica de vinculación
    const isLinked = entity.isNew || entity.empresa_id === wizardState.empresa.id;
    
    if (!isLinked) {
      setPendingContacto(entity);
    } else {
      updateEntity('contacto', entity);
      paginate(1);
    }
  };

  const confirmarVinculacion = () => {
    updateEntity('contacto', { ...pendingContacto, empresa_id: wizardState.empresa.id, newlyLinked: true });
    setPendingContacto(null);
    paginate(1);
  };

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content" style={{ paddingBottom: '5rem' }}>
        <div className="step-title-block">
          <h3>Empresa y Contacto</h3>
          <p>Resuelve primero la empresa (constructora) y luego el contacto asociado para este registro.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* BLOQUE EMPRESA */}
          <div className={`fieldflow-accordion-panel ${activeBlock === 'empresa' ? 'active' : ''}`}>
            <div className="fieldflow-accordion-header">
              <div className="accordion-header-title">
                <Building2 />
                1. Constructora / Empresa
              </div>
              {wizardState.empresa && activeBlock === 'contacto' && (
                <button 
                  type="button"
                  onClick={() => setActiveBlock('empresa')} 
                  className="btn-accordion-edit"
                >
                  <Edit2 style={{ width: '13px', height: '13px' }} /> Editar
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {activeBlock === 'empresa' ? (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="fieldflow-accordion-body"
                >
                  <input 
                    type="text" 
                    placeholder="Buscar empresa por nombre o RFC..." 
                    value={empresaQuery} 
                    onChange={(e) => setEmpresaQuery(e.target.value)} 
                    className="fieldflow-input" 
                    style={{ marginBottom: '1.25rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)' }}
                  />
                  <EntityResolver entityType="empresa" searchResults={empresaResults} onResolve={handleEmpresaResolve} />
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="accordion-resolved-summary">
                  <div>
                    <p className="name">{wizardState.empresa?.nombre || wizardState.empresa?.searchKey}</p>
                    <p className="type">{wizardState.empresa?.isNew ? 'Registro Nuevo' : 'Verificado en CRM'}</p>
                  </div>
                  <div style={{ width: '32px', height: '32px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a7f3d0' }}>
                    <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BLOQUE CONTACTO */}
          <div className={`fieldflow-accordion-panel ${activeBlock === 'contacto' ? 'active' : ''} ${!wizardState.empresa ? 'disabled' : ''}`}>
            <div className="fieldflow-accordion-header">
              <div className="accordion-header-title">
                <User />
                2. Ingeniero / Contacto
              </div>
            </div>

            <AnimatePresence>
              {activeBlock === 'contacto' && wizardState.empresa && !pendingContacto && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  className="fieldflow-accordion-body"
                >
                  <input 
                    type="text" 
                    placeholder="Buscar contacto por nombre..." 
                    value={contactoQuery} 
                    onChange={(e) => setContactoQuery(e.target.value)} 
                    className="fieldflow-input" 
                    style={{ marginBottom: '1.25rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)' }}
                  />
                  <EntityResolver entityType="contacto" searchResults={contactoResults} onResolve={handleContactoResolve} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ALERTA DE VINCULACIÓN */}
            <AnimatePresence>
              {pendingContacto && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="fieldflow-linking-alert"
                >
                  <div className="linking-alert-header">
                    <LinkIcon />
                    <div>
                      <h5>El contacto existe pero no está vinculado</h5>
                      <p>
                        <strong>{pendingContacto.nombre}</strong> no aparece en el organigrama de <strong>{wizardState.empresa?.nombre || wizardState.empresa?.searchKey}</strong> en la base de datos del CRM. ¿Deseas realizar la vinculación para esta actividad?
                      </p>
                    </div>
                  </div>
                  <div className="linking-alert-actions">
                    <button 
                      type="button"
                      onClick={() => setPendingContacto(null)} 
                      className="fieldflow-btn-secondary"
                      style={{ height: '42px', fontSize: '0.8rem' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={confirmarVinculacion} 
                      className="fieldflow-btn-primary"
                      style={{ height: '42px', fontSize: '0.8rem' }}
                    >
                      Sí, Vincular
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
