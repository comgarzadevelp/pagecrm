// src/contexts/CompanyContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { applyTheme, getStoredTheme, saveTheme } from '../styles/companyThemes';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const [companyId, setCompanyId] = useState(null);
  const [companyCode, setCompanyCode] = useState(getStoredTheme());
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apply stored theme on mount
    applyTheme(companyCode);
  }, [companyCode]);

  const switchCompany = (newCompanyId, newCompanyCode, companyData) => {
    setCompanyId(newCompanyId);
    setCompanyCode(newCompanyCode);
    setCompany(companyData);
    saveTheme(newCompanyCode);
    // Save to localStorage for persistence
    localStorage.setItem('companyId', newCompanyId);
  };

  const loadCompanyFromStorage = () => {
    const storedCompanyId = localStorage.getItem('companyId');
    const storedCompanyCode = localStorage.getItem('companyCode');
    
    if (storedCompanyId && storedCompanyCode) {
      setCompanyId(storedCompanyId);
      setCompanyCode(storedCompanyCode);
      applyTheme(storedCompanyCode);
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companyId,
        companyCode,
        company,
        loading,
        switchCompany,
        loadCompanyFromStorage,
        setLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};
