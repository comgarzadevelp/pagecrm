
import fs from 'fs';
let content = fs.readFileSync('companyController.js', 'utf8');

// 1. Remove saeSupabase import
content = content.replace(/import \{ supabase, saeSupabase \} from '\.\.\/supabaseClient\.js';/, import { supabase } from '../supabaseClient.js';);

// We'll just replace the whole file since it's easier to maintain and clean. 

