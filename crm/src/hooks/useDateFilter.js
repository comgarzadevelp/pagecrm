import { useState, useMemo } from 'react';

export function useDateFilter(items, dateField = 'created_at') {
  const [dateFilter, setDateFilter] = useState({ type: 'all', startDate: '', endDate: '' });

  const filteredItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    if (dateFilter.type === 'all') return items;

    const now = new Date();
    let start = null;
    let end = null;

    if (dateFilter.type === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start.getTime() + 86400000 - 1);
    } else if (dateFilter.type === 'week') {
      const day = now.getDay() || 7; // 1-7 (Mon-Sun)
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      end = new Date(start.getTime() + 7 * 86400000 - 1);
    } else if (dateFilter.type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter.type === 'custom') {
      if (dateFilter.startDate) {
        start = new Date(dateFilter.startDate + 'T00:00:00');
      }
      if (dateFilter.endDate) {
        end = new Date(dateFilter.endDate + 'T23:59:59');
      }
    }

    return items.filter(item => {
      // Revisa todas las candidatas de fecha del objeto (la clave especificada, actividad reciente, última visita, actualización, etc.)
      const dateCandidates = [
        item[dateField],
        item.last_activity_date,
        item.updated_at,
        item.created_at,
        item.last_visit_date,
        item.last_quote_date
      ].filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d.getTime()));

      if (dateCandidates.length === 0) return true; // Mantener si no tiene fechas

      // Un item coincide con el rango si al menos una de sus fechas de creación/actividad entra en el rango (start / end)
      return dateCandidates.some(d => {
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    });
  }, [items, dateFilter, dateField]);

  return { dateFilter, setDateFilter, filteredItems };
}
