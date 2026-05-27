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
  const res1 = await supabase.from('contac03').select('*', { count: 'exact', head: true });
  console.log('contac03 exists:', !res1.error, 'count:', res1.count, 'error:', res1.error?.message);

  const res2 = await supabase.from('contc03').select('*', { count: 'exact', head: true });
  console.log('contc03 exists:', !res2.error, 'count:', res2.count, 'error:', res2.error?.message);
}

test();
