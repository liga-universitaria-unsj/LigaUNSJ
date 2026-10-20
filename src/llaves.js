// =====================================================================
//  MOTOR DE LLAVES
//  Sirve para la Copa de Oro, la Copa de Plata y la Copa Challenger.
//  Son funciones "puras": reciben datos y devuelven datos, sin tocar la pantalla,
//  por eso se pueden probar con  node pruebas/probar.mjs
//
//  Cada partido de una llave puede tener sus equipos de dos formas:
//    · fijos:        local_id / visitante_id
//    · por origen:   origen_local / origen_visitante, que pueden ser
//                      {"ganador":"P16"}            → el ganador del partido con ese código
//                      {"zona":"A","lugar":1}       → el 1º de la tabla de la Zona A
//  Si un partido tiene los dos (equipo fijo + origen), manda el equipo fijo; el origen
//  solo sirve para dibujar de dónde viene (ej. el ganador de la ronda previa).
// =====================================================================
import { fechaCorta } from "./util.js";

export const numeroCodigo = (codigo) => parseInt(String(codigo ?? "").replace(/\D/g, ""), 10) || 0;

const tieneResultado = (p) => p.goles_local != null && p.goles_visitante != null;

// Quién ganó un partido: "local", "visitante" o null (sin jugar, o empatado sin penales cargados)
export function ladoGanador(p) {
  if (!tieneResultado(p)) return null;
  if (p.goles_local > p.goles_visitante) return "local";
  if (p.goles_local < p.goles_visitante) return "visitante";
  return p.penales_ganador === "local" || p.penales_ganador === "visitante" ? p.penales_ganador : null;
}

// ---------------------------------------------------------------------
//  1. Completar cada partido con sus equipos, el ganador y el perdedor
//     equipos:       Map id → equipo
//     posiciones:    { A: [filas de la tabla], B: [...] }   (para los cruces "1º Zona A")
//     zonaCompleta:  { A: true/false, ... }                 (si la zona terminó; si no, el cruce es provisorio)
// ---------------------------------------------------------------------
export function resolverLlaves(partidos, { equipos = new Map(), posiciones = {}, zonaCompleta = {} } = {}) {
  const lista = partidos.map((p) => ({ ...p, codigo: p.codigo ?? p.id }));
  const porCodigo = new Map(lista.map((p) => [p.codigo, p]));
  const memo = new Map();

  const resolverLado = (p, lado, nivel) => {
    const id = lado === "local" ? p.local_id : p.visitante_id;
    const origen = lado === "local" ? p.origen_local : p.origen_visitante;

    if (id) {
      const equipo = equipos.get(id) ?? null;
      return { equipo, etiqueta: equipo?.nombre ?? "—", provisorio: false, de: origen?.ganador ?? null };
    }
    if (origen?.ganador) {
      const previo = resolver(origen.ganador, nivel + 1);
      return { equipo: previo?.ganador ?? null, etiqueta: `Ganador ${origen.ganador}`, provisorio: false, de: origen.ganador };
    }
    if (origen?.zona) {
      const fila = posiciones[origen.zona]?.[origen.lugar - 1];
      return { equipo: fila?.equipo ?? null, etiqueta: `${origen.lugar}º Zona ${origen.zona}`, provisorio: !zonaCompleta[origen.zona], de: null };
    }
    return { equipo: null, etiqueta: "A definir", provisorio: false, de: null };
  };

  const resolver = (codigo, nivel = 0) => {
    if (memo.has(codigo)) return memo.get(codigo);
    const p = porCodigo.get(codigo);
    if (!p || nivel > 25) return null;                       // protege de vínculos circulares
    const local = resolverLado(p, "local", nivel);
    const visitante = resolverLado(p, "visitante", nivel);
    const lado = ladoGanador(p);
    const r = {
      ...p, local, visitante, lado,
      jugado: tieneResultado(p),
      ganador: lado === "local" ? local.equipo : lado === "visitante" ? visitante.equipo : null,
      perdedor: lado === "local" ? visitante.equipo : lado === "visitante" ? local.equipo : null,
    };
    memo.set(codigo, r);
    return r;
  };

  return lista.map((p) => resolver(p.codigo));
}

// ---------------------------------------------------------------------
//  2. Posiciones del cuadro (dónde dibujar cada partido y las líneas que los unen)
//     Estructura: la final al centro, una semifinal a cada lado y las rondas anteriores hacia afuera.
// ---------------------------------------------------------------------
const media = (numeros) => numeros.reduce((a, b) => a + b, 0) / numeros.length;

export function layoutBracket(resueltos, opciones = {}) {
  const { anchoCard = 200, hueco = 28, filaH = 94, altoCard = 78, cabecera = 44, margen = 8 } = opciones;
  const colW = anchoCard + hueco;

  const porCodigo = new Map(resueltos.map((p) => [p.codigo, p]));
  const hijosDe = (p) => [p.origen_local?.ganador, p.origen_visitante?.ganador]
    .filter((c) => c && c !== p.codigo && porCodigo.has(c));

  const padre = new Map();
  for (const p of resueltos) for (const h of hijosDe(p)) if (!padre.has(h)) padre.set(h, p.codigo);

  const tamano = (codigo, vistos = new Set()) => {
    if (vistos.has(codigo)) return 0;
    vistos.add(codigo);
    return 1 + hijosDe(porCodigo.get(codigo)).reduce((s, h) => s + tamano(h, vistos), 0);
  };
  let raices = resueltos.filter((p) => !padre.has(p.codigo)).sort((a, b) => tamano(b.codigo) - tamano(a.codigo));
  if (!raices.length && resueltos.length) raices = [resueltos[0]];

  const nodos = [], enlaces = [], columnas = [];
  let yBase = 0;

  raices.forEach((raiz, indiceRaiz) => {
    const prof = new Map(), lado = new Map(), y = new Map();

    const asignarProf = (c, d) => {
      if (prof.has(c)) return;
      prof.set(c, d);
      hijosDe(porCodigo.get(c)).forEach((h) => asignarProf(h, d + 1));
    };
    asignarProf(raiz.codigo, 0);

    const hijosRaiz = hijosDe(raiz).filter((h) => prof.has(h));
    lado.set(raiz.codigo, "centro");
    const marcar = (c, l) => {
      lado.set(c, l);
      hijosDe(porCodigo.get(c)).forEach((h) => { if (!lado.has(h)) marcar(h, l); });
    };
    hijosRaiz.forEach((h, i) => marcar(h, i === 0 ? "izq" : "der"));

    // Vertical: las hojas ocupan lugares consecutivos; los demás van en el medio de sus hijos
    const cont = { izq: 0, der: 0 };
    const asignarY = (c, l) => {
      if (y.has(c)) return;
      const hs = hijosDe(porCodigo.get(c)).filter((h) => prof.has(h));
      if (!hs.length) { y.set(c, yBase + cabecera + cont[l]++ * filaH + filaH / 2); return; }
      hs.forEach((h) => asignarY(h, l));
      y.set(c, media(hs.map((h) => y.get(h))));
    };
    hijosRaiz.forEach((h, i) => asignarY(h, i === 0 ? "izq" : "der"));
    y.set(raiz.codigo, hijosRaiz.length ? media(hijosRaiz.map((h) => y.get(h))) : yBase + cabecera + filaH / 2);

    // Horizontal: la profundidad define la columna (izquierda o derecha de la final)
    const maxProf = Math.max(...prof.values());
    const xDe = (c) => {
      const d = prof.get(c), l = lado.get(c);
      return l === "izq" ? (maxProf - d) * colW : l === "der" ? (maxProf + d) * colW : maxProf * colW;
    };

    const nodosArbol = [...prof.keys()].map((c) => ({ p: porCodigo.get(c), x: xDe(c), y: y.get(c), lado: lado.get(c), profundidad: prof.get(c) }));
    const nodoDe = new Map(nodosArbol.map((n) => [n.p.codigo, n]));
    for (const n of nodosArbol) {
      for (const h of hijosDe(n.p).filter((c) => prof.has(c))) {
        const hijo = nodoDe.get(h);
        const x1 = hijo.lado === "izq" ? hijo.x + anchoCard : hijo.x;
        const x2 = hijo.lado === "izq" ? n.x : n.x + anchoCard;
        enlaces.push({ x1, y1: hijo.y, x2, y2: n.y, xm: (x1 + x2) / 2 });
      }
    }

    // Títulos de columna (solo para el cuadro principal)
    if (indiceRaiz === 0) {
      const grupos = new Map();
      for (const n of nodosArbol) {
        const k = `${n.lado}:${n.profundidad}`;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(n);
      }
      for (const grupo of grupos.values()) {
        const fechas = grupo.map((n) => n.p.fecha).filter(Boolean).sort();
        const desde = fechas[0] ? fechaCorta(fechas[0]) : "";
        const hasta = fechas.length ? fechaCorta(fechas[fechas.length - 1]) : "";
        columnas.push({ x: grupo[0].x, titulo: grupo[0].p.ronda ?? "", fecha: desde && desde !== hasta ? `${desde} – ${hasta}` : desde });
      }
    }

    nodos.push(...nodosArbol);
    yBase = Math.max(...nodosArbol.map((n) => n.y)) + altoCard / 2 + margen;
  });

  if (!nodos.length) return { nodos: [], enlaces: [], columnas: [], ancho: 0, alto: 0, anchoCard, altoCard, padre, porCodigo: new Map() };

  // Se corre todo para que el borde izquierdo quede en el margen
  const minX = Math.min(...nodos.map((n) => n.x));
  const desplazar = margen - minX;
  nodos.forEach((n) => { n.x += desplazar; });
  enlaces.forEach((e) => { e.x1 += desplazar; e.x2 += desplazar; e.xm += desplazar; });
  columnas.forEach((c) => { c.x += desplazar; });

  return {
    nodos, enlaces, columnas, anchoCard, altoCard, padre,
    porCodigo: new Map(nodos.map((n) => [n.p.codigo, n])),
    ancho: Math.max(...nodos.map((n) => n.x)) + anchoCard + margen,
    alto: Math.max(...nodos.map((n) => n.y)) + altoCard / 2 + margen,
  };
}

// ---------------------------------------------------------------------
//  3. Camino posible de un equipo hasta la final
// ---------------------------------------------------------------------
export function caminoDe(equipoId, layout) {
  const candidatos = layout.nodos.filter((n) =>
    n.p.local.equipo?.id === equipoId || n.p.visitante.equipo?.id === equipoId);
  if (!candidatos.length) return null;

  // Su primer partido es el de la ronda más temprana (mayor profundidad en el cuadro)
  candidatos.sort((a, b) => b.profundidad - a.profundidad || numeroCodigo(a.p.codigo) - numeroCodigo(b.p.codigo));

  const partidos = [];
  let eliminadoEn = null;
  let nodo = candidatos[0];
  while (nodo) {
    const p = nodo.p;
    partidos.push(p);
    if (p.jugado && p.lado && p.perdedor?.id === equipoId) { eliminadoEn = p.codigo; break; }
    const siguiente = layout.padre.get(p.codigo);
    nodo = siguiente ? layout.porCodigo.get(siguiente) : null;
  }
  const ultimo = partidos[partidos.length - 1];
  const campeon = !eliminadoEn && Boolean(ultimo.jugado && ultimo.ganador?.id === equipoId && !layout.padre.has(ultimo.codigo));
  return { partidos, eliminadoEn, campeon };
}
