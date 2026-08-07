import { useState, useCallback } from 'react';

export default function useDirectorio(API_BASE, token) {
  const [allCompanies, setAllCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [loadingCustomerQuotes, setLoadingCustomerQuotes] = useState(false);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [loadingLinkedContacts, setLoadingLinkedContacts] = useState(false);

  const fetchCrmCompanies = useCallback(async (signal) => {
    setLoadingCompanies(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, { 
        headers: { Authorization: `Bearer ${token}` }, 
        signal 
      });
      const data = await res.json();
      if (res.ok) setAllCompanies(data.companies || []);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Error fetching CRM companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  }, [API_BASE, token]);

  const fetchCustomerDetails = useCallback(async (customerId, companyOrCustomerId) => {
    setLoadingCustomerQuotes(true);
    setLoadingLinkedContacts(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const reqs = [
        fetch(`${API_BASE}/api/crm/customers/${customerId}/quotes`, { headers }).then(r => r.json())
      ];
      if (companyOrCustomerId) {
        reqs.push(fetch(`${API_BASE}/api/crm/companies/${companyOrCustomerId}`, { headers }).then(r => r.json()));
      }
      
      const results = await Promise.all(reqs);
      setCustomerQuotes(results[0]?.quotes || []);
      setLinkedContacts(results[1]?.linkedContacts || []);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    } finally {
      setLoadingCustomerQuotes(false);
      setLoadingLinkedContacts(false);
    }
  }, [API_BASE, token]);

  return {
    allCompanies, loadingCompanies, fetchCrmCompanies,
    customerQuotes, setCustomerQuotes, loadingCustomerQuotes,
    linkedContacts, setLinkedContacts, loadingLinkedContacts,
    fetchCustomerDetails
  };
}
