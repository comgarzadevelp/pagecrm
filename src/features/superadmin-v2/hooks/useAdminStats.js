import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useAdminStats() {
  return useQuery({
    queryKey: ['sa-crm-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      
      const [compRes, sellRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/crm/enterprise-companies`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/crm/sellers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/crm/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!statsRes.ok) {
        const errorData = await statsRes.json();
        throw new Error(errorData.message || 'Error al obtener estadísticas del CRM.');
      }

      const compData = await compRes.json();
      const sellData = await sellRes.json();
      const statsData = await statsRes.json();

      return {
        companies: compRes.ok ? (compData.companies || []) : [],
        sellers: sellRes.ok ? (sellData.sellers || []) : [],
        rawStats: statsData.stats
      };
    },
    // Cache de 5 minutos, ya que las métricas históricas no cambian cada segundo
    staleTime: 5 * 60 * 1000, 
  });
}
