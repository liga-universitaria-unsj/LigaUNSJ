# Liga Universitaria

Web de la liga: posiciones y fixture por división, con panel de administración para cargar
resultados, días y horarios (y postergaciones con su motivo).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Descarga las dependencias (solo la primera vez) |
| `npm run dev` | Abre la versión de desarrollo; se actualiza sola al guardar |
| `npm run build` | Genera la carpeta `dist` lista para publicar |
| `node pruebas/probar.mjs` | Prueba la lógica de tablas, llaves, goleadores, tarjetas y suspensiones (no necesita internet) |
| `node pruebas/revisar-imports.mjs` | Revisa que ningún archivo pida algo que no existe (evita la pantalla en blanco al copiar archivos) |

## Configuración

Copiar `.env.example` como `.env` y completar la URL y la clave *publishable* de Supabase.
En Netlify se cargan las mismas variables (*Project configuration → Environment variables*).
Las variables de Vite empiezan con `VITE_`.

## Estructura

```
index.html            Página única
src/
  main.js             Arranque, navegación y botones
  liga.js             Nombre de la liga y formato de copas por división
  config.js           Variables de entorno
  supabase.js         Conexión con la base de datos
  datos.js            Lectura de datos
  admin.js            Escritura (solo administrador; la base lo verifica)
  auth.js             Inicio de sesión del administrador
  modal.js            Cuadros de formulario
  tabla.js            Cálculo de posiciones
  util.js             Funciones chicas (fechas, escudos, escape de HTML)
  llaves.js           Motor de llaves: cruces, ganadores, penales, dibujo del cuadro y camino de un equipo
  jugadores.js        Jugadores, goleadores, tarjetas y suspensiones (sin pantalla)
  vistas/             Pantallas: menú, posiciones, fixture, copas, cuadro de llaves, Copa Challenger y estadísticas
  styles/estilos.css  Colores y diseño
pruebas/probar.mjs    Pruebas de la lógica (incluye los 36 partidos reales de la Copa Challenger)
pruebas/challenger.json  Datos de prueba de la Challenger
```

## Escudos

1. En Supabase: *Storage → escudos → Upload*, con los archivos PNG nombrados como el `slug` del equipo
   (por ejemplo `gol-en-contra.png`).
2. En el SQL Editor (cambiando la URL por la de tu proyecto):
   ```sql
   update equipos
   set escudo_url = 'https://TU-PROYECTO.supabase.co/storage/v1/object/public/escudos/' || slug || '.png'
   where slug in ('gol-en-contra', 'malvinas');   -- los que ya subiste
   ```

## Cuadros de llaves

Un partido de llave sabe de dónde viene cada equipo (`origen_local` / `origen_visitante` en la base):
`{"ganador":"P16"}` = el ganador de ese partido, `{"zona":"A","lugar":1}` = el 1º de la Zona A.
Con eso el cuadro se arma solo y avanza cuando el administrador carga un resultado
(si hubo empate, elige quién ganó por penales).
Sirve para la Copa de Oro, la Copa de Plata y la Copa Challenger.

## Goleadores, tarjetas y suspensiones

El administrador carga el **total por jugador** en el torneo (no partido por partido).
Los jugadores se crean al cargarlos y se comparan sin tildes ni mayúsculas, así
"Muñoz, José" y "MUNOZ, jose" son el mismo y no se duplican (la base lo garantiza,
ver `liga/05_estadisticas.sql`). Con total 0 el jugador sale de la tabla.
Las suspensiones las decide la liga: se cargan a mano, y las que tienen fecha de
vencimiento se ocultan solas al público cuando vencen.

## Si la página queda en blanco

Casi siempre es un archivo que no se actualizó. Abrí la consola del navegador (F12) y
corré `node pruebas/revisar-imports.mjs`: dice qué archivo tiene el problema.
Ante la duda, reemplazá la carpeta `src` completa.
