import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values if environment variables are not set
const SUPABASE_URL_FALLBACK = "https://oepwmwwykdqiszzaietf.supabase.co";
const SUPABASE_ANON_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lcHdtd3d5a2RxaXN6emFpZXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjY3ODYsImV4cCI6MjA4NDYwMjc4Nn0.el1TnWxmxxZHJwwfCwD6Tvbx-K8OZ7f2yw7orDksSdw";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is not defined. Please check your environment variables or the hardcoded fallback values.");
  // In a production app, you might want to throw an error or handle this more gracefully.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);