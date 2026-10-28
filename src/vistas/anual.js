// Pestaña "Tabla anual" de una división
import { esc, escudo } from "../util.js";

export function htmlAnual({ anio, resultado, torneos }) {
  const { filas, descalificados } = resultado;
  const faltan = ["apertura", "clausura"].filter((t) => !torneos.includes(t));
  const aviso = faltan.length
    ? `<p class="aviso-pie">Todavía no hay datos del ${faltan.map((t) => (t === "apertura" ? "Apertura" : "Clausura")).join(" ni del ")} ${esc(anio)}: la tabla suma solo lo que está cargado.</p>` : "";

  if (!filas.length) {
    return `<section class="anual"><h2 class="seccion">Tabla anual ${esc(anio)}</h2>${aviso}<p class="vacio">Todavía no hay equipos ni resultados cargados.</p></section>`;
  }

  const cuerpo = filas.map((f) => `
    <tr class="${f.pos === 1 ? "lider" : ""}">
      <td class="pos">${f.pos}${f.empate ? "<sup title=\"Empate en puntos y goles a favor\">=</sup>" : ""}</td>
      <td class="n"><span class="equipo">${escudo(f.equipo, 22)}<span>${esc(f.equipo.nombre)}${f.torneos < 2 ? '<sup class="prov" title="Jugó un solo torneo en esta división">*</sup>' : ""}</span></span></td>
      <td>${f.ptsApertura}</td><td>${f.ptsClausura}</td>
      <td>${f.pj}</td><td>${f.g}</td><td>${f.e}</td><td>${f.p}</td><td>${f.gf}</td>
      <td><b>${f.pts}</b></td>
    </tr>`).join("");

  const hayUnTorneo = filas.some((f) => f.torneos < 2);
  const hayEmpate = filas.some((f) => f.empate);

  return `<section class="anual">
    <h2 class="seccion">Tabla anual ${esc(anio)}</h2>
    <p class="ayuda">Suma los puntos de la fase de zonas del Apertura y del Clausura (no cuentan playoffs ni copas). Desempata por goles a favor.
      El 1º de la tabla juega la Superfinal.</p>
    ${aviso}
    <div class="tarjeta"><table class="tabla">
      <thead><tr><th>#</th><th class="n">Equipo</th><th title="Puntos del Apertura">Apertura</th><th title="Puntos del Clausura">Clausura</th>
        <th>PJ</th><th>G</th><th>E</th><th>P</th><th title="Goles a favor">GF</th><th>Pts</th></tr></thead>
      <tbody>${cuerpo}</tbody></table></div>
    <p class="aviso-pie">${hayUnTorneo ? '<span class="prov">*</span> Jugó un solo torneo en esta división. ' : ""}${hayEmpate ? "<b>=</b> Empate en puntos y goles a favor: lo define la liga. " : ""}
      Los puntos se calculan con los resultados cargados.</p>
    ${descalificados.length ? `<p class="aviso-pie">Descalificados (no cuentan en la tabla): ${descalificados.map((e) => esc(e.nombre)).join(", ")}.</p>` : ""}
  </section>`;
}
