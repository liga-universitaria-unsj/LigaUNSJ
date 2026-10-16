# Liga Universitaria

Web de la liga: posiciones y fixture por división, con panel de administración para cargar
resultados, días y horarios (y postergaciones con su motivo).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Descarga las dependencias (solo la primera vez) |
| `npm run dev` | Abre la versión de desarrollo; se actualiza sola al guardar |
| `npm run build` | Genera la carpeta `dist` lista para publicar |
| `node pruebas/probar.mjs` | Prueba la lógica de tablas y vistas (no necesita internet) |

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
  vistas/             Pantallas: menú, posiciones, fixture
  styles/estilos.css  Colores y diseño
pruebas/probar.mjs    Pruebas de la lógica
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
