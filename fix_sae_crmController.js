import fs from 'fs';

const filePath = 'backend/controllers/crmController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace in getCustomerDetails
content = content.replace(
  /const isGarza = req\.user\?\.companyCode === 'GARZA';\s*if \(isGarza\) \{\s*const \{ data: client \} = await saeSupabase\s*\.from\('clie03'\)/g,
  "const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });\n          if (saeObj.saeClient) {\n            const { data: client } = await saeObj.saeClient\n              .from(clie\)"
);

// Replace in getSaeVendors
content = content.replace(
  /const \{ data, error \} = await saeSupabase\s*\.from\('vend03'\)/g,
  "const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });\n    const { data, error } = await (saeObj.saeClient)\n      .from(end\)"
);

// Replace in getContacts (contac03)
content = content.replace(
  /const \{ data: saeConts \} = await saeSupabase\s*\.from\('contac03'\)/g,
  "const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });\n        const { data: saeConts } = await (saeObj.saeClient)\n          .from(contac\)"
);

// Replace in getContacts (clie03)
content = content.replace(
  /const isGarza = req\.user\?\.companyCode === 'GARZA';\s*if \(isGarza\) \{\s*const \{ data: client \} = await saeSupabase\s*\.from\('clie03'\)/g,
  "const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });\n        if (saeObj.saeClient) {\n          const { data: client } = await saeObj.saeClient\n            .from(clie\)"
);

// Replace in syncSaeCompanyToCrm
content = content.replace(
  /const isGarza = req\.user\?\.companyCode === 'GARZA';\s*if \(!isGarza\) return null;\s*const \{ data: client, error: clientError \} = await saeSupabase\s*\.from\('clie03'\)/g,
  "const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });\n    if (!saeObj.saeClient) return null;\n\n    const { data: client, error: clientError } = await saeObj.saeClient\n      .from(clie\)"
);

// Replace in searchSaeCompanies
content = content.replace(
  /const isGarza = req\.user\?\.companyCode === 'GARZA';\s*if \(!isGarza\) \{\s*return res\.json\(\{ success: true, companies: \[\] \}\);\s*\}\s*const \{ data: saeData, error: saeError \} = await saeSupabase\s*\.from\('clie03'\)/g,
  "const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });\n    if (!saeObj.saeClient) {\n      return res.json({ success: true, companies: [] });\n    }\n\n    const { data: saeData, error: saeError } = await saeObj.saeClient\n      .from(clie\)"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed saeSupabase references in crmController.js');
