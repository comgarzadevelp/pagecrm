import { createClient } from '@supabase/supabase-js';

// MTY Instance (Usar las variables existentes en el proyecto real)
export const supabaseMTY = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// GDL Instance (Añadidas en .env)
export const supabaseGDL = createClient(
  import.meta.env.VITE_SUPABASE_GDL_URL,
  import.meta.env.VITE_SUPABASE_GDL_ANON_KEY
);
