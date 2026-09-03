import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Guard estrito contra execução no lado do cliente (navegador).
// O service_role ignora RLS e NUNCA pode ser disponibilizado ao client.
if (typeof window !== 'undefined') {
  throw new Error(
    'VIOLAÇÃO DE SEGURANÇA: supabaseAdmin jamais deve ser executado no navegador (client-side)! ' +
    'Este cliente possui privilégios de service_role que ignoram o RLS. Utilize exclusivamente em Route Handlers ou Server Components.'
  )
}

// CAUTION: This client uses the service role key, bypassing RLS.
// Use ONLY in secure server contexts (Route Handlers, Server Actions).
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
