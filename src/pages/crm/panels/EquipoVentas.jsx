import React, { useState } from 'react';

export default function EquipoVentas({
  role,
  API_BASE,
  sellers,
  saeSellers,
  fetchSellers,
  fetchSaeSellers,
  formatDate
}) {
  // Add Seller modal states
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPassword, setNewSellerPassword] = useState('');
  const [newSellerSaeKey, setNewSellerSaeKey] = useState('');
  const [sellerError, setSellerError] = useState('');
  const [sellerSuccess, setSellerSuccess] = useState('');

  // Edit Seller modal states
  const [showEditSellerModal, setShowEditSellerModal] = useState(false);
  const [selectedSellerForEdit, setSelectedSellerForEdit] = useState(null);
  const [editSellerName, setEditSellerName] = useState('');
  const [editSellerEmail, setEditSellerEmail] = useState('');
  const [editSellerSaeKey, setEditSellerSaeKey] = useState('');
  const [editSellerError, setEditSellerError] = useState('');
  const [editSellerSuccess, setEditSellerSuccess] = useState('');

  // Reset password states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedSellerForReset, setSelectedSellerForReset] = useState(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    setSellerError('');
    setSellerSuccess('');

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newSellerName,
          email: newSellerEmail,
          password: newSellerPassword,
          sae_vendor_key: newSellerSaeKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear la cuenta del vendedor');
      }

      setSellerSuccess('¡Vendedor registrado exitosamente!');
      setNewSellerName('');
      setNewSellerEmail('');
      setNewSellerPassword('');
      setNewSellerSaeKey('');
      fetchSellers();

      setTimeout(() => {
        setShowAddSellerModal(false);
        setSellerSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Create seller error:', err);
      setSellerError(err.message || 'Error de conexión.');
    }
  };

  const handleUpdateSeller = async (e) => {
    e.preventDefault();
    setEditSellerError('');
    setEditSellerSuccess('');

    if (!selectedSellerForEdit) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/${selectedSellerForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editSellerName,
          email: editSellerEmail,
          sae_vendor_key: editSellerSaeKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar el vendedor');
      }

      setEditSellerSuccess('¡Vendedor actualizado exitosamente!');
      fetchSellers();

      setTimeout(() => {
        setShowEditSellerModal(false);
        setSelectedSellerForEdit(null);
        setEditSellerSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Update seller error:', err);
      setEditSellerError(err.message || 'Error de conexión.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!selectedSellerForReset) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/${selectedSellerForReset.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPasswordForReset
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al restablecer contraseña');
      }

      setResetSuccess('¡Contraseña restablecida exitosamente!');
      setNewPasswordForReset('');

      setTimeout(() => {
        setShowResetPasswordModal(false);
        setSelectedSellerForReset(null);
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError(err.message || 'Error de conexión.');
    }
  };

  const handleDeleteSeller = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cuenta de ${name}? El vendedor perderá su acceso. Todos sus prospectos y cotizaciones creadas se conservarán y pasarán al panel de Leads Huérfanos como huérfanos sin asignar.`)) {
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Vendedor eliminado con éxito.');
        fetchSellers();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error('Delete seller error:', err);
      alert('Error de conexión con el servidor.');
    }
  };

  if (role !== 'admin') {
    return (
      <div className="crm-error-placeholder">
        <i className="fas fa-exclamation-triangle"></i>
        <p>No tienes permisos de Administrador para ver esta sección.</p>
      </div>
    );
  }

  return (
    <section className="crm-table-container glass">
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Equipo de Ventas Registrado</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Visualiza los ejecutivos autorizados que gestionan los prospectos comerciales.
          </p>
        </div>
        <button className="btn-primary-golden" onClick={() => { fetchSaeSellers(); setShowAddSellerModal(true); }}>
          <i className="fas fa-plus"></i> Registrar Vendedor
        </button>
      </div>

      <div className="crm-table-responsive">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Fecha de Registro</th>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              <th>Vinc. SAE</th>
              <th>Rol en Sistema</th>
              <th>ID de Vendedor</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller) => (
              <tr key={seller.id} className="crm-row-item">
                <td className="lead-date">{formatDate(seller.created_at)}</td>
                <td className="lead-identity">
                  <strong>{seller.name}</strong>
                </td>
                <td className="lead-biz">
                  <strong>{seller.email}</strong>
                </td>
                <td>
                  {seller.sae_vendor_key ? (
                    <span style={{
                      background: 'rgba(212, 163, 89, 0.12)',
                      color: 'var(--color-brand-primary)',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      border: '1px solid rgba(212, 163, 89, 0.3)'
                    }}>
                      <i className="fas fa-link" style={{ marginRight: '4px', fontSize: '0.7rem' }}></i>
                      CLAVE: {seller.sae_vendor_key.trim()}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      Sin Vincular
                    </span>
                  )}
                </td>
                <td>
                  <span className="role-badge-sales">
                    <i className="fas fa-user-tag"></i> {seller.role === 'sales' ? 'Ventas' : seller.role}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {seller.id}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      className="btn-view-details"
                      onClick={() => {
                        fetchSaeSellers();
                        setSelectedSellerForEdit(seller);
                        setEditSellerName(seller.name || '');
                        setEditSellerEmail(seller.email || '');
                        setEditSellerSaeKey(seller.sae_vendor_key || '');
                        setEditSellerError('');
                        setEditSellerSuccess('');
                        setShowEditSellerModal(true);
                      }}
                      style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', padding: '0.4rem 0.85rem' }}
                    >
                      <i className="fas fa-user-edit"></i> Editar Perfil
                    </button>
                    <button
                      className="btn-view-details"
                      onClick={() => {
                        setSelectedSellerForReset(seller);
                        setShowResetPasswordModal(true);
                      }}
                      style={{ borderColor: 'var(--color-brand-accent)', color: 'var(--color-brand-accent)', padding: '0.4rem 0.85rem' }}
                    >
                      <i className="fas fa-key"></i> Contraseña
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleDeleteSeller(seller.id, seller.name)}
                      style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', padding: '0.4rem 0.85rem', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}
                    >
                      <i className="fas fa-trash-alt"></i> Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sellers.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No hay vendedores registrados todavía. ¡Comienza haciendo clic en "Registrar Vendedor"!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Seller Modal */}
      {showAddSellerModal && (
        <div className="crm-modal-overlay" onClick={() => setShowAddSellerModal(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <button className="close-modal-btn" onClick={() => setShowAddSellerModal(false)}>&times;</button>
            <div className="modal-header">
              <h2>Registrar Nuevo Vendedor</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Crea una cuenta para un ejecutivo de ventas. Tendrá acceso exclusivo a gestionar solo los leads que le sean asignados.
              </p>
            </div>
            <form onSubmit={handleCreateSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="crm-input-group">
                <label className="crm-input-label">Nombre Completo</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Ej. Juan Pérez"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  required
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="crm-login-input"
                  placeholder="ejemplo@garza.com"
                  value={newSellerEmail}
                  onChange={(e) => setNewSellerEmail(e.target.value)}
                  required
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Contraseña Temporal</label>
                <input
                  type="password"
                  className="crm-login-input"
                  placeholder="Mínimo 6 caracteres"
                  value={newSellerPassword}
                  onChange={(e) => setNewSellerPassword(e.target.value)}
                  required
                />
              </div>

              <div className="crm-input-group">
                <label className="crm-input-label">Vincular con Vendedor SAE</label>
                <select
                  className="crm-login-input"
                  value={newSellerSaeKey}
                  onChange={(e) => setNewSellerSaeKey(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- No vincular por ahora / Sin clave --</option>
                  {saeSellers.map(s => (
                    <option key={s.cve_vend} value={s.cve_vend}>
                      [{s.cve_vend.trim()}] {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {sellerError && (
                <div className="crm-login-error" style={{ margin: '0' }}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{sellerError}</span>
                </div>
              )}

              {sellerSuccess && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a54a',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-check-circle"></i>
                  <span>{sellerSuccess}</span>
                </div>
              )}

              <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                Crear Cuenta de Ventas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Seller Modal */}
      {showEditSellerModal && selectedSellerForEdit && (
        <div className="crm-modal-overlay" onClick={() => { setShowEditSellerModal(false); setSelectedSellerForEdit(null); }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <button className="close-modal-btn" onClick={() => { setShowEditSellerModal(false); setSelectedSellerForEdit(null); }}>&times;</button>
            <div className="modal-header">
              <h2>Editar Vendedor</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Modifica los datos del ejecutivo de ventas y su vinculación con el SAE.
              </p>
            </div>
            <form onSubmit={handleUpdateSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="crm-input-group">
                <label className="crm-input-label">Nombre Completo</label>
                <input
                  type="text"
                  className="crm-login-input"
                  value={editSellerName}
                  onChange={(e) => setEditSellerName(e.target.value)}
                  required
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="crm-login-input"
                  value={editSellerEmail}
                  onChange={(e) => setEditSellerEmail(e.target.value)}
                  required
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Vincular con Vendedor SAE</label>
                <select
                  className="crm-login-input"
                  value={editSellerSaeKey}
                  onChange={(e) => setEditSellerSaeKey(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- No vincular por ahora / Sin clave --</option>
                  {saeSellers.map(s => (
                    <option key={s.cve_vend} value={s.cve_vend}>
                      [{s.cve_vend.trim()}] {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {editSellerError && (
                <div className="crm-login-error" style={{ margin: '0' }}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{editSellerError}</span>
                </div>
              )}

              {editSellerSuccess && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a54a',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-check-circle"></i>
                  <span>{editSellerSuccess}</span>
                </div>
              )}

              <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedSellerForReset && (
        <div className="crm-modal-overlay" onClick={() => { setShowResetPasswordModal(false); setSelectedSellerForReset(null); setNewPasswordForReset(''); setResetError(''); setResetSuccess(''); }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <button className="close-modal-btn" onClick={() => { setShowResetPasswordModal(false); setSelectedSellerForReset(null); setNewPasswordForReset(''); setResetError(''); setResetSuccess(''); }}>&times;</button>
            <div className="modal-header">
              <h2>Restablecer Contraseña</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Ingresa la nueva contraseña para <strong>{selectedSellerForReset.name}</strong> ({selectedSellerForReset.email}).
              </p>
            </div>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="crm-input-group">
                <label className="crm-input-label">Nueva Contraseña</label>
                <input
                  type="password"
                  className="crm-login-input"
                  placeholder="Mínimo 6 caracteres"
                  value={newPasswordForReset}
                  onChange={(e) => setNewPasswordForReset(e.target.value)}
                  required
                />
              </div>

              {resetError && (
                <div className="crm-login-error" style={{ margin: '0' }}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a54a',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-check-circle"></i>
                  <span>{resetSuccess}</span>
                </div>
              )}

              <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                Guardar Nueva Contraseña
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
