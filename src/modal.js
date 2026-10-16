// Cuadro de formulario reutilizable (<dialog> nativo del navegador).
// Devuelve una promesa con los valores { nombre: valor } o null si se cancela.
import { esc } from "./util.js";

export function formulario({ titulo, ayuda = "", campos, ok = "Guardar" }) {
  return new Promise((resolver) => {
    const d = document.createElement("dialog");
    d.className = "modal";
    d.innerHTML = `
      <form method="dialog">
        <h2>${esc(titulo)}</h2>
        ${ayuda ? `<p class="ayuda">${esc(ayuda)}</p>` : ""}
        ${campos.map((c) => `
          <label>${esc(c.etiqueta)}
            <input name="${esc(c.nombre)}" type="${esc(c.tipo || "text")}" value="${esc(c.valor ?? "")}"
              placeholder="${esc(c.placeholder || "")}" ${c.requerido ? "required" : ""}
              ${c.autocomplete ? `autocomplete="${esc(c.autocomplete)}"` : ""} ${c.foco ? "data-foco" : ""}>
          </label>`).join("")}
        <div class="acciones">
          <button type="button" class="sec" data-cancelar>Cancelar</button>
          <button type="submit">${esc(ok)}</button>
        </div>
      </form>`;
    document.body.appendChild(d);

    const form = d.querySelector("form");
    const cerrar = (valor) => { if (d.open) d.close(); d.remove(); resolver(valor); };
    d.querySelector("[data-cancelar]").onclick = () => cerrar(null);
    d.addEventListener("cancel", () => cerrar(null));              // tecla Esc
    form.onsubmit = (e) => { e.preventDefault(); cerrar(Object.fromEntries(new FormData(form))); };

    d.showModal();
    (form.querySelector("[data-foco]") || form.querySelector("input"))?.focus();
  });
}
