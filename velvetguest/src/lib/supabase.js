import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vugscppmartquxqbsryl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Z3NjcHBtYXJ0cXV4cWJzcnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjUxNTMsImV4cCI6MjA5NTY0MTE1M30.FvGfjQpDAWUpL7OzOaRh9SW0pnSnuDSoMBzIzQKKSUk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
