// =====================================================================
//  Datos fijos de la liga. Es el archivo que se toca para ajustar formatos.
// =====================================================================

export const LIGA = {
  nombre: "Liga Universitaria",
  sigla: "UNSJ",
};

// Formato de cada división en la fase de zonas.
//   oro   → cuántos primeros de cada zona pasan a la Copa de Oro
//   plata → [desde, hasta] puestos de cada zona que pasan a la Copa de Plata
//   copas → true si la división tiene Copa de Oro y de Plata (se arman en la pestaña "Copas")
// La División C se define más adelante con la liga.
export const FORMATOS = {
  A: { oro: 4, plata: [5, 8], copas: true },
  B: { oro: 4, plata: [5, 8], copas: true },
  C: {},
};

// Equipo "LIBRE": no existe como equipo, ese equipo simplemente descansa la fecha.
