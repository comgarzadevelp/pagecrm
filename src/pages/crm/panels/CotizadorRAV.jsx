import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useUX } from '../../../components/common/UXProvider';

export default function CotizadorRAV({
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
  customers
}) {
  const { showToast, showConfirm } = useUX();
  // ---------- CORE STATE ----------
  const [level, setLevel] = useState('publico'); // 'publico' | 'tecnico' | 'mayoreo'
  const [quoteNum, setQuoteNum] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const printableRef = useRef(null);

  // ---------- CUSTOMER OPTIONS ----------
  const [isUnregisteredClient, setIsUnregisteredClient] = useState(false);
  const [unregisteredClient, setUnregisteredClient] = useState({
    name: '',
    company: '',
    phone: '',
    email: ''
  });
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [showOpportunityDropdown, setShowOpportunityDropdown] = useState(false);

  // ---------- COMMON LOGISTICS ----------
  const [hasInstallation, setHasInstallation] = useState(false);
  const [installationNotes, setInstallationNotes] = useState('');

  // ---------- TÉCNICOS LOGISTICS ----------
  const [techDiscountPercentage, setTechDiscountPercentage] = useState(15); // Default 15% discount for technicians

  // ---------- MAYOREO LOGISTICS ----------
  const [currency, setCurrency] = useState('MXN'); // 'MXN' | 'USD'
  const [exchangeRate, setExchangeRate] = useState(17.50);
  const [currentLanguage, setCurrentLanguage] = useState('both'); // 'es' | 'en' | 'both'

  // Items for Venta Público & Técnicos (flat list)
  const [simpleItems, setSimpleItems] = useState([
    { id: 1, model: '', description: '', quantity: 1, price: 0 }
  ]);

  // Items for Mayoreo (flat list with short summary, quantity, price, and detailed specifications)
  const [wholesaleItems, setWholesaleItems] = useState([
    { id: Date.now(), model: '', summary: '', descriptionEs: '', descriptionEn: '', specificTermsEs: '', specificTermsEn: '', quantity: 1, price: 0 }
  ]);

  // Terms and conditions B2B / Mayoreo (support >10k characters)
  const [termsEs, setTermsEs] = useState(
    'Condiciones de Venta:\n• Precios indicados en la moneda seleccionada, más 16% de IVA.\n• Forma de pago: 50% de anticipo para procesar pedido y 50% contra aviso de entrega del suministro.\n• Tiempo de entrega: 4 a 6 semanas sujeto a confirmación de planta.\n• Vigencia de la cotización: 15 días naturales a partir de la fecha de emisión.'
  );
  const [termsEn, setTermsEn] = useState(
    'Sales Terms:\n• Prices stated in the selected currency, plus 16% VAT.\n• Payment terms: 50% down payment to process order and 50% upon notice of supply delivery.\n• Delivery time: 4 to 6 weeks subject to factory confirmation.\n• Quotation validity: 15 calendar days from the date of issue.'
  );

  const [translatingItemId, setTranslatingItemId] = useState(null);

  // ---------- CATALOG SEARCH & CUSTOM PRODUCT SAVE ----------
  const [suggestions, setSuggestions] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  const handleSearchProduct = async (itemId, query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions(prev => ({ ...prev, [itemId]: [] }));
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/products?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuggestions(prev => ({ ...prev, [itemId]: data.products || [] }));
      }
    } catch (e) {
      console.error('Error fetching suggestions:', e);
    }
  };

  const handleSelectSuggestion = (itemId, prod, isWholesale = true) => {
    if (isWholesale) {
      setWholesaleItems(wholesaleItems.map(item => item.id === itemId ? {
        ...item,
        model: prod.Clave,
        summary: prod.Descripción || '',
        descriptionEs: prod.descriptionEs || prod.Descripción || '',
        descriptionEn: prod.descriptionEn || '',
        price: prod.precio_publico || 0
      } : item));
    } else {
      setSimpleItems(simpleItems.map(item => item.id === itemId ? {
        ...item,
        model: prod.Clave,
        description: prod.Descripción || '',
        price: prod.precio_publico || 0
      } : item));
    }
    setSuggestions(prev => ({ ...prev, [itemId]: [] }));
  };

  const handleSaveProductToCatalog = async (item, isWholesale = true) => {
    const model = isWholesale ? item.model : item.model;
    const summary = isWholesale ? item.summary : item.description;
    const descriptionEs = isWholesale ? item.descriptionEs : item.description;
    const descriptionEn = isWholesale ? item.descriptionEn : '';
    const price = item.price;
    
    if (!model || !model.trim()) {
      showToast('Por favor introduce un modelo válido para poder guardar el producto.', 'warning');
      return;
    }
    
    setSavingProductId(item.id);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/products/rav`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clave: model,
          model,
          summary,
          descriptionEs,
          descriptionEn,
          price
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`¡Producto "${model}" guardado en el catálogo de RAV con éxito! Ahora se sugerirá automáticamente cuando busques.`, 'success');
      } else {
        showToast('Error al guardar producto: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (err) {
      console.error('Error saving catalog product:', err);
      showToast('Error de conexión al intentar guardar en el catálogo.', 'error');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleTranslateItem = async (itemId, textToTranslate) => {
    if (!textToTranslate || !textToTranslate.trim()) {
      showToast('Por favor escribe la descripción en español primero antes de traducir.', 'warning');
      return;
    }
    setTranslatingItemId(itemId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textToTranslate })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        handleUpdateWholesaleItem(itemId, 'descriptionEn', data.translation);
      } else {
        showToast('Error al traducir: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (err) {
      console.error('Translation error:', err);
      showToast('Error de conexión al intentar traducir.', 'error');
    } finally {
      setTranslatingItemId(null);
    }
  };

  // ---------- INITIALIZE QUOTE NUMBER ----------
  useEffect(() => {
    if (activeTab === 'quotes' && !quoteNum) {
      const today = new Date();
      setQuoteDate(today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
      setQuoteNum('RAV-' + Math.floor(100000 + Math.random() * 900000));
    }
  }, [activeTab, level]);

  // Auto-collapse sidebar to maximize desktop workspace
  useEffect(() => {
    if (activeTab === 'quotes') {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [activeTab]);

  // ---------- QUOTE CALCULATIONS ----------
  const getSimpleTotals = () => {
    const subtotal = simpleItems.reduce((acc, item) => acc + (item.quantity * item.price || 0), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const getWholesaleTotals = () => {
    const subtotal = wholesaleItems.reduce((acc, item) => acc + (item.quantity * item.price || 0), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const totals = level === 'mayoreo' ? getWholesaleTotals() : getSimpleTotals();

  // ---------- ACTIONS ----------
  const handleAddSimpleItem = () => {
    setSimpleItems([...simpleItems, { id: Date.now(), model: '', description: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveSimpleItem = (id) => {
    if (simpleItems.length === 1) return;
    setSimpleItems(simpleItems.filter(item => item.id !== id));
  };

  const handleUpdateSimpleItem = (id, field, value) => {
    setSimpleItems(simpleItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddWholesaleItem = () => {
    setWholesaleItems([
      ...wholesaleItems,
      { id: Date.now(), model: '', summary: '', descriptionEs: '', descriptionEn: '', specificTermsEs: '', specificTermsEn: '', quantity: 1, price: 0 }
    ]);
  };

  const handleRemoveWholesaleItem = (itemId) => {
    if (wholesaleItems.length === 1) return;
    setWholesaleItems(wholesaleItems.filter(item => item.id !== itemId));
  };

  const handleUpdateWholesaleItem = (itemId, field, value) => {
    setWholesaleItems(wholesaleItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  // ---------- SAVE AND DOWNLOAD PDF (AUTOMATIC SAVE ON PDF DOWNLOAD) ----------
  const handleSaveQuoteToDB = async (bypassAlert = false) => {
    let clientName = 'Cliente Manual';
    let companyName = 'RAV Cliente';
    let email = '';
    let phone = '';

    if (isUnregisteredClient) {
      clientName = unregisteredClient.name || 'Cliente Manual';
      companyName = unregisteredClient.company || 'Particular';
      email = unregisteredClient.email || '';
      phone = unregisteredClient.phone || '';
    } else if (selectedOpportunityId) {
      const opp = (allOpportunities || []).find(x => x.id === selectedOpportunityId);
      if (opp) {
        clientName = opp.contact?.name || opp.company?.name || 'Cliente Oportunidad';
        companyName = opp.company?.name || opp.company?.alias || 'Particular';
        email = opp.contact?.email || opp.company?.email_main || '';
        phone = opp.contact?.phone || opp.company?.phone_main || '';
      }
    }

    const itemsPayload = level === 'mayoreo' ? wholesaleItems.map(item => ({
      model: item.model,
      description_es: item.descriptionEs,
      description_en: item.descriptionEn,
      summary: item.summary,
      specific_terms_es: item.specificTermsEs,
      specific_terms_en: item.specificTermsEn,
      quantity: item.quantity,
      price: item.price
    })) : simpleItems.map(item => ({
      model: item.model,
      description: item.description,
      quantity: item.quantity,
      price: item.price
    }));

    const finalNotes = JSON.stringify({
      level,
      has_installation: hasInstallation,
      installation_notes: hasInstallation ? installationNotes : '',
      currency,
      exchange_rate: currency === 'USD' ? exchangeRate : 1,
      unregistered_client: isUnregisteredClient ? unregisteredClient : null,
      terms_es: termsEs,
      terms_en: termsEn,
      language: currentLanguage
    });

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
          opportunityId: selectedOpportunityId || null,
          agreement: `rav_${level}`,
          items: itemsPayload,
          notes: finalNotes,
          subtotal: totals.subtotal,
          iva: totals.iva,
          total: totals.total
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (!bypassAlert) {
          showToast(`¡Cotización ${quoteNum} guardada con éxito en el CRM!`, 'success');
        }
        fetchOpportunitiesList();
        return true;
      } else {
        console.error('Error saving quote:', data.message);
        return false;
      }
    } catch (err) {
      console.error('Error connecting to backend:', err);
      return false;
    }
  };

  const handleDownloadPdfAndAutoSave = async () => {
    if (!printableRef.current) return;
    
    setSavingQuote(true);
    // 1. Trigger the automatic backend save in background/parallel as requested by user
    const saveSuccess = await handleSaveQuoteToDB(true);
    
    // 2. Generate PDF using our elegant page-by-page capture technique to eliminate formatting crops
    try {
      const pdf = new jsPDF('p', 'mm', 'letter');
      
      if (level === 'mayoreo') {
        const element = printableRef.current.querySelector('.rav-mayoreo-continuous-proposal');
        if (element) {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          let heightLeft = imgHeight;
          let position = 0;
          
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
          
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
        }
      } else {
        const pageElements = printableRef.current.querySelectorAll('.rav-pdf-page');
        for (let i = 0; i < pageElements.length; i++) {
          if (i > 0) {
            pdf.addPage();
          }
          // Capture each physical page container individually to eliminate text-cut or formatting crops
          const canvas = await html2canvas(pageElements[i], { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
      }
      
      const fileName = `${quoteNum || 'cotizacion'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setSavingQuote(false);
    }
  };

  const handleCleanQuote = async () => {
    const confirmed = await showConfirm('¿Limpiar Cotización?', '¿Seguro que deseas vaciar los datos actuales de la cotización?', { type: 'warning', confirmText: 'Vaciar' });
    if (confirmed) {
      setSimpleItems([{ id: Date.now(), model: '', description: '', quantity: 1, price: 0 }]);
      setWholesaleItems([{
        id: Date.now(),
        model: '',
        summary: '',
        descriptionEs: '',
        descriptionEn: '',
        specificTermsEs: '',
        specificTermsEn: '',
        quantity: 1,
        price: 0
      }]);
      setHasInstallation(false);
      setInstallationNotes('');
      setIsUnregisteredClient(false);
      setSelectedOpportunityId('');
      setUnregisteredClient({ name: '', company: '', phone: '', email: '' });
      setQuoteNum('RAV-' + Math.floor(100000 + Math.random() * 900000));
    }
  };

  return (
    <section className="crm-quotes-section glass" style={{ padding: '2rem 1.5rem', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* HEADER BANNER */}
      <div className="crm-table-header hide-on-print" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'var(--color-primary)', fontWeight: '900', letterSpacing: '-0.5px', margin: 0 }}>
              Cotizador Inteligente Multi-Nivel RAV
            </h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Genera presupuestos rápidos para público y técnicos, o complejas propuestas de mayoreo bilingües.
            </p>
          </div>
          <div className="rav-level-tabs" style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
            {['publico', 'tecnico', 'mayoreo'].map(lvl => (
              <button
                key={lvl}
                type="button"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  background: level === lvl ? '#CC3333' : 'transparent',
                  color: level === lvl ? '#fff' : 'var(--color-text-muted)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setLevel(lvl)}
              >
                {lvl === 'publico' ? 'Venta Público' : lvl === 'tecnico' ? 'Técnicos' : '📈 Mayoreo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="crm-quotes-realtime-layout" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: LIVE PRINTABLE SHEET */}
        <div className="crm-quote-preview-panel-sticky">
          
          <div className="quote-preview-actions-header hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="live-badge-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', fontSize: '0.85rem' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
              <span>Vista Previa Carta</span>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleCleanQuote} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                <i className="fas fa-trash"></i> Limpiar
              </button>
              
              <button 
                onClick={handleDownloadPdfAndAutoSave} 
                disabled={savingQuote}
                style={{
                  background: 'linear-gradient(135deg, #CC3333, #e53e3e)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  boxShadow: '0 4px 10px rgba(204,51,51,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {savingQuote ? (
                  <span>Descargando y Guardando...</span>
                ) : (
                  <>
                    <i className="fas fa-file-pdf"></i>
                    <span>Descargar PDF (Auto-Guardado)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PRINTABLE LETTER BOX (SUPPORTING DYNAMIC MULTI-PAGE FOR MAYOREO AND SINGLE PAGE FOR QUICK PLOTS) */}
          <div 
            ref={printableRef} 
            className="rav-printable-sheet-container"
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}
          >
            {level === 'mayoreo' ? (
              // ==========================================
              // ==========================================
              // DYNAMIC UNIFIED CONTINUOUS FLOW FOR MAYOREO
              // ==========================================
              // ==========================================
              <div 
                className="rav-mayoreo-continuous-proposal"
                style={{ 
                  background: '#fff', 
                  color: '#1a1a1a', 
                  padding: '2.5cm 2cm', 
                  borderRadius: '2px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '11px',
                  lineHeight: '1.45',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* BRAND HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #CC3333', paddingBottom: '12px', marginBottom: '20px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#CC3333', letterSpacing: '-0.8px' }}>
                      RAV <span style={{ color: '#0087BE', fontWeight: '300' }}>Aire y Calefacción</span>
                    </h1>
                    <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Ingeniería en Confort Ambiental y Climatización B2B
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
                    <span style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Propuesta de Ingeniería</span>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{quoteNum || 'RAV-XXXXXX'}</h3>
                    <span style={{ fontSize: '9px', color: '#666' }}>{quoteDate}</span>
                  </div>
                </div>

                {/* METADATA GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', background: '#f8fafc', padding: '12px', borderRadius: '4px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '9px', color: '#CC3333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Datos del Cliente</h4>
                    {isUnregisteredClient ? (
                      <>
                        <strong style={{ fontSize: '12px', color: '#111' }}>{unregisteredClient.name || 'Cliente Público'}</strong>
                        {unregisteredClient.company && <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>Empresa: {unregisteredClient.company}</div>}
                        {unregisteredClient.phone && <div style={{ fontSize: '10px', color: '#666' }}>Tel: {unregisteredClient.phone}</div>}
                        {unregisteredClient.email && <div style={{ fontSize: '10px', color: '#666' }}>Email: {unregisteredClient.email}</div>}
                      </>
                    ) : (
                      (() => {
                        const opp = (allOpportunities || []).find(x => x.id === selectedOpportunityId);
                        if (opp) {
                          return (
                            <>
                              <strong style={{ fontSize: '12px', color: '#111' }}>{opp.contact?.name || opp.company?.name || 'Cliente RAV'}</strong>
                              {opp.company?.name && <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>Empresa: {opp.company.name}</div>}
                              {opp.contact?.phone && <div style={{ fontSize: '10px', color: '#666' }}>Tel: {opp.contact.phone}</div>}
                              {opp.contact?.email && <div style={{ fontSize: '10px', color: '#666' }}>Email: {opp.contact.email}</div>}
                            </>
                          );
                        }
                        return <span style={{ color: '#999', fontStyle: 'italic' }}>Sin cliente vinculado / Cotización Rápida</span>;
                      })()
                    )}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '9px', color: '#0087BE', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ejecutivo Comercial</h4>
                    <strong style={{ fontSize: '11px', color: '#111' }}>{currentUserProfile?.name || userName || 'Asesor Comercial RAV'}</strong>
                    <div style={{ fontSize: '10px', color: '#666' }}>Puesto: {currentUserProfile?.position || 'Ingeniero de Ventas'}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Email: {currentUserProfile?.email || 'ventas@ravclimas.com'}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Ubicación: Monterrey, N.L.</div>
                  </div>
                </div>

                {/* CONTINUOUS LIST OF ITEMS */}
                <h3 style={{ color: '#0087BE', borderBottom: '2px solid #0087BE', paddingBottom: '6px', margin: '20px 0 15px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px', fontWeight: '900' }}>
                  Especificaciones Técnicas y Partidas
                </h3>

                {wholesaleItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      padding: '16px', 
                      marginBottom: '20px', 
                      background: '#f8fafc',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    {/* Item Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '12px', color: '#CC3333' }}>Partida #{index + 1}</strong>
                      <span style={{ fontSize: '11px', color: '#475569' }}>Modelo: <strong style={{ color: '#1e293b' }}>{item.model || 'S/M'}</strong></span>
                    </div>
                    
                    {/* Short Summary */}
                    {item.summary && (
                      <div style={{ marginBottom: '10px', fontStyle: 'italic', color: '#475569', fontWeight: 'bold', fontSize: '11px' }}>
                        {item.summary}
                      </div>
                    )}
                    
                    {/* Detailed Specs */}
                    <div style={{ fontSize: '10.5px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '12px' }}>
                      {currentLanguage === 'en' ? item.descriptionEn : currentLanguage === 'es' ? item.descriptionEs : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <strong style={{ color: '#CC3333', fontSize: '9px', display: 'block', marginBottom: '4px' }}>ESPAÑOL:</strong>
                            {item.descriptionEs || 'Sin descripción técnica registrada.'}
                          </div>
                          <div style={{ borderLeft: '1px dashed #cbd5e1', paddingLeft: '15px' }}>
                            <strong style={{ color: '#0087BE', fontSize: '9px', display: 'block', marginBottom: '4px' }}>ENGLISH:</strong>
                            {item.descriptionEn || 'No English specifications recorded.'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* [NEW] SPECIFIC CAVEAT / TERMS & CONDITIONS FOR THIS ITEM */}
                    {(item.specificTermsEs || item.specificTermsEn) && (
                      <div style={{ background: 'rgba(0,135,190,0.04)', border: '1px solid rgba(0,135,190,0.15)', borderRadius: '6px', padding: '10px', marginBottom: '12px', fontSize: '9.5px', color: '#0369a1' }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', textTransform: 'uppercase', fontSize: '8.5px', color: '#0284c7' }}>
                          <i className="fas fa-info-circle"></i> Cláusulas y Garantías Específicas del Equipo:
                        </strong>
                        {currentLanguage === 'en' ? item.specificTermsEn : currentLanguage === 'es' ? item.specificTermsEs : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>{item.specificTermsEs}</div>
                            <div style={{ borderLeft: '1px dashed rgba(0,135,190,0.2)', paddingLeft: '15px' }}>{item.specificTermsEn}</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Partida Prices & Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 'bold' }}>
                      <span style={{ color: '#475569' }}>Cant: <span style={{ color: '#1e293b' }}>{item.quantity}</span></span>
                      <span style={{ color: '#475569' }}>P. Unit: <span style={{ color: '#1e293b' }}>${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {currency}</span></span>
                      <span style={{ color: '#0087BE' }}>Total Partida: <span>${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {currency}</span></span>
                    </div>
                  </div>
                ))}

                {/* LOGÍSTICA DE INSTALACIÓN IF ACTIVE */}
                {hasInstallation && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#b45309', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-tools"></i> Logística y Criterios de Instalación Generales
                    </h4>
                    <p style={{ margin: 0, fontSize: '9.5px', color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {installationNotes || 'Instalación estándar de equipos RAV.'}
                    </p>
                  </div>
                )}

                {/* NET TOTALS & GLOBAL TERMS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '25px', marginTop: '20px', borderTop: '2px solid #e2e8f0', paddingTop: '15px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  
                  {/* Cláusulas Generales de Venta */}
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '9.5px', color: '#CC3333', textTransform: 'uppercase', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                      Términos y Cláusulas Comerciales de Venta
                    </h4>
                    <div style={{ fontSize: '8.5px', color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: '1.35' }}>
                      {currentLanguage === 'en' ? termsEn : currentLanguage === 'es' ? termsEs : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>{termsEs}</div>
                          <div style={{ borderLeft: '1px dashed #cbd5e1', paddingLeft: '15px' }}>{termsEn}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totals Table */}
                  <div>
                    <table style={{ width: '100%', fontSize: '11px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#666' }}>Subtotal Neto:</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                            ${totals.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#666' }}>IVA (16%):</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                            ${totals.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                          </td>
                        </tr>
                        <tr style={{ borderTop: '2px solid #CC3333' }}>
                          <td style={{ padding: '6px 0', fontWeight: '900', color: '#CC3333', fontSize: '12px' }}>Total Propuesta:</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '900', color: '#CC3333', fontSize: '13px' }}>
                            ${totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                          </td>
                        </tr>
                        {currency === 'USD' && (
                          <tr style={{ borderTop: '1px dashed #cbd5e1' }}>
                            <td style={{ padding: '4px 0', color: '#64748b', fontSize: '9.5px' }}>T.C.: ${exchangeRate.toFixed(2)} | Aprox:</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', color: '#64748b', fontSize: '9.5px', fontWeight: 'bold' }}>
                              ${(totals.total * exchangeRate).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* SIGNATURE BLOCK */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #cbd5e1', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div style={{ width: '42%', textAlign: 'center' }}>
                    <div style={{ height: '40px' }}></div>
                    <hr style={{ border: 'none', borderTop: '1px solid #888', margin: '4px 0' }} />
                    <strong style={{ fontSize: '9.5px', color: '#1e293b', display: 'block' }}>Firma Autorizada RAV</strong>
                    <span style={{ fontSize: '8px', color: '#64748b' }}>Ingeniería de Ventas y Proyectos</span>
                  </div>
                  <div style={{ width: '42%', textAlign: 'center' }}>
                    <div style={{ height: '40px' }}></div>
                    <hr style={{ border: 'none', borderTop: '1px solid #888', margin: '4px 0' }} />
                    <strong style={{ fontSize: '9.5px', color: '#1e293b', display: 'block' }}>Aceptación de Cotización Cliente</strong>
                    <span style={{ fontSize: '8px', color: '#64748b' }}>Nombre, Firma y Fecha</span>
                  </div>
                </div>

                {/* FOOTER */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#999', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <span>www.ravaireycalefaccion.com &bull; Tel: 81 8340 1020</span>
                  <span style={{ fontWeight: 'bold', color: '#CC3333' }}>Propuesta Técnica y Comercial RAV</span>
                </div>

              </div>
            ) : (
              // ==========================================
              // ==========================================
              // SINGLE-PAGE STRUCTURE FOR PUBLICO / TECNICO
              // ==========================================
              // ==========================================
              <div 
                className="rav-pdf-page"
                style={{ 
                  background: '#fff', 
                  color: '#1a1a1a', 
                  padding: '2.5cm 2cm', 
                  borderRadius: '2px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  fontFamily: 'Outfit, sans-serif',
                  minHeight: '279.4mm',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* BRAND HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #CC3333', paddingBottom: '12px', marginBottom: '20px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#CC3333', letterSpacing: '-0.8px' }}>
                      RAV <span style={{ color: '#0087BE', fontWeight: '300' }}>Aire y Calefacción</span>
                    </h1>
                    <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Ingeniería en Confort Ambiental y Climatización B2B
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
                    <span style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presupuesto Oficial</span>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{quoteNum || 'RAV-XXXXXX'}</h3>
                    <span style={{ fontSize: '9px', color: '#666' }}>{quoteDate}</span>
                  </div>
                </div>

                {/* METADATA GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', background: '#f8fafc', padding: '12px', borderRadius: '4px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '9px', color: '#CC3333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Datos del Cliente</h4>
                    {isUnregisteredClient ? (
                      <>
                        <strong style={{ fontSize: '12px', color: '#111' }}>{unregisteredClient.name || 'Cliente Público'}</strong>
                        {unregisteredClient.company && <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>Empresa: {unregisteredClient.company}</div>}
                        {unregisteredClient.phone && <div style={{ fontSize: '10px', color: '#666' }}>Tel: {unregisteredClient.phone}</div>}
                        {unregisteredClient.email && <div style={{ fontSize: '10px', color: '#666' }}>Email: {unregisteredClient.email}</div>}
                      </>
                    ) : (
                      (() => {
                        const opp = (allOpportunities || []).find(x => x.id === selectedOpportunityId);
                        if (opp) {
                          return (
                            <>
                              <strong style={{ fontSize: '12px', color: '#111' }}>{opp.contact?.name || opp.company?.name || 'Cliente RAV'}</strong>
                              {opp.company?.name && <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>Empresa: {opp.company.name}</div>}
                              {opp.contact?.phone && <div style={{ fontSize: '10px', color: '#666' }}>Tel: {opp.contact.phone}</div>}
                              {opp.contact?.email && <div style={{ fontSize: '10px', color: '#666' }}>Email: {opp.contact.email}</div>}
                            </>
                          );
                        }
                        return <span style={{ color: '#999', fontStyle: 'italic' }}>Sin cliente vinculado / Cotización Rápida</span>;
                      })()
                    )}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '9px', color: '#0087BE', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ejecutivo Comercial</h4>
                    <strong style={{ fontSize: '11px', color: '#111' }}>{currentUserProfile?.name || userName || 'Asesor Comercial RAV'}</strong>
                    <div style={{ fontSize: '10px', color: '#666' }}>Puesto: {currentUserProfile?.position || 'Ingeniero de Ventas'}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Email: {currentUserProfile?.email || 'ventas@ravclimas.com'}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Ubicación: Monterrey, N.L.</div>
                  </div>
                </div>

                {/* QUICK ITEMS TABLE */}
                <div style={{ flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #CC3333' }}>
                        <th style={{ textAlign: 'left', padding: '6px', width: '18%', fontSize: '9px', color: '#475569' }}>Modelo</th>
                        <th style={{ textAlign: 'left', padding: '6px', fontSize: '9px', color: '#475569' }}>Descripción</th>
                        <th style={{ textAlign: 'center', padding: '6px', width: '10%', fontSize: '9px', color: '#475569' }}>Cant.</th>
                        <th style={{ textAlign: 'right', padding: '6px', width: '15%', fontSize: '9px', color: '#475569' }}>Precio U.</th>
                        <th style={{ textAlign: 'right', padding: '6px', width: '15%', fontSize: '9px', color: '#475569' }}>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simpleItems.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px', fontWeight: 'bold', color: '#1e293b' }}>{item.model || 'S/M'}</td>
                          <td style={{ padding: '6px', color: '#334155' }}>{item.description || 'Suministro de climatización'}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '6px', textAlign: 'right' }}>
                            ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                            ${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* INSTALLATION SECTION IF ACTIVE */}
                  {hasInstallation && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 4px 0', color: '#b45309', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        <i className="fas fa-tools"></i> DETALLES Y LOGÍSTICA DE INSTALACIÓN
                      </h4>
                      <p style={{ margin: 0, fontSize: '9.5px', color: '#78350f', whiteSpace: 'pre-wrap' }}>
                        {installationNotes || 'Instalación estándar de equipos RAV.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* TOTALS & TERMS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '25px', alignItems: 'start', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '8.5px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Términos y Condiciones de Venta</h4>
                    <p style={{ margin: 0, fontSize: '8px', color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                      {termsEs}
                    </p>
                  </div>

                  <div>
                    <table style={{ width: '100%', fontSize: '11px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#666' }}>Subtotal:</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                            ${totals.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#666' }}>IVA (16%):</td>
                          <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                            ${totals.iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </td>
                        </tr>
                        <tr style={{ borderTop: '2px solid #CC3333' }}>
                          <td style={{ padding: '6px 0', fontWeight: '900', color: '#CC3333', fontSize: '12px' }}>Total Neto:</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: '900', color: '#CC3333', fontSize: '13px' }}>
                            ${totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SIGNATURES */}
                <div style={{ marginTop: '25px', borderTop: '1px solid #e2e8f0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '40%', textAlign: 'center' }}>
                    <div style={{ height: '30px' }}></div>
                    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '4px 0' }} />
                    <span style={{ fontSize: '8.5px', color: '#666' }}>Firma Autorizada RAV</span>
                  </div>
                  <div style={{ width: '40%', textAlign: 'center' }}>
                    <div style={{ height: '30px' }}></div>
                    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '4px 0' }} />
                    <span style={{ fontSize: '8.5px', color: '#666' }}>Aceptación de Cotización Cliente</span>
                  </div>
                </div>
                
                {/* FOOTER */}
                <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '8px', color: '#999' }}>
                  RAV Aire y Calefacción S.A. de C.V. &bull; www.ravaireycalefaccion.com &bull; Tel: 81 8340 1020
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE INPUTS / EDITORS */}
        <div className="crm-quote-controls-panel hide-on-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* LEVEL 1 & 2 SELECTOR FOR CUSTOMER */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', color: '#1e293b' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#CC3333', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <i className="fas fa-user-circle"></i> Configuración de Cliente
            </h3>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: '#334155', fontWeight: 'bold' }}>
                <input
                  type="checkbox"
                  checked={isUnregisteredClient}
                  onChange={(e) => setIsUnregisteredClient(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#CC3333',
                    cursor: 'pointer',
                    appearance: 'checkbox',
                    WebkitAppearance: 'checkbox',
                    display: 'inline-block',
                    margin: '0',
                    verticalAlign: 'middle',
                    minHeight: 'auto',
                    background: 'initial',
                    border: 'initial',
                    boxShadow: 'none'
                  }}
                />
                <span>Cotización Rápida / Cliente no registrado</span>
              </label>
            </div>

            {isUnregisteredClient ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Nombre Cliente</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={unregisteredClient.name}
                    onChange={(e) => setUnregisteredClient({ ...unregisteredClient, name: e.target.value })}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Empresa</label>
                  <input
                    type="text"
                    placeholder="Ej. Industrias ABC"
                    value={unregisteredClient.company}
                    onChange={(e) => setUnregisteredClient({ ...unregisteredClient, company: e.target.value })}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Teléfono</label>
                  <input
                    type="text"
                    placeholder="81 1234 5678"
                    value={unregisteredClient.phone}
                    onChange={(e) => setUnregisteredClient({ ...unregisteredClient, phone: e.target.value })}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
                  <input
                    type="email"
                    placeholder="cliente@abc.com"
                    value={unregisteredClient.email}
                    onChange={(e) => setUnregisteredClient({ ...unregisteredClient, email: e.target.value })}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Vincular Oportunidad CRM</label>
                <select
                  value={selectedOpportunityId}
                  onChange={(e) => setSelectedOpportunityId(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="" style={{ background: '#fff', color: '#1e293b' }}>-- Seleccionar Oportunidad --</option>
                  {(allOpportunities || []).map(o => (
                    <option key={o.id} value={o.id} style={{ background: '#fff', color: '#1e293b' }}>
                      {o.title} {o.company?.name ? `(${o.company.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* LEVEL 3 LOGISTICS (MAYOREO CURRENCY AND LANG) */}
          {level === 'mayoreo' && (
            <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Divisa de Venta</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="MXN" style={{ background: '#fff', color: '#1e293b' }}>Pesos Mexicanos (MXN)</option>
                  <option value="USD" style={{ background: '#fff', color: '#1e293b' }}>Dólares (USD)</option>
                </select>
              </div>

              {currency === 'USD' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Tipo de Cambio (TC)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              )}

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Idioma de Impresión</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['both', 'es', 'en'].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCurrentLanguage(lang)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer',
                        background: currentLanguage === lang ? '#0087BE' : '#f8fafc',
                        color: currentLanguage === lang ? '#fff' : '#475569',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {lang === 'both' ? 'Bilingüe (ES + EN)' : lang === 'es' ? 'Solo Español' : 'English Only'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INSTALLATION LOGISTICS TOGGLE */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', color: '#1e293b' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: '#334155', fontWeight: 'bold', marginBottom: hasInstallation ? '12px' : 0 }}>
              <input
                type="checkbox"
                checked={hasInstallation}
                onChange={(e) => setHasInstallation(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#CC3333',
                  cursor: 'pointer',
                  appearance: 'checkbox',
                  WebkitAppearance: 'checkbox',
                  display: 'inline-block',
                  margin: '0',
                  verticalAlign: 'middle',
                  minHeight: 'auto',
                  background: 'initial',
                  border: 'initial',
                  boxShadow: 'none'
                }}
              />
              <span>¿Incluye Logística e Instalación?</span>
            </label>

            {hasInstallation && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Datos e Instalación (Sitio, Soportes, etc.)</label>
                <textarea
                  rows="3"
                  placeholder="Ej. Ubicación de condensadoras en azotea, tubería de refrigeración a 15 metros, alimentación eléctrica a cargo del cliente."
                  value={installationNotes}
                  onChange={(e) => setInstallationNotes(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical', outline: 'none' }}
                />
              </div>
            )}
          </div>

          {/* PRODUCT & ITEM EDITORS */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', color: '#1e293b' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#CC3333', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-edit"></i> Conceptos del Presupuesto
              </h3>
              
              {level === 'mayoreo' ? (
                <button 
                  onClick={handleAddWholesaleItem}
                  style={{ padding: '8px 14px', fontSize: '0.78rem', background: '#0087BE', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,135,190,0.2)' }}
                >
                  <i className="fas fa-plus"></i> Añadir Partida Mayoreo
                </button>
              ) : (
                <button 
                  onClick={handleAddSimpleItem}
                  style={{ padding: '8px 14px', fontSize: '0.78rem', background: '#CC3333', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(204,51,51,0.2)' }}
                >
                  <i className="fas fa-plus"></i> Añadir Concepto
                </button>
              )}
            </div>

            {/* LEVEL 2 SPECIAL ACTION: TECHNICIAN PRICE DISCOUNTERS */}
            {level === 'tecnico' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,135,190,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,135,190,0.15)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#0087BE', flex: 1, fontWeight: '500' }}>
                  <strong>Asistente de Precios Técnicos:</strong> Aplica un descuento general a tus precios de venta rápido.
                </div>
                <div style={{ display: 'flex', gap: '6px', width: '130px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={techDiscountPercentage}
                    onChange={(e) => setTechDiscountPercentage(parseInt(e.target.value) || 0)}
                    style={{ width: '50px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '6px', borderRadius: '6px', textAlign: 'center', fontSize: '0.75rem', outline: 'none' }}
                  />
                  <button
                    onClick={() => {
                      setSimpleItems(simpleItems.map(item => ({ ...item, price: Math.round(item.price * (1 - (techDiscountPercentage / 100)) * 100) / 100 })));
                      showToast('¡Descuento de técnicos aplicado correctamente a los conceptos!', 'success');
                    }}
                    style={{ background: '#0087BE', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}

            {/* RENDER THE EDITORS */}
            {level === 'mayoreo' ? (
              // Wholesale Page/Section Editors with Bilingual Long Texts
              wholesaleItems.map((item, idx) => (
                <div key={item.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '10px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                  
                  {/* Top action bar inside card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#CC3333' }}>Partida #{idx + 1} (Pág. {idx + 2})</span>
                    <button
                      type="button"
                      onClick={() => handleSaveProductToCatalog(item, true)}
                      disabled={savingProductId === item.id}
                      style={{
                        background: 'rgba(0, 135, 190, 0.1)',
                        border: '1px solid rgba(0, 135, 190, 0.3)',
                        color: '#0087BE',
                        fontSize: '0.72rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      title="Guarda este equipo en la base de datos de RAV para usarlo después"
                    >
                      <i className="fas fa-save"></i>
                      <span>{savingProductId === item.id ? 'Guardando...' : '💾 Guardar en Catálogo'}</span>
                    </button>
                  </div>

                  {/* Main specs row with clear labels */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 80px 120px 30px', gap: '8px', marginBottom: '10px', alignItems: 'end' }}>
                    
                    <div style={{ position: 'relative' }}>
                      <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Modelo (Buscar o registrar)</span>
                      <input
                        type="text"
                        placeholder="Modelo del equipo"
                        value={item.model}
                        onChange={(e) => {
                          handleUpdateWholesaleItem(item.id, 'model', e.target.value);
                          handleSearchProduct(item.id, e.target.value);
                        }}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', fontWeight: 'bold' }}
                      />
                      
                      {/* Suggestion Dropdown */}
                      {suggestions[item.id] && suggestions[item.id].length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                          {suggestions[item.id].map(prod => (
                            <div
                              key={prod.Clave}
                              onClick={() => handleSelectSuggestion(item.id, prod, true)}
                              style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#1e293b', textAlign: 'left' }}
                              onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                              onMouseLeave={(e) => e.target.style.background = '#fff'}
                            >
                              <strong style={{ color: '#CC3333' }}>{prod.Clave}</strong> - {prod.Descripción}
                              <div style={{ fontSize: '0.72rem', color: '#0087BE', marginTop: '2px' }}>Precio: ${prod.precio_publico} {currency}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Cantidad</span>
                      <input
                        type="number"
                        placeholder="Cant."
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateWholesaleItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 6px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Precio Unit. ({currency})</span>
                      <input
                        type="number"
                        placeholder="Precio"
                        value={item.price}
                        onChange={(e) => handleUpdateWholesaleItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '6px' }}>
                      <button onClick={() => handleRemoveWholesaleItem(item.id)} disabled={wholesaleItems.length === 1} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', opacity: wholesaleItems.length === 1 ? 0.3 : 1 }}>
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>

                  </div>

                  {/* Short Summary Description (Page 1) */}
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Descripción Comercial Corta (Se muestra arriba del equipo)</span>
                    <input
                      type="text"
                      placeholder="Ej. sistema RVI de 30 toneladas con casete de 40 pulgadas"
                      value={item.summary}
                      onChange={(e) => handleUpdateWholesaleItem(item.id, 'summary', e.target.value)}
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>

                  {/* Detailed specs with dynamic language block */}
                  <div style={{ 
                    display: currentLanguage === 'both' ? 'grid' : 'block', 
                    gridTemplateColumns: currentLanguage === 'both' ? '1fr 1fr' : 'none', 
                    gap: '8px' 
                  }}>
                    {(currentLanguage === 'es' || currentLanguage === 'both') && (
                      <div style={{ marginBottom: currentLanguage === 'both' ? 0 : '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>Descripción Técnica Detallada (Español)</span>
                        <textarea
                          rows="4"
                          placeholder="Características detalladas, especificaciones eléctricas, dimensiones..."
                          value={item.descriptionEs}
                          onChange={(e) => handleUpdateWholesaleItem(item.id, 'descriptionEs', e.target.value)}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                        />
                      </div>
                    )}
                    {(currentLanguage === 'en' || currentLanguage === 'both') && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold' }}>English Specifications</span>
                          {currentLanguage === 'both' && (
                            <button
                              type="button"
                              onClick={() => handleTranslateItem(item.id, item.descriptionEs)}
                              disabled={translatingItemId === item.id}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#0087BE',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '0'
                              }}
                            >
                              {translatingItemId === item.id ? (
                                <>
                                  <div className="spinner-mini" style={{ width: '8px', height: '8px', borderTopColor: '#0087BE', margin: 0, border: '1.5px solid rgba(0,135,190,0.1)', borderTop: '1.5px solid #0087BE', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                  <span>Traduciendo...</span>
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-language" style={{ fontSize: '0.85rem' }}></i>
                                  <span>Traducir con IA 🤖</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Technical specs in English, electrical details, options, weight..."
                          value={item.descriptionEn}
                          onChange={(e) => handleUpdateWholesaleItem(item.id, 'descriptionEn', e.target.value)}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Specific Terms & Guarantees for this product card */}
                  <div style={{ marginTop: '10px', display: currentLanguage === 'both' ? 'grid' : 'block', gridTemplateColumns: currentLanguage === 'both' ? '1fr 1fr' : 'none', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    {(currentLanguage === 'es' || currentLanguage === 'both') && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                          <i className="fas fa-certificate"></i> Garantías y Condiciones Específicas (Español - Opcional)
                        </span>
                        <textarea
                          rows="2"
                          placeholder="Ej. Garantía de 5 años en compresor. Requiere arranque certificado por RAV."
                          value={item.specificTermsEs || ''}
                          onChange={(e) => handleUpdateWholesaleItem(item.id, 'specificTermsEs', e.target.value)}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                        />
                      </div>
                    )}
                    {(currentLanguage === 'en' || currentLanguage === 'both') && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                          English Specific Terms & Guarantees (Optional)
                        </span>
                        <textarea
                          rows="2"
                          placeholder="Ej. 5-year warranty on compressor. Certified startup by RAV required."
                          value={item.specificTermsEn || ''}
                          onChange={(e) => handleUpdateWholesaleItem(item.id, 'specificTermsEn', e.target.value)}
                          style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '6px 8px', borderRadius: '6px', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // Simple Quick Item Editor for Public / Technical
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr 1.2fr 0.4fr', gap: '8px', padding: '0 10px', fontSize: '0.75rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase' }}>
                  <div>Modelo</div>
                  <div>Descripción del Concepto</div>
                  <div style={{ textAlign: 'center' }}>Cant.</div>
                  <div style={{ textAlign: 'right' }}>Precio Unit.</div>
                  <div></div>
                </div>
                {simpleItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr 1.2fr 40px 30px', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Modelo"
                        value={item.model}
                        onChange={(e) => {
                          handleUpdateSimpleItem(item.id, 'model', e.target.value);
                          handleSearchProduct(item.id, e.target.value);
                        }}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                      />
                      
                      {/* Suggestion Dropdown */}
                      {suggestions[item.id] && suggestions[item.id].length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                          {suggestions[item.id].map(prod => (
                            <div
                              key={prod.Clave}
                              onClick={() => handleSelectSuggestion(item.id, prod, false)}
                              style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#1e293b', textAlign: 'left' }}
                              onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                              onMouseLeave={(e) => e.target.style.background = '#fff'}
                            >
                              <strong style={{ color: '#CC3333' }}>{prod.Clave}</strong> - {prod.Descripción}
                              <div style={{ fontSize: '0.72rem', color: '#0087BE', marginTop: '2px' }}>Precio: ${prod.precio_publico} MXN</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Descripción del concepto"
                      value={item.description}
                      onChange={(e) => handleUpdateSimpleItem(item.id, 'description', e.target.value)}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <input
                      type="number"
                      placeholder="Cant"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateSimpleItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 6px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center', outline: 'none' }}
                    />
                    <input
                      type="number"
                      placeholder="Precio"
                      value={item.price}
                      onChange={(e) => handleUpdateSimpleItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }}
                    />
                    
                    <button
                      type="button"
                      onClick={() => handleSaveProductToCatalog(item, false)}
                      disabled={savingProductId === item.id}
                      style={{ background: 'transparent', border: 'none', color: '#0087BE', cursor: 'pointer', fontSize: '1rem' }}
                      title="Guardar en catálogo"
                    >
                      <i className="fas fa-save"></i>
                    </button>

                    <button
                      onClick={() => handleRemoveSimpleItem(item.id)}
                      disabled={simpleItems.length === 1}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', opacity: simpleItems.length === 1 ? 0.3 : 1 }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EDITABLE TERMS AND CONDITIONS */}
          <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', color: '#1e293b' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#CC3333', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <i className="fas fa-gavel"></i> Términos y Condiciones
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(currentLanguage === 'es' || currentLanguage === 'both' || level !== 'mayoreo') && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Términos en Español</span>
                  <textarea
                    rows="4"
                    value={termsEs}
                    onChange={(e) => setTermsEs(e.target.value)}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>
              )}
              {level === 'mayoreo' && (currentLanguage === 'en' || currentLanguage === 'both') && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>English Terms & Conditions</span>
                  <textarea
                    rows="4"
                    value={termsEn}
                    onChange={(e) => setTermsEn(e.target.value)}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}

