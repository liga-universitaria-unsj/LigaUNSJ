// Pruebas rápidas de la lógica (no necesitan internet ni la base de datos).
// Se ejecutan con:  node pruebas/probar.mjs
import { calcularTabla } from "../src/tabla.js";
import { htmlPosiciones } from "../src/vistas/posiciones.js";
import { htmlFixture } from "../src/vistas/fixture.js";
import { htmlMenu } from "../src/vistas/layout.js";
import { esc, formatoFecha, formatoHora } from "../src/util.js";

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

// --- División B, Zona A, con los resultados de las fechas 1 a 3 y el descuento de Gol en Contra ---
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

// --- Vistas ---
console.log("Vistas");
const formato = { oro: 4, plata: [5, 8] };
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

// Equipo libre: en una zona de 7 equipos, el que no juega se muestra como "Libre"
const siete = ["A1", "A2", "A3", "A4", "A5", "A6", "A7"].map((n) => ({ id: n, nombre: n, zona: "B" }));
const fixLibre = htmlFixture({ equipos: siete, partidos: [
  { id: "1", local_id: "A1", visitante_id: "A2", zona: "B", nro_fecha: 1, estado: "programado" },
  { id: "2", local_id: "A3", visitante_id: "A4", zona: "B", nro_fecha: 1, estado: "programado" },
  { id: "3", local_id: "A5", visitante_id: "A6", zona: "B", nro_fecha: 1, estado: "programado" }] });
contiene(fixLibre, "Libre: A7", "indica qué equipo descansa en la fecha");

contiene(htmlMenu({ divisiones: [{ codigo: "A", nombre: "División A", color: "#3b82f6" }], activa: "A" }), "activo", "el menú marca la división actual");

console.log("Utilidades");
igual(formatoFecha("2026-10-17"), "sáb 17 oct", "formato de fecha");
igual(formatoHora("21:10:00"), "21:10", "formato de hora");
igual(esc('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;", "escape de HTML");

console.log(fallos ? `\n✘ ${fallos} prueba(s) fallaron` : "\n✔ Todas las pruebas pasaron");
process.exit(fallos ? 1 : 0);
