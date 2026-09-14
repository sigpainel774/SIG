import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nijjizpcodnjhvqwjuso.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamppenBjb2Ruamh2cXdqdXNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAzNTA1NCwiZXhwIjoyMDk4NjExMDU0fQ.tV7OHgq8HiMHQrqdZO78b7wO9XDFhCJauc2JhlRyGj0'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  const { data, error } = await supabaseAdmin.from('emaee_especialidades_vinculadas').select('*').limit(1)
  console.log('Result vinculos:', { data, error })
}

run()
