// =====================================================================
//  Arranque de la aplicación: arma la estructura, maneja la navegación
//  y conecta los botones. La lógica de cada pantalla está en /vistas.
// =====================================================================
import "./styles/estilos.css";
import { db, configuracionCompleta } from "./supabase.js";
import { cargarBase, cargarDivision, cargarCopas, cargarChallenger } from "./datos.js";
import { sesion, iniciarAuth, ingresar, salir } from "./auth.js";
import * as admin from "./admin.js";
import { formulario } from "./modal.js";
import { LIGA, FORMATOS } from "./liga.js";
import { esc, nombreTemporada, formatoHora, entero } from "./util.js";
import { resolverLlaves, layoutBracket, caminoDe } from "./llaves.js";
import { htmlMenu, htmlTabs, htmlInicio } from "./vistas/layout.js";
import { htmlPosiciones } from "./vistas/posiciones.js";
import { htmlFixture } from "./vistas/fixture.js";
import { prepararCopas, htmlCopas } from "./vistas/copas.js";
import { htmlChallenger, htmlCamino, buscarEquipos } from "./vistas/challenger.js";

const $ = (selector) => document.querySelector(selector);
const guardarPref = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ } };
const leerPref = (clave) => { try { return localStorage.getItem(clave); } catch (e) { return null; } };

// ---------- Estado ----------
let divisiones = [];
let temporadas = [];
let temporadaId = null;
let datosActuales = null;               // partidos que se están mostrando (para las acciones del administrador)
let resueltosActuales = new Map();      // id de partido → partido con sus equipos resueltos (llaves)
let challengerActual = null;            // datos de la Challenger para el buscador
let busquedaChallenger = "";            // lo que se escribió en el buscador (se conserva al actualizar)
let contadorPedidos = 0;                // descarta respuestas viejas si el usuario navega rápido
const cache = new Map();                // clave → datos ya pedidos
const zooms = new Map();                // zoom elegido por cuadro de llaves
let menuAbierto = leerPref("liga-menu") !== "0";
let sidebarVisible = leerPref("liga-sidebar") ? leerPref("liga-sidebar") === "1" : window.innerWidth > 800;


// ---------- Estructura de la página ----------
function construirEsqueleto() {
  $("#app").innerHTML = `
    <div class="app" id="raiz">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__marca">
          <img src="/logo.png" alt="" width="40" height="40">
          <button class="sidebar__titulo" id="btn-liga" aria-expanded="true" title="Mostrar u ocultar las divisiones">
            ${esc(LIGA.nombre)} <span class="chevron">▾</span>
          </button>
        </div>
        <nav class="menu" id="menu"></nav>
        <div class="sidebar__pie">
          <button class="sec" id="btn-tema" title="Modo oscuro / claro"></button>
          <button class="sec" id="btn-admin"></button>
        </div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="principal">
        <header class="topbar">
          <button class="icono" id="btn-menu" aria-label="Mostrar u ocultar el menú">☰</button>
          <h1 id="titulo-pagina"></h1>
          <select id="sel-temporada" aria-label="Torneo"></select>
        </header>
        <div class="aviso" id="aviso" hidden></div>
        <main id="contenido"></main>
      </div>
    </div>`;
}

function avisar(texto) {
  const caja = $("#aviso");
  caja.textContent = texto;
  caja.hidden = !texto;
}

function aplicarVisibilidad() {
  $("#raiz").classList.toggle("con-sidebar", sidebarVisible);
  $("#menu").classList.toggle("cerrado", !menuAbierto);
  $("#btn-liga").setAttribute("aria-expanded", String(menuAbierto));
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  $("#btn-tema").textContent = tema === "oscuro" ? "☀️ Modo claro" : "🌙 Modo oscuro";
}

function actualizarPie() {
  $("#btn-admin").textContent = sesion.admin ? "Salir (administrador)" : "Entrar como administrador";
}


// ---------- Navegación ----------
// #/                       → inicio
// #/division/A             → posiciones y fixture
// #/division/A/copas       → copa de oro y de plata
// #/challenger             → Copa Challenger
function leerRuta() {
  const partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (partes[0] === "division" && partes[1]) {
    return { vista: "division", codigo: decodeURIComponent(partes[1]).toUpperCase(), tab: partes[2] === "copas" ? "copas" : "posiciones" };
  }
  if (partes[0] === "challenger") return { vista: "challenger" };
  return { vista: "inicio" };
}

function actualizarMarco(ruta) {
  $("#menu").innerHTML = htmlMenu({ divisiones, activa: ruta.codigo, vista: ruta.vista });
  const div = divisiones.find((d) => d.codigo === ruta.codigo);
  $("#titulo-pagina").textContent =
    ruta.vista === "division" && div ? div.nombre : ruta.vista === "challenger" ? "Copa Challenger" : LIGA.nombre;

  const sel = $("#sel-temporada");
  sel.hidden = !temporadas.length || ruta.vista === "challenger";
  sel.innerHTML = temporadas.map((t) =>
    `<option value="${t.id}" ${t.id === temporadaId ? "selected" : ""}>${esc(nombreTemporada(t))}</option>`).join("");
}

// Pide los datos a la base solo si todavía no están guardados en memoria
async function obtener(clave, cargar, mostrarCargando) {
  if (!cache.has(clave)) {
    if (mostrarCargando) $("#contenido").innerHTML = `<p class="cargando">Cargando…</p>`;
    cache.set(clave, await cargar());
  }
  return cache.get(clave);
}

async function renderContenido({ mostrarCargando = true } = {}) {
  const ruta = leerRuta();
  actualizarMarco(ruta);
  const contenido = $("#contenido");
  const temporada = temporadas.find((t) => t.id === temporadaId);
  if (ruta.vista !== "challenger") challengerActual = null;

  if (ruta.vista === "inicio") {
    datosActuales = null;
    contenido.innerHTML = htmlInicio({ liga: LIGA, divisiones, temporada });
    return;
  }

  const pedido = ++contadorPedidos;
  try {
    if (ruta.vista === "challenger") await pintarChallenger(pedido, mostrarCargando);
    else await pintarDivision(ruta, temporada, pedido, mostrarCargando);
  } catch (e) {
    console.error(e);
    if (pedido === contadorPedidos) contenido.innerHTML = `<p class="vacio">No se pudo cargar la información. Revisá tu conexión.</p>`;
  }
}

async function pintarDivision(ruta, temporada, pedido, mostrarCargando) {
  const contenido = $("#contenido");
  const division = divisiones.find((d) => d.codigo === ruta.codigo);
  if (!division) { contenido.innerHTML = `<p class="vacio">No encontramos esa división.</p>`; return; }
  if (!temporada) { contenido.innerHTML = `<p class="vacio">Todavía no hay torneos cargados.</p>`; return; }

  const clave = `${temporadaId}:${division.id}`;
  const datos = await obtener(clave, () => cargarDivision(temporadaId, division.id), mostrarCargando);
  const formato = FORMATOS[division.codigo] ?? {};
  const copas = ruta.tab === "copas" && formato.copas
    ? await obtener(`copas:${clave}`, () => cargarCopas(temporadaId, division.id), mostrarCargando)
    : [];
  if (pedido !== contadorPedidos) return;                    // el usuario ya fue a otra pantalla

  const cabecera = `
    <div class="cabecera-division" style="--color:${esc(division.color || "#7a8499")}">
      <h2>${esc(division.nombre)}</h2><span>${esc(nombreTemporada(temporada))}</span>
    </div>`;

  if (ruta.tab === "copas") {
    const preparadas = prepararCopas({ partidos: copas, equipos: datos.equipos, grupos: datos.partidos, descuentos: datos.descuentos });
    datosActuales = { partidos: copas };
    resueltosActuales = new Map(Object.values(preparadas).flatMap((c) => c.resueltos.map((p) => [p.id, p])));
    contenido.innerHTML = cabecera + htmlTabs({ codigo: division.codigo, activa: "copas" })
      + htmlCopas({ division, formato, copas: preparadas, admin: sesion.admin });
    ajustarBrackets();
    return;
  }

  datosActuales = datos;
  contenido.innerHTML = cabecera + htmlTabs({ codigo: division.codigo, activa: "posiciones" })
    + htmlPosiciones({ formato, equipos: datos.equipos, partidos: datos.partidos, descuentos: datos.descuentos })
    + htmlFixture({ equipos: datos.equipos, partidos: datos.partidos, admin: sesion.admin });
}

async function pintarChallenger(pedido, mostrarCargando) {
  const contenido = $("#contenido");
  const datos = await obtener("challenger", () => cargarChallenger(temporadaId), mostrarCargando);
  if (pedido !== contadorPedidos) return;
  if (!datos) { contenido.innerHTML = `<p class="vacio">Todavía no hay una Copa Challenger cargada.</p>`; return; }

  const mapa = new Map(datos.equipos.map((e) => [e.id, e]));
  const resueltos = resolverLlaves(datos.partidos, { equipos: mapa });
  const layout = layoutBracket(resueltos);

  // División de cada equipo (para la insignia A / B / C)
  const divPorId = new Map(divisiones.map((d) => [d.id, d]));
  const divisionDeEquipo = new Map();
  for (const i of datos.inscripciones) { const d = divPorId.get(i.division_id); if (d) divisionDeEquipo.set(i.equipo_id, d); }

  // Equipos que participan (para el buscador)
  const participantes = new Map();
  for (const p of resueltos) for (const e of [p.local.equipo, p.visitante.equipo]) if (e) participantes.set(e.id, e);
  const equipos = [...participantes.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  datosActuales = { partidos: datos.partidos };
  resueltosActuales = new Map(resueltos.map((p) => [p.id, p]));
  challengerActual = { layout, equipos, divisiones: divisionDeEquipo };

  contenido.innerHTML = htmlChallenger({
    torneo: datos.torneo, resueltos, layout, divisiones: divisionDeEquipo, divisionesLista: divisiones,
    equipos, admin: sesion.admin, busqueda: busquedaChallenger,
  });
  aplicarBusqueda();
  ajustarBrackets();
}

// Vuelve a pedir los datos a la base (después de guardar algo o cada tanto)
async function refrescar() {
  cache.clear();
  await renderContenido({ mostrarCargando: false });
}

const hayEdicionAbierta = () =>
  document.querySelector("dialog[open]") || document.activeElement?.matches?.("input, select, textarea");


// ---------- Cuadros de llaves: zoom ----------
function escalaDe(bloque) {
  const vista = bloque.querySelector(".bracket-vista");
  const ancho = Number(vista.dataset.ancho);
  const auto = Math.min(1, Math.max(0.6, vista.clientWidth / ancho));
  return zooms.get(bloque.dataset.clave) ?? auto;
}

function ajustarBrackets() {
  document.querySelectorAll(".bracket-bloque").forEach((bloque) => {
    const vista = bloque.querySelector(".bracket-vista");
    const ancho = Number(vista.dataset.ancho), alto = Number(vista.dataset.alto);
    if (!ancho) return;
    const escala = escalaDe(bloque);
    const contenedor = vista.querySelector(".bracket-escala");
    contenedor.style.width = `${ancho * escala}px`;
    contenedor.style.height = `${alto * escala}px`;
    contenedor.firstElementChild.style.transform = `scale(${escala})`;
  });
}

function cambiarZoom(bloque, accion) {
  const vista = bloque.querySelector(".bracket-vista");
  const ancho = Number(vista.dataset.ancho);
  let escala = escalaDe(bloque);
  if (accion === "+") escala = Math.min(1.5, escala * 1.2);
  else if (accion === "-") escala = Math.max(0.3, escala / 1.2);
  else escala = Math.max(0.25, Math.min(1, (vista.clientWidth - 4) / ancho));   // ajustar al ancho
  zooms.set(bloque.dataset.clave, escala);
  ajustarBrackets();
}


// ---------- Challenger: buscador de equipo ----------
function aplicarBusqueda() {
  const panel = $("#camino");
  if (!panel || !challengerActual) return;

  document.querySelectorAll(".en-camino").forEach((el) => el.classList.remove("en-camino"));
  $(".bracket")?.classList.remove("con-busqueda");

  const termino = busquedaChallenger.trim();
  if (!termino) { panel.innerHTML = ""; return; }

  const encontrados = buscarEquipos(termino, challengerActual.equipos);
  if (!encontrados.length) { panel.innerHTML = `<p class="ayuda">No encontramos ese equipo en la Copa Challenger.</p>`; return; }
  if (encontrados.length > 1) {
    panel.innerHTML = `<p class="ayuda">¿Cuál de estos?</p><div class="chips">${encontrados.map((e) =>
      `<button class="mini" data-elegir-equipo="${esc(e.nombre)}">${esc(e.nombre)}</button>`).join("")}</div>`;
    return;
  }

  const equipo = encontrados[0];
  const camino = caminoDe(equipo.id, challengerActual.layout);
  panel.innerHTML = htmlCamino({ equipo, camino, divisiones: challengerActual.divisiones });

  const codigos = new Set((camino?.partidos ?? []).map((p) => p.codigo));
  document.querySelectorAll(".mcard, .fila-chal").forEach((el) => { if (codigos.has(el.dataset.codigo)) el.classList.add("en-camino"); });
  if (codigos.size) $(".bracket")?.classList.add("con-busqueda");
}


// ---------- Acciones del administrador ----------
async function guardarCambios(accion) {
  try {
    await accion();
    avisar("");
    await refrescar();
  } catch (e) {
    console.error(e);
    avisar("No se pudo guardar: " + (e.message || e));
    await refrescar();                            // vuelve a mostrar lo que realmente hay guardado
  }
}

// Día, hora y cancha de un partido (el cambio de día u hora queda en el historial)
async function aplicarDiaHoraCancha(p, v) {
  const cambioDiaHora = (v.fecha || "") !== (p.fecha ?? "") || (v.hora && v.hora !== formatoHora(p.hora));
  if (cambioDiaHora) {
    if (p.estado === "jugado") throw new Error("Este partido ya se jugó: para cambiarle el día, primero borrá el resultado.");
    const fecha = v.fecha || p.fecha;
    if (!fecha) throw new Error("Elegí un día.");
    await admin.reprogramar([p.id], fecha, v.hora || null, v.motivo.trim() || null);
  }
  if ((v.cancha || "") !== (p.cancha ?? "")) await admin.actualizarCancha(p.id, v.cancha.trim() || null);
}

const camposDiaHoraCancha = (p) => [
  { nombre: "fecha", etiqueta: "Día", tipo: "date", valor: p.fecha ?? "" },
  { nombre: "hora", etiqueta: "Hora", tipo: "time", valor: formatoHora(p.hora) },
  { nombre: "cancha", etiqueta: "Cancha", valor: p.cancha ?? "" },
  { nombre: "motivo", etiqueta: "Motivo (opcional)", placeholder: "Ej.: Postergado por lluvia" },
];

// Partido de la fase de grupos
async function reprogramarUno(id) {
  const p = datosActuales?.partidos.find((x) => x.id === id);
  if (!p) return;
  const v = await formulario({
    titulo: "Día, hora y cancha",
    ayuda: "Si cambiás el día o la hora, podés escribir el motivo para que lo vea el público (ej.: Día de la Madre).",
    campos: camposDiaHoraCancha(p),
  });
  if (v) await guardarCambios(() => aplicarDiaHoraCancha(p, v));
}

// Fecha completa de la fase de grupos
async function reprogramarFecha(numero) {
  const pendientes = (datosActuales?.partidos ?? []).filter((p) => p.nro_fecha === numero && p.estado !== "jugado");
  if (!pendientes.length) { alert("Todos los partidos de esta fecha ya se jugaron."); return; }

  const v = await formulario({
    titulo: `Fecha ${numero}: asignar o postergar`,
    ayuda: `Se aplica a los ${pendientes.length} partidos que todavía no se jugaron. Cada uno conserva su hora, salvo que escribas una.`,
    campos: [
      { nombre: "fecha", etiqueta: "Nuevo día", tipo: "date", valor: pendientes.find((p) => p.fecha)?.fecha ?? "", requerido: true },
      { nombre: "hora", etiqueta: "Hora para todos (opcional)", tipo: "time" },
      { nombre: "motivo", etiqueta: "Motivo (se muestra al público)", placeholder: "Ej.: Día de la Madre" },
    ],
  });
  if (!v) return;
  await guardarCambios(() =>
    admin.reprogramar(pendientes.map((p) => p.id), v.fecha, v.hora || null, v.motivo.trim() || null));
}

// Partido de una llave (copas y Challenger): resultado con penales + día, hora y cancha
async function editarPartidoLlave(id) {
  const p = datosActuales?.partidos.find((x) => x.id === id);
  const r = resueltosActuales.get(id);
  if (!p || !r) return;
  const nombreL = r.local.equipo?.nombre ?? r.local.etiqueta;
  const nombreV = r.visitante.equipo?.nombre ?? r.visitante.etiqueta;

  const v = await formulario({
    titulo: `${r.codigo} · ${r.ronda}`,
    ayuda: "Si hubo empate, elegí quién ganó por penales. Para borrar el resultado, dejá los dos marcadores vacíos.",
    campos: [
      { nombre: "gl", etiqueta: `Goles de ${nombreL}`, tipo: "number", min: 0, valor: p.goles_local ?? "" },
      { nombre: "gv", etiqueta: `Goles de ${nombreV}`, tipo: "number", min: 0, valor: p.goles_visitante ?? "" },
      { nombre: "pen", etiqueta: "Si empataron: ganador por penales", tipo: "select", valor: p.penales_ganador ?? "",
        opciones: [{ valor: "", texto: "Sin penales" }, { valor: "local", texto: `Ganó ${nombreL}` }, { valor: "visitante", texto: `Ganó ${nombreV}` }] },
      ...camposDiaHoraCancha(p),
    ],
  });
  if (!v) return;

  await guardarCambios(async () => {
    await aplicarDiaHoraCancha(p, v);                         // primero día/hora (no se puede en partidos jugados)
    const gl = v.gl.trim(), gv = v.gv.trim();
    if (gl !== "" && gv !== "") await admin.guardarResultadoLlave(p.id, entero(gl), entero(gv), v.pen);
    else if (gl === "" && gv === "") { if (p.goles_local != null) await admin.guardarResultadoLlave(p.id, null, null, null); }
    else throw new Error("Completá los dos marcadores o dejalos vacíos.");
  });
}


// ---------- Botones y eventos ----------
function enlazarEventos() {
  // Menú lateral
  $("#btn-menu").onclick = () => { sidebarVisible = !sidebarVisible; guardarPref("liga-sidebar", sidebarVisible ? "1" : "0"); aplicarVisibilidad(); };
  $("#scrim").onclick = () => { sidebarVisible = false; aplicarVisibilidad(); };
  $("#btn-liga").onclick = () => { menuAbierto = !menuAbierto; guardarPref("liga-menu", menuAbierto ? "1" : "0"); aplicarVisibilidad(); };

  // En celulares, al elegir una pantalla el menú se cierra solo
  window.addEventListener("hashchange", () => {
    if (window.innerWidth <= 800) { sidebarVisible = false; aplicarVisibilidad(); }
    renderContenido();
  });
  window.addEventListener("resize", ajustarBrackets);

  $("#sel-temporada").onchange = (e) => { temporadaId = Number(e.target.value); renderContenido(); };

  $("#btn-tema").onclick = () => {
    const nuevo = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
    guardarPref("liga-tema", nuevo);
    aplicarTema(nuevo);
  };

  $("#btn-admin").onclick = async () => {
    if (sesion.admin) await salir(); else await ingresar();
    actualizarPie();
    await renderContenido({ mostrarCargando: false });
  };

  // Resultados de la fase de grupos (solo administrador): al completar los dos goles se guarda
  $("#contenido").addEventListener("change", (e) => {
    if (!sesion.admin || !e.target.matches(".gol")) return;
    const fila = e.target.closest(".partido");
    const l = fila.querySelector(".gol-l").value.trim();
    const v = fila.querySelector(".gol-v").value.trim();
    if (l !== "" && v !== "") guardarCambios(() => admin.guardarResultado(fila.dataset.id, entero(l), entero(v)));
    else if (l === "" && v === "") guardarCambios(() => admin.guardarResultado(fila.dataset.id, null, null));
    // si falta uno de los dos, se espera sin guardar
  });

  document.addEventListener("click", (e) => {
    // Zoom de los cuadros de llaves (lo puede usar cualquiera)
    const zoom = e.target.closest("[data-zoom]");
    if (zoom) { cambiarZoom(zoom.closest(".bracket-bloque"), zoom.dataset.zoom); return; }

    // Buscador de la Challenger: elegir uno de varios equipos
    const elegido = e.target.closest("[data-elegir-equipo]");
    if (elegido) {
      busquedaChallenger = elegido.dataset.elegirEquipo;
      const campo = $("#buscar-equipo");
      if (campo) campo.value = busquedaChallenger;
      aplicarBusqueda();
      return;
    }

    const boton = e.target.closest("[data-accion]");
    if (!boton || !sesion.admin) return;
    if (boton.dataset.accion === "reprogramar") reprogramarUno(boton.dataset.id);
    if (boton.dataset.accion === "reprogramar-fecha") reprogramarFecha(Number(boton.dataset.fecha));
    if (boton.dataset.accion === "editar-llave") editarPartidoLlave(boton.dataset.id);
  });

  // Buscador de equipo de la Challenger
  document.addEventListener("input", (e) => {
    if (e.target.id !== "buscar-equipo") return;
    busquedaChallenger = e.target.value;
    aplicarBusqueda();
  });

  // Actualización automática cada minuto y al volver a la pestaña
  setInterval(() => { if (!document.hidden && !hayEdicionAbierta()) refrescar(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !hayEdicionAbierta()) refrescar(); });
}


// ---------- Arranque ----------
function pintarErrorDeConfiguracion() {
  $("#app").innerHTML = `
    <div class="error-config">
      <h1>Falta la configuración</h1>
      <p>Creá un archivo <code>.env</code> en la carpeta del proyecto con estas dos líneas y reiniciá <code>npm run dev</code>:</p>
      <pre>VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_KEY=sb_publishable_...</pre>
      <p>En Netlify se cargan igual, en <em>Project configuration → Environment variables</em>.</p>
    </div>`;
}

async function arrancar() {
  if (!configuracionCompleta) return pintarErrorDeConfiguracion();

  construirEsqueleto();
  aplicarTema(document.documentElement.dataset.tema || "claro");
  aplicarVisibilidad();
  actualizarPie();
  enlazarEventos();

  try {
    ({ divisiones, temporadas } = await cargarBase());
  } catch (e) {
    console.error(e);
    avisar("No se pudo conectar con la base de datos. Revisá tu conexión y recargá la página.");
    return;
  }
  temporadaId = (temporadas.find((t) => t.activa) ?? temporadas[0])?.id ?? null;

  await iniciarAuth(async () => { actualizarPie(); await renderContenido({ mostrarCargando: false }); });
  actualizarPie();
  await renderContenido();
}

arrancar();
