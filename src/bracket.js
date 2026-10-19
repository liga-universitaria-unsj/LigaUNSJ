// Dibujo del cuadro de llaves (sirve para la Challenger y para las copas de oro y plata).
// Recibe el resultado de layoutBracket() y devuelve HTML; no toca la pantalla.
import { esc, escudo, fechaCorta, formatoHora } from "../util.js";

function cuando(p, sinPenales) {
  if (sinPenales) return "⚠ definir penales";
  const partes = [p.fecha ? fechaCorta(p.fecha) : "", p.hora ? formatoHora(p.hora) : "", p.cancha ?? ""].filter(Boolean);
  return partes.length ? partes.join(" · ") : "A confirmar";
}

// Una fila de equipo dentro de la tarjeta de un partido
function filaEquipo(p, lado, divisiones) {
  const L = p[lado];
  const goles = lado === "local" ? p.goles_local : p.goles_visitante;
  const gano = p.lado === lado;
  const perdio = Boolean(p.lado) && !gano;
  const empate = p.jugado && p.goles_local === p.goles_visitante;
  const porPenales = empate && p.penales_ganador === lado;

  const nombre = L.equipo
    ? `${escudo(L.equipo, 18)}<span class="nom">${esc(L.equipo.nombre)}${L.provisorio ? '<sup class="prov" title="Posición provisoria">*</sup>' : ""}</span>`
    : `<span class="nom tbd">${esc(L.etiqueta)}</span>`;
  const div = L.equipo && divisiones ? divisiones.get(L.equipo.id) : null;
  const insignia = div ? `<span class="dv" style="--c:${esc(div.color)}" title="${esc(div.nombre)}">${esc(div.codigo)}</span>` : "";

  return `<div class="meq${gano ? " gano" : ""}${perdio ? " perdio" : ""}">
    ${insignia}${nombre}
    <span class="gol-final">${p.jugado ? goles : ""}${porPenales ? '<small title="Ganó por penales">p</small>' : ""}</span>
  </div>`;
}

function htmlCard(n, { admin, divisiones, anchoCard, altoCard }) {
  const p = n.p;
  const sinPenales = p.jugado && p.goles_local === p.goles_visitante && !p.lado;
  return `<div class="mcard${p.jugado ? " jugado" : ""}${sinPenales ? " sin-pen" : ""}"
      data-id="${esc(p.id)}" data-codigo="${esc(p.codigo)}"
      style="left:${n.x}px;top:${n.y - altoCard / 2}px;width:${anchoCard}px;height:${altoCard}px">
    <div class="mcab">
      <span class="cod">${esc(p.codigo)}</span>
      <span class="cuando">${esc(cuando(p, sinPenales))}</span>
      ${admin ? `<button class="mini" data-accion="editar-llave" data-id="${esc(p.id)}" title="Resultado, día, hora y cancha">✏️</button>` : ""}
    </div>
    ${filaEquipo(p, "local", divisiones)}
    ${filaEquipo(p, "visitante", divisiones)}
  </div>`;
}

// clave: nombre para recordar el zoom de este cuadro (ej. "challenger", "oro")
// divisiones: Map idEquipo → { codigo, color, nombre } para mostrar la insignia A/B/C (opcional)
export function htmlBracket(layout, { clave, admin = false, divisiones = null } = {}) {
  if (!layout.nodos.length) return "";
  const { anchoCard, altoCard } = layout;

  const columnas = layout.columnas.map((c) => `
    <div class="bcol" style="left:${c.x}px;width:${anchoCard}px"><strong>${esc(c.titulo)}</strong>${c.fecha ? `<span>${esc(c.fecha)}</span>` : ""}</div>`).join("");
  const lineas = layout.enlaces.map((e) => `<path d="M${e.x1} ${e.y1} H${e.xm} V${e.y2} H${e.x2}"/>`).join("");
  const tarjetas = layout.nodos.map((n) => htmlCard(n, { admin, divisiones, anchoCard, altoCard })).join("");

  return `<div class="bracket-bloque" data-clave="${esc(clave)}">
    <div class="zoom">
      <button class="mini" data-zoom="-" aria-label="Achicar el cuadro">−</button>
      <button class="mini" data-zoom="+" aria-label="Agrandar el cuadro">+</button>
      <button class="mini" data-zoom="ajustar">Ajustar al ancho</button>
    </div>
    <div class="bracket-vista" data-ancho="${layout.ancho}" data-alto="${layout.alto}">
      <div class="bracket-escala">
        <div class="bracket" style="width:${layout.ancho}px;height:${layout.alto}px">
          <svg class="bracket__lineas" width="${layout.ancho}" height="${layout.alto}" aria-hidden="true">${lineas}</svg>
          ${columnas}${tarjetas}
        </div>
      </div>
    </div>
  </div>`;
}
