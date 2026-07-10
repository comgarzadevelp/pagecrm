import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'Z:/Diseño V2/GARZA/06-GarzaPage/backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFilter() {
    const { data: opportunities, error } = await supabase
      .from('crm_opportunities')
      .select(`
        id,
        quote_num:id,
        title,
        description,
        stage,
        total:value,
        created_at,
        updated_at,
        stage_updated_at,
        assigned_to,
        contact_id,
        company_id,
        seller:crm_users!assigned_to (id, name, email),
        contact:contacts!contact_id (id, name),
        company:companies!company_id (id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const quotes = (opportunities || []).map(opp => ({
      ...opp,
      client: {
        id: opp.contact_id || opp.company_id,
        name: opp.company?.name || opp.contact?.name || 'Sin Cliente'
      },
      quote_num: opp.id.substring(0, 6).toUpperCase(),
      opportunity: {
        id: opp.id,
        title: opp.title,
        stage: opp.stage,
        updated_at: opp.updated_at,
        stage_updated_at: opp.stage_updated_at
      },
      items: [
        {
          name: opp.title || 'Servicio General',
          description: opp.title || 'Servicio General',
          total: opp.total
        }
      ]
    }));

    console.log(`Raw quotes count: ${quotes.length}`);

    const now = new Date('2026-07-10T12:00:00Z');
    const oneDay = 24 * 60 * 60 * 1000;

    const parsed = quotes.map(q => {
      const createdTime = new Date(q.created_at).getTime();
      const lastActivityStr = q.opportunity?.stage_updated_at || q.opportunity?.updated_at || q.created_at;
      const lastActivityTime = new Date(lastActivityStr).getTime();
      const daysInactive = Math.floor((now.getTime() - lastActivityTime) / oneDay);
      
      const stage = q.opportunity?.stage?.toLowerCase() || 'nuevo';
      let status = 'en_proceso';
      if (stage.includes('ganad') || stage.includes('cerrad')) status = 'ganado';
      if (stage.includes('perdid') || stage.includes('cancelad')) status = 'perdido';

      return {
        ...q,
        createdTime,
        daysInactive,
        status, 
        sellerId: q.seller?.id || 'unknown',
        sellerName: q.seller?.name || 'Vendedor Desconocido',
        clientName: q.client?.name || 'Cliente Desconocido'
      };
    });

    const filterPeriod = 'month';
    const filterSeller = 'all';

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);

    const filteredQuotes = parsed.filter(q => {
      if (filterSeller !== 'all' && q.sellerId !== filterSeller) return false;
      if (filterPeriod === 'today' && q.createdTime < todayStart) return false;
      if (filterPeriod === 'week' && q.createdTime < oneWeekAgo) return false;
      if (filterPeriod === 'month' && q.createdTime < oneMonthAgo) return false;
      return true;
    });

    console.log(`Filtered quotes count (${filterPeriod}): ${filteredQuotes.length}`);
    if (filteredQuotes.length > 0) {
        console.log(filteredQuotes[0]);
    }
}
testFilter();
