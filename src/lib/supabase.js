import { createClient } from '@supabase/supabase-js'

// Las credenciales viven en variables de entorno (.env), nunca hardcodeadas en el código.
// La clave pública (anon/publishable) es segura de exponer en el navegador:
// la protección real son las políticas RLS configuradas en la base de datos.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Verifica tu archivo .env (ver .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
