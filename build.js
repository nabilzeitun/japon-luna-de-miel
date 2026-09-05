const fs = require('fs');
const path = require('path');
const { CITY_COLORS, days, extras, altDayTrips, manualPlaces, manualFood } = require('./trip-config.js');

const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'japon_kmz', 'parsed.json'), 'utf-8'));

const byFolder = {};
for (const f of parsed) byFolder[f.folder] = f.places;

// index name -> place, tracking duplicates (e.g. "Nagoya" appears in 2 folders)
const allPlaces = []; // {name, desc, lat, lon, folder}
for (const f of parsed) for (const p of f.places) allPlaces.push({ ...p, folder: f.folder });
for (const p of manualPlaces) allPlaces.push({ ...p, folder: 'Manual' });

const norm = s => s.replace(/[ \s]+/g, ' ').trim();

const byName = new Map();
for (const p of allPlaces) {
  const key = norm(p.name);
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(p);
}

function resolve(name, preferFolder) {
  const list = byName.get(norm(name));
  if (!list) return null;
  if (list.length === 1) return list[0];
  if (preferFolder) {
    const f = list.find(p => p.folder === preferFolder);
    if (f) return f;
  }
  return list[0];
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function guessDuration(name, desc) {
  const s = (name + ' ' + desc).toLowerCase();
  if (/museo|museum/.test(s)) return 75;
  if (/castillo|castle|palacio|palace/.test(s)) return 60;
  if (/templo|temple|santuario|shrine|-ji\b|-dera\b|taisha/.test(s)) return 30;
  if (/parque|garden|jardín|jardin|park/.test(s)) return 40;
  if (/mercado|market/.test(s)) return 40;
  if (/calle|street|avenue|shopping|dori|yokocho|yokochō/.test(s)) return 30;
  if (/mirador|view|tower|torre/.test(s)) return 25;
  return 30;
}

const usedNames = new Set();
const missing = [];

function resolveStop(stopCfg, cityFolder) {
  const p = resolve(stopCfg.name, cityFolder);
  if (!p) { missing.push(stopCfg.name); return null; }
  usedNames.add(norm(stopCfg.name) + '|' + p.folder);
  const duration = stopCfg.kind === 'info' ? 0 : (stopCfg.durOverride != null ? stopCfg.durOverride : guessDuration(p.name, p.desc));
  return {
    name: p.name,
    desc: p.desc,
    lat: p.lat,
    lon: p.lon,
    kind: stopCfg.kind,
    mealType: stopCfg.mealType || null,
    duration,
    note: stopCfg.note || null,
    transit: stopCfg.transit || null,
    transitMin: stopCfg.transitMin != null ? stopCfg.transitMin : null,
    optional: !!stopCfg.optional,
    mealAfter: stopCfg.mealAfter || null,
  };
}

function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}
function formatHM(totalMin) {
  const m = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

const shoppingRaw = byFolder['shopping en japon'].map(p => ({ name: p.name, desc: p.desc, lat: p.lat, lon: p.lon }));
const foodRaw = byFolder['comer en japon'].map(p => ({ name: p.name, desc: p.desc, lat: p.lat, lon: p.lon }))
  .concat(manualFood.map(p => ({ name: p.name, desc: p.desc, lat: p.lat, lon: p.lon, notMeal: !!p.notMeal })));
const mealEligible = foodRaw.filter(f => !f.notMeal);

// sugerencias de comer/shopping cercanas a las paradas reales del día (capas "comer en japon" / "shopping en japon")
function nearestWithin(list, refs, maxMeters, excludeNames) {
  let best = null, bestD = Infinity;
  for (const item of list) {
    if (excludeNames.has(item.name)) continue;
    for (const r of refs) {
      const dd = haversine(item.lat, item.lon, r.lat, r.lon);
      if (dd < bestD) { bestD = dd; best = item; }
    }
  }
  return best && bestD <= maxMeters ? { ...best, dist: Math.round(bestD) } : null;
}

function buildSuggestions(stops, skipLunch, skipDinner) {
  const visitStops = stops.filter(s => s.kind === 'visit');
  if (!visitStops.length) return { lunch: null, dinner: null, shopping: [] };
  const mid = visitStops[Math.floor((visitStops.length - 1) / 2)];
  const last = visitStops[visitStops.length - 1];
  const used = new Set();
  const lunch = skipLunch ? null : nearestWithin(foodRaw, [mid], 700, used);
  if (lunch) used.add(lunch.name);
  const dinner = skipDinner ? null : nearestWithin(foodRaw, [last], 700, used);
  if (dinner) used.add(dinner.name);
  const shopUsed = new Set();
  const shopping = [];
  for (let i = 0; i < 2; i++) {
    const pick = nearestWithin(shoppingRaw, visitStops, 500, shopUsed);
    if (!pick) break;
    shopUsed.add(pick.name);
    shopping.push(pick);
  }
  return { lunch, dinner, shopping };
}

const clockWarnings = [];
const usedMealNames = new Set(); // evita repetir el mismo restaurante en dos días distintos
const seenHotelCheckin = new Set(); // primera vez que se hace check-in en cada hotel (bonus de 30 min)
const MEAL_DEFAULTS = { lunch: { min: 45, tag: 'Comer' }, dinner: { min: 60, tag: 'Cenar' } };

// inserta una parada de comida (restaurante real de la capa "comer en japon") justo después de la parada dada
function insertMeals(stops) {
  const out = [];
  for (const s of stops) {
    out.push(s);
    if (s.mealAfter && MEAL_DEFAULTS[s.mealAfter]) {
      const pick = nearestWithin(mealEligible, [s], 1600, usedMealNames);
      if (pick) {
        usedMealNames.add(pick.name);
        const def = MEAL_DEFAULTS[s.mealAfter];
        // el transit que tuviera la parada anterior describe salir de la zona: pasa a la comida, que está a <1.2km
        const inheritedTransit = s.transit;
        const inheritedTransitMin = s.transitMin;
        s.transit = null;
        s.transitMin = null;
        out.push({
          name: pick.name, desc: pick.desc, lat: pick.lat, lon: pick.lon,
          kind: 'meal', mealType: s.mealAfter, duration: def.min,
          note: `Sugerencia para ${s.mealAfter === 'lunch' ? 'comer' : 'cenar'} — cambiadlo si preferís otra cosa.`,
          transit: inheritedTransit, transitMin: inheritedTransitMin, optional: false, mealAfter: null,
        });
      }
    }
  }
  return out;
}

const builtDays = days.map(d => {
  let stops = d.stops.map(s => resolveStop(s, d.city)).filter(Boolean);
  stops = insertMeals(stops);
  // bonus de check-in la primera vez que se llega a cada hotel (30 min para instalarse)
  stops.forEach(s => {
    if (s.kind === 'info' && /^Hotel\s/.test(s.name) && !seenHotelCheckin.has(norm(s.name))) {
      seenHotelCheckin.add(norm(s.name));
      s.duration = 30;
      s.note = s.note || 'Check-in y acomodarse en la habitación.';
    }
  });
  // walking segments between consecutive visit-able stops (skip 0,0 dupes)
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    const meters = haversine(a.lat, a.lon, b.lat, b.lon);
    const walkMin = Math.max(1, Math.round((meters * 1.3) / 75)); // 1.3 correction, ~4.5km/h => 75m/min
    a.toNextMeters = Math.round(meters);
    a.toNextWalkMin = meters <= 6000 ? walkMin : null; // más allá de esto ya no es "caminar", es transporte
    // minutos de viaje para el reloj del día: transitMin explícito > tiempo andando > estimación de reserva (30km/h)
    a.travelToNextMin = a.transitMin != null ? a.transitMin : (a.toNextWalkMin != null ? a.toNextWalkMin : Math.round(meters / 500));
  }
  const totalVisitMin = stops.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalWalkMin = stops.reduce((sum, s) => sum + (s.toNextWalkMin || 0), 0);
  const hasLunchStop = stops.some(s => s.kind === 'meal' && s.mealType === 'lunch');
  const hasDinnerStop = stops.some(s => s.kind === 'meal' && s.mealType === 'dinner');
  const suggestions = buildSuggestions(stops, hasLunchStop, hasDinnerStop);

  // reloj del día: hora estimada de llegada/salida en cada parada, en cascada desde dayStartTime
  if (d.dayStartTime && stops.length) {
    let clock = parseHM(d.dayStartTime);
    stops.forEach((s, i) => {
      s.arrival = formatHM(clock);
      clock += s.duration || 0;
      s.departure = formatHM(clock);
      if (i < stops.length - 1) clock += stops[i].travelToNextMin || 0;
    });
    if (clock - parseHM(d.dayStartTime) > 16 * 60) {
      clockWarnings.push(`${d.date} (${d.title}): el día dura ${(( clock - parseHM(d.dayStartTime))/60).toFixed(1)}h de reloj — revisar si es realista.`);
    }
  }

  return {
    date: d.date,
    city: d.city,
    cityColor: CITY_COLORS[d.city] || '#666',
    title: d.title,
    kind: d.kind,
    optional: !!d.optional,
    altGroup: d.altGroup || null,
    altLabel: d.altLabel || null,
    altNote: d.altNote || null,
    travelNote: d.travelNote || null,
    stops,
    totalVisitMin,
    totalWalkMin,
    suggestions,
  };
});

if (clockWarnings.length) {
  console.log('\nAVISOS DE RELOJ:');
  clockWarnings.forEach(w => console.log('  ⚠', w));
}

// resolve extras
const builtExtras = {};
for (const [city, names] of Object.entries(extras)) {
  builtExtras[city] = names.map(n => {
    const p = resolve(n, city);
    if (!p) { missing.push('[extra]' + n); return null; }
    usedNames.add(norm(n) + '|' + p.folder);
    return { name: p.name, desc: p.desc, lat: p.lat, lon: p.lon };
  }).filter(Boolean);
}

const builtAlt = altDayTrips.map(alt => ({
  id: alt.id,
  title: alt.title,
  note: alt.note,
  stops: alt.stops.map(n => {
    const p = resolve(n);
    if (!p) { missing.push('[alt]' + n); return null; }
    usedNames.add(norm(n) + '|' + p.folder);
    return { name: p.name, desc: p.desc, lat: p.lat, lon: p.lon };
  }).filter(Boolean),
}));

// asignar a cada sitio de shopping/comer el día cuyas paradas tiene más cerca (para agrupar por día en la interfaz)
function assignNearestDay(list) {
  return list.map(item => {
    let bestDate = null, bestDist = Infinity;
    for (const d of builtDays) {
      for (const s of d.stops) {
        if (s.kind !== 'visit') continue;
        const dd = haversine(item.lat, item.lon, s.lat, s.lon);
        if (dd < bestDist) { bestDist = dd; bestDate = d.date; }
      }
    }
    return { ...item, nearestDay: bestDate, nearestDayDist: Math.round(bestDist) };
  });
}

const shopping = assignNearestDay(shoppingRaw);
const food = assignNearestDay(foodRaw);

// sanity check: any KML place (excluding shopping/comer/duplicated "Nagoya" marker inside Kioto) not referenced anywhere?
const unused = [];
const IGNORE = new Set(['Kioto::Nagoya']); // marcador duplicado del Castillo de Nagoya, ya cubierto por la carpeta Nagoya
for (const p of allPlaces) {
  if (p.folder === 'shopping en japon' || p.folder === 'comer en japon') continue;
  if (IGNORE.has(p.folder + '::' + norm(p.name))) continue;
  const key = norm(p.name) + '|' + p.folder;
  if (!usedNames.has(key)) unused.push(p.folder + ' :: ' + p.name);
}

console.log('MISSING (referenced in config but not found in KML):', missing.length);
missing.forEach(m => console.log('  ✗', m));
console.log('\nUNUSED (in KML but not placed in any day/extra/alt):', unused.length);
unused.forEach(u => console.log('  -', u));

const trip = {
  meta: {
    title: 'Japón · Luna de miel',
    start: '2026-10-28',
    end: '2026-11-12',
    cities: [...new Set(days.map(d => d.city))],
  },
  cityColors: CITY_COLORS,
  days: builtDays,
  extras: builtExtras,
  altDayTrips: builtAlt,
  shopping,
  food,
};

fs.writeFileSync(path.join(__dirname, 'trip.json'), JSON.stringify(trip), 'utf-8');
console.log('\nWrote trip.json —', builtDays.length, 'días,', builtDays.reduce((s,d)=>s+d.stops.length,0), 'paradas totales.');
