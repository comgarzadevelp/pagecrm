// src/pages/crm/panels/MiPerfil.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useUX } from '../../../components/common/UXProvider';

const API_BASE = import.meta.env.VITE_API_URL || '';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  let cleanUrl = url;
  if (cleanUrl.includes('/uploads/')) {
    const idx = cleanUrl.indexOf('/uploads/');
    cleanUrl = '/api' + cleanUrl.substring(idx);
  }
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  return `${API_BASE}${cleanUrl}`;
};

export default function MiPerfil() {
  const { showToast, showConfirm } = useUX();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Google Calendar Integration states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [checkingCalendar, setCheckingCalendar] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const avatarInputRef = useRef(null);

  // Password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const token = () => localStorage.getItem('token');

  useEffect(() => { 
    fetchProfile(); 
    fetchCalendarStatus();

    // Check query params in case of returning from OAuth flow
    const urlParts = window.location.href.split('?');
    if (urlParts.length > 1) {
      const urlParams = new URLSearchParams(urlParts[1]);
      const googleSuccess = urlParams.get('google_success');
      const googleEmail = urlParams.get('email');
      const googleError = urlParams.get('error');

      if (googleSuccess === 'true') {
        setSuccess(`¡Google Calendar vinculado con éxito a ${googleEmail}!`);
        setCalendarConnected(true);
        setCalendarEmail(googleEmail || '');
        // Clean URL params to prevent double alerts
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
        setTimeout(() => setSuccess(''), 5000);
      } else if (googleSuccess === 'false') {
        setError(`Error al conectar con Google: ${googleError || 'Acceso denegado'}`);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
        setTimeout(() => setError(''), 5000);
      }
    }
  }, []);

  const fetchProfile = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/profile`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const u = data.user;
      setUser(u);
      setName(u.name || '');
      setPosition(u.position || '');
      setPhone(u.phone || '');
      setWhatsapp(u.whatsapp || '');
      setBio(u.bio || '');
      if (u.avatar_url) setAvatarPreview(resolveMediaUrl(u.avatar_url));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchCalendarStatus = async () => {
    setCheckingCalendar(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/status`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCalendarConnected(data.connected);
        setCalendarEmail(data.email || '');
      }
    } catch (err) {
      console.error('Error fetching calendar status:', err);
    } finally {
      setCheckingCalendar(false);
    }
  };

  const handleConnectCalendar = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/calendar/auth-url`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar la conexión con Google.');
    }
  };

  const handleDisconnectCalendar = async () => {
    const confirmed = await showConfirm('¿Confirmar Desconexión?', '¿Estás seguro de que deseas desconectar Google Calendar? Se detendrá la sincronización automática de citas.', { type: 'danger', confirmText: 'Sí, desconectar' });
    if (!confirmed) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/calendar/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCalendarConnected(false);
      setCalendarEmail('');
      setSuccess('Google Calendar desconectado correctamente.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error al desconectar Google Calendar.');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('position', position);
      formData.append('phone', phone);
      formData.append('whatsapp', whatsapp);
      formData.append('bio', bio);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await fetch(`${API_BASE}/api/crm/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess('¡Perfil actualizado correctamente!');
      setUser(data.user);
      setAvatarFile(null);
      if (data.user?.avatar_url) setAvatarPreview(resolveMediaUrl(data.user.avatar_url));
      localStorage.setItem('userName', data.user.name || name);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdSuccess('');
    if (newPwd !== confirmPwd) { setPwdError('Las contraseñas nuevas no coinciden.'); return; }
    if (newPwd.length < 6) { setPwdError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    setSavingPwd(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/profile/password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwdSuccess('¡Contraseña cambiada correctamente!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => setPwdSuccess(''), 3000);
    } catch (err) { setPwdError(err.message); }
    finally { setSavingPwd(false); }
  };

  if (loading) return <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando perfil...</p></div>;
  if (error && !user) return <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p></div>;

  return (
    <section className="crm-table-container glass profile-panel">
      <div className="crm-table-header" style={{ marginBottom: '2rem' }}>
        <h2><i className="fas fa-id-card" style={{ marginRight: 8 }} />Mi Perfil</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Información personal y de contacto del ejecutivo de ventas.
        </p>
      </div>

      <div className="profile-layout">
        {/* AVATAR COLUMN */}
        <div className="profile-avatar-col">
          <div className="profile-avatar-wrap" onClick={() => avatarInputRef.current?.click()}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" />
              : <div className="profile-avatar-placeholder"><i className="fas fa-user-circle" /></div>}
            <div className="profile-avatar-overlay"><i className="fas fa-camera" /><span>Cambiar foto</span></div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

          <div className="profile-identity">
            <h3>{user?.name}</h3>
            <span className={`user-role-badge ${user?.role}`}>
              {user?.role === 'super_admin' ? 'Super Admin' : 
               user?.role === 'admin' ? 'Administrador' : 
               user?.role === 'supervisor' ? 'Supervisor' : 
               user?.role === 'technical' ? 'Soporte Técnico' : 'Vendedor'}
            </span>
            {user?.email && <p className="profile-email"><i className="fas fa-envelope" style={{ marginRight: '6px' }} /> {user.email}</p>}
            
            {/* Resolved company display */}
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <i className="fas fa-building" style={{ color: '#98ca3f' }} />
              Empresa: <strong style={{ color: '#fff' }}>{user?.company?.name || 'Comercializadora Garza'} ({user?.company?.company_code || 'GARZA'})</strong>
            </div>

            {/* Resolved database connection status */}
            <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <i className="fas fa-database" style={{ color: user?.dbConnected ? '#98ca3f' : '#ef4444' }} />
              Base de Datos: <strong style={{ color: user?.dbConnected ? '#98ca3f' : '#ef4444' }}>{user?.dbConnectionName || 'Ninguna (No Conectada)'}</strong>
            </div>
            
            {/* SAE vendor key display */}
            {user?.role === 'sales' && (
              <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <i className="fas fa-key" style={{ color: '#e0922b' }} />
                Vendedor SAE: <strong style={{ color: '#fff' }}>{user?.sae_vendor_key || 'N/A'}</strong>
              </div>
            )}
          </div>

          {/* Quick contact cards */}
          <div className="profile-quick-info">
            {user?.phone && (
              <div className="quick-info-card">
                <i className="fas fa-phone" />
                <div><span className="quick-info-label">Teléfono</span><span>{user.phone}</span></div>
              </div>
            )}
            {user?.whatsapp && (
              <div className="quick-info-card">
                <i className="fab fa-whatsapp" style={{ color: '#16a34a' }} />
                <div><span className="quick-info-label">WhatsApp</span><span>{user.whatsapp}</span></div>
              </div>
            )}
            {user?.position && (
              <div className="quick-info-card">
                <i className="fas fa-briefcase" />
                <div><span className="quick-info-label">Cargo</span><span>{user.position}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* FORMS COLUMN */}
        <div className="profile-forms-col">
          {/* PROFILE FORM */}
          <div className="profile-form-card glass">
            <h4><i className="fas fa-edit" /> Editar Información</h4>

            {success && <div className="crm-success-banner"><i className="fas fa-check-circle" /> {success}</div>}
            {error && <div className="crm-error-banner"><i className="fas fa-exclamation-circle" /> {error}</div>}

            <form onSubmit={handleSaveProfile} className="crm-form-grid">
              <div className="form-group full-width">
                <label>Nombre Completo *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" />
              </div>
              <div className="form-group">
                <label>Cargo / Posición</label>
                <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej: Ejecutivo de Ventas" />
              </div>
              <div className="form-group">
                <label>Teléfono de Contacto</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="81 1234 5678" />
              </div>
              <div className="form-group full-width">
                <label>WhatsApp (sin código país)</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="8112345678" />
              </div>
              <div className="form-group full-width">
                <label>Presentación / Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Breve descripción de tu perfil, especialidades, zona que atiendes..." />
              </div>
              <div className="form-actions full-width">
                <button type="submit" className="btn-primary-golden" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Cambios</>}
                </button>
              </div>
            </form>
          </div>

          {/* PASSWORD FORM */}
          <div className="profile-form-card glass" style={{ marginTop: '1.5rem' }}>
            <h4><i className="fas fa-lock" /> Cambiar Contraseña</h4>

            {pwdSuccess && <div className="crm-success-banner"><i className="fas fa-check-circle" /> {pwdSuccess}</div>}
            {pwdError && <div className="crm-error-banner"><i className="fas fa-exclamation-circle" /> {pwdError}</div>}

            <form onSubmit={handleChangePassword} className="crm-form-grid">
              <div className="form-group full-width">
                <label>Contraseña Actual</label>
                <input type="password" required value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Tu contraseña actual" />
              </div>
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input type="password" required value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label>Confirmar Nueva Contraseña</label>
                <input type="password" required value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repite la nueva contraseña" />
              </div>
              <div className="form-actions full-width">
                <button type="submit" className="btn-cancel" disabled={savingPwd}>
                  {savingPwd ? <><i className="fas fa-spinner fa-spin" /> Actualizando...</> : <><i className="fas fa-key" /> Cambiar Contraseña</>}
                </button>
              </div>
            </form>
          </div>

          {/* GOOGLE CALENDAR CARD */}
          <div className="profile-form-card glass" style={{ marginTop: '1.5rem' }}>
            <h4><i className="fab fa-google" /> Conexiones y Calendario</h4>
            <p style={{ margin: '4px 0 15px', fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
              Sincroniza tus eventos del CRM directamente con tu Google Calendar personal.
            </p>

            {checkingCalendar ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                <i className="fas fa-spinner fa-spin" />
                <span style={{ fontSize: '0.9rem' }}>Verificando conexión...</span>
              </div>
            ) : calendarConnected ? (
              <div className="calendar-status-container connected">
                <div className="calendar-status-header">
                  <div className="calendar-icon-circle connected">
                    <i className="fab fa-google" />
                  </div>
                  <div className="calendar-status-text">
                    <h5>Google Calendar Vinculado</h5>
                    <p className="calendar-email-linked">{calendarEmail}</p>
                  </div>
                </div>
                <div className="calendar-status-badge" style={{ marginBottom: '15px' }}>
                  <span className="badge-dot" /> Sincronización Activa
                </div>
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  onClick={handleDisconnectCalendar}
                >
                  <i className="fas fa-unlink" />
                  Desconectar Cuenta
                </button>
              </div>
            ) : (
              <div className="calendar-status-container disconnected">
                <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  Al conectar tu Google Calendar, todas las citas, llamadas y eventos de seguimiento agendados con prospectos se añadirán de forma automática a tu agenda en tiempo real.
                </p>
                <button
                  type="button"
                  className="btn-primary-golden"
                  style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  onClick={handleConnectCalendar}
                >
                  <i className="fab fa-google" />
                  Vincular Google Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


