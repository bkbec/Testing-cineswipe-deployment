
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client initialization.
 * 
 * We use a publishable anonymous key to avoid the "Forbidden use of secret API key" error.
 * The URL and Key are fetched from process.env with fallbacks to prevent initialization crashes.
 */

// Safe access to process.env for browser environments
const getEnv = (key: string): string => {
  try {
    // Check window.process first as it's our most reliable shim
    if (typeof window !== 'undefined' && (window as any).process?.env) {
      return (window as any).process.env[key] || '';
    }
    // Fallback to standard process if available
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch (e) {
    // Ignore error
  }
  return '';
};

// Default values point to the project, but we ensure they aren't empty/undefined strings
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://grbqgwtwtafvoqsqymof.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_KPNg0y59-5Az5Ni_v5AuXA_UnNxp1Jx';

// Ensure the client is only created if we have valid-looking strings
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
