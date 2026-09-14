import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nijjizpcodnjhvqwjuso.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamppenBjb2Ruamh2cXdqdXNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAzNTA1NCwiZXhwIjoyMDk4NjExMDU0fQ.tV7OHgq8HiMHQrqdZO78b7wO9XDFhCJauc2JhlRyGj0'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  const payload = {
    vinculo_id: '00000000-0000-0000-0000-000000000000',
    data_atendimento: '2026-09-14',
    status: 'pendente'
  }
  
  const { data, error } = await supabaseAdmin
    .from('emaee_atendimentos_registros')
    .upsert(payload, { onConflict: 'vinculo_id,data_atendimento' })
    
  console.log('Result:', { data, error })
}

run()
