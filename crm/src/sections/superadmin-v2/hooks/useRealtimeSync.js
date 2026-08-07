import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * useRealtimeSync
 * Invalida queries de TanStack Query cuando hay cambios en Supabase
 *
 * @param {import('@supabase/supabase-js').SupabaseClient[]} clients - Arreglo de clientes (ej. [supabaseMTY, supabaseGDL])
 * @param {string[]} tables - Tablas a escuchar (ej. ['leads_chatbot', 'contactos'])
 * @param {string[]} queryKeys - Llaves a invalidar (ej. ['sa-leads-website'])
 */
export function useRealtimeSync(clients, tables, queryKeys) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = [];

    clients.forEach((client, clientIdx) => {
      tables.forEach((table) => {
        const channelName = `sa2-sync-${clientIdx}-${table}-${Date.now()}`;
        const channel = client
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            (payload) => {
              console.log(`[Realtime Sync] Cambio en ${table}`, payload);
              queryKeys.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: [key] });
              });
            }
          )
          .subscribe();
        
        channels.push({ client, channel });
      });
    });

    return () => {
      channels.forEach(({ client, channel }) => {
        client.removeChannel(channel);
      });
    };
  }, [clients, tables, queryKeys, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps
}
