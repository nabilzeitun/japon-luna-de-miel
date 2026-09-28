// Script puntual: rellena descripciones cortas para paradas con desc vacía/pobre heredada del KMZ.
// Uso: node scripts/fill-descs.js   (desde la raíz del proyecto)
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'japon_kmz', 'parsed.json');
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

const DESCS = {
  // Tokio
  'Shibamata Taishakuten': 'Templo budista de 1629, famoso por los relieves de madera tallada sin pintar en sus muros, obra de artesanos que también trabajaron en el Tōshō-gū de Nikkō.',
  'Toyosu Senkyaku Banrai': 'Mercado cubierto de tres plantas junto al mercado mayorista de Toyosu, con puestos de marisco fresco, restaurantes y un baño termal.',
  'Ginza': 'El barrio comercial más elegante de Tokio, con grandes almacenes centenarios, boutiques de lujo y galerías de arte.',
  '大正寺 山門(竜宮門)': 'Puerta principal del templo Taishō-ji de Chōfu, con forma de castillo-dragón (ryūgū-mon).',
  'Asakusa': 'Barrio histórico alrededor del Sensō-ji, el templo más antiguo de Tokio, con calles comerciales tradicionales.',
  'Calle Comercial Nakamise': 'Calle comercial de 250 m entre la Puerta Kaminarimon y el Sensō-ji, con cerca de 90 puestos centenarios de dulces, abanicos y recuerdos.',
  'Tokyo Skytree': 'La torre de telecomunicaciones más alta de Japón (634 m), con dos miradores — descartada la subida en este viaje (ver nota en Sumida).',
  'Parque de Ueno': 'El parque más visitado de Tokio, con varios museos (Nacional de Tokio, de Arte Occidental), el zoo y más de 1.000 cerezos.',
  'Jardín Rikugien': 'Uno de los jardines paisajísticos más bellos de Tokio, construido hacia 1700 recreando en miniatura 88 escenas de poemas clásicos.',
  'Ameyoko market': 'Mercado callejero bullicioso junto a las vías del tren entre Ueno y Okachimachi, con ropa, cosmética, pescado fresco y comida a buen precio.',
  'Shibuya Crossing': 'El cruce peatonal más transitado del mundo — hasta 3.000 personas cruzan en cada cambio de semáforo.',
  'Hachiko Statue': 'Estatua del Akita que esperó cada día a su dueño fallecido durante nueve años — punto de encuentro icónico de Shibuya.',
  'Calle Central de Shibuya': 'Calle comercial principal que baja desde el cruce de Shibuya, llena de tiendas y moda juvenil.',
  'Parque Yoyogi': 'Uno de los parques más grandes de Tokio, con amplios céspedes, ideal para pícnic y paseos junto al Santuario Meiji.',
  'Santuario Meiji': 'Santuario sintoísta dedicado al emperador Meiji y la emperatriz Shōken, rodeado de un bosque de 100.000 árboles donados de todo Japón.',
  'Shinjuku': 'Distrito de negocios y ocio con la estación más transitada del mundo — rascacielos al oeste, neones y bares al este.',
  'Kabukichō': 'El mayor distrito de ocio nocturno de Tokio, con neones, restaurantes, bares y clubes — conocido como "la ciudad que nunca duerme".',
  'Kamakura': 'Antigua capital samurái a orillas del mar, con templos, playas y el Gran Buda, a menos de una hora de Tokio.',
  'Templo Kotoku-in': 'Templo que alberga el Gran Buda de Kamakura (Daibutsu), una estatua de bronce de 11,4 m fundida en 1252.',
  'Tsurugaoka Hachiman-gū': 'El santuario más importante de Kamakura, fundado en 1063 y dedicado a Hachiman, dios protector del clan Minamoto y de los samuráis.',
  'Templo Hokoku-ji': 'Templo zen conocido como "el templo del bambú", por el precioso bosquecillo de bambú detrás del edificio principal.',
  'Hakone': 'Región montañosa junto al lago Ashi, famosa por sus vistas al Fuji, aguas termales y el circuito de transporte turístico (tren, funicular, teleférico y barco).',
  'Museo al Aire Libre de Hakone': 'Primer museo al aire libre de Japón (1969): esculturas contemporáneas repartidas entre las montañas, incluido un pabellón con obras de Picasso.',
  'Santuario Hakone': 'Santuario sintoísta a orillas del lago Ashi, famoso por su gran torii rojo que parece flotar sobre el agua, con el Fuji al fondo en días despejados.',
  'Mount Fuji Fujinomiya 5th Station': 'La más alta (2.400 m) de las cuatro "quintas estaciones" del Fuji, punto de partida de la ruta de ascenso más corta.',
  // Kanazawa-Takayama / Nagoya
  'Tsuzumi-mon Gate': 'Puerta de madera de 13,7 m a la salida de la Estación de Kanazawa, inspirada en los tambores tsuzumi del teatro Noh — se ilumina de noche.',
  'Hida no Sato Folk Village Museum': 'Museo al aire libre con más de 30 casas tradicionales de la región de Hida, muchas con tejados gasshō-zukuri, trasladadas de sus emplazamientos originales.',
  'Castillo de Nagoya': 'Castillo completado en 1615 por Tokugawa Ieyasu; su palacio Hommaru, destruido en 1945, fue reconstruido fielmente en 2018.',
  // Kioto
  'Fushimi Inari-taisha': 'El santuario sintoísta más importante dedicado a Inari, dios del arroz — miles de torii vermellón forman un túnel que sube 233 m por el monte Inari.',
  'Templo Nishi Hongan-ji': 'Sede occidental de la secta budista Jōdo Shin, construida en 1591 por Toyotomi Hideyoshi. Patrimonio Unesco.',
  'Templo Higashi Hongan-ji': 'El templo de madera más grande de Kioto, sede oriental de la secta Jōdo Shin, justo enfrente de la estación.',
  'Templo Tenryu-ji': 'El más importante de los cinco grandes templos zen de Kioto, con un jardín de paseo de 700 años diseñado por su fundador. Patrimonio Unesco.',
  'Bosque de Bambú de Arashiyama': 'Sendero de 400 m entre miles de tallos de bambú de hasta 30 m de altura, una de las imágenes más icónicas de Kioto.',
  'Castillo Nijō': 'Residencia de Kioto de los shogunes Tokugawa desde 1603, con el famoso "suelo de ruiseñor" que chirría para detectar intrusos. Patrimonio Unesco.',
  'Pabellon Dorado': 'Pabellón zen del siglo XIV con las dos plantas superiores cubiertas de pan de oro, reflejado en el estanque Kyōko-chi. Patrimonio Unesco.',
  'Ryōan-ji': 'Templo zen famoso por su jardín seco de piedras: 15 rocas dispuestas sobre grava rastrillada, sin árboles ni plantas. Patrimonio Unesco.',
  'Ninna-ji': 'Templo imperial fundado en 888, con una pagoda de cinco pisos y cerezos tardíos famosos en primavera. Patrimonio Unesco.',
  'Hanamikoji-dori': 'La calle principal de Gion, con casas de té (ochaya) y restaurantes tradicionales tras celosías de madera — la más "kioto" de todas las calles.',
  'Gionmachi Minamigawa': 'Zona sur de Gion, el barrio de geishas y maiko mejor conservado de Kioto, con casas de madera tradicionales.',
  'Santuario Yasaka': 'Santuario sintoísta de más de 1.350 años en el corazón de Gion, escenario del Festival Gion — su escenario se llena de faroles cada noche.',
  'Santuario Yasui Konpira': 'Pequeño santuario famoso por su piedra "enkiri enmusubi" — se cruza gateando para cortar malas relaciones o iniciar buenas.',
  'Palacio Imperial Sento de Kioto': 'Antiguo palacio de retiro de los emperadores, construido en 1630; el edificio ardió en 1854 y hoy solo se visitan sus jardines paisajísticos.',
  "Philosopher's Path (Tetsugaku no Michi), North End": 'Extremo norte del Camino del Filósofo, junto al Pabellón de Plata (Ginkaku-ji).',
  'Tetsugaku No Michi': 'Sendero de piedra de 2 km junto al canal Shirakawa, entre Ginkaku-ji y Nanzen-ji, llamado así por el filósofo Nishida Kitarō.',
  'Heian Jingū': 'Santuario de 1895 que recrea a escala el antiguo Palacio Imperial de la era Heian, con un gran torii rojo y un jardín trasero con estanques.',
  'Santuario Shirakumo': 'Pequeño santuario del siglo XIII dentro del Parque Imperial, dedicado a Benzaiten, diosa de la música.',
  'Munakata Shrine': 'Santuario sintoísta del siglo VIII dentro del Parque Imperial, dedicado a las tres diosas de Munakata.',
  'Santuario Itsukushima (interior del Parque del Palacio Imperial de Kioto)': 'Réplica en miniatura del santuario de Miyajima dentro del Parque Imperial, con su propio torii sobre un estanque.',
  'Reikan-ji': 'Antiguo convento imperial con motivos de hojas de arce por todo el templo — abre solo unas semanas al año.',
  'Santuario Otoyo': 'Pequeño santuario famoso por sus estatuas guardianas de ratones (en vez de los habituales zorros o leones), junto al Camino del Filósofo.',
  'Kumano Nyakuōji Shrine': 'Pequeño santuario del siglo XII en el extremo sur del Camino del Filósofo, filial de los santuarios Kumano.',
  'Anraku-ji Temple': 'Templo de tejado de paja con jardín de musgo, vinculado a dos damas de la corte imperial — abre solo unas semanas al año.',
  'Hōnenin Temple': 'Templo de 1680 con un jardín de musgo y dos montículos de arena rastrillada junto a la entrada, que cambian de diseño con las estaciones.',
  'Mirokuin Temple': 'Pequeño templo tranquilo y poco frecuentado por el turismo, justo al lado de Ginkaku-ji.',
  'Templo Eikando': 'Templo del siglo IX famoso por sus ~3.000 arces en otoño y por la estatua del Buda Amida que mira hacia atrás por encima del hombro.',
  'Nanzen-ji': 'Uno de los templos zen más importantes de Japón, con un imponente portal de entrada y jardines de piedra al pie de las montañas de Higashiyama.',
  // Osaka
  'Don Quijote Dotonbori Midosuji': 'Gran tienda de descuento abierta 24h, reconocible por la noria amarilla en su fachada — de todo, desde souvenirs a electrónica.',
  'Tower Slider (Tsutenkaku)': 'Torre símbolo de Osaka (108 m) con mirador a 91 m y la estatua de Billiken, que da suerte si le frotas la planta de los pies; incluye un tobogán interior.',
  // Hiroshima-Miyajima
  'Hiroshima': 'Capital de la prefectura, reconstruida tras la bomba atómica de 1945 — hoy es un símbolo mundial de paz.',
  'Parque Memorial de la Paz de Hiroshima': 'Parque de 120.000 m² dedicado a las víctimas de la bomba atómica de 1945, junto a la Cúpula Genbaku. Patrimonio Unesco.',
  'Castillo de Hiroshima': 'Castillo de llanura de 1589, destruido por la bomba atómica y reconstruido en 1958 — hoy es un museo de historia de la ciudad.',
  'Hondori Shopping Street': 'La arcada comercial más grande de la región, con más de 200 tiendas en 580 m — aquí está Okonomimura.',
  'Jardín Shukkeien': 'Jardín paisajístico de 1620 inspirado en el Lago del Oeste de Hangzhou, con un estanque central y puentes.',
  'Miyahima': 'Isla sagrada sintoísta, considerada una de las tres vistas más bellas de Japón por su torii flotante.',
  'Santuario Itsukushima': 'Santuario del siglo VI construido sobre el agua, famoso por su gran torii flotante — con la marea alta parece suspendido sobre el mar.',
  'Santuario Toyokuni (Senjokaku)': 'Salón del tamaño de 1.000 tatamis, encargado en 1587 por Toyotomi Hideyoshi y nunca terminado — sin techo interior ni entrada principal.',
  'Parque Momijidani': 'Valle a los pies del Monte Misen con unos 700 arces, uno de los mejores lugares de la región para ver el otoño.',
  'Teleférico de Miyajima': 'Teleférico de dos tramos (~1,6 km) que sube desde Momijidani hasta cerca de la cima del Monte Misen.',
  'Monte Misen': 'La montaña más alta de Miyajima (535 m), con vistas al Mar Interior de Seto desde la cima, accesible en teleférico y un tramo final a pie.',
};

let updated = 0, notFound = [];
for (const name of Object.keys(DESCS)) {
  let found = false;
  for (const f of data) {
    for (const p of f.places) {
      if (p.name === name) {
        p.desc = DESCS[name];
        updated++;
        found = true;
      }
    }
  }
  if (!found) notFound.push(name);
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Actualizadas:', updated, '/', Object.keys(DESCS).length);
if (notFound.length) console.log('NO ENCONTRADAS (revisar nombre exacto):', notFound);
