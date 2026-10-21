// Cuadros de formulario reutilizables (<dialog> nativo del navegador).
import { esc } from "./util.js";
import { nombreJugador, claveJugador, parsearJugador } from "./jugadores.js";

// Un campo del formulario: texto, número, fecha, hora o lista desplegable
function htmlCampo(c) {
  const control = c.tipo === "select"
    ? `<select name="${esc(c.nombre)}">${c.opciones.map((o) =>
        `<option value="${esc(o.valor)}"${String(o.valor) === String(c.valor ?? "") ? " selected" : ""}>${esc(o.texto)}</option>`).join("")}</select>`
    : `<input name="${esc(c.nombre)}" type="${esc(c.tipo || "text")}" value="${esc(c.valor ?? "")}"
        placeholder="${esc(c.placeholder || "")}" ${c.requerido ? "required" : ""} ${c.min !== undefined ? `min="${esc(c.min)}"` : ""}
        ${c.autocomplete ? `autocomplete="${esc(c.autocomplete)}"` : ""} ${c.foco ? "data-foco" : ""}>`;
  // visibleSi: { campo: "tipo", valores: ["partidos"] } → el campo solo se muestra con esa opción elegida
  const condicion = c.visibleSi
    ? ` data-si-campo="${esc(c.visibleSi.campo)}" data-si-valores="${esc(c.visibleSi.valores.join(","))}"` : "";
  return `<label${condicion}>${esc(c.etiqueta)}${control}</label>`;
}

// Muestra u oculta los campos con condición, y vuelve a evaluarlos cada vez que cambia el campo del que dependen
function aplicarCondiciones(form) {
  const etiquetas = form.querySelectorAll("label[data-si-campo]");
  const actualizar = () => etiquetas.forEach((l) => {
    const campo = form.elements[l.dataset.siCampo];
    l.hidden = !l.dataset.siValores.split(",").includes(campo?.value);
  });
  etiquetas.forEach((l) => form.elements[l.dataset.siCampo]?.addEventListener("change", actualizar));
  actualizar();
}

// Arma el cuadro, lo muestra y devuelve una función para cerrarlo
function abrirDialogo(contenido, alCerrar) {
  const d = document.createElement("dialog");
  d.className = "modal";
  d.innerHTML = `<form method="dialog">${contenido}</form>`;
  document.body.appendChild(d);
  const form = d.querySelector("form");
  const cerrar = (valor) => { if (d.open) d.close(); d.remove(); alCerrar(valor); };
  d.querySelector("[data-cancelar]").onclick = () => cerrar(null);
  d.addEventListener("cancel", () => cerrar(null));                  // tecla Esc
  return { d, form, cerrar };
}

const botones = (ok) => `
  <div class="acciones">
    <button type="button" class="sec" data-cancelar>Cancelar</button>
    <button type="submit">${esc(ok)}</button>
  </div>`;

// Devuelve una promesa con los valores { nombre: valor } o null si se cancela.
export function formulario({ titulo, ayuda = "", campos, ok = "Guardar" }) {
  return new Promise((resolver) => {
    const { d, form, cerrar } = abrirDialogo(`
      <h2>${esc(titulo)}</h2>
      ${ayuda ? `<p class="ayuda">${esc(ayuda)}</p>` : ""}
      ${campos.map(htmlCampo).join("")}
      ${botones(ok)}`, resolver);

    form.onsubmit = (e) => { e.preventDefault(); cerrar(Object.fromEntries(new FormData(form))); };
    aplicarCondiciones(form);
    d.showModal();
    (form.querySelector("[data-foco]") || form.querySelector("input"))?.focus();
  });
}

// Formulario con equipo + jugador (con autocompletado de los jugadores ya cargados) y campos extra.
// Devuelve { equipo_id, apellido, nombre, ...campos extra } o null si se cancela.
//   equipos:    [{ id, nombre }]               jugadores: [{ id, apellido, nombre, equipo_id }]
//   edicion:    true = se está corrigiendo un jugador ya cargado (se puede cambiar el nombre)
export function formularioJugador({
  titulo, ayuda = "", equipos, jugadores, equipoId = "", apellido = "", nombre = "",
  bloquearEquipo = false, permitirSinEquipo = false, edicion = false, campos = [], ok = "Guardar",
}) {
  return new Promise((resolver) => {
    const opciones = [
      { valor: "", texto: permitirSinEquipo ? "Sin equipo / otro" : "Elegí el equipo…" },
      ...equipos.map((e) => ({ valor: e.id, texto: e.nombre })),
    ];
    const valorInicial = apellido && nombre ? `${apellido}, ${nombre}` : "";

    const { d, form, cerrar } = abrirDialogo(`
      <h2>${esc(titulo)}</h2>
      ${ayuda ? `<p class="ayuda">${esc(ayuda)}</p>` : ""}
      <label>Equipo
        <select name="equipo" ${bloquearEquipo ? "disabled" : ""}>${opciones.map((o) =>
          `<option value="${esc(o.valor)}"${String(o.valor) === String(equipoId ?? "") ? " selected" : ""}>${esc(o.texto)}</option>`).join("")}</select>
      </label>
      <label>Jugador (Apellido, Nombre)
        <input name="jugador" list="lista-jugadores-dlg" autocomplete="off" required placeholder="Ej.: PÉREZ, JUAN" value="${esc(valorInicial)}">
        <datalist id="lista-jugadores-dlg"></datalist>
      </label>
      <p class="hint" id="hint-jugador"></p>
      ${campos.map(htmlCampo).join("")}
      <p class="error-form" hidden></p>
      ${botones(ok)}`, resolver);

    const selEquipo = form.elements.equipo;
    const entrada = form.elements.jugador;
    const lista = d.querySelector("datalist");
    const hint = d.querySelector("#hint-jugador");
    const error = d.querySelector(".error-form");

    const delEquipo = () => jugadores.filter((j) => (j.equipo_id ?? "") === (selEquipo.value ?? ""));
    const rearmarLista = () => {
      lista.innerHTML = delEquipo().map((j) => `<option value="${esc(nombreJugador(j))}"></option>`).join("");
    };
    const mostrarAyuda = () => {
      error.hidden = true;
      const texto = entrada.value.trim();
      if (!texto) { hint.textContent = ""; hint.className = "hint"; return; }
      if (edicion) { hint.textContent = "Si corregís el nombre, se actualiza en todas las tablas."; hint.className = "hint"; return; }
      const p = parsearJugador(texto);
      if (!p) { hint.textContent = "Escribilo como Apellido, Nombre (con coma)."; hint.className = "hint aviso"; return; }
      const existente = delEquipo().find((j) => claveJugador(j.apellido, j.nombre) === claveJugador(p.apellido, p.nombre));
      hint.textContent = existente ? `✔ Jugador ya cargado: ${nombreJugador(existente)}` : "Jugador nuevo: se va a crear en este equipo.";
      hint.className = existente ? "hint ok" : "hint nuevo";
    };

    selEquipo.addEventListener("change", () => { rearmarLista(); mostrarAyuda(); });
    entrada.addEventListener("input", mostrarAyuda);
    rearmarLista();
    mostrarAyuda();
    aplicarCondiciones(form);

    const fallo = (texto) => { error.textContent = texto; error.hidden = false; };
    form.onsubmit = (e) => {
      e.preventDefault();
      const p = parsearJugador(entrada.value);
      if (!p) return fallo("Escribí el jugador como Apellido, Nombre (con coma).");
      if (!permitirSinEquipo && !selEquipo.value) return fallo("Elegí el equipo.");
      const datos = Object.fromEntries(new FormData(form));
      delete datos.equipo; delete datos.jugador;
      cerrar({ ...datos, equipo_id: selEquipo.value || null, apellido: p.apellido, nombre: p.nombre });
    };

    d.showModal();
    (valorInicial ? form.querySelector("input[type=number], input:not([name=jugador])") : entrada)?.focus();
  });
}
