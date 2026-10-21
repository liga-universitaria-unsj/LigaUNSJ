// Pruebas rápidas de la lógica (no necesitan internet ni la base de datos).
// Se ejecutan con:  node pruebas/probar.mjs
import fs from "node:fs";
import { calcularTabla, posicionesPorZona } from "../src/tabla.js";
import { htmlPosiciones } from "../src/vistas/posiciones.js";
import { htmlFixture } from "../src/vistas/fixture.js";
import { htmlMenu, htmlTabs, htmlInicio } from "../src/vistas/layout.js";
import { htmlBracket } from "../src/vistas/bracket.js";
import { htmlCopas, prepararCopas } from "../src/vistas/copas.js";
import { htmlChallenger, htmlCamino, buscarEquipos } from "../src/vistas/challenger.js";
import { resolverLlaves, layoutBracket, caminoDe, ladoGanador } from "../src/llaves.js";
import { esc, formatoFecha, formatoHora, formatoFechaLarga, fechaCorta, formatoFechaNumerica, normalizar } from "../src/util.js";
import { nombreJugador, claveJugador, parsearJugador, conPosicion, ordenarGoleadores, filasTarjetas, estadoSancion } from "../src/jugadores.js";
import { htmlGoleadores, htmlTarjetas, htmlSuspensiones } from "../src/vistas/estadisticas.js";

let fallos = 0;
const igual = (real, esperado, texto) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(ok ? "  ✔" : "  ✘", texto, ok ? "" : `\n      esperado: ${JSON.stringify(esperado)}\n      obtenido: ${JSON.stringify(real)}`);
};
const contiene = (texto, trozo, nombre) => {
  const ok = texto.includes(trozo);
  if (!ok) fallos++;
  console.log(ok ? "  ✔" : "  ✘", nombre);
};

// =====================================================================
//  FASE 1 · tabla, fixture, utilidades
// =====================================================================
const nombres = ["DE ZURDA", "F90", "MALVINAS", "GEOLOGIA", "TIMBA", "AGRIMENSURA", "GOL EN CONTRA", "TERCER TIEMPO"];
const equipos = nombres.map((n) => ({ id: n, nombre: n, zona: "A", escudo_url: null }));
const r = (l, v, gl, gv, extra = {}) => ({ id: `${l}-${v}`, local_id: l, visitante_id: v, goles_local: gl, goles_visitante: gv, zona: "A", ...extra });
const partidos = [
  r("DE ZURDA", "F90", 0, 3), r("MALVINAS", "GEOLOGIA", 2, 1), r("TIMBA", "AGRIMENSURA", 1, 4), r("GOL EN CONTRA", "TERCER TIEMPO", 0, 1),
  r("DE ZURDA", "GEOLOGIA", 4, 0), r("F90", "AGRIMENSURA", 3, 1), r("MALVINAS", "TERCER TIEMPO", 2, 0), r("TIMBA", "GOL EN CONTRA", 0, 7),
  r("DE ZURDA", "AGRIMENSURA", 4, 1), r("GEOLOGIA", "TERCER TIEMPO", 1, 3), r("F90", "GOL EN CONTRA", 1, 2), r("MALVINAS", "TIMBA", 6, 0),
  r("DE ZURDA", "TERCER TIEMPO", null, null),
];
console.log("Tabla de posiciones");
const tabla = calcularTabla(equipos, partidos, [{ equipo_id: "GOL EN CONTRA", puntos: 1 }]);
igual(tabla.map((f) => [f.equipo.nombre, f.pts, f.dg]),
  [["MALVINAS", 9, 9], ["DE ZURDA", 6, 4], ["F90", 6, 4], ["TERCER TIEMPO", 6, 1], ["GOL EN CONTRA", 5, 7], ["AGRIMENSURA", 3, -2], ["GEOLOGIA", 0, -7], ["TIMBA", 0, -16]],
  "coincide con la tabla de la web del equipo (puntos y diferencia)");
igual(tabla.find((f) => f.equipo.nombre === "TIMBA").pj, 3, "un partido sin resultado no cuenta como jugado");

console.log("Vistas de la fase de grupos");
const formato = { oro: 4, plata: [5, 8], copas: true };
const descuentos = [{ equipo_id: "GOL EN CONTRA", puntos: 1 }];
const pos = htmlPosiciones({ formato, equipos, partidos, descuentos });
contiene(pos, "Posiciones · Zona A", "título de zona");
contiene(pos, "Copa de Plata (5º a 8º)", "leyenda de copas");
contiene(pos, 'class="oro"', "marca dorada en los 4 primeros");
contiene(pos, "−1", "muestra el descuento de puntos");

const conFecha = partidos.map((p, i) => ({ ...p, nro_fecha: 1 + Math.floor(i / 4), fecha: i < 4 ? "2026-10-17" : null, hora: i === 0 ? "09:00:00" : null, estado: "programado" }));
const fixPublico = htmlFixture({ equipos, partidos: conFecha, admin: false });
contiene(fixPublico, "sáb 17 oct · 09:00", "fecha y hora del partido");
contiene(fixPublico, "horario a confirmar", "partido con día pero sin hora");
contiene(fixPublico, "Fecha a confirmar", "partido sin día");
igual(fixPublico.includes('class="gol'), false, "el público NO ve campos para editar");
const fixAdmin = htmlFixture({ equipos, partidos: conFecha, admin: true });
contiene(fixAdmin, 'class="gol gol-l"', "el administrador ve campos de goles");
contiene(fixAdmin, 'data-accion="reprogramar-fecha"', "el administrador ve el botón de fecha completa");

const xss = htmlFixture({ equipos: [{ id: "a", nombre: "<img src=x onerror=alert(1)>", zona: "A" }, { id: "b", nombre: "B", zona: "A" }],
  partidos: [{ id: "1", local_id: "a", visitante_id: "b", zona: "A", nro_fecha: 1, estado: "programado", nota_publica: "<b>x</b>" }] });
igual(xss.includes("<img src=x") || xss.includes("<b>x</b>"), false, "los textos de la base se escapan (sin inyección de HTML)");

const siete = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"].map((n) => ({ id: n, nombre: n, zona: "B" }));
const fixLibre = htmlFixture({ equipos: siete, partidos: [
  { id: "1", local_id: "A1", visitante_id: "A2", zona: "B", nro_fecha: 1, estado: "programado" },
  { id: "2", local_id: "A3", visitante_id: "A4", zona: "B", nro_fecha: 1, estado: "programado" },
  { id: "3", local_id: "A5", visitante_id: "A6", zona: "B", nro_fecha: 1, estado: "programado" }] });
contiene(fixLibre, "Libre: A7", "indica qué equipo descansa en la fecha");

console.log("Utilidades");
igual(formatoFecha("2026-10-17"), "sáb 17 oct", "formato de fecha");
igual(formatoFechaLarga("2026-10-07"), "miércoles 7 de octubre", "fecha larga");
igual(fechaCorta("2026-10-17"), "17/10", "fecha corta");
igual(formatoHora("21:10:00"), "21:10", "formato de hora");
igual(esc('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;", "escape de HTML");
igual(normalizar("  Cátedra FC "), "catedra fc", "normalizar para buscar sin tildes");

// =====================================================================
//  FASE 2 · motor de llaves
// =====================================================================
console.log("Motor de llaves · resultados y penales");
igual(ladoGanador({ goles_local: 2, goles_visitante: 1 }), "local", "gana el local");
igual(ladoGanador({ goles_local: 0, goles_visitante: 1 }), "visitante", "gana el visitante");
igual(ladoGanador({ goles_local: 1, goles_visitante: 1, penales_ganador: "visitante" }), "visitante", "empate definido por penales");
igual(ladoGanador({ goles_local: 1, goles_visitante: 1 }), null, "empate sin penales cargados: todavía no hay ganador");
igual(ladoGanador({ goles_local: null, goles_visitante: null }), null, "partido sin jugar");

console.log("Copa Challenger (36 partidos reales)");
const datos = JSON.parse(fs.readFileSync(new URL("./challenger.json", import.meta.url), "utf8"));
const mapaEquipos = new Map(datos.equipos.map((e) => [e.id, e]));
const clonar = (x) => JSON.parse(JSON.stringify(x));
const base = clonar(datos.partidos);

let res = resolverLlaves(base, { equipos: mapaEquipos });
let lay = layoutBracket(res);
const nodo = (c) => lay.porCodigo.get(c);
igual([lay.nodos.length, lay.enlaces.length], [36, 35], "36 partidos y 35 conexiones entre llaves");
igual(nodo("P22").p.local.etiqueta, "Ganador P16", "octavos: antes de jugar se muestra 'Ganador P16'");
igual([nodo("P7").p.local.equipo.id, nodo("P7").p.visitante.equipo.id], ["atletico-bonus-track", "c-lesion"], "16avos con equipos fijos");
igual(nodo("P7").p.visitante.de, "P5", "el 16avo recuerda de qué partido de la previa viene C-Lesion");
igual([nodo("P34").lado, nodo("P35").lado, nodo("P36").lado], ["izq", "der", "centro"], "semifinales a cada lado de la final");

const superposiciones = () => {
  const porX = new Map();
  lay.nodos.forEach((n) => { if (!porX.has(n.x)) porX.set(n.x, []); porX.get(n.x).push(n); });
  let malos = 0;
  for (const ns of porX.values()) { ns.sort((a, b) => a.y - b.y); for (let i = 1; i < ns.length; i++) if (ns[i].y - ns[i - 1].y < lay.altoCard + 4) malos++; }
  return malos;
};
igual(superposiciones(), 0, "ninguna tarjeta se superpone con otra de su columna");
igual(lay.nodos.every((n) => n.x >= 0 && n.y - lay.altoCard / 2 >= 0 && n.x + lay.anchoCard <= lay.ancho && n.y + lay.altoCard / 2 <= lay.alto), true, "todas las tarjetas entran en el cuadro");
const centrado = lay.nodos.filter((n) => lay.porCodigo && n.p.origen_local?.ganador && n.p.origen_visitante?.ganador).every((n) => {
  const a = lay.porCodigo.get(n.p.origen_local.ganador).y, b = lay.porCodigo.get(n.p.origen_visitante.ganador).y;
  return Math.abs(n.y - (a + b) / 2) < 0.01;
});
igual(centrado, true, "cada partido queda en el medio de los dos que lo alimentan");

// Se cargan resultados: P16 (F90 gana), P17 empatado con penales (Geología), P14 empatado sin penales
const sim = clonar(datos.partidos);
const poner = (cod, gl, gv, pen = null) => { const p = sim.find((x) => x.codigo === cod); Object.assign(p, { goles_local: gl, goles_visitante: gv, penales_ganador: pen, estado: "jugado" }); };
poner("P16", 2, 1); poner("P17", 1, 1, "visitante"); poner("P14", 0, 0);
res = resolverLlaves(sim, { equipos: mapaEquipos }); lay = layoutBracket(res);
igual(nodo("P22").p.local.equipo?.id, "f90", "el ganador pasa solo a octavos");
igual(nodo("P22").p.visitante.equipo?.id, "geologia", "gana por penales y avanza");
igual(nodo("P23").p.local.equipo, null, "empate sin penales: no avanza nadie todavía");
contiene(htmlBracket(lay, { clave: "x" }), "sin-pen", "la tarjeta del empate sin penales se marca");

console.log("Camino de un equipo");
res = resolverLlaves(base, { equipos: mapaEquipos }); lay = layoutBracket(res);
const camino = (id) => { const c = caminoDe(id, lay); return c && c.partidos.map((p) => p.codigo); };
igual(camino("timba"), ["P4", "P12", "P29", "P31", "P35", "P36"], "Timba: previa → 16avos → octavos → cuartos → semi → final");
igual(camino("f90"), ["P16", "P22", "P32", "P34", "P36"], "F90 (entra directo a 16avos)");
igual(camino("c-lesion"), ["P5", "P7", "P27", "P33", "P35", "P36"], "C-Lesion (ganó la previa)");
const gec = caminoDe("gol-en-contra", lay);
igual([gec.partidos.map((p) => p.codigo), gec.eliminadoEn], [["P2"], "P2"], "Gol en Contra quedó eliminado en la previa");
igual(caminoDe("agrimensura", lay), null, "un equipo que no participa no tiene camino");
igual(buscarEquipos("catedra", datos.equipos.concat([{ id: "catedra", nombre: "Cátedra FC" }])).map((e) => e.id), ["catedra"], "el buscador ignora tildes y mayúsculas");
igual(buscarEquipos("inter", datos.equipos).length >= 1, true, "el buscador encuentra por parte del nombre");

const divs = new Map([["timba", { codigo: "B", color: "#d4a017", nombre: "División B" }]]);
const pantalla = htmlChallenger({
  torneo: { nombre: "Copa Challenger", anio: 2026, organizador: "Liga Superior Universitaria Sanjuanina de Fútbol" },
  resueltos: res, layout: lay, divisiones: divs, divisionesLista: [{ codigo: "A", nombre: "División A", color: "#3b82f6" }],
  equipos: datos.equipos, admin: true, busqueda: "timba" });
contiene(pantalla, "Copa Challenger 2026", "encabezado de la pantalla");
contiene(pantalla, 'id="buscar-equipo"', "buscador de equipo");
contiene(pantalla, "miércoles 7 de octubre", "fixture agrupado por día");
contiene(pantalla, "Fecha a confirmar", "semifinales y final sin día");
contiene(pantalla, 'data-accion="editar-llave"', "el administrador puede editar partidos");
contiene(htmlCamino({ equipo: { id: "timba", nombre: "Timba" }, camino: caminoDe("timba", lay), divisiones: divs }), "Primer partido: <b>P4</b>", "panel del camino");

console.log("Copas de Oro y de Plata");
const nueve = (zona, n) => Array.from({ length: n }, (_, i) => ({ id: `${zona}${i + 1}`, nombre: `${zona}${i + 1}`, zona }));
const equiposCopa = [...nueve("A", 8), ...nueve("B", 7)];
// Cada equipo gana a todos los de abajo: queda A1 > A2 > ... y B1 > B2 > ...
const grupos = [];
for (const z of ["A", "B"]) { const e = equiposCopa.filter((x) => x.zona === z); for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) grupos.push({ id: `${z}${i}${j}`, zona: z, local_id: e[i].id, visitante_id: e[j].id, goles_local: 1, goles_visitante: 0 }); }
const og = (z, l) => ({ zona: z, lugar: l }), gn = (c) => ({ ganador: c });
const copaOro = [["C1", og("A", 1), og("B", 4)], ["C2", og("A", 2), og("B", 3)], ["C3", og("B", 1), og("A", 4)], ["C4", og("B", 2), og("A", 3)],
  ["S1", gn("C1"), gn("C4")], ["S2", gn("C3"), gn("C2")], ["F", gn("S1"), gn("S2")]].map(([codigo, l, v]) => ({ id: "o" + codigo, fase: "oro", codigo, ronda: codigo[0] === "C" ? "Cuartos de final" : codigo === "F" ? "Final" : "Semifinal", origen_local: l, origen_visitante: v, estado: "programado" }));
const copaPlata = [["C1", og("A", 6), og("B", 7)], ["C2", og("A", 7), og("B", 6)], ["C3", og("A", 8), og("B", 5)],
  ["S1", og("A", 5), gn("C3")], ["S2", gn("C1"), gn("C2")], ["F", gn("S1"), gn("S2")]].map(([codigo, l, v]) => ({ id: "p" + codigo, fase: "plata", codigo, ronda: codigo[0] === "C" ? "Cuartos de final" : codigo === "F" ? "Final" : "Semifinal", origen_local: l, origen_visitante: v, estado: "programado" }));
const prep = prepararCopas({ partidos: [...copaOro, ...copaPlata], equipos: equiposCopa, grupos, descuentos: [] });
const par = (fase, c) => prep[fase].resueltos.find((p) => p.codigo === c);
igual([par("oro", "C1").local.equipo.nombre, par("oro", "C1").visitante.equipo.nombre], ["A1", "B4"], "Oro: 1ºA vs 4ºB");
igual([par("oro", "C3").local.equipo.nombre, par("oro", "C3").visitante.equipo.nombre], ["B1", "A4"], "Oro: 1ºB vs 4ºA");
igual([par("plata", "C3").local.equipo.nombre, par("plata", "C3").visitante.equipo.nombre], ["A8", "B5"], "Plata: 8ºA vs 5ºB");
igual([par("plata", "S1").local.equipo.nombre, par("plata", "S1").visitante.etiqueta], ["A5", "Ganador C3"], "Plata: el 5ºA pasa libre a semifinales");
igual(par("oro", "C1").local.provisorio, false, "zona terminada: el cruce ya no es provisorio");
igual(prep.plata.layout.nodos.length, 6, "el cuadro de plata tiene 6 partidos (el 5ºA pasa libre)");
// Solo los primeros 10 partidos tienen resultado; el resto de la zona sigue sin jugarse
const sinTerminar = grupos.map((g, i) => (i < 10 ? g : { ...g, goles_local: null, goles_visitante: null }));
const prov = prepararCopas({ partidos: copaOro, equipos: equiposCopa, grupos: sinTerminar, descuentos: [] });
igual(prov.oro.resueltos[0].local.provisorio, true, "zona sin terminar: cruce provisorio");
const htmlC = htmlCopas({ division: { codigo: "B", nombre: "División B" }, formato: { copas: true }, copas: prov, admin: false });
contiene(htmlC, "Copa de Oro", "título de la Copa de Oro");
contiene(htmlC, "Cruces provisorios", "aviso de cruces provisorios");
contiene(htmlCopas({ division: { codigo: "C", nombre: "División C" }, formato: {}, copas: {}, admin: false }), "se define más adelante", "la División C no tiene copas todavía");

console.log("Menú y pestañas");
contiene(htmlMenu({ divisiones: [{ codigo: "A", nombre: "División A", color: "#3b82f6" }], activa: "A", vista: "division" }), "activo", "el menú marca la división actual");
contiene(htmlMenu({ divisiones: [], vista: "challenger" }), 'href="#/challenger"', "el menú enlaza a la Copa Challenger");
contiene(htmlTabs({ codigo: "A", activa: "copas" }), 'href="#/division/A/copas"', "pestaña de copas");
contiene(htmlInicio({ liga: { nombre: "Liga" }, divisiones: [], temporada: null }), "Copa Challenger", "el inicio incluye la Challenger");

// =====================================================================
//  FASE 3 · jugadores, goleadores, tarjetas y suspensiones
// =====================================================================
console.log("Jugadores");
igual(parsearJugador("Pérez, Juan Carlos"), { apellido: "Pérez", nombre: "Juan Carlos" }, "separa apellido y nombre por la coma");
igual(parsearJugador("  de la   Fuente ,  Ana  "), { apellido: "de la Fuente", nombre: "Ana" }, "limpia espacios de más (apellidos compuestos)");
igual([parsearJugador("SoloApellido"), parsearJugador("Pérez,"), parsearJugador(",Juan")], [null, null, null], "sin coma o con un lado vacío: no es válido");
igual(claveJugador("Muñoz", "José"), claveJugador("MUNOZ", " jose "), "'Muñoz, José' y 'MUNOZ, jose' son el mismo jugador");
igual(claveJugador("Pérez", "Juan") === claveJugador("Perez", "Juana"), false, "nombres parecidos pero distintos no se confunden");
igual(nombreJugador({ apellido: "PÉREZ", nombre: "JUAN" }), "PÉREZ, JUAN", "formato 'APELLIDO, NOMBRE'");
igual(formatoFechaNumerica("2027-12-31"), "31/12/2027", "fecha dd/mm/aaaa");

console.log("Goleadores y tarjetas");
const jug = (a, n) => ({ apellido: a, nombre: n });
const eqX = { id: "e1", nombre: "MALVINAS" }, eqY = { id: "e2", nombre: "F90" };
const stats = [
  { jugador_id: "1", equipo_id: "e1", goles: 7, amarillas: 1, rojas: 0, jugadores: jug("PÉREZ", "JUAN"), equipos: eqX },
  { jugador_id: "2", equipo_id: "e2", goles: 7, amarillas: 3, rojas: 1, jugadores: jug("GÓMEZ", "LUIS"), equipos: eqY },
  { jugador_id: "3", equipo_id: "e1", goles: 3, amarillas: 0, rojas: 2, jugadores: jug("DÍAZ", "ANA"), equipos: eqX },
  { jugador_id: "4", equipo_id: "e2", goles: 0, amarillas: 0, rojas: 0, jugadores: jug("RUIZ", "PABLO"), equipos: eqY },
];
const gol = conPosicion(ordenarGoleadores(stats), (f) => f.goles);
igual(gol.map((f) => [f.jugadores.apellido, f.goles, f.pos]), [["GÓMEZ", 7, 1], ["PÉREZ", 7, 1], ["DÍAZ", 3, 3]], "goleadores: orden, empate compartiendo puesto y el de 0 goles no aparece");
igual(filasTarjetas(stats).map((f) => `${f.jugadores.apellido}:${f.tipo}:${f.cantidad}`),
  ["DÍAZ:roja:2", "GÓMEZ:roja:1", "GÓMEZ:amarilla:3", "PÉREZ:amarilla:1"], "tarjetas: primero rojas, luego amarillas, de más a menos");
igual(filasTarjetas(stats, "roja").length, 2, "filtro de rojas");
igual(filasTarjetas(stats, "amarilla").length, 2, "filtro de amarillas");

console.log("Suspensiones");
const hoy = "2026-10-20";
igual(estadoSancion({ activa: true, tipo: "hasta_fecha", hasta: "2027-12-31" }, hoy), { vigente: true, detalle: "Hasta el 31/12/2027" }, "hasta una fecha futura: vigente");
igual(estadoSancion({ activa: true, tipo: "hasta_fecha", hasta: "2026-06-30" }, hoy).vigente, false, "hasta una fecha pasada: vencida");
igual(estadoSancion({ activa: false, tipo: "de_por_vida" }, hoy), { vigente: false, detalle: "De por vida" }, "dada de baja: no vigente");
igual(estadoSancion({ activa: true, tipo: "partidos", partidos_total: 4, partidos_cumplidos: 2 }, hoy).detalle, "Cumplió 2 de 4 partidos", "por partidos: cuántos cumplió");
igual(estadoSancion({ activa: true, tipo: "partidos", partidos_total: 1, partidos_cumplidos: 0 }, hoy).detalle, "Cumplió 0 de 1 partido", "singular");

console.log("Vistas de estadísticas");
const hG = htmlGoleadores({ stats, admin: false });
contiene(hG, "GÓMEZ, LUIS", "el goleador aparece con 'APELLIDO, NOMBRE'");
igual(hG.includes("RUIZ"), false, "quien tiene 0 goles no aparece");
igual(hG.includes("data-accion"), false, "el público no ve botones de edición");
contiene(htmlGoleadores({ stats, admin: true }), 'data-accion="cargar-goles"', "el administrador ve '＋ Cargar goles'");
contiene(htmlGoleadores({ stats: [], admin: false }), "Todavía no hay goleadores", "mensaje cuando no hay datos");
contiene(htmlTarjetas({ stats, admin: false, tipo: "roja" }), 'class="chip activo" data-filtro-tarjeta="roja"', "el filtro elegido queda marcado");
contiene(htmlTarjetas({ stats, admin: false }), "tj--amarilla", "tarjeta amarilla con su color");
const sanciones = [
  { id: "s1", activa: true, tipo: "de_por_vida", causa: "Suspendido de por vida", jugadores: jug("TELLO", "FACUNDO"), equipos: null },
  { id: "s2", activa: true, tipo: "hasta_fecha", hasta: "2026-06-30", causa: "Hasta el 30/06/26", jugadores: jug("ATENCIO", "FRANCISCO"), equipos: eqX },
  { id: "s3", activa: true, tipo: "partidos", partidos_total: 4, partidos_cumplidos: 2, causa: "4 partidos", jugadores: jug("CEBALLOS", "FRANCISCO"), equipos: eqY },
];
const hS = htmlSuspensiones({ sanciones, admin: true, hoy });
contiene(hS, "TELLO, FACUNDO", "suspensión de un jugador sin equipo");
contiene(hS, 'class="vencida"', "el administrador ve la vencida en gris");
contiene(hS, 'data-accion="toggle-sancion"', "el administrador puede dar de baja");
igual(hS.indexOf("ATENCIO") > hS.indexOf("CEBALLOS"), true, "las vencidas quedan al final");
contiene(htmlSuspensiones({ sanciones: [], admin: false, hoy }), "No hay suspensiones vigentes", "mensaje cuando no hay suspensiones");
const xss3 = htmlSuspensiones({ sanciones: [{ id: "x", activa: true, tipo: "de_por_vida", causa: "<script>alert(1)</script>", jugadores: jug("<b>A</b>", "B"), equipos: null }], admin: false, hoy });
igual(xss3.includes("<script>") || xss3.includes("<b>A</b>"), false, "los textos cargados por el administrador se escapan");
contiene(htmlTabs({ codigo: "B", activa: "goleadores" }), 'href="#/division/B/suspensiones"', "las pestañas de la Fase 3 están habilitadas");

console.log(fallos ? `\n✘ ${fallos} prueba(s) fallaron` : "\n✔ Todas las pruebas pasaron");
process.exit(fallos ? 1 : 0);
