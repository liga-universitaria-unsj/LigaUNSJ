// Piezas de la estructura general: menú lateral, pestañas e inicio.
// Cada función devuelve texto HTML; no toca la pantalla directamente.
import { esc, nombreTemporada } from "../util.js";

export function htmlMenu({ divisiones, activa }) {
  const items = divisiones.map((d) => `
    <a class="menu__item${d.codigo === activa ? " activo" : ""}" href="#/division/${esc(d.codigo)}"
       style="--color:${esc(d.color || "#7a8499")}">
      <span class="punto"></span>${esc(d.nombre)}
    </a>`).join("");

  const pronto = ["Copa Challenger", "Campeones"].map((n) =>
    `<span class="menu__item deshabilitado">${esc(n)}<em>Pronto</em></span>`).join("");

  return `<div class="menu__divisiones">${items}</div><div class="menu__separador"></div>${pronto}`;
}

// Pestañas de cada división (las que no están listas se muestran apagadas)
export function htmlTabs({ codigo }) {
  const pronto = ["Copas", "Tabla anual", "Goleadores", "Tarjetas", "Suspensiones"]
    .map((t) => `<span class="tab deshabilitada" aria-disabled="true">${t}</span>`).join("");
  return `<nav class="tabs"><a class="tab activa" href="#/division/${esc(codigo)}">Posiciones y fixture</a>${pronto}</nav>`;
}

export function htmlInicio({ liga, divisiones, temporada }) {
  const tarjetas = divisiones.map((d) => `
    <a class="tarjeta-division" href="#/division/${esc(d.codigo)}" style="--color:${esc(d.color || "#7a8499")}">
      <strong>${esc(d.nombre)}</strong>
      <span>Posiciones y fixture →</span>
    </a>`).join("");

  return `
    <section class="inicio">
      <img src="/logo.png" alt="" class="inicio__logo">
      <h2>${esc(liga.nombre)}</h2>
      ${temporada ? `<p class="inicio__torneo">${esc(nombreTemporada(temporada))}</p>` : ""}
      <div class="tarjetas">${tarjetas}</div>
    </section>`;
}
