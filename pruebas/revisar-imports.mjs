// Revisa que todos los "import" del proyecto apunten a archivos y funciones que existen.
// Es lo que provoca la "pantalla en blanco" cuando se copian archivos a medias.
// Uso (desde la carpeta del proyecto):   node pruebas/revisar-imports.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const archivos = [];
(function recorrer(carpeta) {
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) recorrer(ruta); else if (e.name.endsWith(".js")) archivos.push(ruta);
  }
})(raiz);

// Lo que exporta cada archivo
const exportaciones = new Map();
for (const f of archivos) {
  const codigo = fs.readFileSync(f, "utf8");
  const nombres = new Set();
  for (const m of codigo.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) nombres.add(m[1]);
  for (const m of codigo.matchAll(/^export\s*\{([^}]*)\}/gm)) m[1].split(",").forEach((n) => { const x = n.trim().split(/\s+as\s+/).pop(); if (x) nombres.add(x); });
  exportaciones.set(f, nombres);
}

const rel = (f) => path.relative(path.dirname(raiz), f).replaceAll("\\", "/");
let problemas = 0;
for (const f of archivos) {
  const codigo = fs.readFileSync(f, "utf8");
  for (const m of codigo.matchAll(/^import\s+(?:([\s\S]*?)\s+from\s+)?["']([^"']+)["'];?/gm)) {
    const [, lo_importado, origen] = m;
    if (!origen.startsWith(".")) continue;                    // librerías (supabase) y similares
    if (origen.endsWith(".css")) { if (!fs.existsSync(path.resolve(path.dirname(f), origen))) { problemas++; console.log(`✘ ${rel(f)}: no existe ${origen}`); } continue; }
    const destino = path.resolve(path.dirname(f), origen);
    if (!exportaciones.has(destino)) { problemas++; console.log(`✘ ${rel(f)}: importa "${origen}" pero ese archivo no existe`); continue; }
    const llaves = (lo_importado ?? "").match(/\{([\s\S]*)\}/);
    if (!llaves) continue;
    for (const pedido of llaves[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      if (!exportaciones.get(destino).has(pedido)) { problemas++; console.log(`✘ ${rel(f)}: pide "${pedido}" de "${origen}", pero ${rel(destino)} no lo tiene`); }
    }
  }
}
console.log(problemas ? `\n✘ ${problemas} problema(s). Copiá de nuevo la carpeta src completa.` : `✔ Todos los imports están bien (${archivos.length} archivos revisados).`);
process.exit(problemas ? 1 : 0);
