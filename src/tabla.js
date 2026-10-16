// Tabla de posiciones. Función "pura": recibe datos y devuelve la tabla, sin tocar la pantalla.
//   equipos    → los equipos de UNA zona
//   partidos   → los partidos de esa zona (los que no tienen goles cargados no cuentan)
//   descuentos → [{ equipo_id, puntos }] sanciones de puntos
// Orden: puntos, diferencia de gol, goles a favor (igual que en la web del equipo).

export function calcularTabla(equipos, partidos, descuentos = []) {
  const filas = new Map(
    equipos.map((e) => [e.id, { equipo: e, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, desc: 0 }])
  );

  for (const m of partidos) {
    if (m.goles_local == null || m.goles_visitante == null) continue;
    const L = filas.get(m.local_id);
    const V = filas.get(m.visitante_id);
    if (!L || !V) continue;

    L.pj++; V.pj++;
    L.gf += m.goles_local;     L.gc += m.goles_visitante;
    V.gf += m.goles_visitante; V.gc += m.goles_local;

    if (m.goles_local > m.goles_visitante)      { L.g++; V.p++; L.pts += 3; }
    else if (m.goles_local < m.goles_visitante) { V.g++; L.p++; V.pts += 3; }
    else                                        { L.e++; V.e++; L.pts += 1; V.pts += 1; }
  }

  for (const d of descuentos) {
    const f = filas.get(d.equipo_id);
    if (f) { f.pts -= d.puntos; f.desc += d.puntos; }
  }

  const lista = [...filas.values()];
  lista.forEach((f) => { f.dg = f.gf - f.gc; });

  return lista.sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.nombre.localeCompare(b.equipo.nombre, "es"));
}
