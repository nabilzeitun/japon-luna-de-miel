// TODO (pendiente, no urgente): varias paradas heredan una desc muy pobre del KMZ original
// (p.ej. "Asakusa" solo dice "barrio"). Pendiente pasarlas y escribir una frase útil para cada una.

// Config: qué placemark (por nombre EXACTO del KML) va en qué día, y en qué orden.
// kind: 'visit' (parada turística) | 'info' (vuelo/hotel/estación, no cuenta como visita)
// durOverride en minutos; si no se da, se infiere por palabra clave del nombre/desc.
// transit + transitMin: cuando el salto a la siguiente parada es largo (>20 min andando) y existe
// alternativa de transporte público razonable, se describe aquí y se usa transitMin para el reloj del día.
// dayStartTime: hora aproximada (HH:MM) en la que arranca la primera parada del día — de ahí se calculan
// en cascada las horas estimadas de llegada a cada parada siguiente.

// Lugares que NO estaban en el KMZ pero pidió el usuario explícitamente (destinos "ancla" confirmados
// por los vuelos/reservas). Coordenadas aproximadas a partir de conocimiento general del lugar.
const manualPlaces = [
  { name: 'Kenrokuen', desc: 'Uno de los tres jardines más famosos de Japón, junto al Castillo de Kanazawa.', lat: 36.5613, lon: 136.6625 },
  { name: 'Nagamachi', desc: 'Antiguo barrio de samuráis, calles empedradas con muros de barro y canales.', lat: 36.5645, lon: 136.6536 },
  { name: 'Higashi Chaya', desc: 'El mayor de los distritos de casas de té (geishas) de Kanazawa, con pan de oro en las tiendas.', lat: 36.5716, lon: 136.6636 },
  { name: 'Kazuemachi', desc: 'Distrito de casas de té más pequeño y tranquilo, a orillas del río Asano.', lat: 36.5687, lon: 136.6597 },
  { name: 'Ginkaku-ji', desc: 'El "Pabellón de Plata", entrada norte del Camino del Filósofo. Unesco.', lat: 35.0270, lon: 135.7981 },
  { name: 'Sumida', desc: 'Barrio a orillas del río, justo al cruzar el Puente Azuma desde Asakusa, a los pies del Skytree.', lat: 35.7100, lon: 139.8050 },
  { name: 'Explanada y Puente Nijūbashi', desc: 'La vista más icónica del Palacio Imperial: el puente Nijūbashi y la Fushimi Yagura al fondo, desde la explanada Kōkyo Gaien (siempre accesible, sin horario). El Jardín Este del palacio cierra los lunes y viernes.', lat: 35.6825, lon: 139.7528 },
  { name: 'Estación de Tokio (Marunouchi)', desc: 'Fachada histórica de ladrillo rojo de 1914, desde donde sale el Shinkansen a Kanazawa.', lat: 35.6812, lon: 139.7671 },
  // Ginza — no estaban en el KMZ, pedidos explícitamente
  { name: 'Avenida Chuo-dori', desc: 'La calle principal de Ginza. Los domingos de 12:00 a 17:00 se corta al tráfico (hokosha tengoku) y se llena de gente paseando por el centro de la calzada.', lat: 35.6714, lon: 139.7660 },
  { name: 'Seiko House Ginza (Wako)', desc: 'El edificio con la torre del reloj más icónico de Ginza, en la esquina del cruce de Ginza 4-chōme.', lat: 35.6716, lon: 139.7658 },
  { name: 'Ginza Place', desc: 'Edificio de diseño en celosía blanca, frente a Wako, con Nissan y Canon.', lat: 35.6711, lon: 139.7658 },
  { name: 'Almacenes Mitsukoshi Ginza', desc: 'Grandes almacenes centenarios; en la azotea está la estatua Ginza Shusse Jizoson (da buena suerte), y en el sótano hay puestos de comida (depachika).', lat: 35.6714, lon: 139.7664 },
  { name: 'Itoya Ginza', desc: 'La papelería más famosa del mundo — varias plantas de material de escritura y papel de diseño.', lat: 35.6739, lon: 139.7651 },
  { name: 'Matsuya Ginza', desc: 'Grandes almacenes en plena Chuo-dori, muy cerca de Itoya.', lat: 35.6735, lon: 139.7655 },
  { name: 'Ginza Six', desc: 'El centro comercial más grande de Ginza, con marcas de lujo y una gran librería (Tsutaya).', lat: 35.6693, lon: 139.7627 },
  // Takayama — no estaban en el KMZ, pedidos explícitamente
  { name: 'Sanmachi Suji', desc: 'Las calles Ichino-machi, Ni-no-machi y San-no-machi: casas de comerciantes convertidas en museos, galerías, tiendas de artesanía y cafeterías.', lat: 36.1418, lon: 137.2533 },
  { name: 'Kusakabe Mingeikan', desc: 'Casa-museo de la familia Kusakabe, mercaderes de sake y aceite en el periodo Edo.', lat: 36.1432, lon: 137.2531 },
  { name: 'Yoshijima-ke', desc: 'Casa histórica de la familia Yoshijima, ejemplo de arquitectura tradicional de comerciantes.', lat: 36.1431, lon: 137.2529 },
  { name: 'Hida Minzoku Kokokan', desc: 'Museo arqueológico de Hida, en una antigua residencia samurái junto al Shiroyama.', lat: 36.1394, lon: 137.2554 },
  { name: 'Hirata Kinenkan', desc: 'Museo de artesanía en una antigua tienda de velas y aceite de Kamisannomachi.', lat: 36.1417, lon: 137.2538 },
  { name: 'Fujii Bijutsu Mingeikan', desc: 'Galería de arte y artesanía tradicional junto a Kusakabe Mingeikan.', lat: 36.1433, lon: 137.2534 },
  { name: 'Templo Hida Kokubunji', desc: 'El templo más antiguo de Takayama, con una pagoda de tres pisos y un ginkgo milenario.', lat: 36.1421, lon: 137.2495 },
  { name: 'Asaichi', desc: 'Mercados matinales junto al río Miyagawa: verduras, encurtidos, artesanía y saru-bobo.', lat: 36.1442, lon: 137.2521 },
  { name: 'Santuario Sakurayama Hachimangu', desc: 'Santuario sintoísta al norte del casco antiguo; alberga el museo de los carros del festival de Takayama.', lat: 36.1481, lon: 137.2500 },
  { name: 'Teramachi', desc: 'Paseo por el barrio de templos en la ladera este, junto al parque Shiroyama (antiguo castillo de Takayama).', lat: 36.1400, lon: 137.2565 },
  { name: 'Parque Shiroyama', desc: 'Antiguo enclave del castillo de Takayama, hoy parque y mirador sobre la ciudad.', lat: 36.1373, lon: 137.2580 },
];

// Comida sugerida en Takayama que no estaba en la capa "comer en japon" del KMZ.
const manualFood = [
  { name: 'Ajikura Tengoku', desc: 'Buñuelos de carne Hida (estilo takoyaki), donburi y nigiri de Hida wagyu.', lat: 36.1424, lon: 137.2539 },
  { name: 'Aji no Yohei', desc: 'Hoba-miso y chuka soba, cocina local de Hida.', lat: 36.1419, lon: 137.2537 },
  { name: 'Funasaka Sake Brewery', desc: 'Bodega de sake tradicional en Kamisannomachi, con cata.', lat: 36.1413, lon: 137.2536, notMeal: true },
];

const CITY_COLORS = {
  Tokio: '#b8442a',
  'Kanazawa-Takayama': '#33475a',
  Kioto: '#8a6d1f',
  Osaka: '#6b5b95',
};

const days = [
  // ---------------- TOKIO ----------------
  {
    date: '2026-10-28', city: 'Tokio', title: 'Llegada, Asakusa y Sumida',
    kind: 'city', dayStartTime: '12:50',
    stops: [
      { name: 'Haneda airport', kind: 'info', transit: 'Keikyu Airport Line + Toei Asakusa Line (servicio directo, sin trasbordo) Haneda → Asakusa, ~45 min.', transitMin: 45 },
      { name: 'Hotel Tokyo', kind: 'info', transit: 'Metro Toei Asakusa Line Oshiage → Asakusa, 1 parada (~5 min).', transitMin: 12 },
      { name: 'Kuramae', kind: 'visit', transit: 'Toei Asakusa Line Kuramae → Asakusa, 1 parada (~3 min).', transitMin: 10 },
      { name: 'Asakusa', kind: 'visit' },
      { name: 'Sensō-ji', kind: 'visit' },
      { name: 'Calle Comercial Nakamise', kind: 'visit' },
      { name: 'Calle Comercial Shin-Nakamise', kind: 'visit' },
      { name: 'Centro de Información Turística y Cultural de Asakusa', kind: 'visit' },
      { name: 'Hoppy Street', kind: 'visit', note: 'Cenar aquí antes de Skytree, no después — así no hay que volver a bajar.' },
      { name: 'Puente Azuma', kind: 'visit' },
      { name: 'Sumida', kind: 'visit', durOverride: 20 },
      { name: 'Tokyo Skytree', kind: 'visit', durOverride: 75, note: 'Al atardecer/de noche — y es la parada más cercana al hotel para cerrar el día.', transit: 'Metro Tobu/Toei Oshiage → hotel, 1 parada o 15 min andando.', transitMin: 15 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-29', city: 'Tokio', title: 'Ueno, Yanaka y Akihabara',
    kind: 'city', dayStartTime: '07:30',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Metro Toei Asakusa Oshiage → Asakusa (~5 min) + Ginza Line Asakusa → Ueno (~5 min).', transitMin: 20 },
      { name: 'Parque de Ueno', kind: 'visit' },
      {
        name: 'Museo Nacional de Tokio', kind: 'visit', durOverride: 90,
        note: 'El museo más antiguo, grande e importante de Japón.<br>• Galería Honkan — arte japonés tradicional por orden cronológico<br>• Armaduras samurái<br>• Galería Tōyōkan<br>• Los jardines alrededor<br>Martes a domingo 09:30-17:00 (viernes y sábados hasta las 21:00). Lunes cerrado. 1.000 yenes.',
      },
      {
        name: 'Ueno Zoo', kind: 'visit', durOverride: 90, optional: true,
        note: 'Opcional — ya no tiene los pandas gigantes desde enero de 2026.',
      },
      { name: 'Ameyoko market', kind: 'visit', durOverride: 55, mealAfter: 'lunch', transit: 'JR/Keisei Ueno → Nippori (~5 min) + 10 min andando a Yanaka.', transitMin: 15 },
      { name: 'Yanaka', kind: 'visit', durOverride: 75, note: 'Callejeo tranquilo de casas bajas y templos — dedicadle tiempo sin prisa, es de los rincones con más encanto de Tokio.', transit: 'JR Yamanote/Keihin-Tōhoku Nippori → Komagome (~10 min) + 7 min andando a Rikugien.', transitMin: 17 },
      { name: 'Jardín Rikugien', kind: 'visit', durOverride: 45, transit: 'JR Yamanote Line Komagome → Akihabara, ~15 min.', transitMin: 15 },
      { name: 'Akihabara', kind: 'visit', durOverride: 60 },
      { name: 'TAITO Station Akihabara', kind: 'visit', durOverride: 45, mealAfter: 'dinner', transit: 'Metro Hanzomon Line directo Akihabara → Oshiage, ~10 min.', transitMin: 15 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-30', city: 'Tokio', title: 'Shibuya, Shinjuku, Kabukichō y Okubo',
    kind: 'city', dayStartTime: '07:00',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Metro Hanzomon Line Oshiage → Omotesando (~25 min) + 5 min andando a Meiji Jingū.', transitMin: 30 },
      { name: 'Santuario Meiji', kind: 'visit', durOverride: 45 },
      { name: 'Parque Yoyogi', kind: 'visit' },
      { name: 'Calle Takeshita', kind: 'visit' },
      { name: 'Omote-Sando Avenue', kind: 'visit', mealAfter: 'lunch', note: 'Si os sobran ~20 min: Paradise Vintage está a 2 min andando y AMORE Vintage Aoyama a 5 min — ropa vintage.' },
      { name: 'Shibuya Crossing', kind: 'visit', durOverride: 15 },
      { name: 'Hachiko Statue', kind: 'visit', durOverride: 10 },
      { name: 'Calle Central de Shibuya', kind: 'visit', note: 'Si os sobran ~20 min: BRAND OFF Shibuya está aquí mismo y MEGA Don Quijote a 3 min — vintage y outlet turístico.' },
      { name: 'Dogenzaka', kind: 'visit' },
      { name: 'Shibuya Nonbei Yokocho', kind: 'visit', transit: 'JR Yamanote Line Shibuya → Shinjuku, ~7 min.', transitMin: 15 },
      { name: 'Shinjuku', kind: 'visit', durOverride: 0 },
      { name: 'Mirador del Gobierno Metropolitano de Tokio', kind: 'visit', durOverride: 40 },
      { name: 'Omoide Yokochō', kind: 'visit', durOverride: 60 },
      { name: 'Shinjuku Ni-chōme', kind: 'visit', durOverride: 30 },
      { name: 'Kabukichō', kind: 'visit' },
      { name: 'Tokyu Kabukicho Tower', kind: 'visit', mealAfter: 'dinner', transit: 'JR Yamanote/Sōbu Line Shinjuku → Shin-Ōkubo, ~5 min.', transitMin: 12 },
      {
        name: 'Okubo', kind: 'visit', durOverride: 45, optional: true,
        note: 'Opcional, al final del día — el Koreatown de Tokio:<br>• comida callejera coreana y restaurantes divertidos y a precio asequible<br>• cafeterías coloridas y con infinidad de dulces y tartas<br>• cosméticos coreanos, famosos en todo el mundo<br>• tiendas de ropa coreana a la última moda<br>• productos para fans del K-Pop<br>• mercados con productos frescos',
        transit: 'Vuelta en JR Yamanote/Sōbu a Shinjuku (~5 min) + Toei Oedo Line a Kuramae (~25 min) + Toei Asakusa Line a Oshiage (~5 min).', transitMin: 45,
      },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-31', city: 'Tokio', title: 'Excursión a Kamakura',
    kind: 'daytrip', dayStartTime: '07:00',
    optional: true, altGroup: 'day4', altLabel: 'A',
    altNote: 'Elegid <b>4A (Kamakura)</b> o <b>4B (Hakone)</b> la mañana de antes, según el tiempo — Kamakura (templos y costa) funciona con cualquier tiempo; Hakone (montaña y volcán) solo compensa con cielo despejado para ver el Fuji.',
    travelNote: 'Desde el hotel, camino a Kinshichō Station (a pocos minutos). Sōbu Line (Rapid) dirección Zushi, que continúa automáticamente como Yokosuka Line (mismo tren, sin trasbordo) hasta Kamakura Station, ~1h en total. Dentro de Kamakura, el bus o el tren local Enoden conecta el Daibutsu con Hase y la costa si os sobra tiempo.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Caminando a Kinshichō Station (pocos minutos) + Sōbu Line (Rapid) dirección Zushi, que continúa como Yokosuka Line (mismo tren, sin trasbordo) → Kamakura Station, ~1h en total.', transitMin: 70 },
      { name: 'Kamakura', kind: 'visit', durOverride: 0 },
      { name: 'Templo Kotoku-in', kind: 'visit', durOverride: 40, mealAfter: 'lunch', transit: 'Enoden Hase → Kamakura Station (~15 min) + bus/taxi a Hokoku-ji (~10 min).', transitMin: 25 },
      { name: 'Templo Hokoku-ji', kind: 'visit', durOverride: 40, transit: 'Bus Keikyu de vuelta a Kamakura Station (~10 min) + 10 min andando a Tsurugaoka.', transitMin: 18 },
      { name: 'Tsurugaoka Hachiman-gū', kind: 'visit', durOverride: 40 },
      { name: 'Komachi Street', kind: 'visit', durOverride: 45, mealAfter: 'dinner', transit: 'JR Yokosuka Line Kamakura → Tokio/Shinagawa (~55 min-1h) + metro Asakusa Line a Oshiage (~15 min).', transitMin: 75 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-31', city: 'Tokio', title: 'Excursión a Hakone',
    kind: 'daytrip', dayStartTime: '07:00',
    optional: true, altGroup: 'day4', altLabel: 'B',
    altNote: 'Elegid <b>4B (Hakone)</b> o <b>4A (Kamakura)</b> la mañana de antes, según el tiempo — Hakone solo compensa con cielo despejado, para ver el Fuji desde el teleférico y el lago Ashi. Si está nublado, mejor Kamakura.',
    travelNote: 'Odakyu Romancecar directo Shinjuku → Hakone-Yumoto (~1h25-1h35). Sacad el Hakone Freepass en la estación: incluye el tren de montaña, el cable car, el teleférico (ropeway) y el barco pirata del lago Ashi, todo lo necesario para el circuito del día.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel, con tiempo de sobra para el Romancecar.', transit: 'Metro Hanzomon Line Oshiage → Shinjuku-sanchōme (~30 min) + Odakyu Romancecar directo Shinjuku → Hakone-Yumoto (~1h25-1h35).', transitMin: 130 },
      { name: 'Hakone', kind: 'visit', durOverride: 10, note: 'Sacad el Hakone Freepass en la estación antes de moveros — incluye todo el transporte del día.', transit: 'Hakone Tozan Railway Hakone-Yumoto → Gora, ~40 min.', transitMin: 40 },
      { name: 'Museo al Aire Libre de Hakone', kind: 'visit', durOverride: 90, note: 'Esculturas al aire libre entre las montañas, con un pabellón de obras de Picasso.', transit: 'Cable car Gora → Sōunzan (~10 min) + teleférico (ropeway) Sōunzan → Owakudani, ~20 min en total.', transitMin: 20 },
      { name: 'Teleférico de Hakone', kind: 'visit', durOverride: 15, note: 'El tramo por encima de Owakudani regala las mejores vistas al Fuji del día, si está despejado.' },
      { name: 'Owakudani', kind: 'visit', durOverride: 45, note: 'Valle volcánico activo — probad un kuro-tamago (huevo cocido en aguas termales; dicen que alarga la vida 7 años). Hay soba/curry si no habéis comido.', transit: 'Teleférico Owakudani → Togendai (~15 min) + barco pirata cruzando el lago Ashi a Hakone-machi (~30 min).', transitMin: 45 },
      { name: 'Santuario Hakone', kind: 'visit', durOverride: 40, note: 'El torii rojo se adentra en el lago Ashi, con el Fuji al fondo en días despejados.', transit: 'Bus Hakone Tozan Hakone-machi → Hakone-Yumoto (~30 min) + Odakyu Romancecar Hakone-Yumoto → Shinjuku (~1h25-1h35) + Metro Hanzomon Line a Oshiage (~30 min).', transitMin: 150 },
      { name: 'Hotel Tokyo', kind: 'info', note: 'De camino, el shotengai de Hakone-Yumoto tiene puestos de soba y comida si preferís cenar antes de subir al tren.' },
    ],
  },
  {
    date: '2026-11-01', city: 'Tokio', title: 'Ginza',
    kind: 'city', dayStartTime: '10:00',
    travelNote: 'Domingo: la Avenida Chuo-dori (la calle principal de Ginza) se corta al tráfico de 12:00 a 17:00 (hokosha tengoku) y se convierte en un paseo peatonal gigante — por eso esta ruta encaja mejor en domingo que en otro día.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Metro Toei Asakusa Line Oshiage → Higashi-Ginza (~20 min).', transitMin: 25 },
      { name: 'Matsuya Ginza', kind: 'visit', durOverride: 45 },
      { name: 'Itoya Ginza', kind: 'visit', durOverride: 35, mealAfter: 'lunch' },
      { name: 'Avenida Chuo-dori', kind: 'visit', durOverride: 30 },
      { name: 'Seiko House Ginza (Wako)', kind: 'visit', durOverride: 20 },
      { name: 'Ginza Place', kind: 'visit', durOverride: 15 },
      { name: 'Almacenes Mitsukoshi Ginza', kind: 'visit', durOverride: 40 },
      { name: 'Ginza', kind: 'visit', durOverride: 45, note: 'Callejeando por las bocacalles de Ginza — boutiques, galerías y cafés.' },
      { name: 'Ginza Six', kind: 'visit', durOverride: 45, mealAfter: 'dinner', transit: 'Metro Toei Asakusa Line Higashi-Ginza → Asakusa, ~15 min.', transitMin: 20 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-11-02', city: 'Tokio', title: 'Palacio Imperial → Kanazawa',
    kind: 'travel', dayStartTime: '07:30',
    travelNote: 'Tokio tiene mucho más que ver que Kanazawa, así que aprovechamos la mañana antes del Shinkansen. Hokuriku "Kagayaki" Tokio → Kanazawa (~2h30, asiento reservado recomendado). Dejad el equipaje facturado o en consigna antes de salir del hotel.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno rápido en el hotel (o saltadlo si vais a comer en Toyosu).', transit: 'Metro Yurikamome/Toei Oedo a Toyosu, ~25-30 min.', transitMin: 30 },
      { name: 'Toyosu Senkyaku Banrai', kind: 'visit', durOverride: 45, optional: true, note: 'Opcional — solo si salís al amanecer, os quita tiempo para el Palacio Imperial.', transit: 'Metro Yurikamome Toyosu → Tokyo Station, ~20 min.', transitMin: 20 },
      { name: 'Explanada y Puente Nijūbashi', kind: 'visit', durOverride: 35 },
      { name: 'Estación de Tokio (Marunouchi)', kind: 'visit', durOverride: 20, transit: 'Shinkansen Hokuriku "Kagayaki" Tokio → Kanazawa, ~2h30.', transitMin: 150 },
      { name: 'Kanazawa Station', kind: 'visit', durOverride: 15 },
      { name: 'Tsuzumi-mon Gate', kind: 'visit', durOverride: 10, transit: 'Bus turístico Kanazawa Loop Bus, parada Kōrinbō/Nagamachi, ~10 min desde la estación.', transitMin: 12 },
      { name: 'Nagamachi', kind: 'visit', durOverride: 45, mealAfter: 'lunch' },
      { name: 'Kenrokuen', kind: 'visit', durOverride: 75, note: 'Uno de los tres jardines más bonitos de Japón — con más razón en temporada de momiji (otoño).' },
      { name: 'Kazuemachi', kind: 'visit', durOverride: 30 },
      { name: 'Higashi Chaya', kind: 'visit', durOverride: 45, mealAfter: 'dinner' },
      { name: 'Hotel Kanazawa', kind: 'info' },
    ],
  },
  // ---------------- KANAZAWA / TAKAYAMA ----------------
  {
    date: '2026-11-03', city: 'Kanazawa-Takayama', title: 'Kanazawa → Shirakawa-go → Takayama',
    kind: 'travel', dayStartTime: '07:00',
    travelNote: 'Salida del hotel con maletas ~08:00. Bus Hokutetsu Kanazawa → Shirakawa-go (75-85 min) y después bus Nohi Shirakawa-go → Takayama (~50 min). Reservad plaza online con antelación (Hokutetsu / Nohi Bus), se llenan sobre todo en temporada de otoño.',
    stops: [
      { name: 'Hotel Kanazawa', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel, con maletas listas para el check-out.', transit: '10 min andando a la terminal de autobuses + Bus Hokutetsu Kanazawa → Shirakawa-go (75-85 min).', transitMin: 90 },
      { name: 'Shirakawa', kind: 'visit', durOverride: 240, transit: 'Bus Nohi Shirakawa-go → Takayama, ~50 min.', transitMin: 50 },
      { name: 'Hotel Takayama', kind: 'info' },
      { name: 'Takayama Old Town', kind: 'visit', durOverride: 75, note: 'Cenar carne Hida wagyu en Hidagyu Maruaki o Ajikura Tengoku (buñuelos, donburi o nigiri de Hida wagyu).' },
      { name: 'Hotel Takayama', kind: 'info' },
    ],
  },
  {
    date: '2026-11-04', city: 'Kanazawa-Takayama', title: 'Takayama: casco antiguo y museos',
    kind: 'city', dayStartTime: '07:00',
    stops: [
      { name: 'Hotel Takayama', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.' },
      { name: 'Asaichi', kind: 'visit', durOverride: 45, note: 'Mercados matinales junto al río — cierran sobre el mediodía, por eso van primero. Buen sitio para comprar un saru-bobo.' },
      { name: 'Santuario Sakurayama Hachimangu', kind: 'visit', durOverride: 25 },
      { name: 'Kusakabe Mingeikan', kind: 'visit', durOverride: 30 },
      { name: 'Yoshijima-ke', kind: 'visit', durOverride: 25 },
      { name: 'Fujii Bijutsu Mingeikan', kind: 'visit', durOverride: 20 },
      { name: 'Sanmachi Suji', kind: 'visit', durOverride: 40, note: 'Ichino-machi, Ni-no-machi y San-no-machi. Aquí hay paseos en jinrikisha (rickshaw) y tiendas de saru-bobo. Probar hoba-miso o chuka soba, y catar sake en Funasaka Sake Brewery.' },
      { name: 'Hirata Kinenkan', kind: 'visit', durOverride: 20 },
      { name: 'Templo Hida Kokubunji', kind: 'visit', durOverride: 20, mealAfter: 'lunch' },
      { name: 'Teramachi', kind: 'visit', durOverride: 30 },
      { name: 'Parque Shiroyama', kind: 'visit', durOverride: 25 },
      { name: 'Hida Minzoku Kokokan', kind: 'visit', durOverride: 35 },
      { name: 'Takayama Shōwa-kan Museum', kind: 'visit', durOverride: 60, transit: 'Bus turístico Sarubobo, Takayama Station → Hida no Sato, ~10 min.', transitMin: 15 },
      { name: 'Hida no Sato Folk Village Museum', kind: 'visit', durOverride: 90, transit: 'Bus Sarubobo de vuelta hacia el centro, parada cercana al hotel, ~10 min.', transitMin: 12 },
      { name: 'Hotel Takayama', kind: 'info', mealAfter: 'dinner' },
    ],
  },
  {
    date: '2026-11-05', city: 'Kanazawa-Takayama', title: 'Takayama → Kioto (Magome-juku opcional)',
    kind: 'travel', dayStartTime: '07:30',
    travelNote: 'Ruta directa y sin estrés: Limited Express "Hida" Takayama→Nagoya (~2h20) + Shinkansen Nagoya→Kioto (~35-45 min), total ~3h. El desvío a Nakatsugawa/Magome-juku es 100% opcional y añade ~2h de trenes/bus extra ese mismo día (no hay bus directo Takayama-Nakatsugawa, hay que bajar hasta Nagoya y volver a subir en la línea JR Chuo). Si vais cansados del viaje, saltároslo sin remordimientos — o cambiadlo por una parada corta en el Castillo de Nagoya (ver Extra y alternativas), que sí queda de camino sin desvío.',
    stops: [
      { name: 'Hotel Takayama', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel, con maletas listas.', transit: 'Camino a la estación (~10 min) + Limited Express "Hida" a Nagoya (~2h20) + JR línea Chūō a Nakatsugawa (~50 min).', transitMin: 200 },
      { name: 'Nakatsugawa Station', kind: 'visit', durOverride: 10, optional: true, note: 'Parada opcional del desvío a Magome-juku (+~2h ida y vuelta desde Nagoya).', transit: 'Bus local Nakatsugawa → Magome-juku, ~30 min.', transitMin: 30 },
      { name: 'Magome-juku', kind: 'visit', durOverride: 90, optional: true, note: 'Opcional — comer soba en Yoshimura Soba. Saltadlo si preferís llegar antes y con más calma a Kioto.', transit: 'Bus de vuelta a Nakatsugawa (~30 min) + JR línea Chūō a Nagoya (~50 min) + Shinkansen Tōkaidō a Kioto (~35-45 min).', transitMin: 125 },
      { name: 'Hotel Kyoto', kind: 'info' },
    ],
  },
  // ---------------- KIOTO ----------------
  {
    date: '2026-11-06', city: 'Kioto', title: 'Higashiyama: Kiyomizu y Gion',
    kind: 'city', dayStartTime: '06:45',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel (temprano, para llegar a Kiyomizu antes que los grupos).', transit: 'Bus Kioto City Bus Shijo Karasuma → Kiyomizu-michi, ~20 min.', transitMin: 20 },
      { name: 'Kiyomizu-dera', kind: 'visit', durOverride: 60 },
      { name: 'Sannenzaka', kind: 'visit' },
      { name: 'Ninenzaka', kind: 'visit' },
      { name: 'Koyasu-no-to Pagoda', kind: 'visit', durOverride: 20 },
      { name: 'Templo Hokan-ji (Pagoda Yasaka)', kind: 'visit', durOverride: 20 },
      { name: 'Santuario Yasaka', kind: 'visit', durOverride: 25 },
      { name: 'Gion', kind: 'visit', durOverride: 60, mealAfter: 'lunch' },
      { name: 'Hanamikoji-dori', kind: 'visit' },
      { name: 'Gionmachi Minamigawa', kind: 'visit' },
      { name: 'Miyakawa-cho Dori', kind: 'visit' },
      { name: 'Hanamikoji Street', kind: 'visit' },
      { name: 'Santuario Yasui Konpira', kind: 'visit', durOverride: 15 },
      { name: 'Monumentos de piedra y encantos de Pontocho', kind: 'visit', durOverride: 45, note: 'La hora del reloj de aquí abajo asume que seguís el ritmo del día — llegad sobre las 22h aunque el reloj marque otra cosa.', mealAfter: 'dinner', transit: 'Paseo de 20 min junto al río Kamo, o autobús directo Kawaramachi → Shijo Karasuma (~10 min).', transitMin: 15 },
      { name: 'Hotel Kyoto', kind: 'info' },
    ],
  },
  {
    date: '2026-11-07', city: 'Kioto', title: 'Kinkaku-ji y Arashiyama',
    kind: 'city', dayStartTime: '08:00',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Bus Kioto City Bus Karasuma → Kinkakuji-michi, ~30 min.', transitMin: 30 },
      { name: 'Pabellon Dorado', kind: 'visit', durOverride: 30 },
      { name: 'Ryōan-ji', kind: 'visit', durOverride: 30 },
      { name: 'Ninna-ji', kind: 'visit', durOverride: 30, transit: 'Bus Kioto City Bus Ninnaji-mae → Ichijōji, ~10 min.', transitMin: 12 },
      { name: 'Taishogun Shopping Street - Ichijo Yokai Street', kind: 'visit', durOverride: 20, transit: 'Bus Kioto City Bus o JR Sagano Line Hanazono → Saga-Arashiyama, ~20 min en total.', transitMin: 20 },
      { name: 'Templo Tenryu-ji', kind: 'visit', durOverride: 30, mealAfter: 'lunch' },
      { name: 'Bosque de Bambú de Arashiyama', kind: 'visit', durOverride: 20 },
      { name: 'Arashiyama Nakaoshitacho', kind: 'visit', durOverride: 30 },
      { name: 'Arashiyama Monkey Park Iwatayama', kind: 'visit', durOverride: 70 },
      { name: 'Adashino Nenbutsuji Temple', kind: 'visit', durOverride: 30, mealAfter: 'dinner', transit: 'JR Sagano Line Saga-Arashiyama → Kioto Station (~15-20 min) + bus/metro al hotel (~10 min).', transitMin: 30 },
      { name: 'Hotel Kyoto', kind: 'info' },
    ],
  },
  {
    date: '2026-11-08', city: 'Kioto', title: 'Fushimi Inari y el Camino del Filósofo (Ginkaku-ji)',
    kind: 'city', dayStartTime: '06:15',
    travelNote: 'Fushimi Inari y Sanjusangen-dō están al sur (cerca de la estación de Kioto); Ginkaku-ji y el Camino del Filósofo están al norte.',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno temprano en el hotel (o para llevar) — Fushimi Inari conviene cogerlo nada más abrir.', transit: 'JR Nara Line Kioto/Tōfukuji → Inari, ~5-10 min (+ 10-15 min hasta la estación desde el hotel).', transitMin: 20 },
      { name: 'Fushimi Inari-taisha', kind: 'visit', durOverride: 100, note: 'Ir muy temprano. Subida completa 2-3h; con llegar al mirador Yotsutsuji (~1h ida y vuelta) ya merece la pena.', transit: 'JR Nara Line Inari → Kioto (~5 min) + JR/bus a Sanjūsangen-dō (~10 min), o taxi directo (~15 min).', transitMin: 20 },
      { name: 'Sanjusangendomawari', kind: 'visit', durOverride: 45, mealAfter: 'lunch', transit: 'Bus o taxi hasta Ginkaku-ji, ~25-35 min.', transitMin: 30 },
      { name: 'Ginkaku-ji', kind: 'visit', durOverride: 45 },
      { name: 'Hōnenin Temple', kind: 'visit', durOverride: 25 },
      { name: 'Santuario Otoyo', kind: 'visit', durOverride: 20, note: 'Estatuas de zorros y ratones, muy fotogénico.' },
      { name: 'Nanzen-ji', kind: 'visit', durOverride: 35 },
      { name: 'Templo Eikando', kind: 'visit', durOverride: 35, mealAfter: 'dinner', transit: 'Bus Kioto City Bus Eikando-michi → Shijo Karasuma, ~20-25 min.', transitMin: 25 },
      { name: 'Hotel Kyoto', kind: 'info' },
    ],
  },
  {
    date: '2026-11-09', city: 'Kioto', title: 'Nara → Osaka',
    kind: 'travel', dayStartTime: '07:30',
    travelNote: 'Salida con maletas del hotel de Kioto (dejadlas en consigna de la estación). JR Nara Line (rápido "Miyakoji") o Kintetsu Kyoto Line hasta Nara, ~45 min. Por la tarde, Kintetsu Nara Line directo hasta Osaka-Namba (~35-40 min) — no hace falta volver a Kioto.',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel, con maletas listas (dejadlas en consigna de la estación).', transit: 'JR Nara Line (rápido "Miyakoji") o Kintetsu Kyoto Line hasta Nara, ~45 min.', transitMin: 45 },
      { name: 'Nara', kind: 'visit', durOverride: 0, transit: 'Paseo por Sanjō-dori (calle comercial) hasta el parque, ~15 min — o bus Nara Kotsu, ~10 min.', transitMin: 10 },
      { name: 'Parque de Nara', kind: 'visit', durOverride: 45 },
      { name: 'Tōdai-ji', kind: 'visit', durOverride: 45, mealAfter: 'lunch' },
      { name: 'Santuario Kasuga Taisha', kind: 'visit', durOverride: 40, transit: 'Kintetsu Nara Line directo Nara → Osaka-Namba, ~35-40 min.', transitMin: 40 },
      { name: 'Hotel Osaka', kind: 'info', note: 'Tarde libre para descansar tras el viaje — o acercaros por la noche a cenar a Takimikoji, junto a Umeda (ver Extra y alternativas).' },
    ],
  },
  // ---------------- OSAKA ----------------
  {
    date: '2026-11-10', city: 'Osaka', title: 'Universal Studios Japan',
    kind: 'daytrip', dayStartTime: '08:00',
    travelNote: 'JR Kanjo Line o Nankai/metro directo Namba/Osaka → Universal City (~20-25 min). Recomendado ir entre semana con pase express para 4 atracciones — planificad las atracciones en la app antes de entrar.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'JR Osaka Loop Line Temmabashi/Osaka → Nishikujo (~15 min) + JR Yumesaki Line a Universal City (~5 min).', transitMin: 25 },
      { name: 'Universal Studios Japan', kind: 'visit', durOverride: 480, note: 'Comida dentro del parque.', transit: 'JR Yumesaki Line Universal City → Nishikujo (~4 min) + JR Osaka Loop Line a Osaka/Temmabashi (~20 min).', transitMin: 30 },
      { name: 'Hotel Osaka', kind: 'info' },
    ],
  },
  {
    date: '2026-11-11', city: 'Osaka', title: 'Excursión a Hiroshima y Miyajima',
    kind: 'daytrip', dayStartTime: '06:00',
    travelNote: 'Salida muy temprano: Shinkansen Sanyo (Nozomi/Sakura) Shin-Osaka → Hiroshima, ~1h20-1h35. Es un día largo — salir con el primer tren que podáis y volved directos al hotel a descansar.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno rápido o para llevar — a esta hora muchos hoteles aún no lo sirven, confirmad el horario la noche anterior.', transit: 'Metro a Shin-Osaka (~15-20 min) + Shinkansen Sanyo a Hiroshima (~1h20-1h35).', transitMin: 110 },
      { name: 'Hiroshima', kind: 'visit', durOverride: 0 },
      { name: 'Parque Memorial de la Paz de Hiroshima', kind: 'visit', durOverride: 60, transit: 'Tranvía Hiroden Genbaku Dome-mae → Kamiyachō, ~5 min + 5 min andando.', transitMin: 12 },
      { name: 'Castillo de Hiroshima', kind: 'visit', durOverride: 45, transit: 'Tranvía Hiroden Kamiyachō → Hatchōbori, ~5 min + 5 min andando.', transitMin: 12 },
      { name: 'Okonomimura', kind: 'visit', durOverride: 45 },
      { name: 'Hondori Shopping Street', kind: 'visit', durOverride: 20, transit: 'JR Sanyo Line Hiroshima → Miyajimaguchi (~25 min) + ferry JR/Miyajima Matsudai (~10 min).', transitMin: 40 },
      { name: 'Miyahima', kind: 'visit', durOverride: 0, note: 'El paseo por la orilla hasta el torii es parte del atractivo — se recorre andando.' },
      { name: 'Torii Flotante del Santuario Itsukushima', kind: 'visit', durOverride: 30 },
      { name: 'Santuario Itsukushima', kind: 'visit', durOverride: 30 },
      { name: 'Calle Comercial Miyajima Omotesando', kind: 'visit', durOverride: 30, transit: 'Bus gratuito a la estación del ropeway + telesférico Miyajima, ~15 min en total.', transitMin: 20 },
      { name: 'Monte Misen', kind: 'visit', durOverride: 90, note: 'Teleférico + un poco de subida a pie para las vistas.', transit: 'Teleférico de bajada (~15 min) + ferry a Miyajimaguchi (~10 min) + JR a Hiroshima (~25 min) + Shinkansen Sanyo a Shin-Osaka (~1h20-1h35) + metro al hotel (~20 min).', transitMin: 160 },
      { name: 'Hotel Osaka', kind: 'info' },
    ],
  },
  {
    date: '2026-11-12', city: 'Osaka', title: 'Castillo, Umeda Sky, Dōtonbori y Shinsekai → Aeropuerto',
    kind: 'city', dayStartTime: '08:30',
    travelNote: 'Salida del hotel con equipaje por la mañana (dejar maletas en consigna de la estación). Vuelo OSAKA KANSAI 23:20 → Singapur 05:00 (+1) — al ser el último día, toda la ruta de hoy es dentro de Osaka, sin trenes de larga distancia, para llegar con margen al aeropuerto.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel, con maletas listas para dejar en consigna.' },
      { name: 'Castillo Osaka', kind: 'visit', durOverride: 75, transit: 'Metro Osaka Loop/Tanimachi Line Osakajōkōen → Umeda, ~15-20 min en total.', transitMin: 20 },
      { name: 'Umeda Sky Building (osaka)', kind: 'visit', durOverride: 45, transit: 'Metro Midosuji Line Umeda → Namba (~10 min) + andar/metro a Kuromon (~10 min).', transitMin: 20 },
      { name: 'Kuromon Market', kind: 'visit', durOverride: 45, mealAfter: 'lunch' },
      { name: 'Shinsaibashisuji', kind: 'visit', durOverride: 30 },
      { name: 'America-mura', kind: 'visit', durOverride: 30 },
      { name: 'Sennichimae', kind: 'visit', durOverride: 20 },
      { name: 'Ebisu Bashi-Suji', kind: 'visit', durOverride: 20 },
      { name: 'Dōtonbori', kind: 'visit', durOverride: 60 },
      { name: 'Don Quijote Dotonbori Midosuji', kind: 'visit', durOverride: 20 },
      { name: 'Hozenji Yokocho', kind: 'visit', durOverride: 20 },
      { name: 'Nipponbashi', kind: 'visit', durOverride: 30 },
      { name: 'Tower Slider (Tsutenkaku)', kind: 'visit', durOverride: 30 },
      { name: 'Magic Cafe & Bar Shinsekai', kind: 'visit', durOverride: 45, note: 'Recortad Umeda Sky, Namba o Shinsekai si vais justos de tiempo para el vuelo — mejor de sobra que con prisas.', transit: 'Metro Sakaisuji/Midosuji a Namba (~10 min) + Nankai "Rapi:t" o JR Kansai Airport Line a Kansai Airport (~40-45 min).', transitMin: 60 },
      { name: 'Aeropuerto Internacional de Kansai', kind: 'info' },
    ],
  },
];

// Lugares del KMZ que no se han metido en ningún día (opcionales / por si sobra tiempo)
const extras = {
  Tokio: ['Chōfu', 'Jardín Botánico Jindaiji', '大正寺 山門(竜宮門)', 'Shibamata', 'Shibamata Taishakuten', 'Yamanote Line', 'Park Hyatt Tokyo', 'SUSHI Gompachi Nishi-Azabu', 'Mount Fuji Fujinomiya 5th Station'],
  'Kanazawa-Takayama': ['Castillo de Nagoya'],
  Kioto: [
    "Philosopher's Path (Tetsugaku no Michi), North End", 'Tetsugaku No Michi',
    'Heian Jingū', 'Santuario Shirakumo', 'Munakata Shrine', 'Santuario Itsukushima (interior del Parque del Palacio Imperial de Kioto)',
    'Reikan-ji', 'Kumano Nyakuōji Shrine', 'Anraku-ji Temple', 'Mirokuin Temple',
    'Daigo-ji', 'Byōdō-in',
    'Castillo Nijō', 'Templo Nishi Hongan-ji', 'Templo Higashi Hongan-ji', 'Palacio Imperial Sento de Kioto',
  ],
  Osaka: [
    'Sumiyoshi Taisha', 'Templo Katsuo-ji', 'Takimikoji',
    'Jardín Shukkeien', 'Santuario Toyokuni (Senjokaku)', 'Parque Momijidani', 'Teleférico de Miyajima',
  ],
};

// Excursiones alternativas (no asignadas a un día fijo, para intercambiar por otra si sobra tiempo)
const altDayTrips = [
  {
    id: 'tsuruga', title: 'Tsuruga, Hikone y Fukui (alternativa, desde Kioto)',
    note: 'Kioto → Maibara (JR Biwako Line, ~50 min) → Castillo Hikone (JR ~10 min) → Tsuruga (limited express Hokuriku, ~30-40 min desde Maibara) → Fukui (JR ~20 min más). Los tres en un día realista solo si vais justos de tiempo en cada parada; con calma, recomendado quedarse en Hikone + Tsuruga.',
    stops: ['Tsuruga', 'Castillo Hikone', 'Fukui'],
  },
];

module.exports = { CITY_COLORS, days, extras, altDayTrips, manualPlaces, manualFood };
