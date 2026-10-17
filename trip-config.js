// TODO (pendiente, no urgente): varias paradas heredan una desc muy pobre del KMZ original
// (p.ej. "Asakusa" solo dice "barrio"). Pendiente pasarlas y escribir una frase útil para cada una.

// Config: qué placemark (por nombre EXACTO del KML) va en qué día, y en qué orden.
// kind: 'visit' (parada turística) | 'info' (vuelo/hotel/estación, no cuenta como visita)
// durOverride en minutos; si no se da, se infiere por palabra clave del nombre/desc.
// transit + transitMin: cuando el salto a la siguiente parada es largo (>20 min andando) y existe
// alternativa de transporte público razonable, se describe aquí y se usa transitMin para el reloj del día.
// dayStartTime: hora aproximada (HH:MM) en la que arranca la primera parada del día — de ahí se calculan
// en cascada las horas estimadas de llegada a cada parada siguiente.

// Bloque HTML de un e-ticket de autobús, pensado para enseñárselo al conductor (texto grande, con japonés).
const ticketRow = (k, v, big) => `<div class="tk-row"><span class="tk-k">${k}</span><span class="tk-v${big ? ' tk-big' : ''}">${v}</span></div>`;
const busTicket = (t) => `<div class="ticket"><div class="tk-title">🎫 BILLETE ELECTRÓNICO · 購入済電子乗車票</div>`
  + ticketRow('Reservation number · 予約番号', t.res, true)
  + ticketRow('Name · お名前', t.name)
  + ticketRow('Fare · ご購入金額', t.fare)
  + ticketRow('Route · 路線', `高岡・富山・金沢ー白川郷・高山線<br>Takayama-Shirakawa-go/Kanazawa Line`)
  + ticketRow('Passengers · 2名', 'Adult_Male (大人料金_男性) 1 person<br>Adult_Female (大人料金_女性) 1 person')
  + ticketRow('Departure · 出発', `${t.depTime} (JST)<br>${t.from} (${t.fromJp})<br><a href="${t.fromMap}" target="_blank" rel="noopener">📍 Mapa</a>`)
  + ticketRow('Arrival · 到着', `${t.arrTime} (JST)<br>${t.to} (${t.toJp})<br><a href="${t.toMap}" target="_blank" rel="noopener">📍 Mapa</a>`)
  + ticketRow('Car No. · 車号 / Seat · 座席番号', `${t.car} · ${t.seats}`, true)
  + ticketRow('Operating Company · 運行会社', t.operator)
  + `</div>`;

// Lugares que NO estaban en el KMZ pero pidió el usuario explícitamente (destinos "ancla" confirmados
// por los vuelos/reservas). Coordenadas aproximadas a partir de conocimiento general del lugar.
const manualPlaces = [
  // Recordatorios de takkyubin — paradas virtuales (duración 0, kind:'info') en la ubicación del hotel correspondiente.
  { name: 'Takkyubin: avisar al hotel (envío a Kioto)', desc: 'Preguntad en recepción si el hotel ofrece servicio de takkyubin, para confirmarlo cuanto antes.', lat: 35.6972128, lon: 139.810939 },
  { name: 'Takkyubin: preparar bolsa pequeña (envío a Kioto)', desc: 'Preparad esta noche lo que necesitéis para los próximos 3 días (Kanazawa, Shirakawa-go, Takayama) en la mochila o bolsa de viaje.', lat: 35.6972128, lon: 139.810939 },
  { name: 'Takkyubin: entregar maleta (envío a Kioto)', desc: 'Entregad la maleta grande en recepción para el envío por takkyubin.', lat: 35.6972128, lon: 139.810939 },
  { name: 'Takkyubin: avisar al hotel (envío a Osaka)', desc: 'Preguntad en recepción si el hotel ofrece servicio de takkyubin, para confirmarlo cuanto antes.', lat: 35.0006295, lon: 135.7578639 },
  { name: 'Takkyubin: preparar bolsa pequeña (envío a Osaka)', desc: 'Preparad esta noche lo que necesitéis para mañana (Nara y el traslado a Osaka) en la mochila o bolsa de viaje.', lat: 35.0006295, lon: 135.7578639 },
  { name: 'Takkyubin: entregar maleta (envío a Osaka)', desc: 'Entregad la maleta grande en recepción para el envío por takkyubin.', lat: 35.0006295, lon: 135.7578639 },
  { name: 'Shibuya Sky', desc: 'Mirador al aire libre en lo alto del Shibuya Scramble Square, justo encima de la estación — vistas de 360° sobre el cruce de Shibuya.', lat: 35.6590, lon: 139.7016 },
  {
    name: 'Shugakuin Imperial Villa',
    desc: 'Villa imperial del siglo XVII en las colinas de Kioto, con tres jardines de paseo y vistas a las montañas. Visita guiada de ~1h20, solo con reserva previa (como el Palacio Sento).<br>A favor:<br>• Un estilo de jardín distinto a todo lo demás del viaje.<br>• Famosa por el otoño — encaja con las fechas del viaje.<br>• Una de las mejores vistas de Kioto, desde el Jardín Alto.',
    lat: 35.0429, lon: 135.8083,
  },
  { name: 'Palacio Imperial de Kioto (Gosho)', desc: 'Antigua residencia oficial de la familia imperial hasta el traslado a Tokio en 1869, dentro del mismo Parque Imperial (Kyoto Gyoen) que el Palacio Sento, unos minutos al norte. Visita guiada, solo con reserva previa en la Agencia de la Casa Imperial (Kunaicho).', lat: 35.0254, lon: 135.7622 },
  // Nara — no estaban en el KMZ, pedidos explícitamente
  { name: 'Nigatsu-dō', desc: 'Sala en lo alto de la colina de Tōdai-ji con un gran balcón de madera y vistas panorámicas sobre Nara. Entrada gratuita.', lat: 34.6897, lon: 135.8446 },
  { name: 'Kamaiki (Udon)', desc: 'Udon estilo Sanuki muy famoso (en la Guía Michelin), con los fideos cortados a mano cada mañana. Solo efectivo.', lat: 34.6829, lon: 135.8292 },
  { name: 'Higashimuki Shopping Street', desc: 'Galería comercial cubierta junto a la estación Kintetsu-Nara, con tiendas de recuerdos y comida.', lat: 34.6836, lon: 135.8290 },
  { name: 'Monte Wakakusa', desc: 'Colina de hierba de ~340 m junto al parque de Nara, con vistas de toda la ciudad. Entrada ¥150.', lat: 34.6883, lon: 135.8500 },
  { name: 'Estación Kintetsu-Nara', desc: 'Estación de la línea Kintetsu, mucho más cercana al parque de Nara que la JR Nara.', lat: 34.6839, lon: 135.8283 },
  { name: 'Arashiyama Yoshimura', desc: 'Soba artesanal con vistas al puente Togetsukyō y las montañas de Arashiyama, a un paso de Tenryu-ji y el bosque de bambú.', lat: 35.0100, lon: 135.6780 },
  { name: 'Kenrokuen', desc: 'Uno de los tres jardines (Nihon Sanmei) más famosos de Japón, junto al Castillo de Kanazawa.', lat: 36.5613, lon: 136.6625 },
  { name: 'Nagamachi', desc: 'Antiguo barrio de samuráis, calles empedradas con muros de barro y canales.', lat: 36.5645, lon: 136.6536 },
  { name: 'Higashi Chaya', desc: 'El mayor de los distritos de casas de té (geishas) de Kanazawa, con pan de oro en las tiendas.', lat: 36.5716, lon: 136.6636 },
  { name: 'Kazuemachi', desc: 'Distrito de casas de té más pequeño y tranquilo, a orillas del río Asano.', lat: 36.5687, lon: 136.6597 },
  { name: 'Mercado Omicho', desc: 'El mercado de abastos de Kanazawa, apodado "la cocina de la ciudad", con casi 300 años de historia y 180 puestos de ostras, sushi fresco, fruta, pescado, carne y setas.', lat: 36.5714, lon: 136.6547 },
  { name: 'Ginkaku-ji', desc: 'El "Pabellón de Plata", templo zen del siglo XV que marca la entrada norte del Camino del Filósofo. Patrimonio Unesco.', lat: 35.0270, lon: 135.7981 },
  { name: 'Sumida', desc: 'Barrio a orillas del río, justo al cruzar el Puente Azuma desde Asakusa, a los pies del Skytree.', lat: 35.7100, lon: 139.8050 },
  { name: 'Explanada y Puente Nijūbashi', desc: 'La vista más icónica del Palacio Imperial: el puente Nijūbashi y la Fushimi Yagura al fondo, desde la explanada Kōkyo Gaien (siempre accesible, sin horario). El Jardín Este del palacio cierra los lunes y viernes.', lat: 35.6825, lon: 139.7528 },
  { name: 'Estación de Tokio (Marunouchi)', desc: 'Fachada histórica de ladrillo rojo de 1914, desde donde sale el Shinkansen a Kanazawa.', lat: 35.6812, lon: 139.7671 },
  // Ginza — no estaban en el KMZ, pedidos explícitamente
  { name: 'Avenida Chuo-dori', desc: 'La calle principal de Ginza. Los domingos de 12:00 a 17:00 se corta al tráfico (hokosha tengoku) y se llena de gente paseando por el centro de la calzada.', lat: 35.6714, lon: 139.7660 },
  { name: 'Seiko House Ginza (Wako)', desc: 'El edificio con la torre del reloj más icónico de Ginza, en la esquina del cruce de Ginza 4-chōme.', lat: 35.6716, lon: 139.7658 },
  { name: 'Ginza Place', desc: 'Edificio de diseño en celosía blanca, frente a Wako, con Nissan y Canon.', lat: 35.6711, lon: 139.7658 },
  { name: 'Almacenes Mitsukoshi Ginza', desc: 'Grandes almacenes centenarios; en la azotea está la estatua Ginza Shusse Jizoson (da buena suerte), y en el sótano hay puestos de comida (depachika).', lat: 35.6714, lon: 139.7664 },
  { name: 'Itoya Ginza', desc: 'La papelería más famosa del mundo — varias plantas de material de escritura y papel de diseño.', lat: 35.6739, lon: 139.7651 },
  { name: 'Lago Ashi: ver el Fuji desde el barco', desc: 'Travesía en barco pirata por el lago Ashi (Togendai → Hakone-machi, ~30 min). El Fuji queda al noroeste, al fondo del lago: con cielo despejado es la mejor vista del día, con el torii del Santuario Hakone en la orilla.', lat: 35.2090, lon: 139.0190 },
  { name: 'Pokémon Center Tokyo DX', desc: 'La tienda oficial de Pokémon más grande de Tokio, dentro del centro comercial Nihombashi Takashimaya S.C.', lat: 35.6835, lon: 139.7745 },
  { name: 'Matsuya Ginza', desc: 'Grandes almacenes en plena Chuo-dori, muy cerca de Itoya.', lat: 35.6735, lon: 139.7655 },
  { name: 'Ginza Six', desc: 'El centro comercial más grande de Ginza, con marcas de lujo y una gran librería (Tsutaya).', lat: 35.6693, lon: 139.7627 },
  // Shirakawa-go — no estaban en el KMZ, pedidos explícitamente
  { name: 'Mirador Shiroyama', desc: 'Mirador en la colina sur del valle, con la vista panorámica más famosa de Shirakawa-go.', lat: 36.2543, lon: 136.9033 },
  { name: 'Casa Museo Wada', desc: 'La casa gasshō-zukuri más grande y visitada del pueblo, Bien Cultural Importante de Japón.', lat: 36.2588, lon: 136.9064 },
  { name: 'Kanda y Nagase', desc: 'Dos casas gasshō-zukuri más, abiertas como museo, muy cerca de la Casa Wada.', lat: 36.2566, lon: 136.9070 },
  { name: 'Templo Myozenji y Santuario Shirakawa Hachiman', desc: 'El templo Myozen-ji (con museo etnográfico) y el santuario sintoísta que da nombre al Festival Doburoku del pueblo.', lat: 36.2560, lon: 136.9072 },
  { name: 'Puente Colgante Deai', desc: 'Puente colgante sobre el río Shogawa, la entrada peatonal clásica al pueblo.', lat: 36.2610, lon: 136.9038 },
  { name: 'Las Tres Casas de Shirakawago', desc: 'El mirador de las tres casas gasshō-zukuri alineadas frente al arrozal.', lat: 36.2580, lon: 136.9055 },
  // Takayama — no estaban en el KMZ, pedidos explícitamente
  { name: 'Sanmachi Suji (Casco Antiguo)', desc: 'Las calles Ichino-machi, Ni-no-machi y San-no-machi, con casas de comerciantes del periodo Edo convertidas en museos, galerías, tiendas de artesanía, destilerías de sake y cafeterías.', lat: 36.1418, lon: 137.2533 },
  { name: 'Takayama Jinya', desc: 'Antigua sede del gobierno local en el periodo Edo, junto al río Miyagawa — el único palacio de gobierno de esa época que se conserva en pie en todo Japón.', lat: 36.1404, lon: 137.2513 },
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
  // Free tours reservados con la agencia — no estaban en el KMZ.
  { name: 'Free tour por Asakusa', desc: 'Recorrido guiado en español (2h) por el barrio más tradicional de Tokio: Kaminarimon, la calle Nakamise, Sensō-ji y el entorno del Puente Azuma, con historia y anécdotas locales.<br>Punto de encuentro: frente a la comisaría de policía de Asakusa (Asakusa Police Station Hanakawado Police Box) — 1 Chome-2-1 Hanakawado, Taito City, Tokyo 111-0033.<br>Llegad con 15 min de antelación.<br>Reservado: 28 oct, 15:00.', lat: 35.7127, lon: 139.7965 },
  { name: 'Free tour por Fushimi Inari-Taisha', desc: 'Recorrido guiado en español (1h45) que empieza en la puerta principal con una introducción histórica del santuario, dedicado a Inari (arroz, fertilidad y zorros/kitsune, sus mensajeros). Pasa por la Sala de Oraciones (Haiden), el emblemático sendero de las mil puertas torii (quién las dona y por qué), un desvío al Santuario Interior —menos concurrido, con leyendas locales sobre los kitsune— y varios santuarios intermedios, hasta terminar con vistas del santuario en plena naturaleza en el Santuario Shirahata.<br>Punto de encuentro: puerta principal de Fushimi Inari-Taisha (Great Torii), frente a la estación JR Inari — 深草薮之内町68番地, Fushimi Ward, Kioto.<br>Reconoceréis al guía por la bandera azul con un panda (Japandas).<br>Llegad con 15 min de antelación.<br>Reservado: 7 nov, 08:30.', lat: 34.9671, lon: 135.7727 },
  { name: 'Free tour por Dotonbori y Namba', desc: 'Recorrido guiado en español (2h30) por Shinsaibashi, America-mura y el canal de Dotonbori, con historias del barrio y parada en el templo Hozenji.<br>Punto de encuentro: Starbucks Coffee Shinsaibashi BIG STEP — 1 Chome-6-14 BIG STEP, Nishishinsaibashi, Chuo Ward, Osaka 542-0086.<br>Reconoceréis al guía por la bandera blanca con las siglas JDM y un perro shiba en un descapotable rojo.<br>Llegad con 10-15 min de antelación.<br>Reservado: 10 nov, 16:30.', lat: 34.6745, lon: 135.5010 },
  // E-tickets de los buses del 3 nov (japanbusonline.com), tal cual el correo de confirmación.
  { name: 'Pendiente: ruta Magome → Tsumago (si lo decidís)', lat: 36.1373669, lon: 137.2480352, desc: '<b>Qué hay que tener decidido y comprado si en Takayama (la víspera, 4 nov) elegís alargar Magome-juku con la caminata a Tsumago (~8 km, unas 3 h):</b><br>✅ <b>Hida de las 08:00 y Shinkansen a Kioto:</b> ya reservados (reserva 41516, coche 6, asientos 6C/6D), junto con el Nozomi a Kioto. Si elegís Magome, el tramo Nagoya → Kioto de ese billete no se usa; solo se admite un cambio de la reserva, así que decidid bien antes de tocarla.<br>⬜ <b>Billetes del día</b> (se compran en el momento, sin reserva previa): JR Chūō Nagoya → Nakatsugawa (el expreso Shinano, ~50 min, asiento reservado opcional) y bus Nakatsugawa → Magome (Kitaena Kotsu). A la vuelta: bus Tsumago → Nagiso (Ontake Kotsu, ¥300, <b>solo efectivo</b>, ~10 min), tren JR Nagiso → Nakatsugawa (los Shinano casi no paran en Nagiso) y Shinano hasta Nagoya + Shinkansen a Kioto.<br>⬜ <b>Último bus Tsumago → Nagiso:</b> según el horario de abril 2026, salidas 15:26, 15:40, 16:10, 16:14 y 17:41 (puede cambiar en fin de semana o festivo; el 5 nov es jueves). Comprobadlo la víspera. Con el Hida de las 08:00 llegáis a Magome hacia las 12:30 y, saliendo a pie hacia las 12:45 sin comer allí, a Tsumago sobre las 15:45: apuntad al bus de las 16:10 o 16:14 (el de las 15:40 ya no llega); el de las 17:41 queda de red de seguridad.<br>⬜ <b>Equipaje (opcional):</b> solo lleváis mochila, pero hay un servicio de envío de maletas Magome → Tsumago, ¥1.000 por pieza (se deja de 8:30 a 11:30 y se recoge de 13:00 a 17:00).<br>⚠ <b>Coste de la opción:</b> llegaríais al hotel de Kioto hacia las 19:30-20:00 y <b>perdéis el tour del Gosho (14:00) y el permiso del Sento (15:30, nº 611321403)</b>, que solo encajan en la opción directa. Si os decidís por Magome, cancelad el permiso en sankan.kunaicho.go.jp.<br>Sin reservas obligatorias para la caminata en sí: no hace falta entrada ni reserva de sendero.' },
  { name: 'Estación de Tokio: recoger billetes del Shinkansen', lat: 35.6812, lon: 139.7671, desc: 'Billetes del Hokuriku Shinkansen del 2 nov (Kagayaki 509, 10:22 Tokio → 12:49 Kanazawa, 2 adultos, ¥29.200), ya reservados y pagados. Hay que recogerlos en una máquina de asientos reservados de JR East («Midori no Kenbaiki») o en la ventanilla Midori no Madoguchi de la Estación de Tokio — <b>no sirven</b> las máquinas de JR Central. Máquina: elegid idioma → «Read QR code» → acercad el código QR de la reserva al lector (o usad el código de recogida si el QR no se ve; el correo de confirmación dice que hay que recoger el billete como muy tarde el día del viaje). Número de reserva <b>E35360</b>, código de recogida <b>31352461812521238</b>. Sin el billete impreso no se puede subir al tren. Hacedlo hoy para no ir con prisa mañana' },
  { name: 'Hida y Nozomi a Kioto · e-ticket', lat: 36.1394, lon: 137.2520, desc: '<div class="ticket"><div class="tk-title">🎫 RESERVA · JR-WEST ONLINE TRAIN RESERVATION</div>'
    + ticketRow('Reservation No.', '41516', true)
    + ticketRow('Receipt ID', 'AEO2157L')
    + ticketRow('Date', 'Thu, Nov 5, 2026')
    + ticketRow('Hida 4 · 特急ひだ4号', '08:00 Takayama (高山) → 10:34 Nagoya (名古屋) · Car 6 · Seats 6-C, 6-D', true)
    + ticketRow('Nozomi 245 · のぞみ245号', '10:47 Nagoya → 11:21 Kyoto (京都) · Car 5 · Seats 4-D, 4-E (trasbordo de 13 min)', true)
    + ticketRow('Passengers · Total', 'Adults: 2 · 23,440 yen (Regular ticket, incluye billete base)')
    + ticketRow('Cómo recogerlo', 'Hay que recoger el billete en una máquina de billetes <b>fuera de los tornos</b> (no valen las de dentro), con la <b>tarjeta física</b> con la que se pagó (Mastercard terminada en 4208; no sirve una tarjeta virtual) y el número de identificación de 4 dígitos que elegisteis al reservar. Mejor recogerlo el <b>2 nov en la Estación de Kanazawa</b>, a la llegada (JR West); respaldo: estación de Takayama el 3 o el 4 nov. Comprobad en la web de la reserva, «Information on stations where tickets can be received», que la estación está en la lista.')
    + ticketRow('Enlaces', '<a href="https://www.westjr.co.jp/global/en/howto/train-reservation/receive/" target="_blank" rel="noopener">📍 Estaciones donde recoger el billete</a><br><a href="https://www.westjr.co.jp/travel-information/en/tickets-passes/" target="_blank" rel="noopener">🔁 Ver, cambiar o reembolsar la reserva</a><br><a href="https://global.trafficinfo.westjr.co.jp/en/" target="_blank" rel="noopener">🚦 Estado del servicio de trenes (JR-West)</a>')
    + ticketRow('Billete base', 'Basic fare ticket TAKAYAMA → KYOTO CITY ZONE, válido del 5 al 7 nov. Suplemento Limited Express 6.000 yen + billete base 5.720 yen por adulto.')
    + ticketRow('Importante', 'Subir al tren sin haber recogido el billete obliga a comprar los billetes de nuevo, a precio sin descuento. Solo se admite un cambio de la reserva.')
    + '</div>' },
  { name: 'Shinkansen a Kanazawa · e-ticket', lat: 35.6812, lon: 139.7671, desc: '<div class="ticket"><div class="tk-title">🎫 RESERVA · 北陸新幹線かがやき509号</div>'
    + ticketRow('Reservation number', 'E35360', true)
    + ticketRow('Pickup code', '31352461812521238', true)
    + ticketRow('QR de recogida (Read QR code)', '<img src="data:image/png;base64,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" alt="QR de recogida del billete, reserva E35360" style="width:220px;max-width:100%;background:#fff;padding:8px;border-radius:6px;image-rendering:pixelated">')
    + ticketRow('Train', 'Kagayaki 509 · Hokuriku Shinkansen')
    + ticketRow('Date', 'Mon, Nov 2, 2026')
    + ticketRow('Time', '10:22 Tokyo (東京) → 12:49 Kanazawa (金沢)', true)
    + ticketRow('Seat', 'Reserved seat · Car 1 · 4D, 4E', true)
    + ticketRow('Passengers · Fare', 'Adults: 2 · 14,600 yen × 2 = 29,200 yen')
    + ticketRow('Payment', 'Credit card · Master ····6133')
    + ticketRow('Cómo recogerlo', 'En una máquina de asientos reservados de JR East (no JR Central) o en la ventanilla Midori no Madoguchi: Choose the language → Read QR code → acercad el QR de la reserva al lector; si el QR no se ve en el móvil, se puede usar el código de recogida. No hace falta registrar ninguna tarjeta IC. Hay que recoger el billete antes de la salida (mejor el 1 nov, paso incluido ese día): sin el billete impreso no se puede subir.')
    + ticketRow('Andén', 'Hokuriku Shinkansen, estación de Tokio. Comprobad el andén en la pantalla.')
    + ticketRow('Ayuda', '<a href="https://www.eki-net.com/en/jreast-train-reservation/Top/Index" target="_blank" rel="noopener">🔁 JR-EAST Train Reservation: ver o reembolsar la reserva</a><br><a href="https://www.jreast.co.jp/en/multi/faq/" target="_blank" rel="noopener">❓ Preguntas frecuentes de JR East</a><br>Recoger el billete como muy tarde el día del viaje; si el QR no se ve, usad el código de recogida. Máquinas de JR Central (zona Tokaido) no valen.')
    + '</div>' },
  { name: 'Romancecar a Hakone · e-ticket', lat: 35.6909, lon: 139.6999, desc: '<div class="ticket"><div class="tk-title">🎫 RECIBO DE COMPRA · ロマンスカー特急券</div>'
    + ticketRow('Booking number', '00037', true)
    + ticketRow('Boarding date', 'Sat, Oct 31, 2026')
    + ticketRow('Train name', 'Hakone 33 (EXE6) · Limited Express Romancecar')
    + ticketRow('Time', '08:20 Shinjuku (新宿) → 09:52 Hakone-Yumoto (箱根湯本)', true)
    + ticketRow('Travelers · Seat type', 'Adults: 2 · Standard seat')
    + ticketRow('Carriage no. / Seat no.', '03 · 7D, 7C', true)
    + ticketRow('Amount (incl. 10% tax)', '2,300 yen')
    + ticketRow('Payment date and time', 'Sun, Oct 04, 2026 21:12 (JST)')
    + ticketRow('Credit card', '************4417 (la tarjeta del pago: hay que llevarla al subir)')
    + ticketRow('Issuing company', 'Odakyu Electric Railway Co., Ltd. (Registration No.: T1011001005060)')
    + ticketRow('Contact', 'Odakyu Sightseeing Service Center · TEL +81-3-5909-0211 (8:00–16:00)')
    + ticketRow('Cómo entrar', 'Enseñad la reserva en el móvil, junto con la tarjeta usada en el pago: abrid el enlace de abajo y pulsad «Confirm booking».<br><a href="https://www.web-odakyu.com/e-romancecar/" target="_blank" rel="noopener">🎫 Abrir e-Romancecar · Confirm booking</a> Se puede subir sin canjear nada en taquilla. Cancelable hasta la salida del tren (¥100 de comisión).')
    + ticketRow('Si NO vais a Hakone (cancelar)', 'Se puede cancelar hasta la salida del tren (08:20 del 31 oct, hora de Japón), con ¥100 de comisión por billete; después no hay devolución. Mejor hacerlo la noche del 30 oct. 1) Abrid <a href="https://www.web-odakyu.com/e-romancecar/" target="_blank" rel="noopener">web-odakyu.com/e-romancecar</a> y entrad en «Confirm booking» / «My Page». 2) Identificad la reserva con el nº 00037 y la tarjeta usada en el pago. 3) Cancelad la reserva. 4) Guardad el correo de confirmación de la cancelación. El reembolso llega a la tarjeta del pago unos días después. Si hay fallo, tel. Odakyu Sightseeing Service Center +81-3-5909-0211 (8:00–16:00).')
    + ticketRow('Ayuda', '<a href="https://odakyu-global.com/passes/romancecar/" target="_blank" rel="noopener">❓ Romancecar: cómo reservar y cancelar</a><br><a href="https://odakyu-global.com/services/faq/" target="_blank" rel="noopener">❓ Preguntas frecuentes de Odakyu</a>')
    + ticketRow('Importante', 'A separate ticket/Freepass is needed when boarding the train. Es solo el suplemento del Romancecar: para subir necesitáis ADEMÁS el Hakone Freepass (o billete normal Shinjuku–Odawara).')
    + '</div>' },
  { name: 'Bus a Shirakawa-go · e-ticket', lat: 36.5782720227044, lon: 136.64648877466, desc: busTicket({
    res: '10032053821', name: 'Nabil Zeitun Eguino', fare: 'JPY 5,600',
    depTime: '11/03/2026 08:40', from: 'Kanazawa Sta. West Exit Bus Stop No.4', fromJp: '金沢駅西口4番乗り場', fromMap: 'https://maps.google.co.jp/maps?q=36.5782720227044,136.64648877466&z=18',
    arrTime: '11/03/2026 10:05', to: 'Shirakawa-go (Ogimachi)', toJp: '白川郷(荻町)', toMap: 'https://maps.google.co.jp/maps?q=36.261918,136.906737&z=18',
    car: '01', seats: '03D / 06B', operator: 'Hokuriku Rail Road Co., Ltd.',
  }) },
  { name: 'Bus a Takayama · e-ticket', lat: 36.261918, lon: 136.906737, desc: busTicket({
    res: '10032054591', name: 'Nabil Zeitun Eguino', fare: 'JPY 5,600',
    depTime: '11/03/2026 13:30', from: 'Shirakawa-go (Ogimachi)', fromJp: '白川郷(荻町)', fromMap: 'https://maps.google.co.jp/maps?q=36.261918,136.906737&z=18',
    arrTime: '11/03/2026 14:20', to: 'Takayama Nohi Bus Center', toJp: '高山濃飛ﾊﾞｽｾﾝﾀｰ', toMap: 'https://maps.google.co.jp/maps?q=36.141933,137.251443&z=18',
    car: '01', seats: '1D / 1C', operator: 'Nohi Bus Co., Ltd.',
  }) },
  { name: 'Takayama Nohi Bus Center', desc: 'Terminal de autobuses de Takayama, pegada a la estación JR — aquí os deja el bus desde Shirakawa-go.', lat: 36.141933, lon: 137.251443 },
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
    date: '2026-10-28', city: 'Tokio', locationLabel: 'Tokyo', title: 'Llegada, Asakusa y Sumida',
    kind: 'city', dayStartTime: '12:50',
    stops: [
      { name: 'Haneda airport', kind: 'info', note: 'Vuelo de llegada: HND-TOKYO, miércoles 28 oct 12:50.', transit: 'Keikyu Airport Line hasta Shinagawa + JR Yokosuka/Sōbu Line (Rapid) directo hasta Kinshichō, ~50 min en total (¥590), con 5 min andando hasta el hotel.', transitMin: 50 },
      { name: 'Hotel Tokyo', kind: 'info', checkinMin: 10, note: 'Dejar las maletas en el Hotel Tobu Levant (junto a la estación Kinshichō) — el check-in suele ser a partir de las 15:00, puede que solo os guarden el equipaje hasta la noche.' },
      { name: 'Takkyubin: avisar al hotel (envío a Kioto)', kind: 'info', note: 'Necesitaréis el servicio el 2 nov, destino Hotel Resol Shijo Muromachi (Kioto), entrega prevista el 5 nov.', transit: 'Bus Toei 都02 de Kinshichō a Kuramae (~22 min, ¥210, cada ~12 min) — o JR Chūō-Sōbu Line + Toei Asakusa Line, también ~22 min.', transitMin: 22 },
      { name: 'Kuramae', kind: 'visit', durOverride: 22, transit: 'Toei Asakusa Line Kuramae → Asakusa, 1 parada (~3 min).', transitMin: 10 },
      { name: 'Free tour por Asakusa', kind: 'visit', durOverride: 120, note: 'El tour ya recorre Kaminarimon, Nakamise, Sensō-ji y el Puente Azuma — no hace falta volver a esos puntos por libre después.' },
      { name: 'Calle Comercial Shin-Nakamise', kind: 'visit' },
      { name: 'Centro de Información Turística y Cultural de Asakusa', kind: 'visit' },
      { name: 'Hoppy Street', kind: 'visit' },
      { name: 'Sumida', kind: 'visit', durOverride: 20, note: 'Vistas del Skytree desde el parque, sin subir — decidimos que no merecía la pena por el precio y por ir de noche (brillos en el cristal); ya se ve Tokio desde arriba en el avión.', transit: 'Cruzando el Puente Azuma (ya visto en el tour) + metro Hanzomon Line Oshiage → Kinshichō (1 parada, ~3 min) y 5 min andando al hotel — o ~20 min andando directo.', transitMin: 15 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-29', city: 'Tokio', locationLabel: 'Tokyo', title: 'Ueno, Yanaka y Akihabara',
    kind: 'city', dayStartTime: '07:30',
    travelNote: 'Día largo con mucho contenido distinto (no hay duplicados que quitar). El Zoo de Ueno, el Jardín Rikugien y TAITO Station Akihabara están marcados como opcionales — saltároslos sin remordimientos si vais cansados, el núcleo del día (Museo Nacional, Ameyoko, Yanaka, Akihabara) no los necesita.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'JR Chūō-Sōbu Line (Local) de Kinshichō a Akihabara + Yamanote Line a Ueno — ~23 min puerta a puerta (¥200, trenes cada ~7 min).', transitMin: 23 },
      { name: 'Parque de Ueno', kind: 'visit' },
      {
        name: 'Museo Nacional de Tokio', kind: 'visit', durOverride: 90,
        note: 'Horario: martes a domingo 09:30-17:00 (viernes y sábados hasta las 21:00), lunes cerrado. Entrada 1.000 yenes.',
      },
      {
        name: 'Ueno Zoo', kind: 'visit', durOverride: 90, optional: true,
        note: 'Opcional — ya no tiene los pandas gigantes desde enero de 2026. Horario 9:30-17:00, cierra los lunes.',
      },
      { name: 'Ameyoko market', kind: 'visit', durOverride: 55, mealAfter: 'lunch', transit: 'JR/Keisei Ueno → Nippori (~5 min) + 10 min andando a Yanaka.', transitMin: 15 },
      { name: 'Yanaka', kind: 'visit', durOverride: 95, note: 'Callejeo tranquilo de casas bajas y templos — dedicadle tiempo sin prisa, es de los rincones con más encanto de Tokio.', transit: 'JR Yamanote/Keihin-Tōhoku Nippori → Komagome (~10 min) + 7 min andando a Rikugien.', transitMin: 17 },
      { name: 'Jardín Rikugien', kind: 'visit', durOverride: 60, optional: true, note: 'Opcional — precioso, pero un desvío en un día ya largo; saltadlo sin problema si vais cansados de Yanaka.', transit: 'JR Yamanote Line Komagome → Akihabara, ~15 min.', transitMin: 15 },
      { name: 'Akihabara', kind: 'visit', durOverride: 75 },
      { name: 'TAITO Station Akihabara', kind: 'visit', durOverride: 55, optional: true, note: 'Opcional — sala recreativa divertida, pero prescindible si ya vais tarde; cenar y volver al hotel es buena alternativa.', mealAfter: 'dinner', transit: 'JR Chūō-Sōbu Line (Local) directa Akihabara → Kinshichō (~6 min, trenes cada ~6 min) y 5 min andando al hotel — ~13 min en total.', transitMin: 13 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-30', city: 'Tokio', locationLabel: 'Tokyo', title: 'Shibuya, Shinjuku, Kabukichō y Okubo',
    kind: 'city', dayStartTime: '07:00',
    travelNote: 'Día largo — encadena 4 barrios (Harajuku, Shibuya, Shinjuku, Kabukichō) con Okubo como colofón opcional. Id marcando el ritmo vosotros: Dogenzaka, Park Hyatt Tokyo, Tokyu Kabukicho Tower y Okubo están señalados como opcionales — saltáoslos sin remordimientos si vais llegando cansados, el núcleo del día (Meiji, Shibuya Crossing/Sky, mirador de Shinjuku, Omoide Yokochō, Kabukichō) no los necesita.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'JR Chūō-Sōbu Line (Local) directa desde Kinshichō hasta la zona de Yoyogi/Sendagaya, junto a Meiji Jingū — ~40 min puerta a puerta (¥260, trenes cada ~6 min). Alternativa: metro Hanzomon Line + Chiyoda Line, ~42 min.', transitMin: 40 },
      { name: 'Santuario Meiji', kind: 'visit', durOverride: 45 },
      { name: 'Parque Yoyogi', kind: 'visit' },
      { name: 'Calle Takeshita', kind: 'visit' },
      { name: 'Omote-Sando Avenue', kind: 'visit', note: 'Si os sobran ~20 min: Paradise Vintage está a 2 min andando y AMORE Vintage Aoyama a 5 min — ropa vintage.' },
      { name: 'Shibuya Crossing', kind: 'visit', durOverride: 15 },
      { name: 'Hachiko Statue', kind: 'visit', durOverride: 10 },
      { name: 'Shibuya Sky', kind: 'visit', durOverride: 60, mealAfter: 'lunch', note: 'Reservad hora con antelación online — se agotan franjas los fines de semana.' },
      { name: 'Calle Central de Shibuya', kind: 'visit', note: 'Si os sobran ~20 min: BRAND OFF Shibuya está aquí mismo y MEGA Don Quijote a 3 min — vintage y outlet turístico.' },
      { name: 'Dogenzaka', kind: 'visit', optional: true, note: 'Opcional — cuesta de bares y locales nocturnos de Shibuya, saltadla sin problema si vais justos de tiempo o energía.' },
      { name: 'Shibuya Nonbei Yokocho', kind: 'visit', transit: 'JR Yamanote Line Shibuya → Shinjuku, ~7 min.', transitMin: 15 },
      { name: 'Shinjuku', kind: 'visit', durOverride: 0 },
      { name: 'Mirador del Gobierno Metropolitano de Tokio', kind: 'visit', durOverride: 40 },
      { name: 'Park Hyatt Tokyo', kind: 'visit', durOverride: 15, optional: true, note: 'Opcional — A 5 min andando del mirador. Solo merece un desvío si os interesa el hotel de "Lost in Translation"; si no, seguid directos a Omoide Yokochō.' },
      { name: 'Omoide Yokochō', kind: 'visit', durOverride: 60 },
      { name: 'Shinjuku Ni-chōme', kind: 'visit', durOverride: 30 },
      { name: 'Kabukichō', kind: 'visit' },
      { name: 'Tokyu Kabukicho Tower', kind: 'visit', optional: true, note: 'Opcional — complejo de ocio y restaurantes; si ya habéis visto Kabukichō por fuera, os lo podéis saltar sin perderos gran cosa.', mealAfter: 'dinner', transit: 'JR Yamanote/Sōbu Line Shinjuku → Shin-Ōkubo, ~5 min.', transitMin: 12 },
      {
        name: 'Okubo', kind: 'visit', durOverride: 45, optional: true,
        note: 'Opcional, dejadlo para el final del día si os queda tiempo y energía.',
        transit: 'Vuelta con JR Chūō-Sōbu Line (Local) directa desde la estación de Ōkubo (a 5 min andando de la zona coreana) hasta Kinshichō, ~42 min en total (¥260).', transitMin: 42,
      },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-31', city: 'Tokio', locationLabel: 'Tokyo', title: 'Excursión a Kamakura',
    kind: 'daytrip', dayStartTime: '07:00',
    optional: true, altGroup: 'day4', altLabel: 'A',
    altNote: 'Elegid <b>4A (Kamakura)</b> o <b>4B (Hakone)</b> la mañana de antes, según el tiempo — Kamakura (templos y costa) funciona con cualquier tiempo; Hakone (montaña y volcán) solo compensa con cielo despejado para ver el Fuji.',
    travelNote: 'Desde el hotel, camino a Kinshichō Station (a pocos minutos). Sōbu Line (Rapid) dirección Zushi, que continúa automáticamente como Yokosuka Line (mismo tren, sin trasbordo) hasta Kamakura Station, ~1h en total. Dentro de Kamakura, el bus o el tren local Enoden conecta el Daibutsu con Hase y la costa si os sobra tiempo.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Caminando a Kinshichō Station (pocos minutos) + Sōbu Line (Rapid) dirección Zushi, que continúa como Yokosuka Line (mismo tren, sin trasbordo) → Kamakura Station, ~1h en total.', transitMin: 70 },
      { name: 'Kamakura', kind: 'visit', durOverride: 0 },
      { name: 'Templo Kotoku-in', kind: 'visit', durOverride: 60, note: 'El gran Buda al aire libre, de 1252 — dedicadle tiempo con calma, no hay prisa por el resto del día.', mealAfter: 'lunch', transit: 'Enoden Hase → Kamakura Station (~15 min) + bus/taxi a Hokoku-ji (~10 min).', transitMin: 25 },
      { name: 'Templo Hokoku-ji', kind: 'visit', durOverride: 60, note: 'El bosquecillo de bambú es de los rincones más tranquilos de Kamakura — un buen sitio para pasear sin prisa.', transit: 'Bus Keikyu de vuelta a Kamakura Station (~10 min) + 10 min andando a Tsurugaoka.', transitMin: 18 },
      { name: 'Tsurugaoka Hachiman-gū', kind: 'visit', durOverride: 55 },
      { name: 'Komachi Street', kind: 'visit', durOverride: 100, mealAfter: 'dinner', note: 'Probad la croqueta de pan de curry (curry pan), típica de la calle — con tiempo de sobra, buen sitio para comer y comprar recuerdos con calma antes del tren de vuelta.', transit: 'JR Yokosuka Line Kamakura → Tokio/Shinagawa (~55 min-1h) + metro Asakusa Line a Oshiage (~15 min).', transitMin: 75 },
      { name: 'Hotel Tokyo', kind: 'info' },
    ],
  },
  {
    date: '2026-10-31', city: 'Tokio', locationLabel: 'Tokyo', title: 'Excursión a Hakone',
    kind: 'daytrip', dayStartTime: '07:00',
    optional: true, altGroup: 'day4', altLabel: 'B',
    altNote: 'Elegid <b>4B (Hakone)</b> o <b>4A (Kamakura)</b> la mañana de antes, según el tiempo — Hakone solo compensa con cielo despejado, para ver el Fuji desde el teleférico y el lago Ashi. Si está nublado, mejor Kamakura.',
    travelNote: 'Odakyu Romancecar directo Shinjuku → Hakone-Yumoto (~1h20-1h35, todos los asientos con reserva obligatoria). RESERVADO el 4 oct: Hakone 33, 08:20 → 09:52, coche 3, asientos 7C/7D (booking 00037, 2.300 yen). Cancelable hasta la salida del tren (¥100 de comisión) si la víspera el pronóstico del Fuji es malo. Sacad el Hakone Freepass en la estación: incluye el tren de montaña, el cable car, el teleférico (ropeway) y el barco pirata del lago Ashi, todo lo necesario para el circuito del día.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, durOverride: 25, note: 'Desayuno rápido en el hotel — hay que salir hacia Shinjuku como tarde a las 07:25 para llegar con 15 min de margen al Romancecar de las 08:20.', transit: 'JR Chūō-Sōbu Line (Local) directa Kinshichō → Shinjuku (~35 min puerta a puerta, ¥260) y ~5 min hasta los tornos de Odakyu.', transitMin: 40 },
      { name: 'Romancecar a Hakone · e-ticket', kind: 'info', note: 'Antes de subir necesitáis el Hakone Freepass de 2 días (¥7.100 por persona desde Shinjuku): compradlo ANTES, online en EMot (billete en el móvil, sirve en los tornos). El Odakyu Sightseeing Service Center de Shinjuku Oeste abre a las 08:00, solo 20 min antes del tren, así que no contéis con él. Incluye ida y vuelta Shinjuku–Odawara, tren de montaña, cable car, teleférico, barco y buses de Hakone.', transit: 'Esperad el tren: Hakone 33, salida 08:20 (7C/7D, coche 3), llega a Hakone-Yumoto a las 09:52.', transitMin: 107 },
      { name: 'Hakone', kind: 'visit', durOverride: 10, note: '<b>Qué falta por comprar</b> (el e-ticket del Romancecar es solo el suplemento):<br>✅ Romancecar de ida — hecho (booking 00037).<br>⬜ <b>Hakone Freepass de 2 días</b> (versión «Hako Ticket Plus» con ida y vuelta Odakyu), ¥7.100 por persona, online en EMot. Comprarlo la noche del 30 oct, cuando se decida Hakone o Kamakura, y siempre antes de salir a las 07:25. Cancelable antes del primer uso con ¥220 de comisión por billete.<br>⬜ <i>Opcional:</i> Romancecar de vuelta (Hakone-Yumoto → Shinjuku, ~16:15-16:30). Un sábado por la tarde puede llenarse: reservarlo el 30 oct, también cancelable. Si no, el tren normal está incluido en el pase.<br><b>Con Freepass o sin él</b> (por persona, precios sueltos estimados):<table class="cmp"><tr><th>Tramo</th><th>Suelto</th><th>Con pase</th></tr><tr><td>Odakyu Shinjuku ↔ Hakone-Yumoto (base)</td><td>~¥2.540</td><td>incl.</td></tr><tr><td>Tren de montaña</td><td>¥460</td><td>incl.</td></tr><tr><td>Cable car</td><td>¥430</td><td>incl.</td></tr><tr><td>Teleférico por Owakudani</td><td>¥2.000</td><td>incl.</td></tr><tr><td>Barco pirata</td><td>¥1.200</td><td>incl.</td></tr><tr><td>Bus a Hakone-Yumoto</td><td>¥1.050</td><td>incl.</td></tr><tr class="tot"><td>Total por persona</td><td>~¥7.700</td><td>¥7.100</td></tr></table>Ahorro del pase: ~¥600 por persona (~¥1.200 los dos), más el margen si algún tramo falla. Mirad el estado del teleférico de Owakudani en hakonenavi.jp: a veces lo cierran por gases volcánicos.<br><b>Si al final no vais a Hakone:</b> 1) cancelad el Romancecar (nº 00037) como indica el e-ticket, hasta las 08:20 del 31 oct: <a href="https://www.web-odakyu.com/e-romancecar/" target="_blank" rel="noopener">web-odakyu.com/e-romancecar</a> → «Confirm booking»; 2) si ya habíais comprado el Hakone Freepass en EMot, pedid el reembolso en la web o app de EMot (<a href="https://www.emot.jp/" target="_blank" rel="noopener">emot.jp</a>, EMot Online Tickets, «mis billetes») <b>antes de usarlo</b>: se descuentan ¥220 por billete; si ya habéis empezado a usarlo, solo por teléfono o email (+81-50-5835-2429, 9:00–17:00, support@emot.jp) y solo del tramo no usado; 3) pasad al plan 4A (Kamakura). Plazos de EMot según sus condiciones de 2025, por confirmar.', transit: 'Hakone Tozan Railway Hakone-Yumoto → Gora, ~40 min.', transitMin: 40 },
      { name: 'Museo al Aire Libre de Hakone', kind: 'visit', durOverride: 90, transit: 'Cable car Gora → Sōunzan (~10 min) + teleférico (ropeway) Sōunzan → Owakudani, ~20 min en total.', transitMin: 20 },
      { name: 'Teleférico de Hakone', kind: 'visit', durOverride: 15 },
      { name: 'Owakudani', kind: 'visit', durOverride: 45, note: 'Probad un kuro-tamago — dicen que alarga la vida 7 años. Hay soba/curry en la zona si no habéis comido.', transit: 'Teleférico Owakudani → Togendai (~15 min) y espera del siguiente barco (~5 min).', transitMin: 20 },
      { name: 'Lago Ashi: ver el Fuji desde el barco', kind: 'visit', durOverride: 30, note: 'Momento clave del día: subid a la cubierta durante toda la travesía. El Fuji queda al noroeste, al fondo del lago — saliendo de Togendai lo tenéis a la espalda y a la derecha, así que mirad hacia popa. Si el día está despejado, es la mejor vista. Si hay nubes, probad igualmente: a veces se abre a ratos. También se ve desde el muelle de Hakone-machi y el torii del santuario.', transit: 'Llegada a Hakone-machi y ~10 min andando por la orilla hasta el Santuario Hakone (torii dentro del lago).', transitMin: 10 },
      { name: 'Santuario Hakone', kind: 'visit', durOverride: 40, transit: 'Bus Hakone Tozan Hakone-machi → Hakone-Yumoto (~30 min) + Odakyu Romancecar Hakone-Yumoto → Shinjuku (~1h25-1h35) + JR Chūō-Sōbu Line (Local) directa Shinjuku → Kinshichō (~30 min).', transitMin: 150 },
      { name: 'Hotel Tokyo', kind: 'info', note: 'De camino, el shotengai de Hakone-Yumoto tiene puestos de soba y comida si preferís cenar antes de subir al tren.' },
    ],
  },
  {
    date: '2026-11-01', city: 'Tokio', locationLabel: 'Tokyo', title: 'Ginza',
    kind: 'city', dayStartTime: '11:30',
    travelNote: 'Domingo: la Avenida Chuo-dori (la calle principal de Ginza) se corta al tráfico de 12:00 a 17:00 (hokosha tengoku) y se convierte en un paseo peatonal gigante — por eso esta ruta encaja mejor en domingo que en otro día.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'JR Sōbu Line (Rapid) Kinshichō → Tokio, 7 min de tren (¥200), ~15 min en total.', transitMin: 15 },
      { name: 'Estación de Tokio: recoger billetes del Shinkansen', kind: 'visit', durOverride: 20, note: 'Recoger HOY los billetes del Shinkansen de mañana (Kagayaki 509, 10:22). Número de reserva E35360, código de recogida 31352461812521238 (con el QR de la reserva). Máquina de asientos reservados de JR East o ventanilla Midori no Madoguchi, no las de JR Central. Detalle en el mapa.', transit: 'JR Yamanote/Keihin-Tōhoku Tokio → Yūrakuchō (2 min) + 5 min andando a Matsuya Ginza, ~15 min en total.', transitMin: 15 },
      { name: 'Matsuya Ginza', kind: 'visit', durOverride: 45 },
      { name: 'Itoya Ginza', kind: 'visit', durOverride: 35, mealAfter: 'lunch', transit: 'Metro Ginza Line Ginza → Nihombashi, ~5 min en total — o ~30 min andando.', transitMin: 10 },
      { name: 'Pokémon Center Tokyo DX', kind: 'visit', durOverride: 30, transit: 'Metro Ginza Line Nihombashi → Ginza, ~5 min en total — o ~25 min andando.', transitMin: 10 },
      { name: 'Avenida Chuo-dori', kind: 'visit', durOverride: 30 },
      { name: 'Seiko House Ginza (Wako)', kind: 'visit', durOverride: 20 },
      { name: 'Ginza Place', kind: 'visit', durOverride: 15 },
      { name: 'Almacenes Mitsukoshi Ginza', kind: 'visit', durOverride: 40 },
      { name: 'Ginza', kind: 'visit', durOverride: 75, note: 'Buen rato para callejear sin rumbo por las bocacalles.' },
      { name: 'Ginza Six', kind: 'visit', durOverride: 80, mealAfter: 'dinner', transit: 'Metro Ginza Line + JR Sōbu Line (Rapid) de vuelta hasta Kinshichō, ~30 min puerta a puerta (¥390).', transitMin: 30 },
      { name: 'Hotel Tokyo', kind: 'info' },
      { name: 'Takkyubin: preparar bolsa pequeña (envío a Kioto)', kind: 'info', note: 'Mañana (2 nov) se entrega la maleta grande en el hotel para el takkyubin a Kioto.' },
    ],
  },
  {
    date: '2026-11-02', city: 'Tokio', locationLabel: 'Kanazawa', title: 'Tokyo → Kanazawa',
    kind: 'travel', dayStartTime: '07:30',
    travelNote: 'Tokio tiene mucho más que ver que Kanazawa, así que aprovechamos la mañana antes del Shinkansen. Hokuriku "Kagayaki" 509 Tokio → Kanazawa (10:22 → 12:49), ya reservado (reserva E35360): recoger el billete el 1 nov en la Estación de Tokio. Antes de salir del hotel, entregad la maleta grande en recepción para enviarla por takkyubin directa al hotel de Kioto (llegada programada para el 5 nov) — así hacéis Kanazawa, Shirakawa-go y Takayama solo con la mochila.',
    stops: [
      { name: 'Hotel Tokyo', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno rápido en el hotel (o saltadlo si vais a comer en Toyosu).' },
      { name: 'Takkyubin: entregar maleta (envío a Kioto)', kind: 'info', note: 'Destino: Hotel Resol Shijo Muromachi, Kioto. Entrega prevista: 5 nov.', transit: 'Metro Yurikamome/Toei Oedo a Toyosu, ~25-30 min. Si vais directos a la Estación de Tokio (sin Toyosu): JR Sōbu Line (Rapid) desde Kinshichō hasta Tokio, 7 min de tren (¥200, cada ~12 min), ~15 min en total.', transitMin: 30 },
      {
        name: 'Toyosu Senkyaku Banrai', kind: 'visit', durOverride: 45, optional: true,
        note: 'Opcional — solo si salís al amanecer, os quita tiempo para el Palacio Imperial. Alternativa: ir directamente a la Estación de Tokio para llegar antes a Kanazawa — la mejor opción si ya habéis hecho las compras que queríais.',
        transit: 'Metro Yurikamome Toyosu → Tokyo Station, ~20 min — o ~85 min andando.', transitMin: 20,
      },
      {
        name: 'Explanada y Puente Nijūbashi', kind: 'visit', durOverride: 10, optional: true,
        note: 'Opcional — el Palacio Imperial no merece mucho la pena, es más para rellenar tiempo antes del Shinkansen. Alternativas: ir de compras a lo que no hayáis podido comprar todavía, o iros directos a la Estación de Tokio para llegar antes a Kanazawa si ya habéis comprado todo lo que queríais.',
        transit: 'Andando por Gyoko-dori hasta la Estación de Tokio (Marunouchi), ~15 min.', transitMin: 15,
      },
      { name: 'Estación de Tokio (Marunouchi)', kind: 'visit', durOverride: 20, note: 'Aquí ya solo toca ir al andén: el billete lo recogisteis ayer. Comprad el bento para el tren y llegad al andén con 10 min de margen: el Kagayaki 509 sale a las 10:22.' },
      { name: 'Shinkansen a Kanazawa · e-ticket', kind: 'info', transit: 'Shinkansen Hokuriku Kagayaki 509, 10:22 → 12:49 (2h27), coche 1, asientos 4D y 4E.', transitMin: 147 },
      {
        name: 'Estación de Kanazawa', kind: 'visit', durOverride: 20,
        note: 'RECOGER AQUÍ el billete del 5 nov (Hida + Nozomi a Kioto, reserva 41516): en una máquina fuera de los tornos, con la tarjeta física Mastercard terminada en 4208 y el número de identificación de 4 dígitos. Detalle en el mapa del día 5 nov. La puerta de madera Tsuzumi-mon (13,7 m, inspirada en los tambores tsuzumi del teatro Noh, se ilumina de noche) está justo a la salida — verla es parte de ver la propia estación.',
        transit: 'Bus turístico Kanazawa Loop Bus (cada 15 min, ¥220/trayecto) desde la parada nº7 de la estación, ~10 min hasta la más cercana al hotel — o ~20 min andando.', transitMin: 10,
      },
      { name: 'Hotel Kanazawa', kind: 'info', note: 'Check-in en el Hotel Tokyu Stay Kanazawa. Lleváis solo la mochila — la maleta grande va directa a Kioto, enviada desde Tokio.', transit: '5 min andando al mercado.', transitMin: 5 },
      { name: 'Mercado Omicho', kind: 'meal', mealType: 'lunch', durOverride: 45 },
      { name: 'Nagamachi', kind: 'visit', durOverride: 30, note: 'Paseo corto por las calles de samuráis: hay que llegar a Kenrokuen antes de las 16:00 — en esta época el jardín cierra a las 17:00 y la última entrada es a las 16:30.' },
      { name: 'Kenrokuen', kind: 'visit', durOverride: 70, note: 'Horario de invierno (desde el 16 oct): 8:00–17:00, última entrada 16:30 (horario de guías, no verificado en la web oficial). En temporada de momiji (otoño), todo rojo. Las iluminaciones nocturnas de noviembre son otros días (7, 14, 15, 21, 22, 28, 29), no hoy.' },
      { name: 'Kazuemachi', kind: 'visit', durOverride: 45, optional: true, note: 'Opcional — el más pequeño y tranquilo de los distritos de chaya; si vais cansados del viaje, Higashi Chaya (el siguiente) es el más completo de los dos.' },
      { name: 'Higashi Chaya', kind: 'visit', durOverride: 60, mealAfter: 'dinner' },
      { name: 'Hotel Kanazawa', kind: 'info' },
    ],
  },
  // ---------------- KANAZAWA / TAKAYAMA ----------------
  {
    date: '2026-11-03', city: 'Kanazawa-Takayama', locationLabel: 'Shirakawa-go', title: 'Kanazawa → Shirakawa-go → Takayama',
    kind: 'travel', dayStartTime: '07:50',
    travelNote: 'Ida y vuelta RESERVADAS (¥11.200 los dos tramos): Kanazawa 08:40 → Shirakawa-go 10:05 y Shirakawa-go 13:30 → Takayama 14:20. Los billetes electrónicos completos están en los pasos "e-ticket" de abajo, listos para enseñar al conductor; llevad también los correos de confirmación en el móvil. Os quedan unas 3h20 en el pueblo, justas pero suficientes: Puente Deai y el templo Myozenji están marcados como opcionales por si os queréis quedar con calma en lo importante.',
    stops: [
      { name: 'Hotel Kanazawa', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel — solo la mochila, check-out rápido.', transit: '10 min andando a la terminal (Kanazawa Sta. West Exit, parada nº4); estad allí ~10 min antes de las 08:40.', transitMin: 10 },
      { name: 'Bus a Shirakawa-go · e-ticket', kind: 'info', note: 'Enseñad este billete al conductor al subir.', transit: 'Espera ~10 min en la parada + bus Hokutetsu, sale 08:40 → Shirakawa-go (Ogimachi), llega 10:05 (~1h25).', transitMin: 95 },
      { name: 'Shirakawa', kind: 'visit', durOverride: 5, note: 'El bus de vuelta sale a las 13:30 — tenéis unas 3h20 en el pueblo.' },
      { name: 'Mirador Shiroyama', kind: 'visit', durOverride: 25, transit: 'Shuttle Shiroyama Line hasta el mirador (ida, ¥200), ~5 min.', transitMin: 8 },
      { name: 'Casa Museo Wada', kind: 'visit', durOverride: 25 },
      { name: 'Kanda y Nagase', kind: 'visit', durOverride: 20 },
      { name: 'Templo Myozenji y Santuario Shirakawa Hachiman', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — si vais justos de tiempo, saltadlo; el bus de vuelta es a las 13:30.' },
      { name: 'Puente Colgante Deai', kind: 'visit', durOverride: 10, optional: true, note: 'Opcional — es la entrada clásica al pueblo desde la terminal de autobuses, lo cruzaréis igualmente al ir o volver; no hace falta una parada aparte.' },
      { name: 'Las Tres Casas de Shirakawago', kind: 'visit', durOverride: 15, note: 'La foto más famosa de Shirakawago.', transit: '5 min andando a la terminal de autobuses; estad allí ~10 min antes de las 13:30.', transitMin: 12 },
      { name: 'Bus a Takayama · e-ticket', kind: 'info', note: 'Enseñad este billete al conductor al subir. Esta reserva solo se podía cancelar hasta las 11:30.', transit: 'Espera ~10 min en la parada + bus Nohi, sale 13:30 → Takayama Nohi Bus Center, llega 14:20 (50 min).', transitMin: 60 },
      { name: 'Takayama Nohi Bus Center', kind: 'info', transit: '8 min andando (600 m) al hotel, a un paso de la estación.', transitMin: 10 },
      { name: 'Hotel Takayama', kind: 'info', note: 'Check-in en el Hotel Hida Takayama Green.' },
      { name: 'Takayama Old Town', kind: 'visit', durOverride: 75, note: 'Cenar carne Hida wagyu en Hidagyu Maruaki o Ajikura Tengoku (buñuelos, donburi o nigiri de Hida wagyu).' },
      { name: 'Hotel Takayama', kind: 'info' },
    ],
  },
  {
    date: '2026-11-04', city: 'Kanazawa-Takayama', locationLabel: 'Takayama', title: 'Takayama: casco antiguo y museos',
    kind: 'city', dayStartTime: '07:00',
    travelNote: 'Día con muchos museos pequeños del mismo estilo (casas de mercaderes del periodo Edo) — Yoshijima-ke, Fujii Bijutsu Mingeikan, Hirata Kinenkan e Hida Minzoku Kokokan están marcados como opcionales, ya que Kusakabe Mingeikan por sí solo ya cubre bien ese tipo de visita. Sumados a Hida no Sato (ya opcional), tenéis mucho margen para ir a vuestro ritmo sin perder lo esencial: Takayama Jinya, Sanmachi Suji, Teramachi, Parque Shiroyama y el Shōwa-kan.',
    stops: [
      { name: 'Hotel Takayama', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.' },
      { name: 'Asaichi', kind: 'visit', durOverride: 45, note: 'Mercados matinales junto al río — cierran sobre el mediodía, por eso van primero. Buen sitio para comprar un saru-bobo.' },
      { name: 'Takayama Jinya', kind: 'visit', durOverride: 35, note: 'Entrada: 440 yenes.' },
      { name: 'Santuario Sakurayama Hachimangu', kind: 'visit', durOverride: 25 },
      { name: 'Kusakabe Mingeikan', kind: 'visit', durOverride: 30, note: 'La más conocida de las casas-museo de mercaderes de Takayama — si el tiempo aprieta, priorizad esta sobre Yoshijima-ke, Fujii Bijutsu y Hirata Kinenkan, que son del mismo estilo.' },
      { name: 'Yoshijima-ke', kind: 'visit', durOverride: 25, optional: true, note: 'Opcional — casa de mercaderes similar a Kusakabe Mingeikan; prescindible si ya la habéis visto.' },
      { name: 'Fujii Bijutsu Mingeikan', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — galería pequeña, mismo estilo que Kusakabe Mingeikan.' },
      { name: 'Sanmachi Suji (Casco Antiguo)', kind: 'visit', durOverride: 40 },
      { name: 'Hirata Kinenkan', kind: 'visit', durOverride: 25, optional: true, note: 'Opcional — museo de artesanía pequeño, de menor prioridad que Takayama Jinya o Sanmachi Suji.' },
      { name: 'Templo Hida Kokubunji', kind: 'visit', durOverride: 25, mealAfter: 'lunch' },
      { name: 'Teramachi', kind: 'visit', durOverride: 40 },
      { name: 'Parque Shiroyama', kind: 'visit', durOverride: 35 },
      { name: 'Hida Minzoku Kokokan', kind: 'visit', durOverride: 50, optional: true, note: 'Opcional — museo arqueológico pequeño; si vais cansados de museos, saltadlo e id directos al Shōwa-kan, mucho más singular.' },
      { name: 'Takayama Shōwa-kan Museum', kind: 'visit', durOverride: 85, transit: 'Bus turístico Sarubobo, Takayama Station → Hida no Sato, ~10 min.', transitMin: 15 },
      {
        name: 'Hida no Sato Folk Village Museum', kind: 'visit', durOverride: 90, optional: true,
        note: 'Opcional — réplica de pueblo con casas gasshō-zukuri; si ya habéis visto Shirakawa-go en persona, os la podéis saltar.',
        transit: 'Bus Sarubobo de vuelta hacia el centro, parada cercana al hotel, ~10 min.', transitMin: 12,
      },
      { name: 'Hotel Takayama', kind: 'info', mealAfter: 'dinner' },
    ],
  },
  {
    date: '2026-11-05', city: 'Kanazawa-Takayama', locationLabel: 'Takayama', title: 'Takayama → Kioto (Magome-juku)',
    kind: 'travel', dayStartTime: '07:00',
    optional: true, altGroup: 'day9', altLabel: 'A',
    altNote: 'Elegid <b>9A (Magome-juku)</b> o <b>9B (directo)</b> — 9A añade ~2h de trenes/bus para ver el pueblo postal de Magome-juku de camino; 9B llega a Kioto sobre el mediodía con toda la tarde libre para más turismo.',
    travelNote: 'Limited Express "Hida" 4 Takayama → Nagoya (08:00 → 10:34, reservado en la reserva 41516, coche 6, asientos 6C/6D) + JR línea Chūō a Nakatsugawa (~50 min) + bus a Magome-juku (~30 min); a la vuelta, bus a Nakatsugawa (~30 min) + JR línea Chūō a Nagoya (~50 min) + Shinkansen Tōkaidō a Kioto (~35-45 min). No hay bus directo Takayama-Nakatsugawa, hay que bajar hasta Nagoya y volver a subir en la línea JR Chūō.',
    stops: [
      { name: 'Pendiente: ruta Magome → Tsumago (si lo decidís)', kind: 'info', note: 'Opcional: alargar Magome-juku con la caminata a Tsumago. Decidirlo la víspera en Takayama; abajo, lo que hay que tener listo.' },
      { name: 'Hotel Takayama', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel a las 07:00 (confirmad que lo sirven tan temprano) para coger el Hida de las 08:00. Seguís viajando solo con la mochila.', transit: 'Camino a la estación (8 min, 600 m) + Limited Express «Hida» nº 4 de las 08:00 a Nagoya (llega 10:34, ~2h35) + JR línea Chūō (Shinano) a Nakatsugawa (~50 min). Google Maps aún no tiene los horarios del 5 nov: confirmadlos a finales de octubre.', transitMin: 255 },
      { name: 'Nakatsugawa Station', kind: 'visit', durOverride: 10, transit: 'Bus Kitaena Kotsu (línea Magome) Nakatsugawa → Magome, ~25 min, sin reserva. Frecuencia distinta entre semana y fin de semana — comprobad el horario del día en la web de Kitaena Kotsu cerca de la fecha.', transitMin: 30 },
      { name: 'Magome-juku', kind: 'visit', durOverride: 130, note: 'Comer soba en Yoshimura Soba — con calma, es el único punto del día sin prisa por un tren después, aprovechad para pasear el pueblo sin reloj.', transit: 'Bus de vuelta a Nakatsugawa (~30 min) + JR línea Chūō a Nagoya (~50 min) + Shinkansen Tōkaidō a Kioto (~35-45 min) + metro Karasuma Line Kioto → Gojō (1 parada, ~3 min) y ~3 min andando hasta el hotel.', transitMin: 135 },
      { name: 'Hotel Kyoto', kind: 'info', note: 'Check-in en el Hotel Resol Shijo Muromachi — la maleta grande, enviada por takkyubin desde Tokio el 2 nov, ya debería estar esperando.' },
      { name: 'Takkyubin: avisar al hotel (envío a Osaka)', kind: 'info', note: 'Necesitaréis el servicio el 8 nov, destino Hotel Keihan Tenmabashi Ekimae (Osaka), entrega prevista el 9 nov.' },
    ],
  },
  {
    date: '2026-11-05', city: 'Kanazawa-Takayama', locationLabel: 'Takayama', title: 'Takayama → Kioto (directo)',
    kind: 'travel', dayStartTime: '07:00',
    optional: true, altGroup: 'day9', altLabel: 'B',
    altNote: 'Elegid <b>9B (directo)</b> o <b>9A (Magome-juku)</b> — 9B llega a Kioto sobre el mediodía con toda la tarde libre para más turismo; 9A añade ~2h de trenes/bus para ver el pueblo postal de Magome-juku de camino.',
    travelNote: 'RESERVADO (reserva 41516, JR-West): Hida 4 de Takayama a Nagoya (08:00 → 10:34) + Nozomi 245 de Nagoya a Kioto (10:47 → 11:21), sin desvíos — el tramo más rápido posible. Recoger el billete en papel el 2 nov en la estación de Kanazawa. Llegada a Kioto a las 11:21, con toda la tarde libre: Higashi Hongan-ji y Nishi Hongan-ji nada más llegar, luego el Parque del Palacio Imperial de Kioto (con el tour guiado gratuito del Gosho a las 14:00) y por último el Castillo Nijō antes de cenar.',
    stops: [
      { name: 'Hotel Takayama', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel a las 07:00 (confirmad que lo sirven tan temprano). Hay que coger el Hida de las 08:00: el siguiente (09:36) llega a Kioto a las 12:50 y pondría en riesgo el tour del Gosho de las 14:00. Seguís viajando solo con la mochila.', transit: 'Camino a la estación (8 min, 600 m) + Limited Express «Hida» nº 4 de las 08:00 a Nagoya (llega 10:34, ~2h35) + Shinkansen Tōkaidō a Kioto (~35 min, conexión de ~15 min). Llegada a Kioto a las 11:21.', transitMin: 30 },
      { name: 'Hida y Nozomi a Kioto · e-ticket', kind: 'info', transit: 'Hida 4 (08:00 → 10:34, coche 6, asientos 6C/6D) + trasbordo en Nagoya de 13 min + Nozomi 245 (10:47 → 11:21, coche 5, asientos 4D/4E).', transitMin: 201 },
      { name: 'Templo Higashi Hongan-ji', kind: 'visit', durOverride: 15, note: 'Justo enfrente de la estación — ideal para visitarlo nada más llegar.' },
      { name: 'Men-ya Inoichi Hanare', kind: 'meal', mealType: 'lunch', durOverride: 35, note: 'Muy recomendado, incluso venden camisetas del restaurante. Quizá sea un poco pronto para comer — valorad sobre la marcha según el tiempo que llevéis, pero sin apurar demasiado: lo prioritario es no llegar tarde al tour reservado del Gosho a las 14:00.' },
      { name: 'Templo Nishi Hongan-ji', kind: 'visit', durOverride: 15, optional: true, note: 'Opcional: el margen hasta el Gosho de las 14:00 es justo. Si vais con retraso, saltad este templo y id directos.', transit: 'Bus 9 o metro Karasuma Line Kyoto → Imadegawa (~35 min en total hasta la Puerta Seishomon, ¥230) — o ~65 min andando desde aquí.', transitMin: 37 },
      { name: 'Palacio Imperial de Kioto (Gosho)', kind: 'visit', durOverride: 50, note: 'Entrada por la Puerta Seishomon, sin necesidad de reserva previa. Tour guiado gratuito en inglés a las 10:00 y a las 14:00 (~50 min) — vamos al de las 14:00; llegad unos minutos antes para la entrada.', transit: 'Paseo dentro del parque hasta el Sento (5 min), con margen hasta el turno reservado.', transitMin: 40 },
      { name: 'Palacio Imperial Sento de Kioto', kind: 'visit', durOverride: 30, note: 'Solo con tour guiado obligatorio (no se puede ir por libre) — turno reservado a las 15:30, el único que encajaba tras el tour del Gosho a las 14:00.<br>Reserva confirmada: 2026-11-05 15:30, nº de permiso 611321403.<br>Aviso del permiso de visita: <a href="https://sankan.kunaicho.go.jp/permit/login?locale=en" target="_blank" rel="noopener">sankan.kunaicho.go.jp</a><br>App de audioguía (descargar antes): <a href="https://www.kunaicho.go.jp/en/visit/guide/app.html" target="_blank" rel="noopener">kunaicho.go.jp/en/visit/guide/app</a>' },
      { name: 'Santuario Shirakumo', kind: 'visit', durOverride: 15 },
      { name: 'Munakata Shrine', kind: 'visit', durOverride: 15 },
      { name: 'Santuario Itsukushima (interior del Parque del Palacio Imperial de Kioto)', kind: 'visit', durOverride: 15, transit: 'Metro Tozai Line Marutamachi → Nijōjō-mae (~10 min) + 5 min andando al castillo — o ~20 min andando directo.', transitMin: 15 },
      { name: 'Castillo Nijō', kind: 'visit', durOverride: 75, mealAfter: 'dinner' },
      { name: 'Hotel Kyoto', kind: 'info', note: 'Check-in en el Hotel Resol Shijo Muromachi — la maleta grande, enviada por takkyubin desde Tokio el 2 nov, ya debería estar esperando.' },
      { name: 'Takkyubin: avisar al hotel (envío a Osaka)', kind: 'info', note: 'Necesitaréis el servicio el 8 nov, destino Hotel Keihan Tenmabashi Ekimae (Osaka), entrega prevista el 9 nov.' },
    ],
  },
  // ---------------- KIOTO ----------------
  {
    date: '2026-11-06', city: 'Kioto', locationLabel: 'Kyoto', title: 'Higashiyama: Kiyomizu y Gion',
    kind: 'city', dayStartTime: '06:45',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel (temprano, para llegar a Kiyomizu antes que los grupos).', transit: 'Bus 207 desde Shijō-Karasuma hasta Kiyomizu-michi (~18 min, ¥230) + ~10 min andando cuesta arriba hasta el templo, ~30 min en total.', transitMin: 30 },
      { name: 'Kiyomizu-dera', kind: 'visit', durOverride: 60, note: 'Ir a primera hora, antes de que lleguen los grupos.' },
      { name: 'Sannenzaka', kind: 'visit', note: 'Recorredla antes o después de Kiyomizu-dera: antes las tiendas están cerradas, después hay más ambiente pero también más gente — mucho más tranquila sobre las 19:00-19:30.' },
      { name: 'Ninenzaka', kind: 'visit', note: 'Igual que Sannenzaka: mucho más tranquila sobre las 19:00-19:30.' },
      { name: 'Koyasu-no-to Pagoda', kind: 'visit', durOverride: 20, note: 'Caminad por este sendero para las mejores vistas.' },
      { name: 'Templo Hokan-ji (Pagoda Yasaka)', kind: 'visit', durOverride: 20, note: 'Las calles de alrededor quedan espectaculares de noche.' },
      { name: 'Santuario Yasaka', kind: 'visit', durOverride: 25, mealAfter: 'lunch' },
      { name: 'Hanamikoji-dori', kind: 'visit', durOverride: 50, note: 'La calle principal de Gion — paseadla con calma, es el mejor resumen del barrio de las geishas.' },
      { name: 'Gionmachi Minamigawa', kind: 'visit', durOverride: 50 },
      { name: 'Miyakawa-cho Dori', kind: 'visit', durOverride: 50 },
      { name: 'Santuario Yasui Konpira', kind: 'visit', durOverride: 30 },
      { name: 'Monumentos de piedra y encantos de Pontocho', kind: 'visit', durOverride: 90, mealAfter: 'dinner', note: 'Con el día ya libre de duplicados, llegaréis aquí con tiempo de sobra — buen sitio para cenar con calma (famoso por el wagyu) y, si os apetece alargar la noche, volved sobre las 22:00: con los restaurantes cerrados y mucha menos gente, los farolillos de piedra se ven mucho mejor.', transit: 'Paseo de 20 min junto al río Kamo, o autobús directo Kawaramachi → Shijo Karasuma (~10 min).', transitMin: 15 },
      { name: 'Hotel Kyoto', kind: 'info' },
    ],
  },
  {
    date: '2026-11-07', city: 'Kioto', locationLabel: 'Kyoto', title: 'Fushimi Inari y el Camino del Filósofo (Ginkaku-ji)',
    kind: 'city', dayStartTime: '07:15',
    travelNote: 'Fushimi Inari y Sanjusangen-dō están al sur (cerca de la estación de Kioto); Ginkaku-ji y el Camino del Filósofo están al norte. El JR Kansai-Hiroshima Pass se activa mañana (8 nov), así que hoy los saltos en JR Nara Line se pagan aparte (importe pequeño). Día largo por naturaleza — junta dos visitas que cada una por sí sola ya sería un medio día (Fushimi Inari y todo el Camino del Filósofo) porque el tour de Fushimi Inari solo tenía plazas hoy. De Ginkaku-ji a Nanzen-ji vais caminando por el propio Tetsugaku No Michi (el Camino del Filósofo, 2 km junto al canal Shirakawa, llamado así por el filósofo Nishida Kitarō) — no es una parada aparte, es el hilo que conecta todos los templos de este tramo. Los templos pequeños del Camino del Filósofo (Mirokuin, Anraku-ji, Reikan-ji, Kumano Nyakuōji) están marcados como opcionales — saltároslos sin problema, el paseo en sí es lo que importa, no cada templo individual.',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno con calma en el hotel — el tour guiado es a las 08:30, no hace falta correr.', transit: 'Metro Karasuma Line Shijō → Kioto + JR Nara Line → Inari, ~20 min puerta a puerta (¥370) — hoy no cubierto por el JR Pass (se activa mañana). Con la espera de trenes y el margen, 45 min antes del tour es suficiente.', transitMin: 45 },
      { name: 'Free tour por Fushimi Inari-Taisha', kind: 'visit', durOverride: 105, note: 'El tour ya llega hasta el Santuario Shirahata, con vistas del santuario en plena naturaleza — no hace falta volver a subir por libre después. Si os quedan ganas, el mirador Yotsutsuji está ~30 min más arriba desde donde termina el tour (opcional, no imprescindible).', transit: 'JR Nara Line Inari → Kioto (~5 min) + JR/bus a Sanjūsangen-dō (~10 min), o taxi directo (~15 min).', transitMin: 20 },
      { name: 'Sanjusangendomawari', kind: 'visit', durOverride: 108, mealAfter: 'lunch', transit: 'Bus o taxi hasta Heian Jingū, ~15 min.', transitMin: 15 },
      { name: 'Heian Jingū', kind: 'visit', durOverride: 30, note: 'El jardín trasero (de pago) es un buen contraste tranquilo antes de seguir al Camino del Filósofo.', transit: '15 min andando o en bus a Ginkaku-ji.', transitMin: 15 },
      { name: 'Ginkaku-ji', kind: 'visit', durOverride: 60 },
      { name: 'Mirokuin Temple', kind: 'visit', durOverride: 15, optional: true, note: 'Opcional — templo pequeño de paso en el Camino del Filósofo, prescindible si vais con el tiempo justo.' },
      { name: 'Hōnenin Temple', kind: 'visit', durOverride: 30 },
      { name: 'Anraku-ji Temple', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — como Reikan-ji, suele abrir solo unas semanas al año, así que puede que ni esté abierto; comprobad fechas antes de ir.' },
      { name: 'Reikan-ji', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — abre solo unas semanas al año, a menudo coincidiendo con el otoño; puede que ni esté abierto, comprobad fechas antes de ir.' },
      { name: 'Santuario Otoyo', kind: 'visit', durOverride: 25 },
      { name: 'Kumano Nyakuōji Shrine', kind: 'visit', durOverride: 15, optional: true, note: 'Opcional — santuario pequeño de paso, prescindible si vais con el tiempo justo.' },
      { name: 'Templo Eikando', kind: 'visit', durOverride: 45 },
      { name: 'Nanzen-ji', kind: 'visit', durOverride: 45, transit: 'Bus 5 Nanzenji-michi → Shijō-Karasuma o metro Tozai + Karasuma Line, ~35 min puerta a puerta (¥230).', transitMin: 35 },
      { name: 'Hotel Kyoto', kind: 'info', mealAfter: 'dinner' },
      { name: 'Takkyubin: preparar bolsa pequeña (envío a Osaka)', kind: 'info', note: 'Mañana (8 nov) se entrega la maleta grande en el hotel para el takkyubin a Osaka.' },
    ],
  },
  {
    date: '2026-11-08', city: 'Kioto', locationLabel: 'Kyoto', title: 'Kinkaku-ji y Arashiyama',
    kind: 'city', dayStartTime: '08:00',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.' },
      { name: 'Takkyubin: entregar maleta (envío a Osaka)', kind: 'info', note: 'Destino: Hotel Keihan Tenmabashi Ekimae, Osaka. Entrega prevista: 9 nov.', transit: 'Bus 12 Karasuma → Kinkakuji-michi, ~38 min (¥230).', transitMin: 38 },
      { name: 'Pabellon Dorado', kind: 'visit', durOverride: 40 },
      { name: 'Ryōan-ji', kind: 'visit', durOverride: 40 },
      { name: 'Ninna-ji', kind: 'visit', durOverride: 40, transit: 'Bus Kioto City Bus Ninnaji-mae → Ichijōji, ~10 min.', transitMin: 12 },
      { name: 'Taishogun Shopping Street - Ichijo Yokai Street', kind: 'visit', durOverride: 20, transit: 'Bus Kioto City Bus o JR Sagano Line Hanazono → Saga-Arashiyama, ~20 min en total.', transitMin: 20 },
      { name: 'Templo Tenryu-ji', kind: 'visit', durOverride: 40 },
      { name: 'Bosque de Bambú de Arashiyama', kind: 'visit', durOverride: 20 },
      { name: 'Arashiyama Yoshimura', kind: 'meal', mealType: 'lunch', durOverride: 45 },
      { name: 'Arashiyama Nakaoshitacho', kind: 'visit', durOverride: 50, optional: true, note: 'Opcional — zona comercial de paso entre el bosque de bambú y el Monkey Park; si vais con el tiempo justo, seguid directos.' },
      { name: 'Arashiyama Monkey Park Iwatayama', kind: 'visit', durOverride: 120 },
      { name: 'Adashino Nenbutsuji Temple', kind: 'visit', durOverride: 70, optional: true, note: 'Opcional — queda un poco más al norte, apartado del resto de Arashiyama; si vais cansados tras el Monkey Park, saltároslo sin problema.', transit: 'Bus 28 o JR Sagano Line Saga-Arashiyama → Kioto Station (~15-20 min) + metro/bus al hotel; ~60 min puerta a puerta con esperas.', transitMin: 60 },
      { name: 'Hotel Kyoto', kind: 'info' },
      { name: 'Sushitetsu', kind: 'meal', mealType: 'dinner', durOverride: 60, note: 'Sugerencia para cenar, cerca del hotel — cambiadlo si preferís otra cosa.' },
    ],
  },
  {
    date: '2026-11-09', city: 'Kioto', locationLabel: 'Kyoto', title: 'Daigo-ji, Uji y Nara → Osaka',
    kind: 'travel', dayStartTime: '08:05',
    travelNote: 'Las maletas grandes ya van camino de Osaka por takkyubin (enviadas ayer) — hoy viajáis solo con la bolsa de mano. Desvío a Daigo-ji (metro Tozai Line, NO cubierto por el JR Pass) antes de coger la JR Nara Line hacia el sur (esta sí, cubierta) — añade ~45 min de trenes respecto a ir directos, pero de camino hacia Nara igualmente se para en Uji (Byōdō-in). Por la tarde, Kintetsu Nara Line directo hasta Osaka-Namba (~35-40 min) — no hace falta volver a Kioto, pero ojo: Kintetsu tampoco está cubierto por el JR Pass, hay que pagarlo aparte.',
    stops: [
      { name: 'Hotel Kyoto', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel. Solo lleváis la bolsa de mano — las maletas grandes ya van camino de Osaka.', transit: 'Metro Karasuma Line + Tozai Line (cambio en Karasuma-Oike) a Daigo, ~44 min puerta a puerta (¥330) — NO cubierto por el JR Pass (es metro municipal).', transitMin: 45 },
      {
        name: 'Daigo-ji', kind: 'visit', durOverride: 45,
        note: 'Añade ~45 min de trenes respecto a ir directos a Uji/Nara, pero merece la pena. No os perdáis la Sala Bentendo.',
        transit: 'Metro Tozai Line Daigo → Kioto (~25 min, no cubierto) + JR Nara Line a Uji, ~20 min (cubierto por el JR Pass).', transitMin: 45,
      },
      {
        name: 'Byōdō-in', kind: 'visit', durOverride: 40,
        transit: 'JR Nara Line Uji → JR Nara (~25 min, el único tren directo desde Uji, cubierto por el JR Pass) + bus Nara Kotsu al parque (~10-15 min, no cubierto). Para el regreso a Osaka usaréis la estación Kintetsu-Nara, más cerca del parque — Kintetsu tampoco está cubierto.', transitMin: 40,
      },
      { name: 'Parque de Nara', kind: 'visit', durOverride: 15 },
      { name: 'Tōdai-ji', kind: 'visit', durOverride: 45 },
      { name: 'Nigatsu-dō', kind: 'visit', durOverride: 25, note: 'Buen sitio para descansar un rato — hay té gratis.' },
      { name: 'Santuario Kasuga Taisha', kind: 'visit', durOverride: 30, transit: 'Bus Nara Kotsu hasta Kintetsu-Nara (~8 min, con espera), o 25-30 min andando por el parque.', transitMin: 18 },
      { name: 'Kamaiki (Udon)', kind: 'meal', mealType: 'lunch', durOverride: 45, note: 'Abre 11:00-15:00 y 17:00-21:00 y suele haber cola al mediodía — llegad antes de las 14:30. Solo efectivo.' },
      { name: 'Nakatanidō', kind: 'visit', durOverride: 15, note: 'Probad el yomogi mochi recién hecho mientras lo golpean.' },
      { name: 'Higashimuki Shopping Street', kind: 'visit', durOverride: 20, note: 'Última compra o recuerdo antes del tren — la estación Kintetsu-Nara está a 3 min andando.', transit: 'Andando o en bus Nara Kotsu hasta la base del monte (~25 min).', transitMin: 25 },
      {
        name: 'Monte Wakakusa', kind: 'visit', durOverride: 70, optional: true,
        note: 'Opcional — empezad antes de las 16:00 y comprobad que siga abierto (suele cerrar hacia las 17:00). Si os lo saltáis, id directos de Higashimuki a la estación Kintetsu-Nara y llegaréis ~2h antes a Osaka.',
        transit: 'Bajando, a pie o en bus hasta la estación Kintetsu-Nara (~25 min).', transitMin: 25,
      },
      { name: 'Estación Kintetsu-Nara', kind: 'info', transit: 'Kintetsu Nara Line directo Kintetsu-Nara → Osaka-Namba (~40 min, ¥680, sin trasbordos) + metro hasta Tenmabashi (~15-20 min).', transitMin: 55 },
      { name: 'Hotel Osaka', kind: 'info', note: 'Check-in en el Hotel Keihan Tenmabashi Ekimae — las maletas grandes, enviadas ayer por takkyubin desde Kioto, ya deberían estar esperando. Tarde libre para descansar tras el viaje — Takimikoji, junto a Umeda, es una opción para cenar (también pasáis cerca el último día).' },
    ],
  },
  // ---------------- OSAKA ----------------
  {
    date: '2026-11-10', city: 'Osaka', locationLabel: 'Osaka', title: 'Castillo, Shinsaibashi, Dōtonbori y Umeda Sky',
    kind: 'city', dayStartTime: '08:00',
    travelNote: 'Día completo en Osaka, sin prisas — primera mañana entera en la ciudad tras el viaje de ayer, mejor con calma que con una excursión larga fuera.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.' },
      { name: 'Castillo Osaka', kind: 'visit', durOverride: 175, note: 'Horario 9:00-17:00. El exterior es más espectacular que el museo interior — con calma, sin prisa por el tour de la tarde.', transit: 'Metro Tanimachi Line Osakajōkōen → Tanimachi 9-chōme (~10 min) + 5 min andando a Kuromon Market — o ~50 min andando directo.', transitMin: 20 },
      { name: 'Kuromon Market', kind: 'visit', durOverride: 145, mealAfter: 'lunch', note: 'Abierto de lunes a sábado, de 8:00 a 18:00. Buen sitio para sushi y sashimi frescos — con tiempo de sobra antes del tour de las 16:30.' },
      { name: 'Sennichimae', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — calle de menaje y cuchillos, de interés si os gusta cocinar; saltadla sin problema si vais justos de tiempo.' },
      { name: 'Ebisu Bashi-Suji', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — es la entrada a Shinsaibashi, zona que ya recorreréis con el free tour más tarde.' },
      { name: 'Free tour por Dotonbori y Namba', kind: 'visit', durOverride: 150, note: 'El tour ya recorre Shinsaibashi, America-mura, el canal de Dōtonbori y el templo Hozenji — no hace falta volver a esos puntos por libre después. Restaurantes recomendados en la zona: Houzenji Sanpei y Mizuno.' },
      { name: 'Don Quijote Dotonbori Midosuji', kind: 'visit', durOverride: 20, note: 'Al final del canal, reconocible por la noria en su fachada — el tour pasa por aquí cerca, es la última parada de la zona antes de seguir camino.', transit: 'Metro Midosuji Line Namba → Umeda, ~10 min — o ~90 min andando.', transitMin: 10 },
      { name: 'Umeda Sky Building (osaka)', kind: 'visit', durOverride: 45, note: 'Horario 10:00-22:30.' },
      { name: 'Takimikoji', kind: 'meal', mealType: 'dinner', durOverride: 30, optional: true, note: 'Opcional, justo al lado del Umeda Sky Building.', transit: 'Metro Tanimachi Line Higashi-Umeda → Tenmabashi (~10 min, más ~10 min andando hasta Higashi-Umeda) — o ~40 min andando.', transitMin: 25 },
      { name: 'Hotel Osaka', kind: 'info' },
    ],
  },
  {
    date: '2026-11-11', city: 'Osaka', locationLabel: 'Osaka', title: 'Excursión a Hiroshima y Miyajima',
    kind: 'daytrip', dayStartTime: '06:00',
    optional: true, altGroup: 'day11', altLabel: 'A',
    altNote: 'Elegid <b>11A (Hiroshima y Miyajima)</b> o <b>11B (Universal Studios)</b> — decidimos no ir finalmente a Universal, así que 11A es el plan real; 11B se deja tal cual por si cambiáis de idea.',
    travelNote: 'Salida muy temprano: Shinkansen Sanyo (Nozomi/Mizuho, las categorías más rápidas) Shin-Osaka → Hiroshima, ~1h20-1h35 — cubierto por este JR Pass regional, a diferencia del pase nacional normal, que NO cubre Nozomi/Mizuho. Es un día largo — salir con el primer tren que podáis y volved directos al hotel a descansar. El tranvía Hiroden dentro de Hiroshima NO está cubierto por el pase (es de otra empresa) — llevad monedas o IC card para esos tramos.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno rápido o para llevar — a esta hora muchos hoteles aún no lo sirven, confirmad el horario la noche anterior.', transit: 'Metro (Tanimachi/Keihan + Midosuji) a Shin-Osaka (~25 min, ¥420, no cubierto) + Shinkansen Sanyo a Hiroshima (~1h20-1h35, cubierto por el JR Pass).', transitMin: 120 },
      { name: 'Hiroshima', kind: 'visit', durOverride: 0 },
      { name: 'Parque Memorial de la Paz de Hiroshima', kind: 'visit', durOverride: 60, transit: 'Tranvía Hiroden Genbaku Dome-mae → Kamiyachō, ~5 min + 5 min andando.', transitMin: 12 },
      { name: 'Castillo de Hiroshima', kind: 'visit', durOverride: 45, transit: '10 min andando al Jardín Shukkeien.', transitMin: 10 },
      { name: 'Jardín Shukkeien', kind: 'visit', durOverride: 30, note: 'Muy cerca del hipocentro de la explosión — sirvió de refugio a los supervivientes tras la bomba atómica.', transit: 'Tranvía Hiroden desde la parada más cercana → Hatchōbori, ~10 min en total.', transitMin: 15 },
      { name: 'Okonomimura', kind: 'visit', durOverride: 45 },
      { name: 'Hondori Shopping Street', kind: 'visit', durOverride: 20, transit: 'JR Sanyo Line Hiroshima → Miyajimaguchi (~25 min, cubierto por el JR Pass) + ferry JR West a Miyajima (~10 min, también cubierto) — evitad el ferry Miyajima Matsudai, es de otra empresa y no está incluido.', transitMin: 40 },
      { name: 'Miyahima', kind: 'visit', durOverride: 0, note: 'El paseo por la orilla hasta el torii es parte del atractivo — se recorre andando.' },
      { name: 'Santuario Itsukushima', kind: 'visit', durOverride: 45, note: 'Incluye el gran torii bermellón de 16,6 m, el símbolo de Miyajima — con la marea alta (~250 cm) parece flotar sobre el mar, visible desde el propio santuario.' },
      { name: 'Santuario Toyokuni (Senjokaku)', kind: 'visit', durOverride: 20, optional: true, note: 'Opcional — la pagoda de cinco pisos de al lado es del mismo conjunto; secundario frente al santuario flotante y el Monte Misen.' },
      { name: 'Calle Comercial Miyajima Omotesando', kind: 'visit', durOverride: 30, note: 'La mayoría de tiendas cierran sobre las 18:00.' },
      { name: 'Parque Momijidani', kind: 'visit', durOverride: 20, note: 'A principios de noviembre es buena época para verlos en pleno color.', transit: 'Bus gratuito a la estación del ropeway + telesférico Miyajima, ~15 min en total.', transitMin: 20 },
      { name: 'Monte Misen', kind: 'visit', durOverride: 30, note: 'OJO con el horario: en noviembre el teleférico sube hasta las 17:00 y el último descenso es a las 17:30. Llegando sobre las 16:50 da para la estación Shishiiwa y su mirador (~30 min), pero NO para subir a la cima (+1h ida y vuelta). Si queréis la cima, saltad el Santuario Toyokuni y acortad Hiroshima para subir antes de las 15:30; si no, es un buen sitio para ver el atardecer. Si el teleférico está parado por el tiempo, la bajada es a pie (~1h30).', transit: 'Teleférico de bajada (~15 min, no cubierto) + ferry JR West a Miyajimaguchi (~10 min, cubierto) + JR a Hiroshima (~25 min, cubierto) + Shinkansen Sanyo a Shin-Osaka (~1h20-1h35, cubierto) + metro al hotel (~25 min, no cubierto). Con esperas son unas 3h15: salís del Misen sobre las 17:25 y llegáis al hotel hacia las 20:40; comprobad ese día el último Shinkansen a Shin-Osaka (aprox. 21:00-21:30).', transitMin: 195 },
      { name: 'Hotel Osaka', kind: 'info' },
    ],
  },
  {
    date: '2026-11-11', city: 'Osaka', locationLabel: 'Osaka', title: 'Universal Studios Japan',
    kind: 'daytrip', dayStartTime: '08:00',
    optional: true, altGroup: 'day11', altLabel: 'B',
    altNote: 'Elegid <b>11B (Universal Studios)</b> o <b>11A (Hiroshima y Miyajima)</b> — decidimos no ir finalmente a Universal, así que este día se queda como alternativa por si cambiáis de idea; el plan real es 11A.',
    travelNote: 'JR Kanjo Line o Nankai/metro directo Namba/Osaka → Universal City (~20-25 min). Recomendado ir entre semana con pase express para 4 atracciones — planificad las atracciones en la app antes de entrar.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'JR Osaka Loop Line Temmabashi/Osaka → Nishikujo (~15 min) + JR Yumesaki Line a Universal City (~5 min).', transitMin: 25 },
      { name: 'Universal Studios Japan', kind: 'visit', durOverride: 480, note: 'Mejor entre semana. Descargad la app para planificar las atracciones. Entrada normal ~48€, pase express de 4 atracciones ~101€. Comida dentro del parque.', transit: 'JR Yumesaki Line Universal City → Nishikujo (~4 min) + JR Osaka Loop Line a Osaka/Temmabashi (~20 min).', transitMin: 30 },
      { name: 'Hotel Osaka', kind: 'info' },
    ],
  },
  {
    date: '2026-11-12', city: 'Osaka', locationLabel: 'Osaka', title: 'Shinsekai → Aeropuerto',
    kind: 'city', dayStartTime: '10:00',
    travelNote: 'Vuelo OSAKA KANSAI 23:20 → Singapur 05:00 (+1) — día deliberadamente ligero (el resto de Osaka ya se ve con calma el 10 nov): una mañana en Shinsekai (con Nipponbashi de paso, a solo 10 min andando) y toda la tarde libre en el hotel (maletas, descanso, última compra) antes de salir hacia el aeropuerto sobre las 19:30, con margen de sobra para el Tax Free y el control de pasaportes.',
    stops: [
      { name: 'Hotel Osaka', kind: 'meal', mealType: 'breakfast', durOverride: 30, note: 'Desayuno en el hotel.', transit: 'Metro Tanimachi/Midosuji hasta Dōbutsuen-mae (Shinsekai), ~20-25 min — o ~70 min andando.', transitMin: 25 },
      { name: 'Tower Slider (Tsutenkaku)', kind: 'visit', durOverride: 130, note: 'Con calma: mirador, la bajada en el tobogán y un paseo por Janjan Yokocho.', transit: '10 min andando hasta Nipponbashi (Den Den Town), justo al norte de Shinsekai.', transitMin: 10 },
      { name: 'Nipponbashi', kind: 'visit', durOverride: 30, note: 'Barrio de electrónica, manga y anime — movido aquí desde el 10 nov, ya que está a un paso de Shinsekai y ese día iba muy cargado.', transit: 'Vuelta a Shinsekai, ~10 min andando.', transitMin: 10 },
      { name: 'Magic Cafe & Bar Shinsekai', kind: 'meal', mealType: 'lunch', durOverride: 45, transit: 'Metro Midosuji/Tanimachi de vuelta al hotel, ~20-25 min — o ~75 min andando.', transitMin: 25 },
      { name: 'Hotel Osaka', kind: 'visit', durOverride: 270, note: 'Tarde libre — maletas con calma, descanso, alguna compra de última hora. Salid del hotel hacia las 19:30 (llegada al aeropuerto ~20:55, vuelo 23:20).', transit: 'Metro Tanimachi Line Tenmabashi → Tennoji (~15 min) + Haruka a Kansai Airport (~40 min, ~2 trenes/hora) — ~80 min con esperas. Haruka gratis y con asiento reservado incluido en el JR Pass; la reserva se abre 1 mes antes (12 oct) en JR-West Online Train Reservation, hacedla en cuanto podáis. Alternativa sin reserva: Nankai desde Namba, ~60 min (¥1.300, no cubierto).', transitMin: 80 },
      { name: 'Aeropuerto Internacional de Kansai', kind: 'info', note: 'Vuelo de vuelta: Osaka Kansai → Singapur, 12 nov 23:20 → 05:00 (+1).' },
    ],
  },
];

// Envíos de takkyubin (maleta grande) — toda la info necesaria para gestionarlo en recepción del hotel de origen.
const takkyubin = [
  {
    title: 'Envío 1: Tokio → Kioto',
    note: 'Así se hacen Kanazawa, Shirakawa-go y Takayama (2-5 nov) solo con la mochila.',
    origin: {
      label: 'Entregar el',
      date: '2 nov 2026',
      hotel: 'Hotel Tobu Levant Tokyo',
      address: '1-2-2 Kinshi, Sumida-ku, Tokio 130-0013',
      addressJp: '〒130-0013 東京都墨田区錦糸1-2-2',
      phone: '+81 3-5611-5511',
    },
    destination: {
      label: 'Entrega prevista el',
      date: '5 nov 2026',
      hotel: 'Hotel Resol Kyoto Shijo Muromachi',
      address: '554 Sanno-cho, Muromachi-dori Takatsuji-agaru, Shimogyo-ku, Kioto 600-8424',
      addressJp: '〒600-8424 京都府京都市下京区室町通高辻上ル山王町554',
      phone: '+81 75-365-9269',
    },
  },
  {
    title: 'Envío 2: Kioto → Osaka',
    note: 'Así se hace la excursión a Nara y el traslado a Osaka (9 nov) sin cargar con la maleta grande.',
    origin: {
      label: 'Entregar el',
      date: '8 nov 2026',
      hotel: 'Hotel Resol Kyoto Shijo Muromachi',
      address: '554 Sanno-cho, Muromachi-dori Takatsuji-agaru, Shimogyo-ku, Kioto 600-8424',
      addressJp: '〒600-8424 京都府京都市下京区室町通高辻上ル山王町554',
      phone: '+81 75-365-9269',
    },
    destination: {
      label: 'Entrega prevista el',
      date: '9 nov 2026',
      hotel: 'Hotel Keihan Tenmabashi Ekimae',
      address: '2-13 Tenmabashikyomachi, Chuo-ku, Osaka 540-0032',
      addressJp: '〒540-0032 大阪府大阪市中央区天満橋京町2-13',
      phone: '+81 6-6946-0321',
    },
  },
];

// Lugares del KMZ que no se han metido en ningún día (opcionales / por si sobra tiempo)
const extras = {
  Tokio: ['Chōfu', 'Jardín Botánico Jindaiji', '大正寺 山門(竜宮門)', 'Shibamata', 'Shibamata Taishakuten', 'Yamanote Line', 'SUSHI Gompachi Nishi-Azabu', 'Mount Fuji Fujinomiya 5th Station', 'Tokyo Skytree'],
  'Kanazawa-Takayama': ['Castillo de Nagoya'],
  Kioto: [
    "Philosopher's Path (Tetsugaku no Michi), North End", 'Shugakuin Imperial Villa',
  ],
  Osaka: [
    'Sumiyoshi Taisha', 'Templo Katsuo-ji',
    'Teleférico de Miyajima',
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

module.exports = { CITY_COLORS, days, extras, altDayTrips, manualPlaces, manualFood, takkyubin };
