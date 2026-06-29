import firebird from 'node-firebird';

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: 'C:\\Users\\MARKETING\\SAE90EMPRE05.FDB',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
};

firebird.attach(options, function(err, db) {
    if (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }

    db.query('SELECT rdb$relation_name FROM rdb$relations WHERE rdb$system_flag = 0', function(err, result) {
        if (err) {
            console.error('Query error:', err.message);
        } else {
            console.log(result.slice(0, 10).map(r => r.RDB$RELATION_NAME.trim()));
        }
        db.detach();
    });
});
