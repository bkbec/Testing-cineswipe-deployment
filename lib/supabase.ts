
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client initialization.
 * 
 * We use a publishable anonymous key to avoid the "Forbidden use of secret API key" error.
 * The URL and Key are fetched from process.env with fallbacks for local development.
 */

// Safe access to process.env for browser environments
const getEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch (e) {
    // Ignore error if process is not defined
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://grbqgwtwtafvoqsqymof.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_KPNg0y59-5Az5Ni_v5AuXA_UnNxp1Jx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
