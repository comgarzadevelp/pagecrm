import firebird from 'node-firebird';

const dbPath = 'C:\\Users\\MARKETING\\SAE90EMPRE01.FDB';

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: dbPath,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

firebird.attach(options, function(err, db) {
    if (err) {
        console.error("Error al conectar a Destino:", err.message);
        process.exit(1);
    }
    
    // Obtener todas las tablas no vacías
    const query = `
        SELECT TRIM(rdb$relation_name) AS table_name 
        FROM rdb$relations 
        WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL AND TRIM(rdb$relation_name) LIKE '%01'
        ORDER BY rdb$relation_name
    `;
    
    db.query(query, async function(err, result) {
        if (err) {
            console.error("Error al consultar tablas:", err.message);
            db.detach();
            process.exit(1);
        }
        
        const tables = result.map(r => r.table_name);
        console.log(`Buscando registros en ${tables.length} tablas en la base de datos de destino...\n`);
        
        const results = [];
        for (const table of tables) {
            await new Promise((resolve) => {
                db.query(`SELECT COUNT(*) AS total FROM ${table}`, function(err, countRes) {
                    if (!err && countRes && countRes[0].total > 0) {
                        results.push({ table, count: countRes[0].total });
                    }
                    resolve();
                });
            });
        }
        
        console.log("==================================================");
        console.log("TABLAS MIGRADAS CON DATOS EN DESTINO");
        console.log("==================================================");
        results.forEach((r, idx) => {
            console.log(`${idx + 1}. ${r.table} ➔ ${r.count} registros`);
        });
        console.log("==================================================");
        console.log(`Total tablas con datos: ${results.length}`);
        db.detach();
    });
});
