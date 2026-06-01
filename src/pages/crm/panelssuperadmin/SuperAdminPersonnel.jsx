import React, { useEffect, useState } from 'react';
import './SuperAdminPersonnel.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SuperAdminPersonnel() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected user for modification
  const [selectedUser, setSelectedUser] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');

  // Form states for modifications
  const [editRole, setEditRole] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editSupervisorId, setEditSupervisorId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaeKey, setEditSaeKey] = useState('');

  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch companies
      const compRes = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const compData = await compRes.json();
      const loadedCompanies = compRes.ok ? (compData.companies || []) : [];
      setCompanies(loadedCompanies);

      // 2. Fetch all users/sellers
      const usersRes = await fetch(`${API_BASE}/api/crm/sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      setUsers(usersRes.ok ? (usersData.sellers || []) : []);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor para cargar el personal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'sales');
    setEditCompanyId(user.company_id || '');
    setEditSupervisorId(user.supervisor_id || '');
    setEditSaeKey(user.sae_vendor_key || '');
    setSuccessMsg('');
    setError('');
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setSaving(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          company_id: editCompanyId || null,
          supervisor_id: editSupervisorId || null,
          sae_vendor_key: editSaeKey || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar el usuario.');

      // Update local state list
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? data.seller : u));
      setSelectedUser(data.seller);
      setSuccessMsg('¡Usuario actualizado exitosamente!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de comunicación al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    const confirmReset = window.confirm(`¿Estás seguro de restablecer la contraseña de ${selectedUser.name}? La nueva contraseña por defecto será "123456".`);
    if (!confirmReset) return;

    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg('¡Contraseña restablecida con éxito a "123456"!');
    } catch (err) {
      console.error(err);
      setError('Error al restablecer la contraseña.');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const confirmDelete = window.confirm(`¿ESTÁS SEGURO DE DAR DE BAJA DEFINITIVA A ${selectedUser.name.toUpperCase()}? Esta acción desvinculará sus prospectos y eliminará su cuenta de forma permanente.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setSelectedUser(null);
      setSuccessMsg('Usuario dado de baja correctamente.');
    } catch (err) {
      console.error(err);
      setError('Error al eliminar usuario.');
    }
  };

  // Helper labels & badges styling
  const getRoleLabel = (r) => {
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      supervisor: 'Supervisor',
      sales: 'Vendedor',
      sistemas: 'Sistemas / IT'
    };
    return labels[r] || r;
  };

  const getRoleBadgeClass = (r) => {
    const classes = {
      super_admin: 'sa-role-badge superadmin',
      admin: 'sa-role-badge admin',
      supervisor: 'sa-role-badge supervisor',
      sales: 'sa-role-badge sales',
      sistemas: 'sa-role-badge sistemas'
    };
    return classes[r] || 'sa-role-badge';
  };

  // Filter users list
  const filteredUsers = users.filter(u => {
    // 1. Search term (Name or Email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = u.name?.toLowerCase().includes(term);
      const emailMatch = u.email?.toLowerCase().includes(term);
      if (!nameMatch && !emailMatch) return false;
    }

    // 2. Role filter
    if (filterRole !== 'all' && u.role !== filterRole) return false;

    // 3. Company filter
    if (filterCompany !== 'all' && u.company_id !== filterCompany) return false;

    return true;
  });

  // Elegible supervisors: anyone who is a supervisor, admin or super_admin
  const elegibleSupervisors = users.filter(u => 
    ['supervisor', 'admin', 'super_admin'].includes(u.role) && 
    (!selectedUser || u.id !== selectedUser.id)
  );

  return (
    <div className="sa-pers-root animate-fade-in">
      {/* HEADER SECTION */}
      <div className="sa-pers-header-box">
        <h2 className="sa-pers-title">
          <i className="fas fa-users-cog" style={{ color: 'var(--color-brand-accent)', marginRight: '12px' }} />
          Gestión de Personal Registrado
        </h2>
        <p className="sa-pers-subtitle">
          Administra roles, promueve perfiles comerciales, reasigna filiales corporativas y establece jerarquías de supervisores en toda la federación de empresas.
        </p>
      </div>

      {/* TOP FILTER BAR */}
      <div className="sa-pers-filter-bar glass">
        <div className="sa-pers-search-box">
          <i className="fas fa-search search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo electrónico..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="sa-pers-filters-group">
          <div className="sa-pers-filter-item">
            <span className="sa-pers-filter-lbl">Filtrar por Rol</span>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Todos los Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="sales">Vendedor</option>
              <option value="sistemas">Sistemas / IT</option>
            </select>
          </div>

          <div className="sa-pers-filter-item">
            <span className="sa-pers-filter-lbl">Filtrar por Empresa</span>
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
              <option value="all">Todas las Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DOUBLE COLUMN LAYOUT */}
      <div className="sa-pers-layout-grid">
        
        {/* LEFT COLUMN: INTERACTIVE PERSONNEL LIST */}
        <div className="sa-pers-list-card glass">
          <div className="sa-pers-list-header">
            <h3>Lista de Colaboradores</h3>
            <span className="sa-pers-counter">{filteredUsers.length} registros</span>
          </div>

          <div className="sa-pers-scroll-wrapper">
            {filteredUsers.length === 0 ? (
              <div className="sa-pers-empty-list">
                <i className="fas fa-user-slash" />
                <p>No se encontraron colaboradores que coincidan con los filtros.</p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedUser?.id === u.id;
                const userCompany = companies.find(c => c.id === u.company_id);
                const userSupervisor = users.find(sup => sup.id === u.supervisor_id);

                return (
                  <div 
                    key={u.id} 
                    className={`sa-pers-item-row ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className="sa-pers-item-avatar">
                      <i className={isSelected ? "fas fa-user-edit" : "fas fa-user"} />
                    </div>

                    <div className="sa-pers-item-info">
                      <div className="sa-pers-item-name-row">
                        <strong className="sa-pers-item-name">{u.name}</strong>
                        <span className={getRoleBadgeClass(u.role)}>{getRoleLabel(u.role)}</span>
                      </div>
                      <span className="sa-pers-item-email">{u.email}</span>
                      
                      <div className="sa-pers-item-meta-row">
                        <span className="meta-tag">
                          <i className="fas fa-building" /> {userCompany ? userCompany.name : 'N/A — Sin Empresa'}
                          {userCompany && (
                            <span style={{ marginLeft: '6px', fontSize: '0.8em', color: userCompany.company_code === 'GARZA' ? '#4ade80' : '#f87171' }}>
                              ({userCompany.company_code === 'GARZA' ? 'DB SAE: Conectada' : 'Sin DB Externa'})
                            </span>
                          )}
                        </span>
                        {u.role === 'sales' && (
                          <span className="meta-tag">
                            <i className="fas fa-user-tie" /> Supervisor: {userSupervisor ? userSupervisor.name : 'Ninguno'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sa-pers-item-chevron">
                      <i className="fas fa-chevron-right" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PERMISSION AND ROLE CONFIG PANEL */}
        <div className="sa-pers-config-card glass">
          {!selectedUser ? (
            <div className="sa-pers-config-placeholder">
              <i className="fas fa-sliders-h placeholder-icon" />
              <h3>Consola de Configuración</h3>
              <p>Selecciona un colaborador de la lista de la izquierda para promover su rol, reasignar su filial o cambiar su supervisor comercial.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveChanges} className="sa-pers-form animate-fade-in">
              <div className="sa-pers-form-header">
                <h3>Editar Perfil de Colaborador</h3>
                <span className="user-uuid">ID: {selectedUser.id.substring(0, 8)}...</span>
              </div>

              {error && (
                <div className="sa-pers-alert error animate-slide-up">
                  <i className="fas fa-exclamation-circle" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="sa-pers-alert success animate-slide-up">
                  <i className="fas fa-check-circle" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="sa-pers-form-fields">
                {/* Name */}
                <div className="sa-pers-field-group">
                  <label>Nombre Completo</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-user field-icon" />
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="sa-pers-field-group">
                  <label>Correo Electrónico</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-envelope field-icon" />
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                {/* Role Switch / Promotion */}
                <div className="sa-pers-field-group">
                  <label>Permiso y Rol en la App</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-shield-alt field-icon" style={{ color: 'var(--color-brand-accent)' }} />
                    <select 
                      value={editRole} 
                      onChange={e => setEditRole(e.target.value)}
                      style={{ color: '#00f2fe', fontWeight: 'bold' }}
                    >
                      <option value="sales">Vendedor (Nivel 2)</option>
                      <option value="supervisor">Supervisor (Nivel 1)</option>
                      <option value="admin">Administrador Local (Nivel 1)</option>
                      <option value="sistemas">Sistemas / IT (Nivel 1)</option>
                      <option value="super_admin">Super Admin Máster (Nivel 0)</option>
                    </select>
                  </div>
                  <span className="field-hint">
                    Promover el perfil cambiará las pestañas visibles, niveles de acceso y reportes de inmediato.
                  </span>
                </div>

                {/* Company Assignment */}
                <div className="sa-pers-field-group">
                  <label>Asignación de Filial / Empresa</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-building field-icon" />
                    <select 
                      value={editCompanyId} 
                      onChange={e => setEditCompanyId(e.target.value)}
                    >
                      <option value="">N/A — Sin Empresa Vinculada</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company_code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Supervisor Assignment (Only applicable for sellers) */}
                {editRole === 'sales' && (
                  <div className="sa-pers-field-group animate-slide-up">
                    <label>Supervisor Comercial Responsable</label>
                    <div className="field-input-wrapper">
                      <i className="fas fa-user-tie field-icon" />
                      <select 
                        value={editSupervisorId} 
                        onChange={e => setEditSupervisorId(e.target.value)}
                      >
                        <option value="">Ninguno — Sin Supervisor</option>
                        {elegibleSupervisors.map(sup => (
                          <option key={sup.id} value={sup.id}>{sup.name} ({getRoleLabel(sup.role)})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* SAE Vendor Key */}
                {editRole === 'sales' && (
                  <div className="sa-pers-field-group animate-slide-up">
                    <label>Clave Vendedor SAE (Opcional)</label>
                    <div className="field-input-wrapper">
                      <i className="fas fa-key field-icon" />
                      <input 
                        type="text" 
                        value={editSaeKey} 
                        onChange={e => setEditSaeKey(e.target.value)}
                        placeholder="Ej: 3"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="sa-pers-form-actions">
                <button 
                  type="submit" 
                  className="btn-save-pers crm-btn-primary" 
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" /> Guardar Configuración
                    </>
                  )}
                </button>

                <div className="sa-pers-actions-divider" />

                <div className="sa-pers-danger-actions-row">
                  <button 
                    type="button" 
                    className="btn-pers-secondary text-glow-cyan"
                    onClick={handleResetPassword}
                  >
                    <i className="fas fa-key" /> Reset Password
                  </button>

                  <button 
                    type="button" 
                    className="btn-pers-danger text-glow-red"
                    onClick={handleDeleteUser}
                  >
                    <i className="fas fa-user-minus" /> Dar de Baja
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
