// Tablas de posiciones de una división (una por zona)
import { esc, escudo } from "../util.js";
import { calcularTabla } from "../tabla.js";

// Marca de la fila según el puesto: oro (dorado) o plata (plateado)
function claseFila(puesto, formato) {
  if (formato.oro && puesto <= formato.oro) return "oro";
  if (formato.plata && puesto >= formato.plata[0] && puesto <= formato.plata[1]) return "plata";
  return "";
}

function htmlTabla(filas, formato) {
  const cuerpo = filas.map((f, i) => `
    <tr class="${claseFila(i + 1, formato)}">
      <td class="pos">${i + 1}</td>
      <td class="n"><span class="equipo">${escudo(f.equipo, 22)}<span>${esc(f.equipo.nombre)}${f.equipo.descalificado ? ' <small class="tag-vencida">descalificado</small>' : ""}</span></span></td>
      <td>${f.pj}</td><td>${f.g}</td><td>${f.e}</td><td>${f.p}</td><td>${f.dg}</td>
      <td><b>${f.pts}</b>${f.desc ? `<sup class="desc" title="Descuento de ${f.desc} punto(s)">−${f.desc}</sup>` : ""}</td>
    </tr>`).join("");

  return `<table class="tabla">
    <thead><tr><th>#</th><th class="n">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr></thead>
    <tbody>${cuerpo}</tbody>
  </table>`;
}

export function htmlPosiciones({ formato = {}, equipos, partidos, descuentos }) {
  if (!equipos.length) return `<p class="vacio">Todavía no hay equipos cargados en esta división.</p>`;

  const zonas = [...new Set(equipos.map((e) => e.zona))].sort();
  const tarjetas = zonas.map((zona) => {
    // Se pasan todos los partidos: los que no son de esta zona se ignoran y los interzonales suman
    const filas = calcularTabla(equipos.filter((e) => e.zona === zona), partidos, descuentos);
    const titulo = zona === "Única" ? "Posiciones" : `Posiciones · Zona ${esc(zona)}`;
    return `<div class="tarjeta"><h3>${titulo}</h3>${htmlTabla(filas, formato)}</div>`;
  }).join("");

  const leyenda = formato.oro
    ? `<p class="leyenda">
         <span class="marca oro"></span> Copa de Oro (1º a ${formato.oro}º)
         ${formato.plata ? `<span class="marca plata"></span> Copa de Plata (${formato.plata[0]}º a ${formato.plata[1]}º)` : ""}
       </p>`
    : "";

  return `<section class="posiciones"><div class="tablas">${tarjetas}</div>${leyenda}</section>`;
}
