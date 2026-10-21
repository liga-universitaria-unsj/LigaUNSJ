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

// Resultado de un partido de llave: si empataron, "penales" dice quién ganó ("local" o "visitante").
// goles null/null = borrar el resultado
export async function guardarResultadoLlave(id, golesLocal, golesVisitante, penales) {
  const cambios = golesLocal === null
    ? { goles_local: null, goles_visitante: null, penales_ganador: null, estado: "programado" }
    : {
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        penales_ganador: golesLocal === golesVisitante ? (penales || null) : null,
        estado: "jugado",
      };
  return ok(await db.from("partidos").update(cambios).eq("id", id));
}

// ---------- Jugadores, estadísticas y suspensiones ----------

// Busca al jugador en el equipo o lo crea. Devuelve su id.
export async function asegurarJugador(equipoId, apellido, nombre) {
  return ok(await db.rpc("asegurar_jugador", { p_equipo: equipoId, p_apellido: apellido, p_nombre: nombre }));
}

export async function corregirJugador(id, apellido, nombre) {
  return ok(await db.rpc("corregir_jugador", { p_id: id, p_apellido: apellido, p_nombre: nombre }));
}

// Guarda los TOTALES del jugador en el torneo. Lo que se manda como null no se modifica;
// si los tres totales quedan en 0, el jugador se quita de las tablas.
export async function cargarEstadistica({ temporadaId, divisionId, equipoId, apellido, nombre, goles = null, amarillas = null, rojas = null }) {
  return ok(await db.rpc("cargar_estadistica", {
    p_temporada: temporadaId, p_division: divisionId, p_equipo: equipoId,
    p_apellido: apellido, p_nombre: nombre,
    p_goles: goles, p_amarillas: amarillas, p_rojas: rojas,
  }));
}

export async function crearSancion(datos) { return ok(await db.from("sanciones").insert(datos)); }
export async function actualizarSancion(id, cambios) { return ok(await db.from("sanciones").update(cambios).eq("id", id)); }
export async function borrarSancion(id) { return ok(await db.from("sanciones").delete().eq("id", id)); }
