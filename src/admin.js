// Acciones del administrador. La base de datos las rechaza si quien las pide no es administrador.
import { db } from "./supabase.js";

const ok = ({ error, data }) => { if (error) throw error; return data; };

// goles null/null = borrar el resultado
export async function guardarResultado(id, golesLocal, golesVisitante) {
  const cambios = golesLocal === null
    ? { goles_local: null, goles_visitante: null, estado: "programado" }
    : { goles_local: golesLocal, goles_visitante: golesVisitante, estado: "jugado" };
  return ok(await db.from("partidos").update(cambios).eq("id", id));
}

// Cambia día y hora de uno o varios partidos y deja registro del motivo (no toca los ya jugados)
export async function reprogramar(ids, fecha, hora, motivo) {
  return ok(await db.rpc("reprogramar_partidos", { p_ids: ids, p_fecha: fecha, p_hora: hora, p_motivo: motivo }));
}

export async function actualizarCancha(id, cancha) {
  return ok(await db.from("partidos").update({ cancha }).eq("id", id));
}
