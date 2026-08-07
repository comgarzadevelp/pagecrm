require("dotenv").config({ path: "Z:\\Diseño V2\\GARZA\\06-GarzaPage\\backend\\.env" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from("crm_opportunities")
  .select("description")
  .eq("id", "9c9ebc03-b4bd-4f92-b6b8-1ffc59f4b23b")
  .single()
  .then(r => {
    console.log(r.data.description);
    process.exit(0);
  });
