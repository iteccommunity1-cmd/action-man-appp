import { supabase } from '@/integrations/supabase/client';

// This file now simply re-exports the supabase client from the canonical integrations file.
// All other files importing from '@/lib/supabaseClient' will continue to work without changes.
export { supabase };