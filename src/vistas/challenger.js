// Pantalla de la Copa Challenger: encabezado, buscador de equipo, cuadro y fixture por día
import { esc, escudo, formatoFechaLarga, formatoHora, normalizar } from "../util.js";
import { numeroCodigo } from "../llaves.js";
import { htmlBracket } from "./bracket.js";

const sinTildes = (t) => normalizar(t).replace(/[^a-z0-9]+/g, "-");

const insignia = (equipo, divisiones) => {
  const d = equipo && divisiones?.get(equipo.id);
  return d ? `<span class="dv" style="--c:${esc(d.color)}" title="${esc(d.nombre)}">${esc(d.codigo)}</span>` : "";
};

// ---------- Buscador de equipos ----------
// Devuelve los equipos que coinciden con lo escrito (si coincide exacto con uno, solo ese)
export function buscarEquipos(texto, equipos) {
  const t = normalizar(texto);
  if (!t) return [];
  const exacto = equipos.filter((e) => normalizar(e.nombre) === t);
  if (exacto.length) return exacto;
  return equipos.filter((e) => normalizar(e.nombre).includes(t));
}

// Texto del rival en un partido
const rivalDe = (p, equipoId) => {
  const otro = p.local.equipo?.id === equipoId ? p.visitante : p.local;
  return otro.equipo?.nombre ?? otro.etiqueta;
};

const cuandoLargo = (p) => {
  if (!p.fecha) return "fecha a confirmar";
  return `${formatoFechaLarga(p.fecha)}${p.hora ? ` · ${formatoHora(p.hora)}` : ""}${p.cancha ? ` · cancha ${p.cancha}` : ""}`;
};

// Panel con el primer partido y el camino posible de un equipo
export function htmlCamino({ equipo, camino, divisiones }) {
  const titulo = `<div class="camino__equipo">${escudo(equipo, 28)}<strong>${esc(equipo.nombre)}</strong>${insignia(equipo, divisiones)}</div>`;
  if (!camino) return `<div class="camino">${titulo}<p class="ayuda">No tiene partidos en la Copa Challenger.</p></div>`;

  const primero = camino.partidos[0];
  const pasos = camino.partidos.map((p, i) => {
    const jugado = p.jugado && p.lado;
    const resultado = jugado ? ` <b>${p.goles_local}-${p.goles_visitante}</b>` : "";
    const marca = jugado ? (p.perdedor?.id === equipo.id ? "perdio" : "gano") : "";
    return `<li class="${marca}"><span class="cod">${esc(p.codigo)}</span>
      <span><b>${esc(p.ronda)}</b> · vs ${esc(rivalDe(p, equipo.id))}${resultado}<br><small>${esc(cuandoLargo(p))}</small></span></li>`;
  }).join("");

  const estado = camino.campeon ? `<p class="camino__estado ok">🏆 ¡Campeón de la Copa Challenger!</p>`
    : camino.eliminadoEn ? `<p class="camino__estado">Quedó eliminado en ${esc(camino.eliminadoEn)}.</p>` : "";

  return `<div class="camino">${titulo}
    <p class="ayuda" style="margin:6px 0">Primer partido: <b>${esc(primero.codigo)}</b> · ${esc(cuandoLargo(primero))}</p>
    <ol class="camino__lista">${pasos}</ol>${estado}
    <p class="ayuda">El camino sigue los cruces si el equipo va ganando.</p></div>`;
}

// ---------- Fixture por día ----------
const clasePill = (cancha) => {
  const k = sinTildes(cancha);
  return k === "rugby" ? "pill pill--rugby" : k === "futbol" ? "pill pill--futbol" : "pill";
};

function filaPartido(p, divisiones, admin) {
  const lado = (l) => {
    const L = p[l];
    const perdio = Boolean(p.lado) && p.lado !== l;
    const nombre = L.equipo ? esc(L.equipo.nombre) : `<em class="tbd">${esc(L.etiqueta)}</em>`;
    return `<span class="fc-eq${perdio ? " perdedor" : ""}">${insignia(L.equipo, divisiones)}${nombre}</span>`;
  };
  const penal = p.jugado && p.goles_local === p.goles_visitante && p.lado
    ? `<small class="pen">pen. ${esc(p[p.lado].equipo?.nombre ?? "")}</small>` : "";
  const marcador = p.jugado ? `<b class="fc-marc">${p.goles_local}–${p.goles_visitante}</b>${penal}` : `<span class="vs">vs</span>`;
  const llave = p.llave ? ` · ${esc(p.llave.replace(/^Llave (\d+)$/, "Llave $1 equipos"))}` : "";

  return `<div class="fila-chal" data-codigo="${esc(p.codigo)}">
    <div class="fc-hora">${p.hora ? esc(formatoHora(p.hora)) : "—"}</div>
    <div class="fc-cancha">${p.cancha ? `<span class="${clasePill(p.cancha)}">${esc(p.cancha)}</span>` : ""}</div>
    <div class="fc-cuerpo">
      <div class="fc-cruce">${lado("local")} ${marcador} ${lado("visitante")}</div>
      <div class="fc-meta">${esc(p.codigo)} · ${esc(p.ronda)}${llave}${p.cancha ? ` · ${esc(p.cancha)}` : ""}</div>
    </div>
    ${admin ? `<button class="mini" data-accion="editar-llave" data-id="${esc(p.id)}" title="Resultado, día, hora y cancha">✏️</button>` : ""}
  </div>`;
}

export function htmlFixtureChallenger(resueltos, divisiones, admin) {
  const ordenados = [...resueltos].sort((a, b) =>
    (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999") || (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99") || numeroCodigo(a.codigo) - numeroCodigo(b.codigo));
  const dias = [...new Set(ordenados.map((p) => p.fecha ?? ""))];
  return dias.map((dia) => `
    <h3 class="dia">${dia ? esc(formatoFechaLarga(dia)) : "Fecha a confirmar"}</h3>
    <div class="tarjeta dia-lista">${ordenados.filter((p) => (p.fecha ?? "") === dia).map((p) => filaPartido(p, divisiones, admin)).join("")}</div>`).join("");
}

// ---------- Pantalla completa ----------
export function htmlChallenger({ torneo, resueltos, layout, divisiones, divisionesLista, equipos, admin, busqueda = "" }) {
  const leyenda = divisionesLista.map((d) =>
    `<span class="dv" style="--c:${esc(d.color)}">${esc(d.codigo)}</span> ${esc(d.nombre)}`).join(" &nbsp; ");
  const opciones = equipos.map((e) => `<option value="${esc(e.nombre)}"></option>`).join("");

  return `
    <section class="challenger">
      <header class="chal-cab">
        ${torneo.logo_url ? `<img src="${esc(torneo.logo_url)}" alt="" class="chal-logo">` : ""}
        <div>
          ${torneo.organizador ? `<small>${esc(torneo.organizador)}</small>` : ""}
          <h2>${esc(torneo.nombre)} ${esc(torneo.anio)}</h2>
        </div>
      </header>
      <p class="leyenda">${leyenda} &nbsp;|&nbsp; <span class="pill pill--rugby">Rugby</span> <span class="pill pill--futbol">Fútbol</span> cancha</p>

      <div class="buscador">
        <label for="buscar-equipo">Buscá tu equipo para ver tu primer partido y el camino posible hasta la final</label>
        <input id="buscar-equipo" type="search" placeholder="Buscar equipo…" list="lista-equipos" autocomplete="off" value="${esc(busqueda)}">
        <datalist id="lista-equipos">${opciones}</datalist>
        <div id="camino"></div>
      </div>

      ${htmlBracket(layout, { clave: "challenger", admin, divisiones })}

      <h3 class="seccion">Fixture</h3>
      <p class="ayuda">Todos los partidos por día.</p>
      ${htmlFixtureChallenger(resueltos, divisiones, admin)}
    </section>`;
}
