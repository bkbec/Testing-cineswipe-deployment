import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://grbqgwtwtafvoqsqymof.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_secret_QrlS6zoLBykitl1jOfaZNA_iaeglrCA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);