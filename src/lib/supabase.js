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

// Se lee antes de crear el cliente: Supabase limpia el hash de la URL al procesar el enlace
// del correo, y la pantalla de restablecer contraseña solo debe abrirse desde ese enlace.
export const arrivedViaRecoveryLink =
  typeof window !== 'undefined' && /(^|[#&])type=recovery(&|$)/.test(window.location.hash)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
