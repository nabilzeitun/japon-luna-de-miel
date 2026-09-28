// Segunda pasada: corrige gramatica y reclasifica desc/nota en las paradas del KMZ (parsed.json).
// Reglas: desc = descripcion breve y neutra del lugar (que es). Contenido de horarios,
// precios, recomendaciones personales o consejos de "como hacerlo bien" se deja para
// el campo note en trip-config.js (se corrige aparte, a mano).
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'japon_kmz', 'parsed.json');
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

const DESCS = {
  'Haneda airport': 'Aeropuerto internacional en la bahía de Tokio, con conexión directa a Asakusa en metro.',
  'Hotel Tokyo': '5 noches de alojamiento y desayuno en el Hotel Tobu Levant (Tokio), habitación doble con vistas al Skytree.',
  'Kuramae': 'Barrio conocido como el "Brooklyn de Tokio": tiendas pequeñas de artesanía y ambiente tranquilo.',
  'Sensō-ji': 'El templo budista más antiguo de Tokio, fundado en el año 645, con la icónica Puerta del Trueno (Kaminarimon) y su gran linterna roja.',
  'Calle Comercial Shin-Nakamise': 'Galería comercial cubierta que conecta con la estación de metro de Asakusa, alternativa menos concurrida a Nakamise-dori.',
  'Centro de Información Turística y Cultural de Asakusa': 'Oficina de turismo con un mirador gratuito en una de sus plantas superiores, con vistas sobre Asakusa y el Skytree.',
  'Hoppy Street': 'Callejón de izakayas tradicionales, famoso por el hoppy, una bebida con sabor a cerveza y poca graduación.',
  'Puente Azuma': 'Puente rojo sobre el río Sumida que conecta Asakusa con el barrio de Sumida, a los pies del Skytree.',
  'Museo Nacional de Tokio': 'El museo más antiguo, grande e importante de Japón, con la galería Honkan (arte japonés tradicional por orden cronológico), armaduras samurái, la galería Tōyōkan y jardines alrededor.',
  'Ueno Zoo': 'El zoológico más antiguo de Japón, abierto en 1882 dentro del Parque de Ueno.',
  'Yanaka': 'Barrio tranquilo de casas bajas, templos y comercios artesanales tradicionales.',
  'Akihabara': 'Barrio de electrónica, videojuegos, manga y tiendas de segunda mano.',
  'TAITO Station Akihabara': 'Sala recreativa viral, una de las más grandes del mundo, famosa por sus máquinas de peluches (UFO catcher).',
  'Gyukatsu Motomura Coredo Muromachi Branch': 'Restaurante especializado en gyūkatsu (tonkatsu de ternera empanada), cerca de Coredo Muromachi.',
  'Calle Takeshita': 'Calle peatonal de unos 350-400 m, emblemática por sus tiendas de moda juvenil.',
  'Omote-Sando Avenue': 'Calle comercial paralela a Takeshita-dori, con tiendas como Kiddy Land (muñecos) y bazares orientales.',
  'Dogenzaka': 'Una de las avenidas comerciales más conocidas del barrio de Shibuya.',
  'Shibuya Nonbei Yokocho': 'Callejón estrecho de pequeños bares tradicionales, animado por las noches.',
  'Mirador del Gobierno Metropolitano de Tokio': 'Rascacielos de la administración metropolitana de Tokio (Tochō), con un mirador gratuito en la planta 45.',
  'Park Hyatt Tokyo': 'Hotel de lujo donde se rodó la película "Lost in Translation" (2003).',
  'Omoide Yokochō': 'Callejón de posguerra con pequeños puestos de yakitori, apenas para unos pocos comensales cada uno.',
  'Shinjuku Ni-chōme': 'El principal barrio LGTBI de Tokio, con la mayor concentración de bares gay de Asia.',
  'Tokyu Kabukicho Tower': 'Torre de ocio en Kabukichō con restaurantes, cines, salas de conciertos y máquinas recreativas.',
  'Shinjuku Sushi Hatsume': 'Restaurante de sushi bien valorado en Shinjuku.',
  'Okubo': 'El Koreatown de Tokio: comida callejera coreana, cafeterías con dulces, cosmética y ropa coreana, productos de K-pop y mercados de productos frescos.',
  'Komachi Street': 'Calle comercial que lleva de la estación de Kamakura al santuario Tsurugaoka Hachiman-gū, con tiendas y puestos de comida callejera.',
  'Teleférico de Hakone': 'Tramo de teleférico entre Sōunzan y Owakudani, con vistas al Fuji si el día está despejado.',
  'Owakudani': 'Valle volcánico activo con fumarolas de azufre, célebre por sus huevos cocidos en aguas termales (kuro-tamago).',
  'Estación de Kanazawa': 'Una de las estaciones más bonitas de Japón, con la puerta de madera Tsuzumi-mon y la cúpula acristalada Motenashi a la salida.',
  'Mercado Omicho': 'El mercado de abastos de Kanazawa, apodado "la cocina de la ciudad", con casi 300 años de historia y 180 puestos de ostras, sushi fresco, fruta, pescado, carne y setas.',
  'Shirakawa': 'Pueblo de casas tradicionales gasshō-zukuri (tejados a dos aguas muy inclinados), Patrimonio Unesco, en el valle del río Shogawa.',
  'Nakatsugawa Station': 'Estación de tren desde donde salen los buses hacia Magome-juku.',
  'Magome-juku': 'Antiguo pueblo de postas de la ruta Nakasendō, con casas de madera y vistas al valle que conservan el ambiente de la era feudal.',
  'Takayama Jinya': 'Antigua sede del gobierno local en el periodo Edo, junto al río Miyagawa — el único palacio de gobierno de esa época que se conserva en pie en todo Japón.',
  'Sanmachi Suji (Casco Antiguo)': 'Las calles Ichino-machi, Ni-no-machi y San-no-machi, con casas de comerciantes del periodo Edo convertidas en museos, galerías, tiendas de artesanía, destilerías de sake y cafeterías.',
  'Men-ya Inoichi Hanare': 'Restaurante de ramen en el centro de Kioto.',
  'Santuario Itsukushima (interior del Parque del Palacio Imperial de Kioto)': 'Réplica en miniatura del santuario de Miyajima dentro del Parque Imperial, con su propio torii sobre un estanque.',
  'Yakiniku Dining Kinoe': 'Restaurante de yakiniku (barbacoa coreano-japonesa) para asar la carne en la mesa.',
  'Kiyomizu-dera': 'Templo budista del siglo VIII, famoso por su gran escenario de madera construido sin clavos, con vistas sobre Kioto. Patrimonio Unesco.',
  'Sannenzaka': 'Callejuela empedrada de tiendas y casas tradicionales que baja desde Kiyomizu-dera, una de las calles históricas mejor conservadas de Kioto.',
  'Ninenzaka': 'Continuación de Sannenzaka, otra calle empedrada tradicional camino a Kiyomizu-dera, con tiendas de artesanía y dulces.',
  'Koyasu-no-to Pagoda': 'Pequeña pagoda de tres pisos en la ladera junto a Kiyomizu-dera, dedicada a la protección del parto.',
  'Templo Hokan-ji (Pagoda Yasaka)': 'Pagoda de cinco pisos del siglo VII, uno de los símbolos fotográficos más reconocibles de Higashiyama.',
  'Gion': 'Barrio de las casas de té donde trabajan geishas y maiko.',
  'Tempura Endo Yasaka (West)': 'Restaurante de tempura bien valorado, cerca de Yasaka.',
  'Miyakawa-cho Dori': 'Calle de casas de té más apartada y tranquila que Hanamikoji, con menos turistas.',
  'Hanamikoji Street': 'Tramo peatonal entre el río Kamo y Hanamikoji-dori, con ambiente tradicional de Gion.',
  'Monumentos de piedra y encantos de Pontocho': 'Callejón tradicional de Pontochō junto al río Kamo, con casas de té, restaurantes y bares — famoso por su wagyu (ohmi beef) y sus farolillos de piedra.',
  'Tai Sushi': 'Restaurante de sushi tradicional y genuino.',
  'Taishogun Shopping Street - Ichijo Yokai Street': 'Calle temática dedicada a los yōkai (monstruos y espíritus del folclore japonés), con tiendas curiosas.',
  'Arashiyama Nakaoshitacho': 'Zona comercial de Arashiyama, de paso entre el bosque de bambú y el Monkey Park, con tiendas y puestos de comida.',
  'Arashiyama Monkey Park Iwatayama': 'Parque en la cima de una colina con macacos japoneses en libertad y vistas panorámicas de Kioto.',
  'Adashino Nenbutsuji Temple': 'Templo con miles de pequeñas estatuas de piedra de Buda, agrupadas en memoria de las almas sin descendientes que las honraran.',
  'Sushitetsu': 'Restaurante de sushi con buenos nigiris y una relación calidad-precio muy buena.',
  'Sanjusangendomawari': 'Salón de madera más largo de Japón, con 1.001 estatuas de Kannon (diosa budista de la misericordia) talladas a mano y cubiertas de pan de oro.',
  'Ginkaku-ji': 'El "Pabellón de Plata", templo zen del siglo XV que marca la entrada norte del Camino del Filósofo. Patrimonio Unesco.',
  'Otoyo': 'Pequeño santuario famoso por sus estatuas guardianas de ratones y zorros (en vez de los habituales leones), junto al Camino del Filósofo — muy fotogénico.',
  'Daigo-ji': 'Templo de la secta budista Shingon con más de 80 edificios entre jardines y estanques; su pagoda de cinco pisos es la estructura de madera más antigua de Kioto. Patrimonio Unesco.',
  'Byōdō-in': 'Templo del siglo XI, Patrimonio Unesco, cuyo pabellón Fénix (Hōō-dō) aparece en la moneda de 10 yenes.',
  'Parque de Nara': 'Parque con más de mil ciervos sika que viven en libertad y se dejan acariciar y alimentar.',
  'Castillo Osaka': 'Castillo de 1583 construido por Toyotomi Hideyoshi, reconstruido en hormigón en 1931; el torreón alberga un museo con ascensor y mirador.',
  'Kuromon Market': 'Mercado cubierto de casi 600 m con más de 150 puestos de pescado, marisco y fruta — el "paladar de Osaka".',
  'Shinsaibashisuji': 'Galería comercial cubierta de más de 600 m con cientos de tiendas — aquí está el Daiso más famoso de Japón (todo a 100 yenes).',
  'Dōtonbori': 'El barrio de ocio y neones más icónico de Osaka, a orillas del canal homónimo — mejor de noche, cuando se encienden los carteles luminosos.',
  'Nipponbashi': 'Barrio de tiendas de electrónica, manga y anime, el "Akihabara de Osaka".',
  'Umeda Sky Building (osaka)': 'Rascacielos gemelo unido por un mirador circular flotante en la azotea, con vistas de 360° especialmente atractivas al atardecer.',
  'Takimikoji': 'Callejón gastronómico junto al Umeda Sky Building, con takoyaki, okonomiyaki y kushiage.',
  'Torii Flotante del Santuario Itsukushima': 'Torii bermellón de 16,6 m, símbolo de Miyajima — con la marea alta (~250 cm) parece flotar sobre el mar.',
  'Calle Comercial Miyajima Omotesando': 'Calle comercial de Miyajima camino al santuario, con tiendas de recuerdos, momiji manju (pastelitos de arce) y anago (anguila) a la parrilla.',
  'Universal Studios Japan': 'Parque temático de Universal Pictures en Osaka, con zonas de Harry Potter, Super Nintendo World y Mario.',
  'Magic Cafe & Bar Shinsekai': 'Bar-restaurante en Shinsekai, el barrio retro alrededor de la torre Tsutenkaku, con fachadas llenas de figuras y carteles antiguos.',
  'Aeropuerto Internacional de Kansai': 'Aeropuerto internacional construido sobre una isla artificial en la bahía de Osaka.',
};

let updated = 0, notFound = [];
for (const name of Object.keys(DESCS)) {
  let found = false;
  for (const f of data) {
    for (const p of f.places) {
      if (p.name === name) { p.desc = DESCS[name]; updated++; found = true; }
    }
  }
  if (!found) notFound.push(name);
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Actualizadas:', updated, '/', Object.keys(DESCS).length);
if (notFound.length) console.log('NO ENCONTRADAS:', notFound);
