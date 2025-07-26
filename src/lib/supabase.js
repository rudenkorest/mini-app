import { createClient } from '@supabase/supabase-js';

// Замініть ці значення на ваші власні з Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 