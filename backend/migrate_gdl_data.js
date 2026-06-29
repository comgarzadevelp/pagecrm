import firebird from 'node-firebird';
import { saeGdlSupabase } from './supabaseClient.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbPath = 'C:\\Users\\MARKETING\\SAE90EMPRE05.FDB';

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: dbPath,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

const TABLES_TO_SYNC = [
    { name: 'inve05', primaryKey: 'cve_art' },
    { name: 'clie05', primaryKey: 'clave' },
    { name: 'contac05', primaryKey: 'num_reg' }, // contac03 PK is num_reg
    { name: 'vend05', primaryKey: 'cve_vend' },
    { name: 'factf05', primaryKey: 'cve_doc' },
    { name: 'par_factf05', primaryKey: 'cve_doc, num_par' }
];

function cleanRecord(record) {
    const cleaned = {};
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string') {
            // Buffer to text issue in Firebird sometimes returns Buffer
            cleaned[key] = value.trim();
        } else if (Buffer.isBuffer(value)) {
            cleaned[key] = value.toString('utf8').trim();
        } else if (value instanceof Date) {
            cleaned[key] = isNaN(value.getTime()) ? null : value.toISOString();
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

console.log('🔄 Iniciando Migración Inicial SAE GDL ➔ Supabase...');
console.log('📌 Base de datos local:', dbPath);

firebird.attach(options, async function(err, db) {
    if (err) {
        console.error('❌ Error al conectar a Firebird:', err.message);
        process.exit(1);
    }

    try {
        for (const tableConfig of TABLES_TO_SYNC) {
            const tableName = tableConfig.name;
            const uppercaseTable = tableName.toUpperCase();
            
            console.log(`\n--- Migrando ${uppercaseTable} ---`);
            
            // Obtener registros locales
            const rows = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM ${uppercaseTable}`, (err, results) => {
                    if (err) {
                        console.error(`❌ Error al leer ${uppercaseTable}:`, err.message);
                        resolve([]);
                    } else {
                        resolve(results.map(cleanRecord));
                    }
                });
            });

            console.log(`📦 Registros encontrados en FDB local: ${rows.length}`);

            if (rows.length === 0) continue;

            const batchSize = 1000;
            let successCount = 0;
            
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                
                // Realizar upsert en Supabase. Si par_factf05 no tiene pk único simple, se sube así.
                const { error: upsertErr } = await saeGdlSupabase
                    .from(tableName)
                    .upsert(batch);

                if (upsertErr) {
                    console.error(`❌ Error al subir lote de ${tableName}:`, upsertErr.message);
                    console.error(upsertErr);
                } else {
                    successCount += batch.length;
                    process.stdout.write(`\r   ➔ Sincronizados: ${successCount} / ${rows.length}`);
                }
            }
            console.log(`\n✅ Tabla ${tableName} completada.`);
        }
    } catch (error) {
        console.error('❌ Error general durante el proceso:', error);
    } finally {
        console.log(`\n⏱️ Migración completada.`);
        db.detach();
    }
});
