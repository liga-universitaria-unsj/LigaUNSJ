// =====================================================================
//  Arranque de la aplicación: arma la estructura, maneja la navegación
//  y conecta los botones. La lógica de cada pantalla está en /vistas.
// =====================================================================
import "./styles/estilos.css";
import { db, configuracionCompleta } from "./supabase.js";
import { cargarBase, cargarDivision } from "./datos.js";
import { sesion, iniciarAuth, ingresar, salir } from "./auth.js";
import * as admin from "./admin.js";
import { formulario } from "./modal.js";
import { LIGA, FORMATOS } from "./liga.js";
import { esc, nombreTemporada, formatoHora, entero } from "./util.js";
import { htmlMenu, htmlTabs, htmlInicio } from "./vistas/layout.js";
import { htmlPosiciones } from "./vistas/posiciones.js";
import { htmlFixture } from "./vistas/fixture.js";

const $ = (selector) => document.querySelector(selector);
const guardarPref = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ } };
const leerPref = (clave) => { try { return localStorage.getItem(clave); } catch (e) { return null; } };

// ---------- Estado ----------
let divisiones = [];
let temporadas = [];
let temporadaId = null;
let datosActuales = null;               // lo que se está mostrando (para las acciones del administrador)
let contadorPedidos = 0;                // descarta respuestas viejas si el usuario navega rápido
const cache = new Map();                // "temporada:division" → datos
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
// #/                → inicio     ·     #/division/A  → una división
function leerRuta() {
  const partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (partes[0] === "division" && partes[1]) {
    return { vista: "division", codigo: decodeURIComponent(partes[1]).toUpperCase() };
  }
  return { vista: "inicio" };
}

function actualizarMarco(ruta) {
  $("#menu").innerHTML = htmlMenu({ divisiones, activa: ruta.codigo });
  const div = divisiones.find((d) => d.codigo === ruta.codigo);
  $("#titulo-pagina").textContent = ruta.vista === "division" && div ? div.nombre : LIGA.nombre;

  const sel = $("#sel-temporada");
  sel.hidden = !temporadas.length;
  sel.innerHTML = temporadas.map((t) =>
    `<option value="${t.id}" ${t.id === temporadaId ? "selected" : ""}>${esc(nombreTemporada(t))}</option>`).join("");
}

async function renderContenido({ mostrarCargando = true } = {}) {
  const ruta = leerRuta();
  actualizarMarco(ruta);
  const contenido = $("#contenido");
  const temporada = temporadas.find((t) => t.id === temporadaId);

  if (ruta.vista === "inicio") {
    datosActuales = null;
    contenido.innerHTML = htmlInicio({ liga: LIGA, divisiones, temporada });
    return;
  }

  const division = divisiones.find((d) => d.codigo === ruta.codigo);
  if (!division) { contenido.innerHTML = `<p class="vacio">No encontramos esa división.</p>`; return; }
  if (!temporada) { contenido.innerHTML = `<p class="vacio">Todavía no hay torneos cargados.</p>`; return; }

  const pedido = ++contadorPedidos;
  const clave = `${temporadaId}:${division.id}`;
  try {
    if (!cache.has(clave)) {
      if (mostrarCargando) contenido.innerHTML = `<p class="cargando">Cargando…</p>`;
      cache.set(clave, await cargarDivision(temporadaId, division.id));
    }
  } catch (e) {
    if (pedido === contadorPedidos) contenido.innerHTML = `<p class="vacio">No se pudo cargar la información. Revisá tu conexión.</p>`;
    console.error(e);
    return;
  }
  if (pedido !== contadorPedidos) return;        // el usuario ya fue a otra pantalla

  const datos = cache.get(clave);
  datosActuales = datos;
  const formato = FORMATOS[division.codigo] ?? {};

  contenido.innerHTML = `
    <div class="cabecera-division" style="--color:${esc(division.color || "#7a8499")}">
      <h2>${esc(division.nombre)}</h2><span>${esc(nombreTemporada(temporada))}</span>
    </div>
    ${htmlTabs({ codigo: division.codigo })}
    ${htmlPosiciones({ formato, equipos: datos.equipos, partidos: datos.partidos, descuentos: datos.descuentos })}
    ${htmlFixture({ equipos: datos.equipos, partidos: datos.partidos, admin: sesion.admin })}`;
}

// Vuelve a pedir los datos a la base (después de guardar algo o cada tanto)
async function refrescar() {
  cache.clear();
  await renderContenido({ mostrarCargando: false });
}

const hayEdicionAbierta = () =>
  document.querySelector("dialog[open]") || document.activeElement?.matches?.("input, select, textarea");


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

async function reprogramarUno(id) {
  const p = datosActuales?.partidos.find((x) => x.id === id);
  if (!p) return;
  const v = await formulario({
    titulo: "Día, hora y cancha",
    ayuda: "Si cambiás el día o la hora, podés escribir el motivo para que lo vea el público (ej.: Día de la Madre).",
    campos: [
      { nombre: "fecha", etiqueta: "Día", tipo: "date", valor: p.fecha ?? "" },
      { nombre: "hora", etiqueta: "Hora", tipo: "time", valor: formatoHora(p.hora) },
      { nombre: "cancha", etiqueta: "Cancha", valor: p.cancha ?? "" },
      { nombre: "motivo", etiqueta: "Motivo (opcional)", placeholder: "Ej.: Postergado por lluvia" },
    ],
  });
  if (!v) return;

  await guardarCambios(async () => {
    const fecha = v.fecha || p.fecha;
    const cambioDiaHora = (v.fecha || "") !== (p.fecha ?? "") || (v.hora || "") !== formatoHora(p.hora);
    if (cambioDiaHora) {
      if (!fecha) throw new Error("Elegí un día.");
      await admin.reprogramar([p.id], fecha, v.hora || null, v.motivo.trim() || null);
    }
    if ((v.cancha || "") !== (p.cancha ?? "")) await admin.actualizarCancha(p.id, v.cancha.trim() || null);
  });
}

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


// ---------- Botones y eventos ----------
function enlazarEventos() {
  // Menú lateral
  $("#btn-menu").onclick = () => { sidebarVisible = !sidebarVisible; guardarPref("liga-sidebar", sidebarVisible ? "1" : "0"); aplicarVisibilidad(); };
  $("#scrim").onclick = () => { sidebarVisible = false; aplicarVisibilidad(); };
  $("#btn-liga").onclick = () => { menuAbierto = !menuAbierto; guardarPref("liga-menu", menuAbierto ? "1" : "0"); aplicarVisibilidad(); };

  // En celulares, al elegir una división el menú se cierra solo
  window.addEventListener("hashchange", () => {
    if (window.innerWidth <= 800) { sidebarVisible = false; aplicarVisibilidad(); }
    renderContenido();
  });

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

  // Resultados (solo administrador): al completar los dos goles se guarda
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
    const boton = e.target.closest("[data-accion]");
    if (!boton || !sesion.admin) return;
    if (boton.dataset.accion === "reprogramar") reprogramarUno(boton.dataset.id);
    if (boton.dataset.accion === "reprogramar-fecha") reprogramarFecha(Number(boton.dataset.fecha));
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
