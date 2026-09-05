# Itinerario Japón — Luna de miel (28 oct – 12 nov 2026)

Página publicada: https://nabilzeitun.github.io/japon-luna-de-miel/

`index.html` es la página publicada (autocontenida: HTML + CSS + JS + mapas incrustados en base64, sin llamadas de red en tiempo de ejecución). No la edites a mano — se genera desde `template.html`.

## Cómo hacer un cambio

1. Editar `trip-config.js` (paradas, horarios, notas) y/o `template.html` (diseño/interacción).
2. Si cambian las paradas de algún día, regenerar todo (para que el mapa de ese día se actualice):
   ```bash
   npm install        # solo la primera vez, instala jimp
   node build.js
   node build_maps.js
   node inject.js
   ```
   Si el cambio es solo de diseño/JS (no de contenido/paradas), basta con `node inject.js`.
3. `inject.js` escribe `itinerario.html`. Copiarlo/renombrarlo a `index.html` (o ajustar `inject.js` para que escriba directamente `index.html`).
4. `git add -A && git commit -m "..." && git push` — GitHub Pages sirve automáticamente el `index.html` de la rama `main`.

## Estructura

- `japon_kmz/` — datos fuente exportados del KMZ de Google Maps (doc.kml + parsed.json).
- `parse_kml.js` — parsea el KMZ/KML a JSON.
- `build.js` — resuelve `trip-config.js` contra los datos y calcula horarios/transporte → `trip.json`.
- `build_maps.js` — descarga teselas de OpenStreetMap y genera las imágenes de mapa de cada día (requiere `jimp`).
- `inject.js` — inyecta `trip.json` en `template.html` → `itinerario.html`.
- `template.html` — el HTML/CSS/JS de la página (sin los datos).
