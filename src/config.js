// Variables de entorno de Vite (archivo .env en tu computadora y variables de Netlify).
// La clave "publishable" de Supabase es pública por diseño: la seguridad real la dan
// las reglas (RLS) de la base de datos.
const env = import.meta.env ?? {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = env.VITE_SUPABASE_KEY;
export const ADMIN_EMAIL  = env.VITE_ADMIN_EMAIL ?? "";   // opcional: email que aparece ya escrito al entrar
