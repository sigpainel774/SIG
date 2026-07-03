import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// CAUTION: This client uses the service role key, bypassing RLS.
// Use ONLY in secure server contexts (Route Handlers, Server Actions).
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
