import dotenv from 'dotenv';
dotenv.config({ path: 'Z:\\Diseño V2\\GARZA\\06-GarzaPage\\backend\\.env' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase.from('crm_opportunities').select('id, description, created_at, updated_at, stage_updated_at');
  
  for (const row of data) {
    if (!row.description) continue;
    
    const oppCreated = new Date(row.created_at);
    const oppUpdated = row.updated_at ? new Date(row.updated_at) : null;
    const oppStage = row.stage_updated_at ? new Date(row.stage_updated_at) : null;
    
    const isSameDay = (d1, d2) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    };

    let newDesc = row.description.replace(/\[([^\]]+?)\]/g, (match, inner) => {
      const dashIndex = inner.indexOf(' - ');
      let dateStr = dashIndex !== -1 ? inner.substring(0, dashIndex).trim() : inner.trim();
      const authorStr = dashIndex !== -1 ? inner.substring(dashIndex) : '';
      
      // If it's already an ISO date (contains T and Z or -), leave it or parse it
      if (dateStr.includes('T') || dateStr.includes('-') && dateStr.split('-').length === 3 && dateStr.length > 10) {
        return match; 
      }
      
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        
        // Smart parse:
        // If first part > 12, it is Day/Month/Year
        // If second part > 12, it is Month/Day/Year (US) and we flip them
        if (day > 12) {
          // Keep as is: day/month/year
        } else if (month > 12) {
          // Flip: day is month, month is day
          const temp = day;
          day = month;
          month = temp;
        } else {
          // Both <= 12. Let's look at opportunity dates to see if we can match the day.
          // In Mexico/Spain, default is Day/Month/Year. Let's test if Month/Day/Year matches the opportunity dates.
          const dateOptionDMY = new Date(year, month - 1, day);
          const dateOptionMDY = new Date(year, day - 1, month);
          
          let matchesDMY = isSameDay(dateOptionDMY, oppCreated) || 
                           (oppUpdated && isSameDay(dateOptionDMY, oppUpdated)) || 
                           (oppStage && isSameDay(dateOptionDMY, oppStage));
                           
          let matchesMDY = isSameDay(dateOptionMDY, oppCreated) || 
                           (oppUpdated && isSameDay(dateOptionMDY, oppUpdated)) || 
                           (oppStage && isSameDay(dateOptionMDY, oppStage));
          
          if (matchesMDY && !matchesDMY) {
            // Flip it because it matches MDY
            const temp = day;
            day = month;
            month = temp;
          }
        }
        
        let dateObj = new Date(year, month - 1, day);
        if (oppUpdated && isSameDay(dateObj, oppUpdated)) dateObj = oppUpdated;
        else if (oppStage && isSameDay(dateObj, oppStage)) dateObj = oppStage;
        else if (oppCreated && isSameDay(dateObj, oppCreated)) dateObj = oppCreated;
        
        return `[${dateObj.toISOString()}${authorStr}]`;
      }
      
      return match;
    });

    if (newDesc !== row.description) {
      await supabase.from('crm_opportunities').update({ description: newDesc }).eq('id', row.id);
      console.log('Standardized dates for opportunity:', row.id);
    }
  }
}
main();
