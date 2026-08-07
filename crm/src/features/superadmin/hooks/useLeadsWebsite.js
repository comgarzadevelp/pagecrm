import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useLeadsWebsite() {
  return useQuery({
    queryKey: ['sa-leads-website'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/sa/leads-website?limit=250`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Error al cargar los leads web');
      }
      
      const json = await res.json();
      return json.data || [];
    }
  });
}
