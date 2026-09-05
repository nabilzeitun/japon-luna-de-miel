const fs = require('fs');
const path = require('path');
const https = require('https');
const { Jimp } = require('jimp');

const TILE_SIZE = 256;
const USER_AGENT = 'HoneymoonItineraryBuilder/1.0 (one-time personal trip-planning build; contact: nabilzeitun@gmail.com)';
const CACHE_DIR = path.join(__dirname, 'tile_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function lon2x(lon, zoom) { return (lon + 180) / 360 * Math.pow(2, zoom) * TILE_SIZE; }
function lat2y(lat, zoom) {
  const latRad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom) * TILE_SIZE;
}

function fetchTile(z, x, y) {
  const cacheFile = path.join(CACHE_DIR, `${z}_${x}_${y}.png`);
  if (fs.existsSync(cacheFile)) return Promise.resolve(cacheFile);
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode + ' for ' + url)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => { fs.writeFileSync(cacheFile, Buffer.concat(chunks)); resolve(cacheFile); });
    }).on('error', reject);
  });
}

// Genera una imagen recortada exactamente al bbox [minLon,minLat,maxLon,maxLat] con el zoom dado.
// Devuelve { jimpImage, originX, originY, zoom } donde originX/Y son los píxeles-mundo (en ese zoom) de la esquina superior-izquierda del recorte.
async function renderBbox(minLon, minLat, maxLon, maxLat, zoom, targetW, targetH) {
  const pxMinX = lon2x(minLon, zoom), pxMaxX = lon2x(maxLon, zoom);
  const pxMinY = lat2y(maxLat, zoom), pxMaxY = lat2y(minLat, zoom); // lat invertida (Y crece hacia el sur)
  const cx = (pxMinX + pxMaxX) / 2, cy = (pxMinY + pxMaxY) / 2;
  const originX = Math.round(cx - targetW / 2), originY = Math.round(cy - targetH / 2);

  const tileMinX = Math.floor(originX / TILE_SIZE), tileMaxX = Math.floor((originX + targetW - 1) / TILE_SIZE);
  const tileMinY = Math.floor(originY / TILE_SIZE), tileMaxY = Math.floor((originY + targetH - 1) / TILE_SIZE);

  const composite = new Jimp({ width: (tileMaxX - tileMinX + 1) * TILE_SIZE, height: (tileMaxY - tileMinY + 1) * TILE_SIZE, color: 0xeeeeeeff });
  for (let tx = tileMinX; tx <= tileMaxX; tx++) {
    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
      try {
        const file = await fetchTile(zoom, tx, ty);
        const img = await Jimp.read(file);
        composite.composite(img, (tx - tileMinX) * TILE_SIZE, (ty - tileMinY) * TILE_SIZE);
      } catch (e) {
        console.log('  tile fail', zoom, tx, ty, e.message);
      }
    }
  }
  const cropX = originX - tileMinX * TILE_SIZE, cropY = originY - tileMinY * TILE_SIZE;
  composite.crop({ x: cropX, y: cropY, w: targetW, h: targetH });
  return { jimpImage: composite, originX, originY, zoom };
}

// Elige el mayor zoom (más detalle) tal que el bbox (con el padding ya aplicado) quepa en targetW/H.
function chooseZoom(minLon, minLat, maxLon, maxLat, targetW, targetH, maxZoom = 17, minZoom = 10) {
  for (let z = maxZoom; z >= minZoom; z--) {
    const w = lon2x(maxLon, z) - lon2x(minLon, z);
    const h = lat2y(minLat, z) - lat2y(maxLat, z);
    if (w <= targetW && h <= targetH) return z;
  }
  return minZoom;
}

module.exports = { lon2x, lat2y, renderBbox, chooseZoom, TILE_SIZE };
