import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const hasValidSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder') && !supabaseAnonKey.includes('placeholder'));

export const supabase = createClient(hasValidSupabaseConfig ? supabaseUrl : 'https://placeholder.supabase.co', hasValidSupabaseConfig ? supabaseAnonKey : 'placeholder-anon-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const isSupabaseConfigured = hasValidSupabaseConfig;
export const supabaseConfigError = 'Supabase is not configured yet. Create .env.local from .env.example and add your project URL, anon key, and admin password.';
export const bucketName = 'conference-media';
export const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
export const maxFileSize = 500 * 1024 * 1024;
