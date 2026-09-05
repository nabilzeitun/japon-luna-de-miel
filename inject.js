const fs = require('fs');
const path = require('path');
const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf-8');
const tripJson = fs.readFileSync(path.join(dir, 'trip.json'), 'utf-8');
const out = template.replace('/*__TRIP_JSON__*/', tripJson);
fs.writeFileSync(path.join(dir, 'index.html'), out, 'utf-8');
console.log('Wrote index.html, bytes:', Buffer.byteLength(out, 'utf-8'));
