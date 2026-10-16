// Fixture de una división, agrupado por fecha y por zona
import { esc, escudo, formatoFecha, formatoHora } from "../util.js";

const marcador = (p, admin, L, V) => {
  const jugado = p.goles_local != null && p.goles_visitante != null;
  if (admin) {
    return `<input class="gol gol-l" type="number" min="0" inputmode="numeric" value="${jugado ? p.goles_local : ""}" aria-label="Goles ${esc(L?.nombre)}">
            <span>-</span>
            <input class="gol gol-v" type="number" min="0" inputmode="numeric" value="${jugado ? p.goles_visitante : ""}" aria-label="Goles ${esc(V?.nombre)}">`;
  }
  return jugado ? `<b>${p.goles_local} - ${p.goles_visitante}</b>` : `<span class="vs">vs</span>`;
};

function cuando(p) {
  if (!p.fecha) return "Fecha a confirmar";
  const f = formatoFecha(p.fecha);
  return p.hora ? `${f} · ${formatoHora(p.hora)}` : `${f} · horario a confirmar`;
}

function htmlPartido(p, porId, admin) {
  const L = porId.get(p.local_id), V = porId.get(p.visitante_id);
  const etiquetas = [
    p.nota_publica ? `<span class="nota">📌 ${esc(p.nota_publica)}</span>` : "",
    p.estado === "suspendido" ? `<span class="etiqueta">Suspendido</span>` : "",
    p.estado === "walkover" ? `<span class="etiqueta">W.O.</span>` : "",
  ].join("");

  return `<div class="partido" data-id="${esc(p.id)}">
    <div class="partido__cuando">
      <span>${esc(cuando(p))}${p.cancha ? ` · ${esc(p.cancha)}` : ""}</span>
      ${admin ? `<button class="mini" data-accion="reprogramar" data-id="${esc(p.id)}" title="Cambiar día, hora o cancha">✏️</button>` : ""}
    </div>
    <div class="cruce">
      <span class="eq eq--local"><span>${esc(L?.nombre ?? "—")}</span>${escudo(L, 22)}</span>
      <span class="marcador">${marcador(p, admin, L, V)}</span>
      <span class="eq eq--visita">${escudo(V, 22)}<span>${esc(V?.nombre ?? "—")}</span></span>
    </div>
    ${etiquetas ? `<div class="partido__etiquetas">${etiquetas}</div>` : ""}
  </div>`;
}

// Orden estable dentro de cada fecha: por día, hora y nombre del local
const orden = (porId) => (a, b) =>
  (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999") ||
  (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99") ||
  (porId.get(a.local_id)?.nombre ?? "").localeCompare(porId.get(b.local_id)?.nombre ?? "", "es");

export function htmlFixture({ equipos, partidos, admin = false }) {
  if (!partidos.length) return `<p class="vacio">Todavía no hay partidos cargados.</p>`;

  const porId = new Map(equipos.map((e) => [e.id, e]));
  const fechas = [...new Set(partidos.map((p) => p.nro_fecha))].sort((a, b) => a - b);

  const tarjetas = fechas.map((n) => {
    const deLaFecha = partidos.filter((p) => p.nro_fecha === n);
    const dias = new Set(deLaFecha.map((p) => p.fecha ?? ""));
    const resumen = dias.size === 1 && !dias.has("") ? formatoFecha([...dias][0]) : (dias.size === 1 ? "" : "varios días");

    const zonas = [...new Set(deLaFecha.map((p) => p.zona))].sort();
    const bloques = zonas.map((zona) => {
      const lista = deLaFecha.filter((p) => p.zona === zona).sort(orden(porId));
      const jugaron = new Set(lista.flatMap((p) => [p.local_id, p.visitante_id]));
      const libres = equipos.filter((e) => e.zona === zona && !jugaron.has(e.id)).map((e) => e.nombre);
      return `
        ${zonas.length > 1 ? `<div class="zona-titulo">Zona ${esc(zona)}</div>` : ""}
        ${lista.map((p) => htmlPartido(p, porId, admin)).join("")}
        ${libres.length ? `<div class="libre">Libre: ${libres.map(esc).join(", ")}</div>` : ""}`;
    }).join("");

    return `<div class="tarjeta fecha">
      <h3>Fecha ${n}${resumen ? ` <small>${esc(resumen)}</small>` : ""}
        ${admin ? `<button class="mini" data-accion="reprogramar-fecha" data-fecha="${n}" title="Asignar día o postergar toda la fecha">📅 Fecha completa</button>` : ""}
      </h3>
      ${bloques}
    </div>`;
  }).join("");

  return `<section class="fixture"><h2 class="seccion">Fixture</h2><div class="fechas">${tarjetas}</div></section>`;
}
