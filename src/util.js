// Funciones chicas que usan todas las pantallas

// Evita que un texto de la base se interprete como código HTML
export const esc = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-10-17" → "sáb 17 oct"
export function formatoFecha(iso) {
  if (!iso) return "";
  const [anio, mes, dia] = iso.split("-").map(Number);
  return `${DIAS[new Date(anio, mes - 1, dia).getDay()]} ${dia} ${MESES[mes - 1]}`;
}

// "21:10:00" → "21:10"
export const formatoHora = (hora) => (hora ? String(hora).slice(0, 5) : "");

export const nombreTemporada = (t) => `${t.torneo === "apertura" ? "Apertura" : "Clausura"} ${t.anio}`;

export const entero = (valor) => Math.max(0, parseInt(valor, 10) || 0);

export function iniciales(nombre = "") {
  const palabras = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!palabras.length) return "?";
  return (palabras.length === 1 ? palabras[0].slice(0, 2) : palabras[0][0] + palabras[1][0]).toUpperCase();
}

// Escudo del equipo; si todavía no tiene imagen, se muestran sus iniciales
export function escudo(equipo, tamano = 24) {
  if (equipo?.escudo_url) {
    return `<img class="escudo" src="${esc(equipo.escudo_url)}" alt="" width="${tamano}" height="${tamano}" loading="lazy">`;
  }
  return `<span class="escudo escudo--ini" style="width:${tamano}px;height:${tamano}px;font-size:${Math.round(tamano * 0.4)}px">${esc(iniciales(equipo?.nombre))}</span>`;
}
