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
