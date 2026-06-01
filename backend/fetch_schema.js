import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/`;
  const headers = {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
  };

  try {
    const res = await fetch(url, { headers });
    const schema = await res.json();
    console.log('--- TABLES IN PRIMARY DATABASE ---');
    console.log(Object.keys(schema.definitions || {}));
  } catch (err) {
    console.error('Error fetching primary schema:', err);
  }

  const saeUrl = `${process.env.SAE_SUPABASE_URL}/rest/v1/`;
  const saeHeaders = {
    'apikey': process.env.SAE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SAE_SUPABASE_ANON_KEY}`
  };

  try {
    const res = await fetch(saeUrl, { headers: saeHeaders });
    const schema = await res.json();
    console.log('--- TABLES IN SAE DATABASE ---');
    const saeTables = Object.keys(schema.definitions || {});
    console.log('Total tables:', saeTables.length);
    console.log('Sample tables:', saeTables.slice(0, 20));
  } catch (err) {
    console.error('Error fetching SAE schema:', err);
  }
}

run();
