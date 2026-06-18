import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useUX } from '../../../components/common/UXProvider';
import './CotizadorB2B.css';
export default function CotizadorB2B({
  role,
  userName,
  API_BASE,
  activeTab,
  setActiveTab,
  sidebarCollapsed,
  setSidebarCollapsed,
  allOpportunities,
  currentUserProfile,
  fetchOpportunitiesList,
  customers,
  
  // Persisted state fields (to keep data intact when user navigates to other tabs)
  quoteItems,
  setQuoteItems,
  quoteNotes,
  setQuoteNotes,
  selectedAgreement,
  setSelectedAgreement,
  quoteNum,
  setQuoteNum,
  quoteDate,
  setQuoteDate,
  selectedOpportunityId,
  setSelectedOpportunityId,
  opportunitySearch,
  setOpportunitySearch,

  // New Phase 1 fields for Bidirectional Kanban sync
  allLeads = [],
  selectedLeadId,
  setSelectedLeadId,
  leadSearch,
  setLeadSearch,
  onQuoteSaved
}) {
  const { showToast, showConfirm } = useUX();
  const [selectedQuoteCustomer, setSelectedQuoteCustomer] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [showOpportunityDropdown, setShowOpportunityDropdown] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogQuantities, setCatalogQuantities] = useState({});

  // Auto-generación de Folio B2B y pre-llenado de Fecha si no existe
  useEffect(() => {
    if (activeTab === 'quotes' && !quoteNum) {
      const today = new Date();
      
      // Formatear a YYYYMMDD asegurando el zero-padding
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePart = `${year}${month}${day}`;
      
      // Generar sufijo aleatorio (XXXX) de 4 dígitos
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      
      setQuoteNum(`COT-${datePart}-${randomSuffix}`);
      setQuoteDate(today.toISOString().split('T')[0]);
    }
  }, [activeTab, quoteNum, setQuoteNum, setQuoteDate]);

  // ---------- PRODUCT CATALOG STATE ----------
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catFilterCategory, setCatFilterCategory] = useState('');
  const [catFilterMaterial, setCatFilterMaterial] = useState('');
  const [catFilterMeasure, setCatFilterMeasure] = useState('');
  const [catFilterOptions, setCatFilterOptions] = useState({ categories: [], materials: [], measures: [] });
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [cardTooltip, setCardTooltip] = useState(null); // { text, x, y }
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(window.innerWidth > 768);

  const printableRef = useRef(null);

  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;

    const LETTER_WIDTH_PX = 816;
    const offScreen = document.createElement('div');
    offScreen.style.cssText = [
      'position:fixed',
      'top:-9999px',
      'left:-9999px',
      `width:${LETTER_WIDTH_PX}px`,
      'background:#ffffff',
      'z-index:-1',
      'padding:0',
      'margin:0',
      'overflow:visible',
    ].join(';');

    const clone = printableRef.current.cloneNode(true);
    clone.style.cssText = [
      `width:${LETTER_WIDTH_PX}px`,
      'max-width:none',
      'overflow:visible',
      'transform:none',
      'box-shadow:none',
      'border:none',
      'padding:40px',
      'box-sizing:border-box',
      'background:#ffffff',
    ].join(';');

    // Eliminar elementos con clase hide-on-print del clon
    clone.querySelectorAll('.hide-on-print').forEach(el => el.remove());

    // Chrome: Font Awesome (CDN cross-origin) taintea el canvas.
    // Reemplazar iconos <i> por su glyph Unicode inline para evitar dependencia del webfont.
    clone.querySelectorAll('i[class*="fa-"]').forEach(icon => {
      const computed = window.getComputedStyle(icon, '::before');
      const content = computed.getPropertyValue('content');
      if (content && content !== 'none' && content !== 'normal') {
        const span = document.createElement('span');
        // Extraer el carácter Unicode del content (viene como '"X"')
        span.textContent = content.replace(/"/g, '');
        span.style.cssText = `font-family:'Font Awesome 6 Free','Font Awesome 5 Free',sans-serif;font-weight:900;font-size:${window.getComputedStyle(icon).fontSize};color:${window.getComputedStyle(icon).color};margin-right:4px;`;
        icon.replaceWith(span);
      } else {
        icon.remove();
      }
    });

    offScreen.appendChild(clone);
    document.body.appendChild(offScreen);

    try {
      const canvas = await html2canvas(offScreen, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: LETTER_WIDTH_PX,
        windowWidth: LETTER_WIDTH_PX,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidthMm = pdfWidth;
      const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;

      let yOffset = 0;
      while (yOffset < imgHeightMm) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, imgWidthMm, imgHeightMm);
        yOffset += pdfHeight;
      }

      const fileName = quoteNum ? `cotizacion_${quoteNum}.pdf` : 'cotizacion.pdf';
      // Descarga manual — Chrome pierde el filename con pdf.save() en contextos async
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // Trigger de Kanban automático
      if (selectedLeadId && typeof onQuoteSaved === 'function') {
        onQuoteSaved(selectedLeadId);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Error al generar el PDF. Intenta de nuevo.', 'error');
    } finally {
      document.body.removeChild(offScreen);
    }
  };

  const fetchCatalogProducts = async (searchQuery) => {
    setCatalogLoading(true);
    const token = localStorage.getItem('token');
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery !== undefined ? searchQuery : debouncedCatalogSearch,
        category: catFilterCategory,
        material: catFilterMaterial,
        measure: catFilterMeasure
      }).toString();

      const res = await fetch(`${API_BASE}/api/crm/products?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCatalogProducts(data.products || []);
        if (data.filterOptions) {
          setCatFilterOptions(data.filterOptions);
        }
      }
    } catch (err) {
      console.error('Fetch catalog products error:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const clearCatalogFilters = () => {
    setCatalogSearch('');
    setCatFilterCategory('');
    setCatFilterMaterial('');
    setCatFilterMeasure('');
    setShowOnlyInStock(false);
  };

  // Debounce catalogSearch
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [catalogSearch]);

  useEffect(() => {
    if (activeTab === 'quotes') {
      fetchCatalogProducts(debouncedCatalogSearch);
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [debouncedCatalogSearch, catFilterCategory, catFilterMaterial, catFilterMeasure, activeTab]);

  // Lock body scroll when catalog modal is open
  useEffect(() => {
    if (showCatalogModal) {
      document.body.style.overflow = 'hidden';
      setShowAdvancedFilters(window.innerWidth > 768);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCatalogModal]);

  const getCompanyAgreementMatch = (companyName) => {
    if (!companyName) return null;
    const nameLower = companyName.toLowerCase();
    if (nameLower.includes('ruba')) return 'ruba';
    if (nameLower.includes('javer')) return 'javer';
    if (nameLower.includes('casitas')) return 'casitas';
    if (nameLower.includes('bienestar')) return 'bienestar';
    if (nameLower.includes('davisa')) return 'davisa';
    return null;
  };

  // Auto match agreement on opportunity change
  useEffect(() => {
    if (selectedOpportunityId) {
      const opp = allOpportunities.find(x => x.id === selectedOpportunityId);
      if (opp) {
        const compName = opp.company?.name || opp.company?.alias || opp.contact?.name || '';
        const matched = getCompanyAgreementMatch(compName);
        if (matched) {
          setSelectedAgreement(matched);
        } else {
          setSelectedAgreement('public');
        }
      }
    }
  }, [selectedOpportunityId, allOpportunities]);

  const getProductPriceByAgreement = (product, agreement) => {
    switch (agreement) {
      case 'ruba':
        return parseFloat(product.convenio_ruba) || 0;
      case 'javer':
        return parseFloat(product.convenio_javer) || 0;
      case 'casitas':
        return parseFloat(product.convenio_casitas) || 0;
      case 'bienestar':
        return parseFloat(product.convenio_bienestar) || 0;
      case 'davisa':
        return parseFloat(product.convenio_davisa) || 0;
      case 'public':
      default:
        return parseFloat(product.precio_publico) || 0;
    }
  };

  const addProductToQuote = (product, quantityToAdd = 1) => {
    const basePrice = getProductPriceByAgreement(product, selectedAgreement);
    const cleanDesc = product["Descripción_Limpia"] || product["Descripción"];
    const itemDesc = `[${product["Clave"]}] ${cleanDesc}`;

    setQuoteItems(prev => {
      if (prev.length === 1 && prev[0].description === '' && prev[0].price === 0) {
        return [{
          id: Date.now(),
          description: itemDesc,
          quantity: quantityToAdd,
          price: basePrice,
          clave: product["Clave"],
          originalProduct: product,
          appliedAgreement: selectedAgreement
        }];
      } else {
        return [...prev, {
          id: Date.now(),
          description: itemDesc,
          quantity: quantityToAdd,
          price: basePrice,
          clave: product["Clave"],
          originalProduct: product,
          appliedAgreement: selectedAgreement
        }];
      }
    });

    showToast(`¡${cleanDesc} (x${quantityToAdd}) agregado con éxito!`, 'success');
  };

  const addQuoteItem = () => {
    setQuoteItems(prev => [
      ...prev,
      { id: Date.now(), description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }
    ]);
  };

  const adjustQuoteItemQty = (id, change) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, (item.quantity || 0) + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeQuoteItem = (id) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuoteItem = (id, field, value) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((acc, item) => acc + (item.quantity * item.price || 0), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const { subtotal, iva, total } = calculateTotals();

  // Quote numbers generator initialization
  useEffect(() => {
    if (activeTab === 'quotes' && !quoteNum) {
      const today = new Date();
      setQuoteDate(today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
      setQuoteNum('CG-' + Math.floor(100000 + Math.random() * 900000));
    }
  }, [activeTab]);

  const handleSaveQuoteToDB = async () => {
    if (!selectedOpportunityId) {
      showToast('Por favor selecciona una oportunidad activa antes de guardar la cotización.', 'warning');
      return;
    }
    if (quoteItems.length === 0 || (quoteItems.length === 1 && quoteItems[0].description === '')) {
      showToast('La cotización debe tener al menos un producto o partida válida.', 'warning');
      return;
    }

    setSavingQuote(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteNum,
          opportunityId: selectedOpportunityId,
          agreement: selectedAgreement,
          items: quoteItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            clave: item.clave || 'manual',
            appliedAgreement: item.appliedAgreement || 'manual'
          })),
          notes: quoteNotes,
          subtotal,
          iva,
          total
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`¡Cotización ${quoteNum} guardada exitosamente en el historial de la oportunidad!`, 'success');
        fetchOpportunitiesList();

        // Trigger de Kanban automático
        if (selectedLeadId && typeof onQuoteSaved === 'function') {
          onQuoteSaved(selectedLeadId);
        }
      } else {
        showToast('Error al guardar cotización: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (err) {
      console.error('Save quote error:', err);
      showToast('Error de conexión con el servidor al intentar guardar.', 'error');
    } finally {
      setSavingQuote(false);
    }
  };

  const handleNewQuote = async () => {
    const confirmed = await showConfirm('¿Nueva Cotización?', '¿Deseas iniciar una nueva cotización limpia? Esto borrará el contenido actual.', { type: 'warning', confirmText: 'Sí, limpiar' });
    if (confirmed) {
      setQuoteItems([{ id: Date.now(), description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }]);
      setSelectedQuoteCustomer('');
      setSelectedOpportunityId('');
      setOpportunitySearch('');
      if (typeof setSelectedLeadId === 'function') setSelectedLeadId('');
      if (typeof setLeadSearch === 'function') setLeadSearch('');
      setSelectedAgreement('public');
      setQuoteNotes('Condiciones comerciales:\n• Precios más 16% de IVA.\n• Pago: 50% de anticipo y 50% contra entrega de suministro.\n• Tiempo de entrega: 3-5 días hábiles sujeto a disponibilidad.\n• Flete incluido en área metropolitana de Monterrey.');
      setQuoteNum('CG-' + Math.floor(100000 + Math.random() * 900000));
      const today = new Date();
      setQuoteDate(today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
    }
  };

  return (
    <section className="crm-quotes-section glass" style={{ padding: '2rem 1.5rem' }}>
      <div className="crm-table-header hide-on-print" style={{ marginBottom: '1.5rem' }}>
        <h2>Cotizador Profesional B2B Inteligente</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Configura tarifas especiales por convenio, edita artículos en tiempo real y genera cotizaciones en PDF al instante.
        </p>
      </div>

      <div className="crm-quotes-realtime-layout">

        {/* COLUMNA IZQUIERDA: PREVISUALIZADOR LIVE PDF TAMAÑO CARTA */}
        <div className="crm-quote-preview-panel-sticky">

          {/* Live PDF Header */}
          <div className="quote-preview-actions-header hide-on-print">
            <div className="actions-header-left">
              <div className="live-badge-indicator">
                <div className="pulse-dot"></div>
                <span>Live PDF</span>
              </div>
            </div>
            <div className="actions-header-buttons">
              <button
                type="button"
                className="btn-refresh"
                onClick={handleNewQuote}
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
                title="Limpiar y crear nueva cotización"
              >
                <i className="fas fa-file"></i> Limpiar
              </button>
              <button
                type="button"
                className="btn-premium-save-db"
                onClick={handleSaveQuoteToDB}
                disabled={savingQuote}
                title="Guardar en el CRM"
              >
                {savingQuote ? (
                  <>
                    <div className="spinner-mini" style={{ borderTopColor: '#ffffff', width: '12px', height: '12px', margin: 0 }}></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    <span>Guardar en CRM</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-primary-golden hide-on-print"
                onClick={handleDownloadPdf}
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem', borderRadius: '8px' }}
                title="Descargar PDF"
              >
                <i className="fas fa-download"></i> Descargar PDF
              </button>
            </div>
          </div>

          {/* Letter Size Printable View */}
          <div className="live-letter-paper" ref={printableRef}>
            <div className="quote-printable-document" style={{ border: 'none', boxShadow: 'none', padding: 0, width: '100%' }}>

              {/* Header Membretado */}
              <div className="quote-print-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div className="quote-print-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <img src="/logo.png" alt="Logo" className="quote-print-logo" style={{ height: '40px' }} />
                  <div className="quote-print-brand-info" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <strong style={{ fontSize: '0.78rem', fontWeight: 700 }}>Expertos en Abastecimiento </strong>
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>S.A. de C.V.</span>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>RFC: CGA-980312-MTY &nbsp;|&nbsp; Tel: 81 2018 9555</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#334155', lineHeight: '1.6' }}>
                  <div><span style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cotización</span>&nbsp;<strong style={{ fontSize: '0.7rem' }}>{quoteNum || 'CG-XXXXXX'}</strong></div>
                  <div><span style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha</span>&nbsp;<strong style={{ fontSize: '0.7rem' }}>{quoteDate}</strong></div>
                </div>
              </div>

              <hr className="quote-divider-gold" style={{ margin: '1rem 0' }} />

              {/* Cliente y Vendedor */}
              <div className="quote-client-seller-grid" style={{ marginBottom: '1.25rem', gap: '1rem' }}>
                <div className="quote-client-box">
                  <h3>DATOS DEL CLIENTE</h3>
                  {(() => {
                    const opp = allOpportunities.find(x => x.id === selectedOpportunityId);
                    if (opp) {
                      const contactName = opp.contact?.name || '';
                      const companyName = opp.company?.name || opp.company?.alias || '';
                      const email = opp.contact?.email || opp.company?.email_main || '';
                      const phone = opp.contact?.phone || opp.company?.phone_main || '';
                      return (
                        <>
                          <strong style={{ fontSize: '0.9rem' }}>{contactName || companyName || 'Cliente Garza'}</strong>
                          {companyName && contactName && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Empresa: {companyName}</p>}
                          {opp.title && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Oportunidad: {opp.title}</p>}
                          {phone && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Tel: {phone}</p>}
                          {email && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Email: {email}</p>}
                        </>
                      );
                    }
                    const c = customers.find(x => x.id === selectedQuoteCustomer);
                    if (c) {
                      return (
                        <>
                          <strong style={{ fontSize: '0.9rem' }}>{c.name}</strong>
                          {c.company && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Empresa: {c.company}</p>}
                          {c.phone && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Tel: {c.phone}</p>}
                          {c.email && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Email: {c.email}</p>}
                        </>
                      );
                    }
                    return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>Ninguna oportunidad vinculada</p>;
                  })()}
                </div>
                <div className="quote-seller-box">
                  <h3>CONTACTO COMERCIAL</h3>
                  <strong style={{ fontSize: '0.9rem' }}>Comercializadora Garza S.A.</strong>
                  <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Atendido por: {currentUserProfile?.name || userName || 'Ejecutivo de Ventas'}</p>
                  {currentUserProfile?.position && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Puesto: {currentUserProfile.position}</p>}
                  <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Email: {currentUserProfile?.email || 'ventas@comercializadoragarza.com'}</p>
                  {currentUserProfile?.phone && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Móvil: {currentUserProfile.phone}</p>}
                  <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Mty, N.L., México</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="quote-print-table" style={{ marginBottom: '1.25rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '5%', padding: '0.5rem', fontSize: '0.7rem' }}>#</th>
                    <th style={{ padding: '0.5rem', fontSize: '0.7rem' }}>DESCRIPCIÓN DEL SUMINISTRO</th>
                    <th style={{ width: '12%', textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem' }}>CANT.</th>
                    <th style={{ width: '18%', textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem' }}>P. UNITARIO</th>
                    <th style={{ width: '20%', textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem' }}>IMPORTE</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '0.55rem', fontSize: '0.75rem' }}>{idx + 1}</td>
                      <td style={{ padding: '0.55rem', fontSize: '0.75rem' }}>
                        {item.description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Artículo vacío</span>}

                        {item.originalProduct && (parseInt(item.originalProduct.Existencias) || 0) <= 0 && (
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#d97706', fontWeight: 'bold', fontStyle: 'italic', marginTop: '2px' }}>
                            * Artículo bajo pedido. Aplican restricciones.
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.55rem', fontSize: '0.75rem' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '0.55rem', fontSize: '0.75rem' }}>
                        ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '0.55rem', fontSize: '0.75rem' }}>
                        ${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Notes */}
              <div className="quote-totals-wrapper" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="quote-notes-block">
                  <h4 style={{ fontSize: '0.7rem' }}>NOTAS Y CONDICIONES</h4>
                  <p style={{ whiteSpace: 'pre-line', fontSize: '0.675rem', lineHeight: '1.4' }}>{quoteNotes || 'Sin notas adicionales.'}</p>
                  {quoteItems.some(item => item.originalProduct && (parseInt(item.originalProduct.Existencias) || 0) <= 0) && (
                    <p style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 'bold', marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                      * Artículo bajo pedido. Aplican restricciones.
                    </p>
                  )}
                </div>
                <table className="quote-print-totals-table">
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>SUBTOTAL:</td>
                      <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>
                        ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>I.V.A. (16%):</td>
                      <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>
                        ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </td>
                    </tr>
                    <tr className="grand-total-row">
                      <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '800' }}>TOTAL NETO:</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: '800' }}>
                        ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="quote-print-footer" style={{ paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.7rem', margin: '0 0 1.5rem 0' }}>
                  Agradecemos su preferencia y quedamos a su entera disposición para cualquier aclaración comercial.
                </p>
                <div className="quote-signatures" style={{ gap: '2.5rem', marginBottom: '1rem' }}>
                  <div className="signature-line">
                    <hr />
                    <span>Firma Autorizada</span>
                    <strong style={{ fontSize: '0.75rem' }}>Comercializadora Garza</strong>
                  </div>
                  <div className="signature-line">
                    <hr />
                    <span>Aceptación de Cotización</span>
                    <strong style={{ fontSize: '0.75rem' }}>Nombre, Firma y Fecha Cliente</strong>
                  </div>
                </div>
                <span className="corp-web-link" style={{ fontSize: '0.7rem' }}>www.comercializadoragarza.com</span>
              </div>

            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: CONTROLES Y EDITOR DE ARTÍCULOS */}
        <div className="crm-quote-controls-panel hide-on-print">

          {/* 1. CONFIGURACIÓN GENERAL */}
          <div className="crm-quote-left-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-brand-primary)', fontWeight: '800' }}>
              <i className="fas fa-sliders-h" style={{ color: 'var(--color-brand-accent)' }}></i> Configuración de Cotización
            </h3>

            <div className="crm-input-group" style={{ marginBottom: '1rem' }}>
              <label className="crm-input-label">Vincular Prospecto de Kanban (CRM)</label>
              {selectedLeadId ? (
                (() => {
                  const lead = allLeads.find(x => String(x.id) === String(selectedLeadId));
                  return lead ? (
                    <div className="selected-client-badge-card">
                      <div className="selected-client-details">
                        <strong style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-primary)', fontSize: '0.95rem' }}>{lead.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>
                          Etapa actual: {lead.status?.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-clear-client"
                        onClick={() => {
                          setSelectedLeadId('');
                          setLeadSearch('');
                        }}
                        title="Desvincular Prospecto"
                      >
                        <i className="fas fa-times-circle"></i>
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>El prospecto vinculado ya no existe.</p>
                  );
                })()
              ) : (
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <div className="client-search-autocomplete-container" style={{ flex: 1 }}>
                    {allLeads.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '8px 0' }}>Sin prospectos disponibles en este tablero.</p>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="crm-login-input"
                          placeholder="Buscar prospecto por nombre..."
                          value={leadSearch}
                          onChange={(e) => {
                            setLeadSearch(e.target.value);
                            // Usaremos showOpportunityDropdown para la simplicidad visual pero filtrando leads si queremos, o creamos un nuevo state.
                            // Mejor usamos un componente inline:
                          }}
                        />
                        {leadSearch && leadSearch.trim() && (
                          <div className="autocomplete-dropdown" style={{ display: 'block' }}>
                            {(() => {
                              const filtered = allLeads.filter(l => l.name?.toLowerCase().includes(leadSearch.toLowerCase()));
                              return filtered.length === 0 ? (
                                <div className="autocomplete-option" style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>
                                  No se encontraron prospectos
                                </div>
                              ) : (
                                filtered.map(l => (
                                  <div
                                    key={l.id}
                                    className="autocomplete-option"
                                    onMouseDown={() => {
                                      setSelectedLeadId(l.id);
                                      setLeadSearch('');
                                    }}
                                  >
                                    <strong>{l.name}</strong>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                                      Etapa: {l.status}
                                    </span>
                                  </div>
                                ))
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <select
                    className="crm-login-input"
                    style={{ width: '45%', cursor: 'pointer', height: '46px', borderRadius: '10px' }}
                    value={selectedLeadId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedLeadId(e.target.value);
                        setLeadSearch('');
                      }
                    }}
                    disabled={allLeads.length === 0}
                  >
                    <option value="">-- O Seleccionar de Lista --</option>
                    {allLeads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="crm-input-group" style={{ marginBottom: '1rem' }}>
              <label className="crm-input-label">Vincular Oportunidad Activa (Opcional)</label>
              {selectedOpportunityId ? (
                (() => {
                  const opp = allOpportunities.find(x => x.id === selectedOpportunityId);
                  return opp ? (
                    <div className="selected-client-badge-card">
                      <div className="selected-client-details">
                        <strong style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-primary)', fontSize: '0.95rem' }}>{opp.title}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>
                          {opp.company?.name ? `Empresa: ${opp.company.name}` : ''}
                          {opp.company?.name && opp.contact?.name ? ' | ' : ''}
                          {opp.contact?.name ? `Contacto: ${opp.contact.name}` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-clear-client"
                        onClick={() => {
                          setSelectedOpportunityId('');
                          setOpportunitySearch('');
                        }}
                        title="Desvincular Oportunidad"
                      >
                        <i className="fas fa-times-circle"></i>
                      </button>
                    </div>
                  ) : null;
                })()
              ) : (
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <div className="client-search-autocomplete-container" style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="crm-login-input"
                      placeholder="Escribe el nombre o título de la oportunidad..."
                      value={opportunitySearch}
                      onChange={(e) => {
                        setOpportunitySearch(e.target.value);
                        setShowOpportunityDropdown(true);
                      }}
                      onFocus={() => setShowOpportunityDropdown(true)}
                      onBlur={() => setTimeout(() => setShowOpportunityDropdown(false), 200)}
                    />
                    {showOpportunityDropdown && opportunitySearch.trim() && (
                      <div className="autocomplete-dropdown">
                        {(() => {
                          const filtered = allOpportunities.filter(o =>
                            (o.title && o.title.toLowerCase().includes(opportunitySearch.toLowerCase())) ||
                            (o.company?.name && o.company.name.toLowerCase().includes(opportunitySearch.toLowerCase())) ||
                            (o.contact?.name && o.contact.name.toLowerCase().includes(opportunitySearch.toLowerCase()))
                          );
                          return filtered.length === 0 ? (
                            <div className="autocomplete-option" style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>
                              No se encontraron oportunidades
                            </div>
                          ) : (
                            filtered.map(o => (
                              <div
                                key={o.id}
                                className="autocomplete-option"
                                onMouseDown={() => {
                                  setSelectedOpportunityId(o.id);
                                  setOpportunitySearch('');
                                  setShowOpportunityDropdown(false);
                                }}
                              >
                                <strong>{o.title}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                                  {o.company?.name ? `Empresa: ${o.company.name}` : ''}
                                  {o.company?.name && o.contact?.name ? ' | ' : ''}
                                  {o.contact?.name ? `Contacto: ${o.contact.name}` : ''}
                                </span>
                              </div>
                            ))
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <select
                    className="crm-login-input"
                    style={{ width: '45%', cursor: 'pointer', height: '46px', borderRadius: '10px' }}
                    value={selectedOpportunityId}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedOpportunityId(e.target.value);
                        setOpportunitySearch('');
                      }
                    }}
                  >
                    <option value="">-- O Seleccionar de Lista --</option>
                    {allOpportunities.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.title} {o.company?.name ? `(${o.company.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="crm-input-group" style={{ margin: 0 }}>
              <label className="crm-input-label">Términos, Condiciones y Notas B2B</label>
              <textarea
                className="crm-login-input"
                rows="3"
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                placeholder="Escribe condiciones comerciales particulares..."
              />
            </div>
          </div>

          {/* 2. EDITOR INTERACTIVO DE ARTÍCULOS */}
          <div className="quote-item-editor-card">
            <div className="editor-card-header">
              <h3><i className="fas fa-edit"></i> Artículos en la Cotización</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-refresh" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', border: '1px solid var(--color-brand-primary)', background: 'transparent', color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={addQuoteItem}>
                  <i className="fas fa-plus"></i> Artículo Libre
                </button>
                <button type="button" className="btn-primary-golden" style={{ padding: '0.5rem 1.1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setShowCatalogModal(true)}>
                  <i className="fas fa-search"></i> Buscar Artículo
                </button>
              </div>
            </div>



            <div className="quote-items-grid">
              {quoteItems.map((item, idx) => (
                <div key={item.id} className="quote-item-row-modular" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div className="row-header" style={{ marginBottom: '0.65rem' }}>
                    <div>
                      <span className="row-num" style={{ fontWeight: '800' }}>Artículo {idx + 1}</span>

                    </div>
                    <button
                      type="button"
                      className="row-delete-btn"
                      onClick={() => removeQuoteItem(item.id)}
                      disabled={quoteItems.length === 1}
                      title="Eliminar artículo de la cotización"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>

                  <div className="row-fields" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: '0.75rem' }}>
                    <div className="field-desc">
                      <label className="field-label">Descripción del Suministro</label>
                      <input
                        type="text"
                        className="crm-login-input"
                        value={item.description}
                        onChange={(e) => updateQuoteItem(item.id, 'description', e.target.value)}
                        required
                        placeholder="Ej. Suministro de Acero..."
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="field-qty">
                      <label className="field-label">Cantidad</label>
                      <div className="qty-control-box" style={{ height: '38px' }}>
                        <button type="button" className="qty-btn-minus" style={{ height: '36px' }} onClick={() => adjustQuoteItemQty(item.id, -1)}>-</button>
                        <input
                          type="number"
                          className="qty-input-field"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuoteItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                        <button type="button" className="qty-btn-plus" style={{ height: '36px' }} onClick={() => adjustQuoteItemQty(item.id, 1)}>+</button>
                      </div>
                    </div>

                    <div className="field-price">
                      <label className="field-label">Precio (Unitario)</label>
                      <div className="price-input-wrapper">
                        <input
                          type="number"
                          className="crm-login-input price-input-field"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateQuoteItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          required
                          style={{ padding: '0.5rem 0.5rem 0.5rem 1.4rem', fontSize: '0.85rem', height: '38px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* PRODUCT CATALOG SEARCH DIALOG */}
      {showCatalogModal && ReactDOM.createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowCatalogModal(false)} style={{ zIndex: 9999 }}>
          <div className="crm-modal-content crm-catalog-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '96%', height: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <button className="close-modal-btn" onClick={() => setShowCatalogModal(false)}>&times;</button>
            <div className="modal-header" style={{ paddingBottom: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-primary)' }}>Catálogo de Suministros Garza (Aspel SAE 9.0)</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Buscador optimizado con filtros inteligentes.
              </p>
            </div>

            {/* Catalog Filters */}
            <div className="catalog-search-filters" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className="search-box" style={{ flex: 1 }}>
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Buscar por clave o descripción..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    onFocus={() => {
                      if (window.innerWidth <= 768) {
                        setShowAdvancedFilters(false);
                      }
                    }}
                  />
                </div>
                
                <button
                  type="button"
                  className={`btn-filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: showAdvancedFilters ? '#fef3c7' : '#ffffff',
                    color: showAdvancedFilters ? '#d97706' : '#475569',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <i className="fas fa-filter"></i>
                  <span className="hide-on-mobile">Filtros</span>
                  {(catFilterCategory || catFilterMaterial || catFilterMeasure || showOnlyInStock) && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      background: '#d97706',
                      borderRadius: '50%',
                      display: 'inline-block'
                    }} />
                  )}
                </button>

                {(catalogSearch || catFilterCategory || catFilterMaterial || catFilterMeasure || showOnlyInStock) && (
                  <button
                    type="button"
                    onClick={clearCatalogFilters}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #fee2e2',
                      background: '#fef2f2',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                    title="Limpiar filtros"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>

              {showAdvancedFilters && (
                <div className="catalog-filters-collapsible" style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div className="catalog-filters-select-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div className="filter-item">
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Categoría</label>
                      <select value={catFilterCategory} onChange={(e) => setCatFilterCategory(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
                        <option value="">Todas</option>
                        {catFilterOptions.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-item">
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Material</label>
                      <select value={catFilterMaterial} onChange={(e) => setCatFilterMaterial(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
                        <option value="">Todos</option>
                        {catFilterOptions.materials.map(mat => (
                          <option key={mat} value={mat}>{mat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-item">
                      <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Medida</label>
                      <select value={catFilterMeasure} onChange={(e) => setCatFilterMeasure(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
                        <option value="">Todas</option>
                        {catFilterOptions.measures.map(meas => (
                          <option key={meas} value={meas}>{meas}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="catalog-stock-toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="stock-only-toggle"
                      className="stock-toggle-checkbox"
                      checked={showOnlyInStock}
                      onChange={(e) => setShowOnlyInStock(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="stock-only-toggle" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', userSelect: 'none' }}>
                      <i className="fas fa-warehouse" style={{ color: 'var(--color-brand-accent)', fontSize: '0.85rem' }}></i> Mostrar solo productos con stock
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Product list */}
            <div className="catalog-products-list" style={{ flex: 1, overflowY: 'auto' }}>
              {catalogLoading ? (
                <div className="catalog-loader">
                  <div className="spinner-mini"></div>
                  <p>Buscando en el inventario Garza...</p>
                </div>
              ) : (() => {
                const displayedProducts = catalogProducts.filter(p => !showOnlyInStock || (parseInt(p.Existencias) || 0) > 0);
                if (displayedProducts.length === 0) {
                  return (
                    <div className="catalog-empty">
                      <i className="fas fa-search-minus"></i>
                      <p>No se encontraron productos disponibles con stock.</p>
                    </div>
                  );
                }
                return displayedProducts.map(p => {
                  const activePrice = getProductPriceByAgreement(p, selectedAgreement);
                  const currentQty = catalogQuantities[p.Clave] || 1;
                  const isOutOfStock = (parseInt(p.Existencias) || 0) <= 0;

                  return (
                    <div
                      key={p.Clave}
                      className={`catalog-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                      style={{ padding: '0.85rem' }}
                      onMouseEnter={isOutOfStock ? (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCardTooltip({
                          text: 'No tenemos este producto en stock. Se puede vender, pero el tiempo de entrega puede variar.',
                          x: rect.left + rect.width / 2,
                          y: rect.bottom + 8
                        });
                      } : undefined}
                      onMouseLeave={isOutOfStock ? () => setCardTooltip(null) : undefined}
                    >
                      <div className="card-top">
                        <span className="p-clave">{p.Clave}</span>
                        <span className="p-stock" style={{ fontSize: '0.725rem', color: isOutOfStock ? '#d97706' : '#10b981', fontWeight: 'bold' }}>
                          {isOutOfStock ? 'Sin stock' : `Stock: ${p.Existencias || 0}`}
                        </span>
                      </div>
                      <h4 className="p-desc" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>{p.Descripción_Limpia}</h4>
                      <div className="card-badges" style={{ marginBottom: '0.65rem' }}>
                        <span className="badge-cat" style={{ fontSize: '0.6rem' }}>{p.Categoria}</span>
                        {p.Material !== 'Varios / Otros' && <span className="badge-mat" style={{ fontSize: '0.6rem' }}>{p.Material}</span>}
                        {p.Medida !== 'N/A' && <span className="badge-meas" style={{ fontSize: '0.6rem' }}>{p.Medida}</span>}
                      </div>

                      <div className="card-price-action">
                        <div className="price-info">
                          <span className="price-label" style={{ fontSize: '0.65rem' }}>
                            {selectedAgreement === 'public' ? 'Precio Público' : `Tarifa Conv. ${selectedAgreement.toUpperCase()}`}
                          </span>
                          <strong className="price-value" style={{ fontSize: '0.9rem', display: 'block' }}>
                            ${activePrice.toFixed(2)} <span className="currency" style={{ fontSize: '0.65rem' }}>MXN</span>
                          </strong>
                        </div>
                        <div className="card-actions-row">
                          <div className="catalog-qty-input-box">
                            <span className="catalog-qty-label">Cant.</span>
                            <input
                              type="number"
                              className="catalog-qty-field"
                              min="1"
                              value={currentQty}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setCatalogQuantities(prev => ({
                                  ...prev,
                                  [p.Clave]: val
                                }));
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => addProductToQuote(p, currentQty)}
                            className="btn-add-to-quote"
                            title={isOutOfStock ? "Añadir artículo bajo pedido" : "Añadir artículo"}
                            style={{ background: isOutOfStock ? '#e0922b' : 'var(--color-brand-primary)' }}
                          >
                            {isOutOfStock ? (
                              <>
                                <i className="fas fa-shipping-fast"></i> Pedir
                              </>
                            ) : (
                              <>
                                <i className="fas fa-plus-circle"></i> Agregar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* Tooltip portal */}
      {cardTooltip && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            left: cardTooltip.x,
            top: cardTooltip.y,
            transform: 'translateX(-50%)',
            background: '#1c1917',
            color: '#fef3c7',
            fontSize: '0.75rem',
            fontWeight: '500',
            lineHeight: '1.5',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #f59e0b',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxWidth: '240px',
            whiteSpace: 'normal',
            textAlign: 'center',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          ⚠️ {cardTooltip.text}
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #f59e0b'
          }} />
        </div>,
        document.body
      )}
    </section>
  );
}

