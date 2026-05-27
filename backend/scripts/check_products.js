import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SAE_SUPABASE_URL;
const supabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { count, error } = await supabase
    .from('inve03')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error fetching inve03 count:', error);
  } else {
    console.log('Total products in inve03 mirror:', count);
  }
}

test();
