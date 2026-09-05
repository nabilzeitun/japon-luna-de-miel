const fs = require('fs');
const path = require('path');

const kmlPath = process.argv[2];
const xml = fs.readFileSync(kmlPath, 'utf-8');

// crude but effective XML walk for KML Document > Folder > Placemark
function decodeEntities(str) {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

const folderRegex = /<Folder>([\s\S]*?)<\/Folder>/g;
const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
const nameRegex = /<name>([\s\S]*?)<\/name>/;
const descRegex = /<description>([\s\S]*?)<\/description>/;
const coordRegex = /<coordinates>([\s\S]*?)<\/coordinates>/;

const result = [];
let fm;
while ((fm = folderRegex.exec(xml)) !== null) {
  const folderBody = fm[1];
  const folderNameMatch = folderBody.match(nameRegex);
  const folderName = folderNameMatch ? decodeEntities(folderNameMatch[1]) : 'Sin nombre';
  const placemarks = [];
  let pm;
  const pmRe = new RegExp(placemarkRegex);
  while ((pm = pmRe.exec(folderBody)) !== null) {
    const body = pm[1];
    const n = body.match(nameRegex);
    const d = body.match(descRegex);
    const c = body.match(coordRegex);
    if (!c) continue;
    const [lon, lat] = c[1].trim().split(',').map(Number);
    placemarks.push({
      name: n ? decodeEntities(n[1]) : '(sin nombre)',
      desc: d ? decodeEntities(d[1]) : '',
      lat, lon
    });
  }
  result.push({ folder: folderName, places: placemarks });
}

fs.writeFileSync(path.join(path.dirname(kmlPath), 'parsed.json'), JSON.stringify(result, null, 2), 'utf-8');
console.log('Folders:', result.length);
result.forEach(f => console.log(' -', f.folder, ':', f.places.length, 'lugares'));
