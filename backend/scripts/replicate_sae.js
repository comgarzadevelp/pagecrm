import firebird from 'node-firebird';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde el backend
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SAE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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

    console.log('¡Conectado con éxito a Firebird! Iniciando replicación espejo de TODAS las tablas...\n');

    // Obtener todos los nombres de tablas no-sistema
    const getTablesQuery = `
        SELECT TRIM(rdb$relation_name) AS table_name 
        FROM rdb$relations 
        WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL
        ORDER BY rdb$relation_name
    `;

    db.query(getTablesQuery, async function(err, result) {
        if (err) {
            console.error('Error al obtener nombres de tablas:', err.message);
            db.detach();
            process.exit(1);
        }

        const tables = result.map(r => r.table_name);
        console.log(`Se detectaron ${tables.length} tablas para replicar.`);

        for (let tIndex = 0; tIndex < tables.length; tIndex++) {
            const tableName = tables[tIndex];
            const pgTableName = tableName.toLowerCase();
            
            console.log(`\n--------------------------------------------------`);
            console.log(`[${tIndex + 1}/${tables.length}] Replicando: ${tableName} ➔ ${pgTableName}`);
            console.log(`--------------------------------------------------`);

            await new Promise((resolveTable) => {
                db.query(`SELECT COUNT(*) as total FROM ${tableName}`, async function(err, countResult) {
                    if (err) {
                        console.error(`❌ Error al contar registros en ${tableName}:`, err.message);
                        resolveTable();
                        return;
                    }

                    const totalRows = countResult[0].total;
                    console.log(`   Total registros: ${totalRows}`);

                    if (totalRows === 0) {
                        console.log(`   Table vacía. Saltando carga.`);
                        resolveTable();
                        return;
                    }

                    // Lista de tablas gigantes que limitaremos para no llenar el disco gratuito de Supabase
                    const massiveTables = {
                        'BITA03': 100,            // Bitácora
                        'CAPAS_X_MOV03': 100,     // Capas de movimiento
                        'CFDI03': 100,            // Logs CFDI
                        'MINVE03': 200,           // Movimientos de inventario (dejar 200 de muestra)
                        'PRECIO_X_PROD03': 1000,  // Precios por producto (suficiente para pruebas)
                        // Pedidos y Partidas de pedido (para pruebas de Felipe)
                        'FACTP03': 1000,          
                        'PAR_FACTP03': 1000,      
                        'PAR_FACTP_CLIB03': 1000, 
                        // Remisiones y Partidas de remisión
                        'FACTR03': 500,           
                        'PAR_FACTR03': 500,       
                        'PAR_FACTR_CLIB03': 500,  
                    };

                    let queryStr = `SELECT * FROM ${tableName}`;
                    if (massiveTables[tableName]) {
                        const limit = massiveTables[tableName];
                        console.log(`   ⚠️ Tabla masiva detectada. Limitando importación a los primeros ${limit} registros.`);
                        queryStr = `SELECT FIRST ${limit} * FROM ${tableName}`;
                    }

                    // Descargar los registros de esta tabla
                    db.query(queryStr, async function(err, rows) {
                        if (err) {
                            console.error(`   ❌ Error al descargar ${tableName}:`, err.message);
                            resolveTable();
                            return;
                        }

                        const cleanedRows = rows.map(cleanRecord);
                        
                        // Vaciar tabla en Supabase antes de insertar para evitar duplicidades
                        console.log(`   ➔ Limpiando datos existentes en Supabase...`);
                        const firstKey = Object.keys(cleanedRows[0])[0];
                        const { error: clearError } = await supabase
                            .from(pgTableName)
                            .delete()
                            .not(firstKey, 'is', null);

                        if (clearError) {
                            console.log(`   ⚠️ Nota al vaciar la tabla: ${clearError.message}`);
                        }

                        const batchSize = 200;
                        let uploadedCount = 0;
                        let errorOccurred = false;

                        for (let i = 0; i < cleanedRows.length; i += batchSize) {
                            const batch = cleanedRows.slice(i, i + batchSize);
                            
                            const { error } = await supabase
                                .from(pgTableName)
                                .upsert(batch);

                            if (error) {
                                console.error(`   ❌ Error en lote (filas ${i} a ${i + batch.length}):`, error.message);
                                errorOccurred = true;
                                break; // Paramos el proceso de esta tabla si hay fallas de esquema o carga
                            } else {
                                uploadedCount += batch.length;
                                const percent = ((uploadedCount / totalRows) * 100).toFixed(1);
                                console.log(`   ➔ [${percent}%] Subidos ${uploadedCount} / ${totalRows} registros...`);
                            }
                        }

                        if (!errorOccurred) {
                            console.log(`   ✅ Completada con éxito!`);
                        }
                        resolveTable();
                    });
                });
            });
        }

        console.log('\n==================================================');
        console.log('🎉 ¡REPLICACIÓN DE TODAS LAS TABLAS COMPLETA! 🎉');
        console.log('==================================================');
        db.detach();
    });
});
