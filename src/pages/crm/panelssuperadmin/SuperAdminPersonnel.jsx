import React, { useEffect, useState } from 'react';
import { useUX } from '../../../components/common/UXProvider';
import './SuperAdminPersonnel.css';
import '../panels/AdminPanels.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SuperAdminPersonnel() {
  const { showToast, showConfirm } = useUX();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected user for modification
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');

  // Form states for modifications / creation
  const [editRole, setEditRole] = useState('sales');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editSupervisorId, setEditSupervisorId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaeKey, setEditSaeKey] = useState('');
  const [createPassword, setCreatePassword] = useState('');

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

  const handleAddNewClick = () => {
    setIsCreateMode(true);
    setSelectedUser(null);
    setEditName('');
    setEditEmail('');
    setEditRole('sales');
    setEditCompanyId('');
    setEditSupervisorId('');
    setEditSaeKey('');
    setCreatePassword('');
    setSuccessMsg('');
    setError('');
  };

  const handleSelectUser = (user) => {
    setIsCreateMode(false);
    setSelectedUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'sales');
    setEditCompanyId(user.company_id || '');
    setEditSupervisorId(user.supervisor_id || '');
    setEditSaeKey(user.sae_vendor_key || '');
    setCreatePassword('');
    setSuccessMsg('');
    setError('');
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!isCreateMode && !selectedUser) return;
    
    setSaving(true);
    setSuccessMsg('');
    setError('');

    const url = isCreateMode
      ? `${API_BASE}/api/crm/sellers`
      : `${API_BASE}/api/crm/sellers/${selectedUser.id}`;

    const method = isCreateMode ? 'POST' : 'PUT';

    const bodyPayload = {
      name: editName,
      email: editEmail,
      role: editRole,
      company_id: editCompanyId || null,
      supervisor_id: editSupervisorId || null,
      sae_vendor_key: editSaeKey || null
    };

    if (isCreateMode) {
      if (!createPassword || createPassword.length < 6) {
        setError('La contraseña inicial es obligatoria y debe tener al menos 6 caracteres.');
        setSaving(false);
        return;
      }
      bodyPayload.password = createPassword;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al procesar la solicitud.');

      if (isCreateMode) {
        // Add new user to state list
        const newUser = data.seller || data.user;
        if (newUser) {
          setUsers(prev => [newUser, ...prev]);
          handleSelectUser(newUser);
          setSuccessMsg('¡Usuario creado y registrado exitosamente!');
        } else {
          fetchInitialData();
          setIsCreateMode(false);
          setSuccessMsg('¡Usuario registrado exitosamente!');
        }
      } else {
        // Update local state list
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? data.seller : u));
        setSelectedUser(data.seller);
        setSuccessMsg('¡Usuario actualizado exitosamente!');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de comunicación al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    const confirmReset = await showConfirm(`¿Estás seguro de restablecer la contraseña de ${selectedUser.name}? La nueva contraseña por defecto será "123456".`);
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
    const confirmDelete = await showConfirm(`¿ESTÁS SEGURO DE DAR DE BAJA DEFINITIVA A ${selectedUser.name.toUpperCase()}? Esta acción desvinculará sus prospectos y eliminará su cuenta de forma permanente.`);
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
          <div className="sa-pers-list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Lista de Colaboradores</h3>
              <span className="sa-pers-counter">{filteredUsers.length} registros</span>
            </div>
            <button 
              className="crm-btn-primary" 
              style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              onClick={handleAddNewClick}
            >
              <i className="fas fa-user-plus" /> Agregar Nuevo
            </button>
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
          {!selectedUser && !isCreateMode ? (
            <div className="sa-pers-config-placeholder">
              <i className="fas fa-sliders-h placeholder-icon" />
              <h3>Consola de Configuración</h3>
              <p>Selecciona un colaborador de la lista de la izquierda o haz clic en "Agregar Nuevo" para dar de alta un nuevo miembro de tu equipo comercial.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveChanges} className="sa-pers-form animate-fade-in">
              <div className="sa-pers-form-header">
                <h3>{isCreateMode ? "Registrar Nuevo Colaborador" : "Editar Perfil de Colaborador"}</h3>
                <span className="user-uuid">
                  {isCreateMode ? "Nuevo Registro" : `ID: ${selectedUser?.id?.substring(0, 8)}...`}
                </span>
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
                  <label>Nombre Completo *</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-user field-icon" />
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      placeholder="Nombre y Apellidos"
                      required 
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="sa-pers-field-group">
                  <label>Correo Electrónico *</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-envelope field-icon" />
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      placeholder="usuario@comgarza.com"
                      required 
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Password (Only for creation) */}
                {isCreateMode && (
                  <div className="sa-pers-field-group animate-slide-up">
                    <label>Contraseña Inicial *</label>
                    <div className="field-input-wrapper">
                      <i className="fas fa-lock field-icon" />
                      <input 
                        type="password" 
                        value={createPassword} 
                        onChange={e => setCreatePassword(e.target.value)} 
                        placeholder="Mínimo 6 caracteres"
                        required 
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}

                {/* Role Switch / Promotion */}
                <div className="sa-pers-field-group">
                  <label>Permiso y Rol en la App</label>
                  <div className="field-input-wrapper">
                    <i className="fas fa-shield-alt field-icon" style={{ color: 'var(--color-brand-accent)' }} />
                    <select 
                      value={editRole} 
                      onChange={e => setEditRole(e.target.value)}
                      style={{ color: '#00f2fe', fontWeight: 'bold' }}
                      disabled={saving}
                    >
                      <option value="sales">Vendedor (Nivel 2)</option>
                      <option value="supervisor">Supervisor (Nivel 1)</option>
                      <option value="admin">Administrador Local (Nivel 1)</option>
                      <option value="sistemas">Sistemas / IT (Nivel 1)</option>
                      <option value="super_admin">Super Admin Máster (Nivel 0)</option>
                    </select>
                  </div>
                  <span className="field-hint">
                    Determina qué módulos, jerarquías y reportes tendrá activos el colaborador.
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
                      disabled={saving}
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
                        disabled={saving}
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
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="sa-pers-form-actions">
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button 
                    type="submit" 
                    className="btn-save-pers crm-btn-primary" 
                    style={{ flex: 2 }}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin" /> Guardando...
                      </>
                    ) : isCreateMode ? (
                      <>
                        <i className="fas fa-user-plus" /> Registrar en Base de Datos
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save" /> Guardar Configuración
                      </>
                    )}
                  </button>
                  
                  {isCreateMode && (
                    <button 
                      type="button" 
                      className="btn-pers-secondary"
                      style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                      onClick={() => setIsCreateMode(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {!isCreateMode && (
                  <>
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
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

