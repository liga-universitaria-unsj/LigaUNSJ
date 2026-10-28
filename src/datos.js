// Lectura de datos desde Supabase
import { db } from "./supabase.js";

const o = (r) => { if (r.error) throw r.error; return r.data; };

export async function cargarBase() {
  const [divisiones, temporadas] = await Promise.all([
    db.from("divisiones").select("*").order("orden"),
    db.from("temporadas").select("*").order("anio", { ascending: false }).order("torneo", { ascending: false }),
  ]);
  return { divisiones: o(divisiones), temporadas: o(temporadas) };
}

// Todo lo que necesita la pantalla de una división en un torneo
export async function cargarDivision(temporadaId, divisionId) {
  const pedirInscripciones = (columnas) => db.from("inscripciones").select(columnas)
    .eq("temporada_id", temporadaId).eq("division_id", divisionId);

  // "descalificado" se agrega con 06_fase4.sql; si todavía no se ejecutó, se sigue sin esa columna
  let insc = await pedirInscripciones("zona, descalificado, equipos(id, nombre, slug, escudo_url)");
  if (insc.error && /descalificado/.test(insc.error.message ?? "")) {
    insc = await pedirInscripciones("zona, equipos(id, nombre, slug, escudo_url)");
  }

  const [partidos, descuentos] = await Promise.all([
    db.from("partidos").select("*")
      .eq("temporada_id", temporadaId).eq("division_id", divisionId).eq("fase", "grupos"),
    db.from("descuentos_puntos").select("equipo_id, puntos, motivo")
      .eq("temporada_id", temporadaId).eq("division_id", divisionId),
  ]);

  return {
    equipos: o(insc).map((r) => ({ ...r.equipos, zona: r.zona, descalificado: Boolean(r.descalificado) })),
    partidos: o(partidos),
    descuentos: o(descuentos),
  };
}

// Partidos de la Copa de Oro y de Plata de una división
export async function cargarCopas(temporadaId, divisionId) {
  return o(await db.from("partidos").select("*")
    .eq("temporada_id", temporadaId).eq("division_id", divisionId).in("fase", ["oro", "plata"]));
}

// Copa Challenger (el torneo más reciente), con todos los equipos y la división de cada uno
export async function cargarChallenger(temporadaId) {
  const torneos = o(await db.from("torneos_especiales").select("*")
    .ilike("nombre", "%challenger%").order("anio", { ascending: false }).limit(1));
  if (!torneos.length) return null;

  const [partidos, equipos, inscripciones] = await Promise.all([
    db.from("partidos").select("*").eq("torneo_especial_id", torneos[0].id),
    db.from("equipos").select("id, nombre, slug, escudo_url"),
    temporadaId
      ? db.from("inscripciones").select("equipo_id, division_id").eq("temporada_id", temporadaId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  return { torneo: torneos[0], partidos: o(partidos), equipos: o(equipos), inscripciones: o(inscripciones) };
}

// ---------- Goleadores, tarjetas y suspensiones ----------

// Totales por jugador en un torneo (goles, amarillas y rojas), con el jugador y el equipo
export async function cargarEstadisticas(temporadaId, divisionId) {
  return o(await db.from("estadisticas_jugador")
    .select("jugador_id, equipo_id, goles, amarillas, rojas, jugadores(id, apellido, nombre), equipos(id, nombre, slug, escudo_url)")
    .eq("temporada_id", temporadaId).eq("division_id", divisionId));
}

// Suspensiones de una división. El público solo recibe las vigentes (lo decide la base);
// el administrador recibe todas.
export async function cargarSanciones(divisionId) {
  return o(await db.from("sanciones")
    .select("id, jugador_id, equipo_id, causa, articulo, tipo, partidos_total, partidos_cumplidos, hasta, activa, creado_en, jugadores(id, apellido, nombre), equipos(id, nombre, slug, escudo_url)")
    .eq("division_id", divisionId).order("creado_en", { ascending: false }));
}

// Jugadores ya cargados de los equipos de una división (y los que no tienen equipo), para el autocompletado
export async function cargarJugadores(equipoIds) {
  const ids = equipoIds.length ? `equipo_id.in.(${equipoIds.join(",")}),equipo_id.is.null` : "equipo_id.is.null";
  return o(await db.from("jugadores").select("id, apellido, nombre, equipo_id").or(ids).order("apellido").limit(5000));
}

// ---------- Campeones y camino al título ----------

// Historial de campeones de todas las divisiones, más la lista de equipos para mostrar sus nombres
export async function cargarCampeones() {
  const [campeones, equipos] = await Promise.all([
    db.from("campeones").select("*"),
    db.from("equipos").select("id, nombre, slug, escudo_url"),
  ]);
  return { campeones: o(campeones), equipos: o(equipos) };
}

// Final de campeones y Superfinal de una división en un año (están dentro del torneo Clausura)
export async function cargarTitulo(temporadaId, divisionId) {
  return o(await db.from("partidos").select("*")
    .eq("temporada_id", temporadaId).eq("division_id", divisionId).in("fase", ["finalistas", "superfinal"]));
}
