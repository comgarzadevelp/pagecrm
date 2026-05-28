import firebird from 'node-firebird';

const dbEjemplos = 'C:\\Program Files (x86)\\Common Files\\Aspel\\Sistemas Aspel\\SAE9.00\\Ejemplos\\Ejemplos.fdb';
const dbGarza = 'C:\\Users\\MARKETING\\SAE90EMPRE03.FDB';

const optionsEjemplos = {
    host: '127.0.0.1',
    port: 3050,
    database: dbEjemplos,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

const optionsGarza = {
    host: '127.0.0.1',
    port: 3050,
    database: dbGarza,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

function getTables(options) {
    return new Promise((resolve, reject) => {
        firebird.attach(options, function(err, db) {
            if (err) {
                return reject(err);
            }
            const query = `
                SELECT TRIM(rdb$relation_name) AS table_name 
                FROM rdb$relations 
                WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL
                ORDER BY rdb$relation_name
            `;
            db.query(query, function(err, result) {
                db.detach();
                if (err) {
                    return reject(err);
                }
                resolve(result.map(r => r.table_name));
            });
        });
    });
}

async function run() {
    console.log("Iniciando análisis comparativo de bases de datos...");
    try {
        console.log(`\nConectando a Ejemplos: ${dbEjemplos}`);
        const tablesEjemplos = await getTables(optionsEjemplos);
        console.log(`✅ Ejemplos cargado. Total tablas: ${tablesEjemplos.length}`);

        console.log(`\nConectando a Garza (Prod): ${dbGarza}`);
        const tablesGarza = await getTables(optionsGarza);
        console.log(`✅ Garza cargado. Total tablas: ${tablesGarza.length}`);

        // Analizar sufijos
        const suffixEjemplos = new Set();
        const cleanEjemplos = [];
        for (const t of tablesEjemplos) {
            const match = t.match(/\d+$/);
            if (match) {
                suffixEjemplos.add(match[0]);
                cleanEjemplos.push(t.replace(/\d+$/, ''));
            } else {
                cleanEjemplos.push(t);
            }
        }

        const suffixGarza = new Set();
        const cleanGarza = [];
        for (const t of tablesGarza) {
            const match = t.match(/\d+$/);
            if (match) {
                suffixGarza.add(match[0]);
                cleanGarza.push(t.replace(/\d+$/, ''));
            } else {
                cleanGarza.push(t);
            }
        }

        console.log("\n==================================================");
        console.log("ANÁLISIS DE SUFIJOS DE EMPRESA");
        console.log("==================================================");
        console.log(`Sufijos detectados en Ejemplos.fdb:`, Array.from(suffixEjemplos));
        console.log(`Sufijos detectados en SAE90EMPRE03.FDB:`, Array.from(suffixGarza));

        // Comparar tablas sin sufijos (esquemas base)
        const setEjemplos = new Set(cleanEjemplos);
        const setGarza = new Set(cleanGarza);

        const onlyInEjemplos = cleanEjemplos.filter(t => !setGarza.has(t));
        const onlyInGarza = cleanGarza.filter(t => !setEjemplos.has(t));
        const shared = cleanGarza.filter(t => setEjemplos.has(t));

        console.log("\n==================================================");
        console.log("COMPARACIÓN DE ESQUEMAS (TABLAS BASE)");
        console.log("==================================================");
        console.log(`Tablas compartidas (esquema idéntico base): ${shared.length}`);
        console.log(`Tablas exclusivas de Ejemplos.fdb: ${onlyInEjemplos.length}`);
        if (onlyInEjemplos.length > 0) {
            console.log("Muestra de tablas solo en Ejemplos:", onlyInEjemplos.slice(0, 15));
        }
        console.log(`Tablas exclusivas de Garza (Empresa 03): ${onlyInGarza.length}`);
        if (onlyInGarza.length > 0) {
            console.log("Muestra de tablas solo en Garza:", onlyInGarza.slice(0, 15));
        }

        console.log("\n¿Qué tanto se rompería al cambiar?");
        if (onlyInGarza.length === 0 && onlyInEjemplos.length === 0) {
            console.log("➔ ¡El esquema es 100% idéntico en su estructura base! Solo cambia el sufijo numérico.");
        } else {
            console.log("➔ Hay ligeras diferencias en las tablas. Esto podría deberse a personalizaciones o campos libres no inicializados.");
        }

    } catch (error) {
        console.error("❌ Error durante la comparación:", error.message);
    }
}

run();
