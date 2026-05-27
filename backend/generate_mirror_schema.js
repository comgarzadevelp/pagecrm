import firebird from 'node-firebird';
import fs from 'fs';
import path from 'path';

const dbPath = 'C:\\Users\\MARKETING\\SAE90EMPRE03.FDB';

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: dbPath,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

// Mapeo de tipos de datos de Firebird a PostgreSQL
const firebirdTypesMap = {
    7: 'INTEGER',            // SMALLINT
    8: 'INTEGER',            // INTEGER
    10: 'REAL',              // FLOAT
    12: 'DATE',              // DATE
    13: 'TIME',              // TIME
    14: 'TEXT',              // CHAR
    16: 'NUMERIC',           // BIGINT o NUMERIC según escala
    27: 'DOUBLE PRECISION',  // DOUBLE PRECISION
    35: 'TIMESTAMPTZ',       // TIMESTAMP
    37: 'TEXT',              // VARCHAR
    261: 'TEXT'              // BLOB (generalmente texto/memo en SAE)
};

firebird.attach(options, function(err, db) {
    if (err) {
        console.error('Error al conectar a Firebird:', err.message);
        process.exit(1);
    }

    console.log('Conectado a Firebird. Extrayendo metadatos de las 200+ tablas...');

    // Consulta para obtener todas las columnas de todas las tablas no-sistema
    const query = `
        SELECT 
            TRIM(rf.rdb$relation_name) AS table_name,
            TRIM(rf.rdb$field_name) AS column_name,
            f.rdb$field_type AS field_type,
            f.rdb$field_scale AS field_scale
        FROM 
            rdb$relation_fields rf
            JOIN rdb$fields f ON rf.rdb$field_source = f.rdb$field_name
            JOIN rdb$relations r ON rf.rdb$relation_name = r.rdb$relation_name
        WHERE 
            r.rdb$system_flag = 0 AND
            r.rdb$view_blr IS NULL
        ORDER BY 
            rf.rdb$relation_name, rf.rdb$field_position
    `;

    db.query(query, function(err, columns) {
        if (err) {
            console.error('Error al obtener metadatos:', err.message);
            db.detach();
            process.exit(1);
        }

        console.log(`Se encontraron ${columns.length} columnas en total.`);

        // Agrupar columnas por tabla
        const tables = {};
        columns.forEach(col => {
            const tName = col.table_name.toLowerCase();
            const colName = col.column_name.toLowerCase();
            
            if (!tables[tName]) {
                tables[tName] = [];
            }
            
            let pgType = firebirdTypesMap[col.field_type] || 'TEXT';
            
            // Si es un INT64/NUMERIC con escala, es un número decimal (por ejemplo importes monetarios)
            if (col.field_type === 16 && col.field_scale < 0) {
                pgType = 'NUMERIC';
            }

            tables[tName].push({
                name: colName,
                type: pgType
            });
        });

        const tableNames = Object.keys(tables);
        console.log(`Total de tablas detectadas: ${tableNames.length}`);

        let sqlOutput = `-- =============================================================\n`;
        sqlOutput += `-- REPLICA ESPEJO COMPLETA DE TODAS LAS TABLAS ASPEL SAE (${tableNames.length} TABLAS)\n`;
        sqlOutput += `-- Generado automáticamente: ${new Date().toISOString()}\n`;
        sqlOutput += `-- =============================================================\n\n`;

        tableNames.forEach(tName => {
            sqlOutput += `-- ─────────────────────────────────────────────────────────────\n`;
            sqlOutput += `-- TABLA ESPEJO: ${tName}\n`;
            sqlOutput += `-- ─────────────────────────────────────────────────────────────\n`;
            sqlOutput += `DROP TABLE IF EXISTS ${tName} CASCADE;\n\n`;
            sqlOutput += `CREATE TABLE ${tName} (\n`;

            const columnDefs = tables[tName].map(col => {
                let def = `  ${col.name} ${col.type}`;
                
                // Intentar poner Primary Key a campos clave comunes
                if (col.name === 'clave' || col.name === 'cve_art' || col.name === 'cve_vend' || col.name === 'num_reg') {
                    // No ponemos PRIMARY KEY automáticamente a todo para evitar fallos si hay duplicados históricos,
                    // excepto en los que sabemos que son únicos e importantes, o los dejamos sin PK para réplica libre.
                }
                return def;
            });

            sqlOutput += columnDefs.join(',\n');
            sqlOutput += `\n);\n\n`;
            sqlOutput += `ALTER TABLE ${tName} DISABLE ROW LEVEL SECURITY;\n\n`;
        });

        const outputPath = path.join('migrations', '005_sae_mirror.sql');
        fs.writeFileSync(outputPath, sqlOutput);
        console.log(`\n¡Esquema SQL de las ${tableNames.length} tablas generado con éxito en: ${outputPath}`);
        
        db.detach();
    });
});
