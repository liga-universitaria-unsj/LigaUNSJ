// Pestaña "Copas" de una división: Copa de Oro y Copa de Plata
import { esc } from "../util.js";
import { posicionesPorZona } from "../tabla.js";
import { resolverLlaves, layoutBracket } from "../llaves.js";
import { htmlBracket } from "./bracket.js";

const TITULOS = { oro: "Copa de Oro", plata: "Copa de Plata" };

// Prepara los cuadros de cada copa (también los usa main.js para saber los nombres al editar)
export function prepararCopas({ partidos, equipos, grupos, descuentos }) {
  const { posiciones, zonaCompleta } = posicionesPorZona(equipos, grupos, descuentos);
  const mapa = new Map(equipos.map((e) => [e.id, e]));
  const resultado = {};
  for (const fase of ["oro", "plata"]) {
    const delaFase = partidos.filter((p) => p.fase === fase);
    if (!delaFase.length) continue;
    const resueltos = resolverLlaves(delaFase, { equipos: mapa, posiciones, zonaCompleta });
    resultado[fase] = { resueltos, layout: layoutBracket(resueltos) };
  }
  return resultado;
}

export function htmlCopas({ division, formato = {}, copas, admin = false }) {
  if (!formato.copas) {
    return `<p class="vacio">El formato de copas de la ${esc(division.nombre)} se define más adelante con la liga.</p>`;
  }
  const fases = Object.keys(copas);
  if (!fases.length) return `<p class="vacio">Todavía no se crearon los cruces de las copas.</p>`;

  const hayProvisorios = fases.some((f) => copas[f].resueltos.some((p) => p.local.provisorio || p.visitante.provisorio));
  const nota = hayProvisorios
    ? `<p class="ayuda"><span class="prov">*</span> Cruces provisorios: se completan con la tabla actual hasta que terminen las zonas.</p>` : "";

  const bloques = fases.map((fase) => `
    <section class="copa">
      <h3 class="seccion">${TITULOS[fase]}</h3>
      ${htmlBracket(copas[fase].layout, { clave: `${division.codigo}-${fase}`, admin })}
    </section>`).join("");

  return `<div class="copas">${nota}${bloques}</div>`;
}
