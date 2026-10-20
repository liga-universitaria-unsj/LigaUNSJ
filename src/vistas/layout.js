// Piezas de la estructura general: menú lateral, pestañas e inicio.
// Cada función devuelve texto HTML; no toca la pantalla directamente.
import { esc, nombreTemporada } from "../util.js";

export function htmlMenu({ divisiones, activa, vista }) {
  const items = divisiones.map((d) => `
    <a class="menu__item${vista === "division" && d.codigo === activa ? " activo" : ""}" href="#/division/${esc(d.codigo)}"
       style="--color:${esc(d.color || "#7a8499")}">
      <span class="punto"></span>${esc(d.nombre)}
    </a>`).join("");

  return `<div class="menu__divisiones">${items}</div>
    <div class="menu__separador"></div>
    <a class="menu__item${vista === "challenger" ? " activo" : ""}" href="#/challenger">Copa Challenger</a>
    <span class="menu__item deshabilitado">Campeones<em>Pronto</em></span>`;
}

// Pestañas de cada división (las que no están listas se muestran apagadas)
export function htmlTabs({ codigo, activa = "posiciones" }) {
  const pronto = ["Tabla anual", "Goleadores", "Tarjetas", "Suspensiones"]
    .map((t) => `<span class="tab deshabilitada" aria-disabled="true">${t}</span>`).join("");
  const c = esc(codigo);
  return `<nav class="tabs">
    <a class="tab${activa === "posiciones" ? " activa" : ""}" href="#/division/${c}">Posiciones y fixture</a>
    <a class="tab${activa === "copas" ? " activa" : ""}" href="#/division/${c}/copas">Copas</a>
    ${pronto}
  </nav>`;
}

export function htmlInicio({ liga, divisiones, temporada }) {
  const tarjetas = divisiones.map((d) => `
    <a class="tarjeta-division" href="#/division/${esc(d.codigo)}" style="--color:${esc(d.color || "#7a8499")}">
      <strong>${esc(d.nombre)}</strong>
      <span>Posiciones, fixture y copas →</span>
    </a>`).join("");

  return `
    <section class="inicio">
      <img src="/logo.png" alt="" class="inicio__logo">
      <h2>${esc(liga.nombre)}</h2>
      ${temporada ? `<p class="inicio__torneo">${esc(nombreTemporada(temporada))}</p>` : ""}
      <div class="tarjetas">
        ${tarjetas}
        <a class="tarjeta-division" href="#/challenger" style="--color:#b88a2e">
          <strong>Copa Challenger</strong>
          <span>Cuadro y fixture →</span>
        </a>
      </div>
    </section>`;
}
