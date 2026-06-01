import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardShell from '../DashboardShell';
import { useCrmData } from '../hooks/useCrmData';

// Panels
import Contenedor from '../panels/Contenedor';
import NotificationsPanel from '../panels/NotificationsPanel';
import MiPerfil from '../panels/MiPerfil';

const DashboardSistemas = ({ enabledModules }) => {
  const role = 'sistemas';
  const {
    userName,
    handleRefreshAll,
    handleLogout
  } = useCrmData(role, enabledModules);

  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'files';
  const setActiveTab = (newTab) => navigate(`/crm/dashboard/${newTab}`);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <DashboardShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      role={role}
      userName={userName}
      enabledModules={enabledModules}
      handleRefreshAll={handleRefreshAll}
      handleLogout={handleLogout}
    >
      {activeTab === 'files' && <Contenedor />}
      {activeTab === 'notifications' && <NotificationsPanel />}
      {activeTab === 'profile' && <MiPerfil />}
    </DashboardShell>
  );
};

export default DashboardSistemas;
