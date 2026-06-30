import fs from 'fs';

const filePath = 'backend/controllers/crmController.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. getCustomerDetails
let block1 =         } else {
          const isGarza = req.user?.companyCode === 'GARZA';
          if (isGarza) {
            const { data: client } = await saeSupabase
              .from('clie03');
let replace1 =         } else {
          const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
          if (saeObj.saeClient) {
            const { data: client } = await saeObj.saeClient
              .from(\clie\\);
content = content.replace(block1, replace1);

// 2. getSaeVendors
let block2 =     // Consultar la tabla vend03 en la base de datos espejo de Supabase
    const { data, error } = await saeSupabase
      .from('vend03');
let replace2 =     // Consultar la tabla vend03 en la base de datos espejo de Supabase
    const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
    if (!saeObj.saeClient) return res.json({ success: true, vendors: [] });
    const { data, error } = await saeObj.saeClient
      .from(\end\\);
content = content.replace(block2, replace2);

// 3. getCustomers (search)
let block3 =       // 2. Buscar en Aspel SAE (si la empresa es GARZA)
      const saeCustomers = [];
      const isGarza = req.user?.companyCode === 'GARZA';

      let userSaeKey = null;
      if (role === 'sales' && userId) {
        const { data: userRec } = await supabase
          .from('crm_users')
          .select('sae_vendor_key')
          .eq('id', userId)
          .maybeSingle();
        if (userRec?.sae_vendor_key) {
          userSaeKey = userRec.sae_vendor_key.trim();
        }
      }

      if (isGarza) {
        const { data: saeData, error: saeError } = await saeSupabase
          .from('clie03');
let replace3 =       // 2. Buscar en Aspel SAE
      const saeCustomers = [];
      const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });

      let userSaeKey = null;
      if (role === 'sales' && userId) {
        const { data: userRec } = await supabase
          .from('crm_users')
          .select('sae_vendor_key')
          .eq('id', userId)
          .maybeSingle();
        if (userRec?.sae_vendor_key) {
          userSaeKey = userRec.sae_vendor_key.trim();
        }
      }

      if (saeObj.saeClient) {
        const { data: saeData, error: saeError } = await saeObj.saeClient
          .from(\clie\\);
content = content.replace(block3, replace3);

// 4. getCustomers (all)
let block4 =     let saeCustomers = [];
    const isGarza = req.user?.companyCode === 'GARZA';
    if (saeKey && isGarza) {
      const { data: saeData, error: saeError } = await saeSupabase
        .from('clie03');
let replace4 =     let saeCustomers = [];
    const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
    if (saeKey && saeObj.saeClient) {
      const { data: saeData, error: saeError } = await saeObj.saeClient
        .from(\clie\\);
content = content.replace(block4, replace4);

// 5. getContacts (contac03)
let block5 =       if (saeClave) {
        const { data: saeConts } = await saeSupabase
          .from('contac03');
let replace5 =       if (saeClave) {
        const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
        if (!saeObj.saeClient) return; // fail safe
        const { data: saeConts } = await saeObj.saeClient
          .from(\contac\\);
content = content.replace(block5, replace5);

// 6. getContacts (clie03)
let block6 =       } else {
        const isGarza = req.user?.companyCode === 'GARZA';
        if (isGarza) {
          const { data: client } = await saeSupabase
            .from('clie03');
let replace6 =       } else {
        const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
        if (saeObj.saeClient) {
          const { data: client } = await saeObj.saeClient
            .from(\clie\\);
content = content.replace(block6, replace6);

// 7. syncSaeCompanyToCrm
let block7 =     // 2. If not found in our CRM, fetch from SAE mirror clie03 and insert
    if (!customerData) {
      const { data: client, error: clientError } = await saeSupabase
        .from('clie03');
let replace7 =     // 2. If not found in our CRM, fetch from SAE mirror and insert
    if (!customerData) {
      const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
      if (!saeObj.saeClient) throw new Error('No SAE configuration for this user');
      const { data: client, error: clientError } = await saeObj.saeClient
        .from(\clie\\);
content = content.replace(block7, replace7);

// 8. searchSaeCompanies
let block8 =     const isGarza = req.user?.companyCode === 'GARZA';
    if (isGarza) {
      try {
        const { data: saeData, error: saeError } = await saeSupabase
          .from('clie03');
let replace8 =     const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
    if (saeObj.saeClient) {
      try {
        const { data: saeData, error: saeError } = await saeObj.saeClient
          .from(\clie\\);
content = content.replace(block8, replace8);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed saeSupabase static references in crmController.js');
