import { useState, useEffect } from 'react';

export default function useEmpresas(API_BASE, token) {
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAllData = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resComp, resCont, resPrice] = await Promise.all([
        fetch(`${API_BASE}/api/crm/companies`, { headers, signal }),
        fetch(`${API_BASE}/api/crm/contacts`, { headers, signal }),
        fetch(`${API_BASE}/api/crm/price-lists`, { headers, signal })
      ]);

      const [dataComp, dataCont, dataPrice] = await Promise.all([
        resComp.json(), 
        resCont.json(), 
        resPrice.json()
      ]);

      if (!resComp.ok) throw new Error(dataComp.message);

      setCompanies(dataComp.companies || []);
      setContacts(dataCont.contacts || []);
      setPriceLists(dataPrice.priceLists || []);

    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchAllData(abortController.signal);
    return () => abortController.abort();
  }, [API_BASE, token]);

  const refetch = () => {
    const ac = new AbortController();
    fetchAllData(ac.signal);
  };

  return { companies, setCompanies, contacts, setContacts, priceLists, loading, error, refetch };
}
