// backend/scripts/seed_test_roles.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE key not set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('──────────────────────────────────────────────────');
    console.log(' SEEDING TEST ACCOUNTS FOR HIGH-FIDELITY ROLES    ');
    console.log('──────────────────────────────────────────────────');

    // 1. Resolve Garza Company ID
    const { data: companies, error: compErr } = await supabase
      .from('enterprise_companies')
      .select('id')
      .eq('company_code', 'GARZA')
      .single();

    if (compErr || !companies) {
      console.error('Error: Garza company not found in enterprise_companies. Make sure you applied 008/009 migrations.', compErr);
      process.exit(1);
    }
    const garzaCompanyId = companies.id;
    console.log(`Found Garza Company ID: ${garzaCompanyId}`);

    // Helper to create user
    const createUser = async (name, email, password, role) => {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Check if user already exists
      const { data: existing } = await supabase
        .from('crm_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        console.log(`User already exists: ${email} (updating role)`);
        await supabase
          .from('crm_users')
          .update({ role, company_id: garzaCompanyId })
          .eq('email', email);
        return existing.id;
      }

      const { data, error } = await supabase
        .from('crm_users')
        .insert([
          {
            name,
            email,
            password_hash: passwordHash,
            role,
            company_id: garzaCompanyId
          }
        ])
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${email}:`, error);
        return null;
      }

      console.log(`Successfully created: ${email} [Role: ${role}]`);
      return data.id;
    };

    // 2. Create the Roles
    const superAdminId = await createUser(
      'Gerente Garza (Super Admin)',
      'superadmin@garza.com',
      'superadminpassword123',
      'super_admin'
    );

    const supervisorId = await createUser(
      'Supervisor Garza',
      'supervisor@garza.com',
      'supervisorpassword123',
      'supervisor'
    );

    const sistemasId = await createUser(
      'IT Soporte Sistemas',
      'sistemas@garza.com',
      'sistemaspassword123',
      'sistemas'
    );

    const salesId = await createUser(
      'Vendedor Uno',
      'sales@garza.com',
      'salespassword123',
      'sales'
    );

    // 3. Link Sales User to Supervisor
    if (salesId && supervisorId) {
      console.log(`Linking Vendedor sales@garza.com to Supervisor...`);
      const { error: linkErr } = await supabase
        .from('crm_users')
        .update({ supervisor_id: supervisorId })
        .eq('id', salesId);

      if (linkErr) {
        console.error('Error linking supervisor:', linkErr);
      } else {
        console.log('Successfully linked Vendedor with Supervisor! 🤝');
      }
    }

    console.log('──────────────────────────────────────────────────');
    console.log(' SEEDING COMPLETED successfully!');
    console.log(' Use these credentials in the login page:');
    console.log(' 💼 Super Admin: superadmin@garza.com / superadminpassword123');
    console.log(' 👥 Supervisor:  supervisor@garza.com / supervisorpassword123');
    console.log(' 🛠️ Sistemas:    sistemas@garza.com / sistemaspassword123');
    console.log(' 📞 Vendedor:    sales@garza.com / salespassword123');
    console.log('──────────────────────────────────────────────────');

  } catch (err) {
    console.error('Unexpected seed error:', err);
  }
}

run();
