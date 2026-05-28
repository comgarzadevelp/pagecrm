import firebird from 'node-firebird';
import fs from 'fs';
import path from 'path';

const srcDbPath = 'C:\\Users\\MARKETING\\SAE90EMPRE03.FDB';
const tgtDbPath = 'C:\\Users\\MARKETING\\SAE90EMPRE01.FDB';
const templateDbPath = 'C:\\Program Files (x86)\\Common Files\\Aspel\\Sistemas Aspel\\SAE9.00\\Ejemplos\\Ejemplos.fdb';

const dbOptions = (dbPath) => ({
    host: '127.0.0.1',
    port: 3050,
    database: dbPath,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true,
    pageSize: 4096
});

const sourceOptions = dbOptions(srcDbPath);
const targetOptions = dbOptions(tgtDbPath);

function connectDb(options) {
    return new Promise((resolve, reject) => {
        firebird.attach(options, function(err, db) {
            if (err) return reject(err);
            resolve(db);
        });
    });
}

function runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, function(err, result) {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

function readBlob(blobFunc) {
    return new Promise((resolve, reject) => {
        blobFunc(function(err, name, eventEmitter) {
            if (err) return reject(err);
            
            let buffers = [];
            eventEmitter.on('data', function(chunk) {
                buffers.push(chunk);
            });
            eventEmitter.once('end', function() {
                const completeBuffer = Buffer.concat(buffers);
                resolve(completeBuffer);
            });
            eventEmitter.once('error', function(err) {
                reject(err);
            });
        });
    });
}

async function resolveRow(row) {
    const resolved = {};
    for (const key of Object.keys(row)) {
        const val = row[key];
        if (typeof val === 'function') {
            try {
                resolved[key] = await readBlob(val);
            } catch (err) {
                console.error(`⚠️ Error al leer BLOB de columna ${key}:`, err.message);
                resolved[key] = null;
            }
        } else if (val === undefined) {
            resolved[key] = null;
        } else {
            resolved[key] = val;
        }
    }
    return resolved;
}

async function main() {
    console.log("==================================================");
    console.log("🚀 INICIANDO MIGRACIÓN ESTRUCTURAL DE EMPRESA 03 A 01");
    console.log("==================================================");

    // 1. Respaldar destino si ya existe, y copiar plantilla limpia
    try {
        if (fs.existsSync(tgtDbPath)) {
            const backupPath = `${tgtDbPath}.bak_${Date.now()}`;
            console.log(`⚠️ El archivo destino ya existe. Creando respaldo de seguridad en: ${backupPath}`);
            fs.copyFileSync(tgtDbPath, backupPath);
        }

        console.log(`📋 Copiando estructura limpia desde la plantilla: ${templateDbPath} ➔ ${tgtDbPath}`);
        fs.copyFileSync(templateDbPath, tgtDbPath);
        console.log("✅ Copia de estructura realizada con éxito.\n");
    } catch (e) {
        console.error("❌ Error al copiar archivos de base de datos:", e.message);
        process.exit(1);
    }

    let srcDb, tgtDb;
    try {
        console.log("🔌 Conectando a las bases de datos Firebird...");
        srcDb = await connectDb(sourceOptions);
        console.log("   ✅ Conectado a base de datos Origen (SAE90EMPRE03.FDB)");
        tgtDb = await connectDb(targetOptions);
        console.log("   ✅ Conectado a base de datos Destino (SAE90EMPRE01.FDB)\n");

        // 2. Obtener lista de tablas de la Empresa 03 en Origen
        console.log("🔍 Escaneando tablas con sufijo 03 en la base de datos de origen...");
        const tablesResult = await runQuery(srcDb, `
            SELECT TRIM(rdb$relation_name) AS table_name 
            FROM rdb$relations 
            WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL AND TRIM(rdb$relation_name) LIKE '%03'
            ORDER BY rdb$relation_name
        `);
        const tables03 = tablesResult.map(r => r.table_name);
        console.log(`   ✅ Se detectaron ${tables03.length} tablas de la empresa 03.\n`);

        // 3. LIMPIEZA: Vaciar tablas en el destino (Ejemplos.fdb viene con datos de prueba)
        // Utilizaremos una cola dinámica para resolver dependencias de llaves foráneas en cascada inversa
        console.log("🧹 Vaciando datos de prueba en la base de datos destino...");
        let deleteQueue = tables03.map(t => t.replace(/03$/, '01'));
        let deleteAttempts = 0;
        const maxDeleteAttempts = deleteQueue.length * 10;
        let lastDeleteSuccessCount = 0;
        let deleteCyclesWithoutSuccess = 0;

        while (deleteQueue.length > 0) {
            const table = deleteQueue.shift();
            try {
                // Intentar vaciar la tabla
                await runQuery(tgtDb, `DELETE FROM ${table}`);
                deleteCyclesWithoutSuccess = 0;
            } catch (err) {
                // Si falla por foreign keys, la volvemos a encolar al final
                deleteQueue.push(table);
                deleteCyclesWithoutSuccess++;
                
                if (deleteCyclesWithoutSuccess > deleteQueue.length * 2) {
                    console.error(`❌ Error crítico de dependencias al vaciar la tabla: ${table}. Detalle: ${err.message}`);
                    throw new Error("No se pudo completar la limpieza por dependencias circulares.");
                }
            }
            
            deleteAttempts++;
            if (deleteAttempts > maxDeleteAttempts) {
                throw new Error("Se excedió el número máximo de intentos para limpiar las tablas.");
            }
        }
        console.log("   ✅ Base de datos destino limpia de datos de prueba.\n");

        // 4. MIGRACIÓN DE DATOS: Insertar datos de 03 a 01 con cola dinámica
        console.log("📦 Iniciando transferencia de datos desde Empresa 03 a Empresa 01...");
        let insertQueue = [...tables03];
        let insertAttempts = 0;
        const maxInsertAttempts = insertQueue.length * 15;
        let insertCyclesWithoutSuccess = 0;
        const migratedTables = new Set();
        let totalRowsMigrated = 0;

        while (insertQueue.length > 0) {
            const srcTable = insertQueue.shift();
            const tgtTable = srcTable.replace(/03$/, '01');

            try {
                // Obtener datos del origen
                const rows = await runQuery(srcDb, `SELECT * FROM ${srcTable}`);
                
                if (rows.length === 0) {
                    // Si está vacía, no hay nada que insertar
                    migratedTables.add(srcTable);
                    insertCyclesWithoutSuccess = 0;
                    continue;
                }

                // Generar INSERT parametrizado
                const columns = Object.keys(rows[0]);
                const colsStr = columns.join(', ');
                const valPlaceholders = columns.map(() => '?').join(', ');
                const insertSql = `INSERT INTO ${tgtTable} (${colsStr}) VALUES (${valPlaceholders})`;

                // Insertar los registros
                for (const row of rows) {
                    const resolvedRow = await resolveRow(row);
                    const params = columns.map(c => resolvedRow[c]);
                    await runQuery(tgtDb, insertSql, params);
                }

                migratedTables.add(srcTable);
                totalRowsMigrated += rows.length;
                console.log(`   ➔ [${migratedTables.size}/${tables03.length}] Tabla ${srcTable} ➔ ${tgtTable} migrada con éxito (${rows.length} registros).`);
                insertCyclesWithoutSuccess = 0;
            } catch (err) {
                // Si falla por foreign keys u otra restricción, la encolamos
                insertQueue.push(srcTable);
                insertCyclesWithoutSuccess++;

                if (insertCyclesWithoutSuccess > insertQueue.length * 2) {
                    console.error(`❌ Error al migrar ${srcTable}:`, err.message);
                    throw new Error(`Dependencias no resueltas para la tabla: ${srcTable}.`);
                }
            }

            insertAttempts++;
            if (insertAttempts > maxInsertAttempts) {
                throw new Error("Se excedió el número máximo de intentos para migrar las tablas.");
            }
        }
        console.log(`\n🎉 ¡Migración de datos completa! Se transfirieron un total de ${totalRowsMigrated} registros en ${migratedTables.size} tablas.\n`);

        // 5. SINCRONIZAR GENERADORES (SECUENCIAS AUTO-INCREMENTALES)
        console.log("🔄 Sincronizando generadores de IDs auto-incrementables...");
        const generatorsResult = await runQuery(tgtDb, `
            SELECT TRIM(rdb$generator_name) AS gen_name 
            FROM rdb$generators 
            WHERE rdb$system_flag = 0 AND TRIM(rdb$generator_name) LIKE '%01'
        `);
        const generators = generatorsResult.map(g => g.gen_name);

        let syncedGens = 0;
        for (const gen01 of generators) {
            const gen03 = gen01.replace(/01/, '03');
            try {
                // Obtener valor actual del generador 03 en origen
                const valResult = await runQuery(srcDb, `SELECT GEN_ID(${gen03}, 0) AS val FROM rdb$database`);
                const currentVal = valResult[0].val;

                if (currentVal > 0) {
                    // Establecer el generador 01 en destino
                    await runQuery(tgtDb, `SET GENERATOR ${gen01} TO ${currentVal}`);
                    syncedGens++;
                }
            } catch (err) {
                // Algunos generadores podrían no tener equivalente, los saltamos silenciosamente
            }
        }
        console.log(`   ✅ Sincronizados ${syncedGens} generadores auto-incrementales de forma exitosa.\n`);

        console.log("==================================================");
        console.log("🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE! 🎉");
        console.log(`   El archivo de base de datos listo para SAE 10 es:`);
        console.log(`   ➔ ${tgtDbPath}`);
        console.log("==================================================");

    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO EN LA MIGRACIÓN:", error.message);
    } finally {
        if (srcDb) srcDb.detach();
        if (tgtDb) tgtDb.detach();
    }
}

main();
