import firebird from 'node-firebird';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno del archivo .env local
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SAE_SUPABASE_URL;
const supabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan credenciales de Supabase (SAE_SUPABASE_URL / SAE_SUPABASE_SERVICE_ROLE_KEY) en el archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta al FDB de SAE
const dbPath = process.env.SAE_FDB_PATH;
if (!dbPath) {
    console.error('❌ Error: Falta la ruta de la base de datos (SAE_FDB_PATH) en el archivo .env');
    process.exit(1);
}

const options = {
    host: process.env.SAE_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.SAE_DB_PORT || '3050'),
    database: dbPath,
    user: process.env.SAE_DB_USER || 'USER_WEB_SYNC',
    password: process.env.SAE_DB_PASSWORD || 'contrasena_segura',
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

console.log('🔄 Iniciando Sincronizador Espejo SAE ➔ Supabase...');
console.log('📌 Base de datos local:', dbPath);

firebird.attach(options, async function(err, db) {
    if (err) {
        console.error('❌ Error al conectar a Firebird:', err.message);
        process.exit(1);
    }

    const startTime = Date.now();

    try {
        // --- 1. SINCRONIZACIÓN DE PRODUCTOS (INVE03) ---
        console.log('--- Analizando INVE03 (Productos) ---');
        
        // Obtener productos locales
        const localProducts = await new Promise((resolve) => {
            db.query('SELECT CVE_ART, DESCR, EXIST, STATUS, FCH_ULTVTA FROM INVE03', (err, rows) => {
                if (err) {
                    console.error('❌ Error al leer INVE03 local:', err.message);
                    resolve([]);
                } else {
                    resolve(rows.map(cleanRecord));
                }
            });
        });
        console.log(`📦 Productos en FDB local: ${localProducts.length}`);

        // Obtener productos actuales de Supabase
        const { data: remoteProducts, error: errRemote } = await supabase
            .from('inve03')
            .select('cve_art, descr, exist, status, fch_ultvta');

        if (errRemote) {
            console.error('❌ Error al leer Supabase (inve03):', errRemote.message);
            db.detach();
            return;
        }
        console.log(`☁️ Productos en Supabase: ${remoteProducts.length}`);

        // Comparar en memoria
        const remoteMap = new Map(remoteProducts.map(p => [p.cve_art, p]));
        const toUpsert = [];

        for (const local of localProducts) {
            const remote = remoteMap.get(local.cve_art);
            if (!remote) {
                toUpsert.push(local);
            } else {
                if (
                    local.descr !== remote.descr ||
                    local.exist !== remote.exist ||
                    local.status !== remote.status ||
                    local.fch_ultvta !== remote.fch_ultvta
                ) {
                    toUpsert.push(local);
                }
            }
        }

        console.log(`📢 Productos con cambios detectados: ${toUpsert.length}`);

        // Subir las diferencias
        if (toUpsert.length > 0) {
            const batchSize = 200;
            for (let i = 0; i < toUpsert.length; i += batchSize) {
                const batch = toUpsert.slice(i, i + batchSize);
                const keys = batch.map(b => b.cve_art);
                
                const fullRows = await new Promise((resolve) => {
                    const placeholders = keys.map(k => `'${k}'`).join(',');
                    db.query(`SELECT * FROM INVE03 WHERE CVE_ART IN (${placeholders})`, (err, rows) => {
                        resolve(err ? [] : rows.map(cleanRecord));
                    });
                });

                if (fullRows.length > 0) {
                    const { error: upsertErr } = await supabase.from('inve03').upsert(fullRows);
                    if (upsertErr) {
                        console.error('❌ Error al subir lote de productos a Supabase:', upsertErr.message);
                    } else {
                        console.log(`   ➔ Sincronizado lote de ${fullRows.length} productos.`);
                    }
                }
            }
        } else {
            console.log('✅ Todos los productos están al día.');
        }

    } catch (error) {
        console.error('❌ Error general durante el proceso:', error);
    } finally {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`⏱️ Sincronización completada con éxito en ${duration} segundos.`);
        db.detach();
    }
});
