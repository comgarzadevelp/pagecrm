import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('Querying crm_users...');
    const { data, error } = await supabase
      .from('crm_users')
      .select('*');

    if (error) {
      console.error('Error querying crm_users:', error);
      console.log('Attempting to create table or run migrations manually...');
      return;
    }

    console.log('Found users in crm_users:', data);

    if (data.length === 0) {
      console.log('No users found. Creating a default admin user...');
      const password = 'adminpassword123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const { data: insertData, error: insertError } = await supabase
        .from('crm_users')
        .insert([
          {
            name: 'Administrador Garza',
            email: 'admin@comercializadoragarza.com',
            password_hash: hash,
            role: 'admin'
          }
        ])
        .select();

      if (insertError) {
        console.error('Error inserting default user:', insertError);
      } else {
        console.log('Successfully created default user:', insertData);
        console.log('Credentials -> Email: admin@comercializadoragarza.com, Password: adminpassword123');
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
