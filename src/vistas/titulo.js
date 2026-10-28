// =====================================================================
//  CAMINO AL TÍTULO DE LA DIVISIÓN (campeón absoluto del año)
//  Función "pura": decide en qué etapa está el año y quién es el campeón.
//
//  Reglas de la liga:
//   1) Cuando terminan el Apertura y el Clausura, los dos campeones (Copa de Oro) juegan la
//      "final de campeones".
//   2) El ganador juega la Superfinal contra el 1º de la tabla anual.
//   3) Si un mismo equipo ganó el Apertura y el Clausura, no se juega nada: es campeón absoluto.
//   4) Si el ganador de la final de campeones es también el 1º de la tabla anual, es campeón
//      absoluto sin jugar la Superfinal.
// =====================================================================

// apertura / clausura / lider: equipo o null.  fc / sf: partidos ya resueltos (con .ganador) o null.
export function estadoTitulo({ apertura, clausura, lider, fc = null, sf = null }) {
  const base = { campeon: null, mostrarLlave: false, sinJugar: false };
  const nombre = (e) => e.nombre;

  if (!apertura && !clausura) return { ...base, etapa: "espera", texto: "Todavía no hay campeones de torneo cargados." };
  if (!apertura) return { ...base, etapa: "espera", texto: "Falta cargar el campeón del Apertura." };
  if (!clausura) return { ...base, etapa: "espera", texto: `Campeón del Apertura: ${nombre(apertura)}. Falta definirse el campeón del Clausura; cuando termine, juegan la final de campeones.` };

  if (apertura.id === clausura.id) {
    return { ...base, etapa: "campeon", campeon: apertura, sinJugar: true,
      texto: `${nombre(apertura)} ganó el Apertura y el Clausura: es campeón absoluto y no se juega la Superfinal.` };
  }

  const ganadorFinal = fc?.ganador ?? null;
  if (!ganadorFinal) {
    return { ...base, etapa: "final-campeones", mostrarLlave: true,
      texto: `Final de campeones: ${nombre(apertura)} (Apertura) vs ${nombre(clausura)} (Clausura). El ganador juega la Superfinal contra el 1º de la tabla anual.` };
  }

  if (lider && lider.id === ganadorFinal.id) {
    return { ...base, etapa: "campeon", campeon: ganadorFinal, sinJugar: true, mostrarLlave: true,
      texto: `${nombre(ganadorFinal)} ganó la final de campeones y además es el 1º de la tabla anual: es campeón absoluto sin jugar la Superfinal.` };
  }
  if (!lider) {
    return { ...base, etapa: "espera", mostrarLlave: true, texto: `${nombre(ganadorFinal)} ganó la final de campeones. Falta la tabla anual para definir la Superfinal.` };
  }

  const ganadorSuper = sf?.ganador ?? null;
  if (ganadorSuper) {
    return { ...base, etapa: "campeon", campeon: ganadorSuper, mostrarLlave: true,
      texto: `${nombre(ganadorSuper)} ganó la Superfinal y es el campeón absoluto.` };
  }
  return { ...base, etapa: "superfinal", mostrarLlave: true,
    texto: `Superfinal: ${nombre(ganadorFinal)} (ganador de la final de campeones) vs ${nombre(lider)} (1º de la tabla anual).` };
}
