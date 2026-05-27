import firebird from 'node-firebird';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SAE_SUPABASE_URL;
const supabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan credenciales de Supabase en el archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dbPath = 'C:\\Users\\MARKETING\\SAE90EMPRE03.FDB';

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: dbPath,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

function cleanRecord(record) {
    const cleaned = {};
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string') {
            cleaned[key] = value.trim();
        } else if (value instanceof Date) {
            cleaned[key] = isNaN(value.getTime()) ? null : value.toISOString();
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

firebird.attach(options, async function(err, db) {
    if (err) {
        console.error('Error al conectar a Firebird:', err.message);
        process.exit(1);
    }

    console.log('Conectado a Firebird. Replicando VEND03 de inmediato...');

    db.query('SELECT * FROM VEND03', async function(err, rows) {
        if (err) {
            console.error('Error al descargar VEND03:', err.message);
            db.detach();
            process.exit(1);
        }

        console.log(`Descargados ${rows.length} vendedores de Firebird.`);
        const cleanedRows = rows.map(cleanRecord);

        // Limpiar tabla en Supabase
        console.log('Limpiando tabla vend03 en Supabase...');
        const { error: clearError } = await supabase
            .from('vend03')
            .delete()
            .not('cve_vend', 'is', null);

        if (clearError) {
            console.warn('Nota al limpiar tabla vend03:', clearError.message);
        }

        // Insertar en Supabase
        const { error: uploadError } = await supabase
            .from('vend03')
            .upsert(cleanedRows);

        if (uploadError) {
            console.error('Error al subir vendedores a Supabase:', uploadError.message);
        } else {
            console.log('¡Vendedores subidos con éxito!');
        }

        db.detach();
    });
});
