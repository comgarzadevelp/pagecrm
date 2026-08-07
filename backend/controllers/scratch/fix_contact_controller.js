
import fs from 'fs';
let content = fs.readFileSync('contactController.js', 'utf8');
content = content.replace(
  /if \\(role === 'sales'\\) \\{\\s*query = query\\.eq\\('created_by', userId\\);\\s*\\}/,
  \if (role === 'sales') {
      query = query.or('created_by.eq.' + userId + ',notes.ilike.%sae_clave%');
    }\
);
fs.writeFileSync('contactController.js', content);

