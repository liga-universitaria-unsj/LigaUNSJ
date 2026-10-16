import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const configuracionCompleta = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Si falta la configuración, db queda en null y la app muestra un aviso claro
export const db = configuracionCompleta ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
