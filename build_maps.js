const fs = require('fs');
const path = require('path');
const { renderBbox, chooseZoom, lon2x, lat2y } = require('./maptile_lib.js');

const tripPath = path.join(__dirname, 'trip.json');
const trip = JSON.parse(fs.readFileSync(tripPath, 'utf-8'));

const W = 640, H = 300;

function computeBbox(stops) {
  let pts = stops.filter(s => s.kind !== 'info' && typeof s.lat === 'number');
  if (pts.length < 2) pts = stops.filter(s => typeof s.lat === 'number');
  if (!pts.length) return null;
  const lats = pts.map(p => p.lat), lons = pts.map(p => p.lon);
  const minLat0 = Math.min(...lats), maxLat0 = Math.max(...lats);
  const minLon0 = Math.min(...lons), maxLon0 = Math.max(...lons);
  const padLat = (maxLat0 - minLat0) * 0.22 + 0.0025;
  const padLon = (maxLon0 - minLon0) * 0.22 + 0.0035;
  return { minLat: minLat0 - padLat, maxLat: maxLat0 + padLat, minLon: minLon0 - padLon, maxLon: maxLon0 + padLon };
}

async function main() {
  for (const d of trip.days) {
    const bbox = computeBbox(d.stops);
    if (!bbox) { d.mapImage = null; continue; }
    const zoom = chooseZoom(bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, W, H, 17, 4);
    console.log(d.date, d.title, '-> zoom', zoom);
    const { jimpImage, originX, originY } = await renderBbox(bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat, zoom, W, H);
    const buf = await jimpImage.getBuffer('image/jpeg', { quality: 62 });
    console.log('  size:', (buf.length/1024).toFixed(0) + 'KB');
    const base64 = buf.toString('base64');
    d.mapImage = { data: base64, zoom, originX, originY, w: W, h: H };
  }
  fs.writeFileSync(tripPath, JSON.stringify(trip), 'utf-8');
  console.log('Done. trip.json updated with mapImage per day.');
}
main().catch(e => { console.error(e); process.exit(1); });
