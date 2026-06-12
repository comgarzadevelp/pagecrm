import React, { useState, useEffect } from 'react';
import { useUX } from '../../../components/common/UXProvider';

export default function EquipoVentas({
  role,
  API_BASE,
  sellers,
  saeSellers,
  fetchSellers,
  fetchSaeSellers,
  formatDate
}) {
  const { showToast, showConfirm } = useUX();
  // Navigation tabs for Super Admin
  const [activeSubTab, setActiveSubTab] = useState('sales'); // 'sales' or 'managers'

  // Corporate Enterprise Companies
  const [companies, setCompanies] = useState([]);

  // Add User modal states
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPassword, setNewSellerPassword] = useState('');
  const [newSellerSaeKey, setNewSellerSaeKey] = useState('');
  const [newSellerRole, setNewSellerRole] = useState('sales');
  const [newSellerCompanyId, setNewSellerCompanyId] = useState('');
  const [newSellerSupervisorId, setNewSellerSupervisorId] = useState('');
  const [sellerError, setSellerError] = useState('');
  const [sellerSuccess, setSellerSuccess] = useState('');

  // Edit User modal states
  const [showEditSellerModal, setShowEditSellerModal] = useState(false);
  const [selectedSellerForEdit, setSelectedSellerForEdit] = useState(null);
  const [editSellerName, setEditSellerName] = useState('');
  const [editSellerEmail, setEditSellerEmail] = useState('');
  const [editSellerSaeKey, setEditSellerSaeKey] = useState('');
  const [editSellerRole, setEditSellerRole] = useState('sales');
  const [editSellerCompanyId, setEditSellerCompanyId] = useState('');
  const [editSellerSupervisorId, setEditSellerSupervisorId] = useState('');
  const [editSellerError, setEditSellerError] = useState('');
  const [editSellerSuccess, setEditSellerSuccess] = useState('');

  // Reset password states
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedSellerForReset, setSelectedSellerForReset] = useState(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Fetch Enterprise Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setCompanies(data.companies || []);
          // Default to Garza if exists
          const garza = (data.companies || []).find(c => c.company_code === 'GARZA');
          if (garza) {
            setNewSellerCompanyId(garza.id);
          } else if (data.companies && data.companies.length > 0) {
            setNewSellerCompanyId(data.companies[0].id);
          }
        }
      } catch (err) {
        console.error('Fetch enterprise companies error:', err);
      }
    };
    fetchCompanies();
  }, [API_BASE]);

  // List of supervisors/managers for linking
  const supervisorsList = (sellers || []).filter(u => u.role === 'admin' || u.role === 'supervisor');

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    setSellerError('');
    setSellerSuccess('');

    const token = localStorage.getItem('token');
    try {
      const payload = {
        name: newSellerName,
        email: newSellerEmail,
        password: newSellerPassword,
        sae_vendor_key: newSellerRole === 'sales' ? newSellerSaeKey : null,
        role: role === 'super_admin' ? newSellerRole : 'sales',
        supervisor_id: newSellerRole === 'sales' && newSellerSupervisorId ? newSellerSupervisorId : null
      };

      if (role === 'super_admin' && newSellerCompanyId) {
        payload.company_id = newSellerCompanyId;
      }

      const res = await fetch(`${API_BASE}/api/crm/sellers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar el usuario');
      }

      setSellerSuccess('¡Usuario registrado exitosamente!');
      setNewSellerName('');
      setNewSellerEmail('');
      setNewSellerPassword('');
      setNewSellerSaeKey('');
      setNewSellerSupervisorId('');
      fetchSellers();

      setTimeout(() => {
        setShowAddSellerModal(false);
        setSellerSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Create user error:', err);
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
      const payload = {
        name: editSellerName,
        email: editSellerEmail,
        sae_vendor_key: editSellerRole === 'sales' ? editSellerSaeKey : null,
        supervisor_id: editSellerRole === 'sales' && editSellerSupervisorId ? editSellerSupervisorId : null
      };

      if (role === 'super_admin') {
        payload.role = editSellerRole;
        payload.company_id = editSellerCompanyId;
      }

      const res = await fetch(`${API_BASE}/api/crm/sellers/${selectedSellerForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar el usuario');
      }

      setEditSellerSuccess('¡Usuario actualizado exitosamente!');
      fetchSellers();

      setTimeout(() => {
        setShowEditSellerModal(false);
        setSelectedSellerForEdit(null);
        setEditSellerSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Update user error:', err);
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

  const handleDeleteSeller = async (id, name, userRole) => {
    const isSales = userRole === 'sales';
    const msg = isSales 
      ? `¿Estás seguro de que deseas eliminar la cuenta de ${name}? El vendedor perderá su acceso. Todos sus prospectos y cotizaciones creadas se conservarán y pasarán al panel de Leads Huérfanos como huérfanos sin asignar.`
      : `¿Estás seguro de que deseas eliminar la cuenta del gerente/supervisor ${name}? Perderá todo su acceso al sistema de inmediato.`;

    const confirmed = await showConfirm('¿Confirmar Eliminación?', msg, { type: 'danger', confirmText: 'Sí, eliminar' });
    if (!confirmed) {
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
        showToast(data.message || 'Usuario eliminado con éxito.', 'success');
        fetchSellers();
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  if (role !== 'admin' && role !== 'supervisor' && role !== 'super_admin') {
    return (
      <div className="crm-error-placeholder">
        <i className="fas fa-exclamation-triangle"></i>
        <p>No tienes permisos suficientes para ver esta sección.</p>
      </div>
    );
  }

  // Filter list by selected sub-tab (or show sales for normal supervisors)
  const filteredUsers = (sellers || []).filter(u => {
    if (role !== 'super_admin') {
      return u.role === 'sales';
    }
    if (activeSubTab === 'sales') {
      return u.role === 'sales';
    } else if (activeSubTab === 'managers') {
      return u.role === 'admin' || u.role === 'supervisor';
    } else {
      return u.role === 'sistemas';
    }
  });

  return (
    <section className="crm-table-container glass">
      <div className="crm-table-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h2>{role === 'super_admin' ? 'Gestión de Estructura Comercial' : 'Equipo de Ventas Registrado'}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {role === 'super_admin' 
                ? 'Administra la estructura completa: gerentes, vendedores y técnicos de Garza y RAV.'
                : 'Visualiza los ejecutivos autorizados que gestionan los prospectos comerciales.'}
            </p>
          </div>
          <button 
            className="btn-primary-golden" 
            onClick={() => { 
              fetchSaeSellers(); 
              if (role === 'super_admin') {
                if (activeSubTab === 'sales') setNewSellerRole('sales');
                else if (activeSubTab === 'managers') setNewSellerRole('admin');
                else setNewSellerRole('sistemas');
              } else {
                setNewSellerRole('sales');
              }
              setShowAddSellerModal(true); 
            }}
          >
            <i className="fas fa-plus"></i> {role === 'super_admin' ? (activeSubTab === 'sales' ? 'Registrar Vendedor' : activeSubTab === 'managers' ? 'Registrar Gerente' : 'Registrar Técnico') : 'Registrar Vendedor'}
          </button>
        </div>

        {/* Super Admin High-Fidelity Role Tabs */}
        {role === 'super_admin' && (
          <div className="crm-subtabs" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              type="button"
              className={`crm-subtab-btn ${activeSubTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('sales')}
              style={{
                background: activeSubTab === 'sales' ? 'rgba(212, 163, 89, 0.15)' : 'transparent',
                color: activeSubTab === 'sales' ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                border: activeSubTab === 'sales' ? '1px solid rgba(212, 163, 89, 0.4)' : '1px solid transparent',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <i className="fas fa-user-tie" style={{ marginRight: '8px' }}></i>
              Vendedores (Ejecutivos)
            </button>
            <button 
              type="button"
              className={`crm-subtab-btn ${activeSubTab === 'managers' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('managers')}
              style={{
                background: activeSubTab === 'managers' ? 'rgba(212, 163, 89, 0.15)' : 'transparent',
                color: activeSubTab === 'managers' ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                border: activeSubTab === 'managers' ? '1px solid rgba(212, 163, 89, 0.4)' : '1px solid transparent',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <i className="fas fa-users-cog" style={{ marginRight: '8px' }}></i>
              Gerentes / Supervisores
            </button>
            <button 
              type="button"
              className={`crm-subtab-btn ${activeSubTab === 'technical_support' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('technical_support')}
              style={{
                background: activeSubTab === 'technical_support' ? 'rgba(212, 163, 89, 0.15)' : 'transparent',
                color: activeSubTab === 'technical_support' ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                border: activeSubTab === 'technical_support' ? '1px solid rgba(212, 163, 89, 0.4)' : '1px solid transparent',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <i className="fas fa-laptop-code" style={{ marginRight: '8px' }}></i>
              Soporte Técnico (TI)
            </button>
          </div>
        )}
      </div>

      <div className="crm-table-responsive">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Fecha Registro</th>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              {role === 'super_admin' && <th>Empresa</th>}
              <th>{activeSubTab === 'sales' ? 'Vinc. SAE / Supervisor' : 'Rol / Permisos'}</th>
              <th>ID de Sistema</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              // Find company detail
              const comp = companies.find(c => c.id === user.company_id);
              // Find supervisor name
              const superv = supervisorsList.find(s => s.id === user.supervisor_id);

              return (
                <tr key={user.id} className="crm-row-item">
                  <td className="lead-date">{formatDate(user.created_at)}</td>
                  <td className="lead-identity">
                    <strong>{user.name}</strong>
                  </td>
                  <td className="lead-biz">
                    <strong>{user.email}</strong>
                  </td>
                  {role === 'super_admin' && (
                    <td>
                      {comp ? (
                        <span style={{
                          background: comp.company_code === 'RAV' ? 'rgba(204, 51, 51, 0.1)' : 'rgba(5, 57, 58, 0.1)',
                          color: comp.company_code === 'RAV' ? '#CC3333' : '#d4a359',
                          border: comp.company_code === 'RAV' ? '1px solid rgba(204, 51, 51, 0.3)' : '1px solid rgba(212, 163, 89, 0.3)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}>
                          {comp.name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>General / Sin Empresa</span>
                      )}
                    </td>
                  )}
                  <td>
                    {user.role === 'sales' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {user.sae_vendor_key ? (
                          <span style={{
                            background: 'rgba(212, 163, 89, 0.12)',
                            color: 'var(--color-brand-primary)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            border: '1px solid rgba(212, 163, 89, 0.3)',
                            width: 'fit-content'
                          }}>
                            CLAVE SAE: {user.sae_vendor_key.trim()}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Sin Clave SAE</span>
                        )}
                        {superv ? (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            <i className="fas fa-user-friends" style={{ marginRight: '4px' }} />
                            Sup: {superv.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic' }}>
                            ⚠ Sin Supervisor asignado
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="role-badge-sales" style={{ 
                        background: user.role === 'super_admin' ? 'rgba(224, 146, 43, 0.15)' : user.role === 'sistemas' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        color: user.role === 'super_admin' ? '#E0922B' : user.role === 'sistemas' ? '#38bdf8' : '#fff'
                      }}>
                        <i className={user.role === 'super_admin' ? 'fas fa-shield-alt' : user.role === 'sistemas' ? 'fas fa-laptop-code' : 'fas fa-users-cog'} style={{ marginRight: '6px' }} />
                        {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' || user.role === 'supervisor' ? 'Gerente / Supervisor' : 'Soporte TI'}
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {user.id.substring(0, 8)}...
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        className="btn-view-details"
                        onClick={() => {
                          fetchSaeSellers();
                          setSelectedSellerForEdit(user);
                          setEditSellerName(user.name || '');
                          setEditSellerEmail(user.email || '');
                          setEditSellerSaeKey(user.sae_vendor_key || '');
                          setEditSellerRole(user.role || 'sales');
                          setEditSellerCompanyId(user.company_id || '');
                          setEditSellerSupervisorId(user.supervisor_id || '');
                          setEditSellerError('');
                          setEditSellerSuccess('');
                          setShowEditSellerModal(true);
                        }}
                        style={{ borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', padding: '0.4rem 0.85rem' }}
                      >
                        <i className="fas fa-user-edit"></i> Editar
                      </button>
                      <button
                        className="btn-view-details"
                        onClick={() => {
                          setSelectedSellerForReset(user);
                          setShowResetPasswordModal(true);
                        }}
                        style={{ borderColor: 'var(--color-brand-accent)', color: 'var(--color-brand-accent)', padding: '0.4rem 0.85rem' }}
                      >
                        <i className="fas fa-key"></i> Pass
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleDeleteSeller(user.id, user.name, user.role)}
                        style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', padding: '0.4rem 0.85rem', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}
                      >
                        <i className="fas fa-trash-alt"></i> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No hay usuarios registrados todavía en esta sección.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddSellerModal && (
        <div className="crm-modal-overlay" onClick={() => setShowAddSellerModal(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="close-modal-btn" onClick={() => setShowAddSellerModal(false)}>&times;</button>
            <div className="modal-header">
              <h2>Registrar Nuevo {role === 'super_admin' ? (newSellerRole === 'sales' ? 'Vendedor' : 'Gerente/Supervisor') : 'Vendedor'}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Crea una cuenta en Comercializadora Garza con permisos específicos.
              </p>
            </div>
            <form onSubmit={handleCreateSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Role selection (Super Admin only) */}
              {role === 'super_admin' && (
                <div className="crm-input-group">
                  <label className="crm-input-label">Rol y Permisos</label>
                  <select
                    className="crm-login-input"
                    value={newSellerRole}
                    onChange={(e) => {
                      setNewSellerRole(e.target.value);
                      if (e.target.value !== 'sales') {
                        setNewSellerSaeKey('');
                        setNewSellerSupervisorId('');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="sales">📞 Vendedor (Ejecutivo de Ventas)</option>
                    <option value="admin">💼 Gerente / Supervisor (Mismo que administrador comercial)</option>
                    <option value="sistemas">🛠️ Soporte Técnico (Sistemas IT)</option>
                  </select>
                </div>
              )}

              {/* Company selection (Super Admin only) */}
              {role === 'super_admin' && (
                <div className="crm-input-group">
                  <label className="crm-input-label">Empresa Corporativa Asignada</label>
                  <select
                    className="crm-login-input"
                    value={newSellerCompanyId}
                    onChange={(e) => setNewSellerCompanyId(e.target.value)}
                    style={{ cursor: 'pointer' }}
                    required
                  >
                    <option value="">-- Selecciona una empresa --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="crm-input-group">
                <label className="crm-input-label">Nombre Completo</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Ej. Yanneth Flores"
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
                  placeholder="usuario@garza.com"
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

              {/* Vendedor-specific fields */}
              {newSellerRole === 'sales' && (
                <>
                  <div className="crm-input-group">
                    <label className="crm-input-label">Supervisor / Gerente a Cargo</label>
                    <select
                      className="crm-login-input"
                      value={newSellerSupervisorId}
                      onChange={(e) => setNewSellerSupervisorId(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">-- Sin Supervisor (Independiente) --</option>
                      {supervisorsList
                        // If super admin selected a company, only show supervisors of that company
                        .filter(s => !newSellerCompanyId || s.company_id === newSellerCompanyId)
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                    </select>
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
                </>
              )}

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
                Crear Cuenta de Usuario
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditSellerModal && selectedSellerForEdit && (
        <div className="crm-modal-overlay" onClick={() => { setShowEditSellerModal(false); setSelectedSellerForEdit(null); }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="close-modal-btn" onClick={() => { setShowEditSellerModal(false); setSelectedSellerForEdit(null); }}>&times;</button>
            <div className="modal-header">
              <h2>Editar Perfil de Usuario</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Modifica los datos generales y su vinculación jerárquica.
              </p>
            </div>
            <form onSubmit={handleUpdateSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Role selection (Super Admin only) */}
              {role === 'super_admin' && (
                <div className="crm-input-group">
                  <label className="crm-input-label">Rol y Permisos</label>
                  <select
                    className="crm-login-input"
                    value={editSellerRole}
                    onChange={(e) => {
                      setEditSellerRole(e.target.value);
                      if (e.target.value !== 'sales') {
                        setEditSellerSaeKey('');
                        setEditSellerSupervisorId('');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="sales">📞 Vendedor (Ejecutivo de Ventas)</option>
                    <option value="admin">💼 Gerente / Supervisor (Mismo que administrador comercial)</option>
                    <option value="sistemas">🛠️ Soporte Técnico (Sistemas IT)</option>
                  </select>
                </div>
              )}

              {/* Company selection (Super Admin only) */}
              {role === 'super_admin' && (
                <div className="crm-input-group">
                  <label className="crm-input-label">Empresa Corporativa Asignada</label>
                  <select
                    className="crm-login-input"
                    value={editSellerCompanyId}
                    onChange={(e) => setEditSellerCompanyId(e.target.value)}
                    style={{ cursor: 'pointer' }}
                    required
                  >
                    <option value="">-- Selecciona una empresa --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

              {/* Vendedor-specific fields */}
              {editSellerRole === 'sales' && (
                <>
                  <div className="crm-input-group">
                    <label className="crm-input-label">Supervisor / Gerente a Cargo</label>
                    <select
                      className="crm-login-input"
                      value={editSellerSupervisorId}
                      onChange={(e) => setEditSellerSupervisorId(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">-- Sin Supervisor (Independiente) --</option>
                      {supervisorsList
                        .filter(s => s.id !== selectedSellerForEdit.id) // Avoid self-reference
                        .filter(s => !editSellerCompanyId || s.company_id === editSellerCompanyId)
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                    </select>
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
                </>
              )}

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

