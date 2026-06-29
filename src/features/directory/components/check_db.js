
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../../../backend/database.sqlite');
db.all('SELECT id, name, alias, rfc FROM crm_companies WHERE name LIKE ''%OMNI%'' OR alias LIKE ''%OMNI%''', [], (err, rows) => {
  console.log('COMPANIES:', rows);
});
db.all('SELECT id, name, company, company_id FROM crm_contacts WHERE name LIKE ''%OMNI%'' OR company LIKE ''%OMNI%'' OR name = ''contacto nuevo'' OR name LIKE ''%Liliana%''', [], (err, rows) => {
  console.log('CONTACTS:', rows);
});
db.all('SELECT id, name, company, rfc, company_id FROM crm_customers WHERE name LIKE ''%OMNI%'' OR company LIKE ''%OMNI%''', [], (err, rows) => {
  console.log('CUSTOMERS:', rows);
});

