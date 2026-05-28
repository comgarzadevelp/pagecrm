import firebird from 'node-firebird';

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: 'C:\\Users\\MARKETING\\SAE90EMPRE01.FDB',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

firebird.attach(options, function(err, db) {
    if (err) {
        console.error("Connection error:", err.message);
        return;
    }

    db.query("SELECT TRIM(rdb$relation_name) AS table_name FROM rdb$relations WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL AND TRIM(rdb$relation_name) LIKE '%01'", function(err, res) {
        if (err) {
            console.error("Query error:", err.message);
            db.detach();
            return;
        }

        const tables = res.map(r => r.table_name);
        console.log(`Checking ${tables.length} tables...`);

        let index = 0;
        function checkNext() {
            if (index >= tables.length) {
                console.log("\nDone checking populated tables.");
                db.detach();
                return;
            }

            const table = tables[index];
            db.query(`SELECT COUNT(*) AS c FROM ${table}`, function(err, cnt) {
                if (!err && cnt && cnt[0] && cnt[0].c > 0) {
                    console.log(`   ➔ ${table}: ${cnt[0].c} records`);
                }
                index++;
                checkNext();
            });
        }

        checkNext();
    });
});
