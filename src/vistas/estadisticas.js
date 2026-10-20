// Pestañas Goleadores, Tarjetas y Suspensiones de una división.
// Cada función devuelve HTML; no toca la pantalla directamente.
import { esc, escudo, normalizar } from "../util.js";
import { nombreJugador, conPosicion, ordenarGoleadores, filasTarjetas, estadoSancion } from "../jugadores.js";

const celdaEquipo = (e) => e
  ? `<span class="equipo">${escudo(e, 20)}<span>${esc(e.nombre)}</span></span>`
  : `<span class="tbd">—</span>`;

// Texto con el que se busca en la fila (jugador + equipo, sin tildes)
const textoBuscable = (fila) => esc(normalizar(`${nombreJugador(fila.jugadores)} ${fila.equipos?.nombre ?? ""}`));

function barra({ filtro, placeholder, acciones = "" }) {
  return `<div class="stats-barra">
    <input id="filtro-jugadores" type="search" placeholder="${esc(placeholder)}" value="${esc(filtro)}" autocomplete="off" aria-label="${esc(placeholder)}">
    ${acciones}
  </div>`;
}

const botonEditar = (accion, id) =>
  `<td class="acc"><button class="mini" data-accion="${accion}" data-jugador="${esc(id)}" title="Editar">✏️</button></td>`;

// ---------- Goleadores ----------
export function htmlGoleadores({ stats, admin = false, filtro = "" }) {
  const filas = conPosicion(ordenarGoleadores(stats), (f) => f.goles);
  const acciones = admin ? `<button data-accion="cargar-goles">＋ Cargar goles</button>` : "";

  const cuerpo = filas.map((f) => `
    <tr data-buscar="${textoBuscable(f)}">
      <td class="pos">${f.pos}</td>
      <td class="n"><strong>${esc(nombreJugador(f.jugadores))}</strong></td>
      <td class="n">${celdaEquipo(f.equipos)}</td>
      <td><b>${f.goles}</b></td>
      ${admin ? botonEditar("editar-goles", f.jugador_id) : ""}
    </tr>`).join("");

  return `<section class="estadisticas">
    <h2 class="seccion">Goleadores</h2>
    ${barra({ filtro, placeholder: "Buscar jugador o equipo…", acciones })}
    ${filas.length ? `<div class="tarjeta"><table class="tabla">
      <thead><tr><th>#</th><th class="n">Jugador</th><th class="n">Equipo</th><th>Goles</th>${admin ? "<th></th>" : ""}</tr></thead>
      <tbody>${cuerpo}</tbody></table></div>` : `<p class="vacio">Todavía no hay goleadores cargados.</p>`}
  </section>`;
}

// ---------- Tarjetas ----------
const ETIQUETA_TARJETA = {
  roja: `<span class="tj tj--roja"><i></i>Roja</span>`,
  amarilla: `<span class="tj tj--amarilla"><i></i>Amarilla</span>`,
};

export function htmlTarjetas({ stats, admin = false, filtro = "", tipo = "todas" }) {
  const filas = filasTarjetas(stats, tipo);
  const chips = [["todas", "Todas"], ["amarilla", "Amarillas"], ["roja", "Rojas"]].map(([valor, texto]) =>
    `<button class="chip${tipo === valor ? " activo" : ""}" data-filtro-tarjeta="${valor}">${texto}</button>`).join("");
  const acciones = `<div class="chips-filtro">${chips}</div>${admin ? `<button data-accion="cargar-tarjetas">＋ Cargar tarjetas</button>` : ""}`;

  const cuerpo = filas.map((f) => `
    <tr data-buscar="${textoBuscable(f)}">
      <td class="n"><strong>${esc(nombreJugador(f.jugadores))}</strong></td>
      <td class="n">${celdaEquipo(f.equipos)}</td>
      <td>${ETIQUETA_TARJETA[f.tipo]}</td>
      <td><b>${f.cantidad}</b></td>
      ${admin ? botonEditar("editar-tarjetas", f.jugador_id) : ""}
    </tr>`).join("");

  return `<section class="estadisticas">
    <h2 class="seccion">Tarjetas</h2>
    ${barra({ filtro, placeholder: "Buscar jugador o equipo…", acciones })}
    ${filas.length ? `<div class="tarjeta"><table class="tabla">
      <thead><tr><th class="n">Jugador</th><th class="n">Equipo</th><th>Tarjeta</th><th>Cantidad</th>${admin ? "<th></th>" : ""}</tr></thead>
      <tbody>${cuerpo}</tbody></table></div>` : `<p class="vacio">Todavía no hay tarjetas cargadas.</p>`}
    <p class="ayuda">Las suspensiones por tarjetas rojas las define la liga y se publican en la pestaña Suspensiones.</p>
  </section>`;
}

// ---------- Suspensiones ----------
export function htmlSuspensiones({ sanciones, admin = false, filtro = "", hoy }) {
  const filas = [...sanciones]
    .map((s) => ({ ...s, ...estadoSancion(s, hoy) }))
    .sort((a, b) => Number(b.vigente) - Number(a.vigente) || nombreJugador(a.jugadores).localeCompare(nombreJugador(b.jugadores), "es"));
  const acciones = admin ? `<button data-accion="cargar-sancion">＋ Cargar suspensión</button>` : "";

  const cuerpo = filas.map((s) => `
    <tr class="${s.vigente ? "" : "vencida"}" data-buscar="${textoBuscable(s)}">
      <td class="n"><strong>${esc(nombreJugador(s.jugadores))}</strong></td>
      <td class="n">${celdaEquipo(s.equipos)}</td>
      <td class="n causa">${esc(s.causa)}${s.detalle ? `<br><small>${esc(s.detalle)}</small>` : ""}
        ${!s.vigente ? `<br><small class="tag-vencida">${s.activa ? "Vencida" : "Dada de baja"}</small>` : ""}</td>
      ${admin ? `<td class="acc">
        <button class="mini" data-accion="editar-sancion" data-id="${esc(s.id)}" title="Editar">✏️</button>
        <button class="mini" data-accion="toggle-sancion" data-id="${esc(s.id)}" title="${s.activa ? "Dar de baja (cumplida)" : "Volver a activar"}">${s.activa ? "✔" : "↩"}</button>
        <button class="mini" data-accion="borrar-sancion" data-id="${esc(s.id)}" title="Borrar">🗑</button>
      </td>` : ""}
    </tr>`).join("");

  return `<section class="estadisticas">
    <h2 class="seccion">Suspensiones</h2>
    ${barra({ filtro, placeholder: "Buscar jugador o equipo…", acciones })}
    ${filas.length ? `<div class="tarjeta"><table class="tabla">
      <thead><tr><th class="n">Jugador</th><th class="n">Equipo</th><th class="n">Causa</th>${admin ? "<th></th>" : ""}</tr></thead>
      <tbody>${cuerpo}</tbody></table></div>` : `<p class="vacio">No hay suspensiones vigentes.</p>`}
    ${admin ? `<p class="ayuda">Solo vos ves las suspensiones vencidas o dadas de baja (en gris). El público ve únicamente las vigentes.</p>` : ""}
  </section>`;
}
