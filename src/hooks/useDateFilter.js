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
      if (!item[dateField]) return true; // keep if no date
      const itemDate = new Date(item[dateField]);
      if (isNaN(itemDate.getTime())) return true;
      
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }, [items, dateFilter, dateField]);

  return { dateFilter, setDateFilter, filteredItems };
}
