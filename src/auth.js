// Sesión del administrador de la liga
import { db } from "./supabase.js";
import { ADMIN_EMAIL } from "./config.js";
import { formulario } from "./modal.js";

const CLAVE_EMAIL = "liga-email";

// Estado de la sesión que consulta el resto de la app
export const sesion = { admin: false };

// Lee el rol del usuario con sesión. Devuelve true si cambió el estado de administrador.
async function aplicarSesion(s) {
  const antes = sesion.admin;
  sesion.admin = false;
  if (s) {
    const { data } = await db.from("perfiles").select("rol").eq("user_id", s.user.id).maybeSingle();
    sesion.admin = data?.rol === "admin_liga";
  }
  return antes !== sesion.admin;
}

// La sesión queda guardada en el navegador: al recargar sigue adentro
export async function iniciarAuth(alCambiar) {
  const { data } = await db.auth.getSession();
  await aplicarSesion(data.session);

  db.auth.onAuthStateChange((_evento, s) => {
    // setTimeout evita bloquear a Supabase si hacemos consultas dentro de este aviso
    setTimeout(async () => { if (await aplicarSesion(s)) alCambiar(); }, 0);
  });
}

export async function ingresar() {
  const guardado = localStorage.getItem(CLAVE_EMAIL) || ADMIN_EMAIL;
  const datos = await formulario({
    titulo: "Administrador de la liga",
    ok: "Entrar",
    campos: [
      { nombre: "email", etiqueta: "Email", tipo: "email", valor: guardado, requerido: true, autocomplete: "username", foco: !guardado },
      { nombre: "password", etiqueta: "Contraseña", tipo: "password", requerido: true, autocomplete: "current-password", foco: Boolean(guardado) },
    ],
  });
  if (!datos) return false;

  const email = datos.email.trim();
  const { data, error } = await db.auth.signInWithPassword({ email, password: datos.password });
  if (error) { alert("No se pudo iniciar sesión: " + error.message); return false; }

  await aplicarSesion(data.session);
  if (!sesion.admin) {
    await db.auth.signOut();
    await aplicarSesion(null);
    alert("Esa cuenta no es de administrador de la liga.");
    return false;
  }
  localStorage.setItem(CLAVE_EMAIL, email);
  return true;
}

export async function salir() {
  await db.auth.signOut();
  await aplicarSesion(null);
}
