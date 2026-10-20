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
  const [insc, partidos, descuentos] = await Promise.all([
    db.from("inscripciones").select("zona, equipos(id, nombre, slug, escudo_url)")
      .eq("temporada_id", temporadaId).eq("division_id", divisionId),
    db.from("partidos").select("*")
      .eq("temporada_id", temporadaId).eq("division_id", divisionId).eq("fase", "grupos"),
    db.from("descuentos_puntos").select("equipo_id, puntos, motivo")
      .eq("temporada_id", temporadaId).eq("division_id", divisionId),
  ]);

  return {
    equipos: o(insc).map((r) => ({ ...r.equipos, zona: r.zona })),
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
