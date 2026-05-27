// src/pages/crm/panels/MiPerfil.jsx
import React, { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function MiPerfil() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

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

  useEffect(() => { fetchProfile(); }, []);

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
      if (u.avatar_url) setAvatarPreview(`${API_BASE}${u.avatar_url}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
      if (data.user?.avatar_url) setAvatarPreview(`${API_BASE}${data.user.avatar_url}`);
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
            <span className={`user-role-badge ${user?.role}`}>{user?.role === 'admin' ? 'Administrador' : 'Vendedor'}</span>
            {user?.email && <p className="profile-email"><i className="fas fa-envelope" /> {user.email}</p>}
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
        </div>
      </div>
    </section>
  );
}
