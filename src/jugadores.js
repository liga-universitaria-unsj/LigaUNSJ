// Lógica de jugadores, goleadores, tarjetas y suspensiones.
// Son funciones "puras" (sin pantalla), por eso se pueden probar con  node pruebas/probar.mjs
import { normalizar, formatoFechaNumerica } from "./util.js";

// "PÉREZ, JUAN"
export const nombreJugador = (j) => (j ? `${j.apellido}, ${j.nombre}` : "—");

// Mismo criterio que usa la base de datos para no duplicar jugadores:
// sin tildes, sin mayúsculas y con espacios simples
export const claveJugador = (apellido, nombre) => normalizar(`${apellido} ${nombre}`).replace(/\s+/g, " ");

// "Pérez, Juan Carlos" → { apellido: "Pérez", nombre: "Juan Carlos" }. Devuelve null si falta alguno de los dos.
export function parsearJugador(texto) {
  const t = String(texto ?? "");
  const i = t.indexOf(",");
  if (i < 0) return null;
  const apellido = t.slice(0, i).trim().replace(/\s+/g, " ");
  const nombre = t.slice(i + 1).trim().replace(/\s+/g, " ");
  return apellido && nombre ? { apellido, nombre } : null;
}

const porNombre = (a, b) => nombreJugador(a.jugadores).localeCompare(nombreJugador(b.jugadores), "es");

// Agrega la posición, compartida cuando hay empate: 1, 2, 2, 4...
export function conPosicion(filas, valorDe) {
  let ultimo, posicion = 0;
  return filas.map((f, i) => {
    const v = valorDe(f);
    if (i === 0 || v !== ultimo) { posicion = i + 1; ultimo = v; }
    return { ...f, pos: posicion };
  });
}

// Goleadores: de más a menos goles (a igual cantidad, por apellido)
export const ordenarGoleadores = (stats) =>
  stats.filter((s) => s.goles > 0).sort((a, b) => b.goles - a.goles || porNombre(a, b));

// Tarjetas: una fila por jugador y tipo de tarjeta. Primero las rojas, luego las amarillas;
// dentro de cada tipo, de más a menos. filtro: "todas" | "roja" | "amarilla"
export function filasTarjetas(stats, filtro = "todas") {
  const filas = [];
  for (const s of stats) {
    if (s.rojas > 0 && filtro !== "amarilla") filas.push({ ...s, tipo: "roja", cantidad: s.rojas });
    if (s.amarillas > 0 && filtro !== "roja") filas.push({ ...s, tipo: "amarilla", cantidad: s.amarillas });
  }
  const orden = { roja: 0, amarilla: 1 };
  return filas.sort((a, b) => orden[a.tipo] - orden[b.tipo] || b.cantidad - a.cantidad || porNombre(a, b));
}

// Si una suspensión está vigente y el texto de detalle que se muestra debajo de la causa
export function estadoSancion(s, hoy = new Date().toISOString().slice(0, 10)) {
  const vencida = !s.activa || Boolean(s.hasta && s.hasta < hoy);
  let detalle = "";
  if (s.tipo === "partidos" && s.partidos_total) {
    detalle = `Cumplió ${s.partidos_cumplidos ?? 0} de ${s.partidos_total} partido${s.partidos_total === 1 ? "" : "s"}`;
  } else if (s.tipo === "hasta_fecha" && s.hasta) {
    detalle = `Hasta el ${formatoFechaNumerica(s.hasta)}`;
  } else if (s.tipo === "de_por_vida") {
    detalle = "De por vida";
  }
  return { vigente: !vencida, detalle };
}
