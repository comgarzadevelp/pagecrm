// backend/scripts/inspect_precios.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SAE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan credenciales de Supabase en el archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Agrupando y contando clientes en clie03 por su lista_prec...');
  const { data: clients, error: err } = await supabase
    .from('clie03')
    .select('lista_prec');

  if (err) {
    console.error('Error:', err);
  } else {
    const summary = {};
    clients.forEach(c => {
      summary[c.lista_prec] = (summary[c.lista_prec] || 0) + 1;
    });
    console.log('Resumen de cantidad de clientes por lista_prec en clie03:');
    console.table(summary);
  }
}

inspect();
