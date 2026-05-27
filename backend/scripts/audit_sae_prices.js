/**
 * Audit SAE Price Structure
 * Inspects precios03, precio_x_prod03, clie03 to understand
 * how price lists / convenios are structured.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sae = createClient(
  process.env.SAE_SUPABASE_URL,
  process.env.SAE_SUPABASE_SERVICE_ROLE_KEY
);

async function audit() {
  console.log('\n════════════════════════════════════════════════');
  console.log('  AUDITORÍA DE ESTRUCTURA DE PRECIOS SAE');
  console.log('════════════════════════════════════════════════\n');

  // 1. precios03 — All price lists
  console.log('─── 1. TABLA precios03 (Listas de Precios) ───');
  const { data: allPriceLists, error: e1 } = await sae
    .from('precios03')
    .select('*')
    .order('cve_precio', { ascending: true });
  
  if (e1) { console.error('Error precios03:', e1); return; }
  
  console.log(`Total registros: ${allPriceLists?.length || 0}`);
  if (allPriceLists && allPriceLists.length > 0) {
    console.log('Columnas:', Object.keys(allPriceLists[0]).join(', '));
    console.log('\nDatos completos:');
    allPriceLists.forEach(pl => {
      console.log(JSON.stringify(pl));
    });
  }

  // 2. precio_x_prod03 — Sample of product prices per list
  console.log('\n─── 2. TABLA precio_x_prod03 (Precios por Producto y Lista) ───');
  const { data: samplePrices, error: e2 } = await sae
    .from('precio_x_prod03')
    .select('*')
    .limit(5);
  
  if (e2) { console.error('Error precio_x_prod03:', e2); return; }
  
  if (samplePrices && samplePrices.length > 0) {
    console.log('Columnas:', Object.keys(samplePrices[0]).join(', '));
    console.log('Muestra (5 registros):');
    samplePrices.forEach(p => console.log(JSON.stringify(p)));
  }

  // Count unique cve_precio values in precio_x_prod03
  const { data: uniquePriceKeys, error: e2b } = await sae
    .from('precio_x_prod03')
    .select('cve_precio')
    .gt('precio', 0);
  
  if (!e2b && uniquePriceKeys) {
    const uniqueKeys = [...new Set(uniquePriceKeys.map(p => p.cve_precio))].sort((a,b) => a-b);
    console.log(`\nClaves de precio únicas con precio > 0: [${uniqueKeys.join(', ')}]`);
    console.log(`Total registros con precio > 0: ${uniquePriceKeys.length}`);
  }

  // 3. clie03 — Sample clients with lista_prec values
  console.log('\n─── 3. TABLA clie03 — Clientes con lista_prec ───');
  const { data: sampleClients, error: e3 } = await sae
    .from('clie03')
    .select('clave, nombre, lista_prec, clasific, cve_vend, status')
    .eq('status', 'A')
    .limit(20);
  
  if (e3) { console.error('Error clie03:', e3); return; }
  
  if (sampleClients && sampleClients.length > 0) {
    console.log('Muestra de clientes activos:');
    sampleClients.forEach(c => {
      console.log(`  ${c.clave?.trim()} | ${c.nombre?.trim()?.substring(0, 40)} | lista_prec=${c.lista_prec} | clasific=${c.clasific?.trim()} | vend=${c.cve_vend?.trim()}`);
    });
  }

  // Unique lista_prec values across all active clients
  const { data: allClientsListaPrec, error: e4 } = await sae
    .from('clie03')
    .select('lista_prec')
    .eq('status', 'A');
  
  if (!e4 && allClientsListaPrec) {
    const uniqueListas = [...new Set(allClientsListaPrec.map(c => c.lista_prec))].sort((a,b) => a-b);
    console.log(`\nValores únicos de lista_prec en clientes activos: [${uniqueListas.join(', ')}]`);
  }

  // 4. Cross-reference: For a known client like DAVISA, show their lista_prec and matching precios03 entry
  console.log('\n─── 4. CROSS-REFERENCE: Clientes conocidos ───');
  const knownNames = ['DAVISA', 'RUBA', 'JAVER', 'CASITAS', 'BIENESTAR'];
  
  for (const name of knownNames) {
    const { data: matches } = await sae
      .from('clie03')
      .select('clave, nombre, lista_prec, clasific')
      .ilike('nombre', `%${name}%`)
      .eq('status', 'A')
      .limit(3);
    
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const listaCode = m.lista_prec;
        const { data: priceEntry } = await sae
          .from('precios03')
          .select('*')
          .eq('cve_precio', listaCode)
          .maybeSingle();
        
        console.log(`  ${name}: clave=${m.clave?.trim()} | nombre=${m.nombre?.trim()?.substring(0,40)} | lista_prec=${listaCode} => precios03: ${priceEntry ? JSON.stringify(priceEntry) : 'NO ENCONTRADO'}`);
      }
    } else {
      console.log(`  ${name}: No se encontraron clientes con ese nombre.`);
    }
  }

  // 5. Show a sample product with ALL its prices across lists
  console.log('\n─── 5. EJEMPLO: Precios de un producto en todas las listas ───');
  const { data: sampleArt } = await sae
    .from('precio_x_prod03')
    .select('cve_art')
    .limit(1);
  
  if (sampleArt && sampleArt.length > 0) {
    const artKey = sampleArt[0].cve_art;
    console.log(`Producto: ${artKey?.trim()}`);
    
    const { data: artPrices } = await sae
      .from('precio_x_prod03')
      .select('cve_precio, precio')
      .eq('cve_art', artKey)
      .order('cve_precio', { ascending: true });
    
    if (artPrices) {
      artPrices.forEach(ap => {
        const listName = allPriceLists?.find(pl => pl.cve_precio === ap.cve_precio);
        console.log(`  Lista ${ap.cve_precio} (${listName?.descripcion || '???'}): $${ap.precio}`);
      });
    }
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('  AUDITORÍA COMPLETADA');
  console.log('════════════════════════════════════════════════\n');
}

audit().catch(console.error);
