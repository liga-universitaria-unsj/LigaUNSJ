// Campeones: historial por año y camino al título (final de campeones + Superfinal)
import { esc, escudo } from "../util.js";
import { htmlBracket } from "./bracket.js";

const TITULOS = [
  ["apertura", "Apertura"],
  ["clausura", "Clausura"],
  ["plata_apertura", "Copa de Plata Apertura"],
  ["plata_clausura", "Copa de Plata Clausura"],
  ["absoluto", "Campeón absoluto"],
];
export const TITULOS_CAMPEON = TITULOS;

const celda = (fila, equipos) => {
  if (!fila) return `<td class="tbd">—</td>`;
  const e = equipos.get(fila.equipo_id), s = fila.subcampeon_id ? equipos.get(fila.subcampeon_id) : null;
  return `<td class="n">${e ? `<span class="equipo">${escudo(e, 20)}<strong>${esc(e.nombre)}</strong></span>` : "—"}
    ${s ? `<br><small class="sub">Sub: ${esc(s.nombre)}</small>` : ""}</td>`;
};

// Historial de una división: una fila por año
export function htmlHistorial({ division, campeones, equipos, admin = false, titulo = "Historial de campeones" }) {
  const mapa = new Map(equipos.map((e) => [e.id, e]));
  const deLaDivision = campeones.filter((c) => c.division_id === division.id);
  const anios = [...new Set(deLaDivision.map((c) => c.anio))].sort((a, b) => b - a);

  const filas = anios.map((anio) => {
    const delAnio = deLaDivision.filter((c) => c.anio === anio);
    return `<tr>
      <td class="pos"><b>${anio}</b></td>
      ${TITULOS.map(([clave]) => celda(delAnio.find((c) => c.titulo === clave), mapa)).join("")}
      ${admin ? `<td class="acc"><button class="mini" data-accion="editar-campeones" data-anio="${anio}" title="Editar los campeones de ${anio}">✏️</button></td>` : ""}
    </tr>`;
  }).join("");

  return `<section class="historial">
    <h2 class="seccion">${esc(titulo)}</h2>
    ${admin ? `<div class="stats-barra"><button data-accion="editar-campeones" data-anio="">＋ Cargar campeones</button></div>` : ""}
    ${anios.length ? `<div class="tarjeta"><table class="tabla">
      <thead><tr><th>Año</th>${TITULOS.map(([, texto]) => `<th class="n">${texto}</th>`).join("")}${admin ? "<th></th>" : ""}</tr></thead>
      <tbody>${filas}</tbody></table></div>` : `<p class="vacio">Todavía no hay campeones cargados.</p>`}
  </section>`;
}

// Camino al título del año: quiénes llegan y cómo se define el campeón absoluto
export function htmlTitulo({ anio, estado, apertura, clausura, lider, liderDefinitivo, layout, admin = false, divisionCodigo, puedeRegistrar = false }) {
  const nombre = (e) => (e ? `<b>${esc(e.nombre)}</b>` : "<span class=\"tbd\">—</span>");
  return `<section class="titulo-panel">
    <h2 class="seccion">Camino al título ${esc(anio)}</h2>
    <div class="titulo-datos">
      <span>Campeón del Apertura: ${nombre(apertura)}</span>
      <span>Campeón del Clausura: ${nombre(clausura)}</span>
      <span>1º de la tabla anual${liderDefinitivo ? "" : " (provisorio)"}: ${nombre(lider)}</span>
    </div>
    <p class="titulo-estado">${esc(estado.texto)}</p>
    ${estado.campeon ? `<div class="campeon">🏆 Campeón absoluto ${esc(anio)}: ${esc(estado.campeon.nombre)}</div>` : ""}
    ${estado.mostrarLlave && layout ? htmlBracket(layout, { clave: `titulo-${divisionCodigo}`, admin }) : ""}
    ${admin && puedeRegistrar ? `<p><button data-accion="registrar-absoluto">🏆 Guardar a ${esc(estado.campeon.nombre)} como campeón absoluto ${esc(anio)} en el historial</button></p>` : ""}
  </section>`;
}

// Página "Campeones" del menú: el historial de las tres divisiones
export function htmlCampeonesGlobal({ divisiones, campeones, equipos }) {
  return divisiones.map((d) => `
    <div class="cabecera-division" style="--color:${esc(d.color || "#7a8499")}"><h2>${esc(d.nombre)}</h2></div>
    ${htmlHistorial({ division: d, campeones, equipos, admin: false, titulo: "Campeones" })}`).join("");
}
