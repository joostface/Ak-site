/* Voorbeeldinhoud voor het prototype.
   In WordPress komt dit uit de REST API (/wp-json/aklokaal/v1/...).
   De vorm van dit object is bewust gelijk aan die API-antwoorden. */
window.AK_DATA = {
  years: [
    { slug: '1-havo-vwo', name: '1 havo/vwo', chapters: [
      { n: 1, title: 'De aarde in kaart', paragraphs: ['Kaarten lezen', 'Schaal en afstand', 'Coördinaten', 'De atlas gebruiken'] },
      { n: 2, title: 'Weer en klimaat', paragraphs: ['Weer en weerkaarten', 'Temperatuur en neerslag', 'Klimaatdiagrammen', 'Klimaten van de wereld', 'Klimaatverandering dichtbij'] },
      { n: 3, title: 'Wonen in Nederland', paragraphs: ['Dorp en stad', 'Wonen in de Randstad', 'Krimpregio’s'] },
      { n: 4, title: 'Landbouw en voedsel', paragraphs: ['Van boer tot bord', 'Landbouw in Nederland', 'Voedsel wereldwijd', 'Duurzame landbouw'] }
    ] },
    { slug: '2-havo-vwo', name: '2 havo/vwo', chapters: [
      { n: 1, title: 'Bevolking en ruimte', paragraphs: ['Bevolkingsgroei', 'Bevolkingspiramides', 'Spreiding en dichtheid', 'Vergrijzing'] },
      { n: 2, title: 'Water', paragraphs: ['De waterkringloop', 'Rivieren', 'Leven onder zeeniveau', 'Water te veel, water te weinig'] },
      { n: 3, title: 'Steden', paragraphs: ['Stadsdelen', 'Steden in arme landen', 'Megasteden'] },
      { n: 4, title: 'Europa', paragraphs: ['Grenzen van Europa', 'De Europese Unie', 'Regionale verschillen', 'Mobiliteit in Europa'] }
    ] },
    { slug: '3-havo', name: '3 havo', chapters: [
      { n: 1, title: 'Globalisering', paragraphs: ['Wereldhandel', 'Containers en havens', 'Multinationals'] },
      { n: 2, title: 'Energie', paragraphs: ['Energiebronnen', 'Energie in Nederland', 'Schone energie'] },
      { n: 3, title: 'Natuurrampen', paragraphs: ['Aardbevingen', 'Vulkanen', 'Overstromingen', 'Risico en kwetsbaarheid'] }
    ] },
    { slug: '3-vwo', name: '3 vwo', chapters: [
      { n: 1, title: 'Arm en rijk', paragraphs: ['Ontwikkeling meten', 'Ongelijkheid in de wereld', 'Ontwikkelingskansen', 'Ongelijkheid in Nederland'] },
      { n: 2, title: 'Energie', href: 'hoofdstuk.html', paragraphs: ['Energiebronnen', 'De koolstofkringloop', 'De energietransitie', 'Wind en zon in Nederland', 'Duurzame keuzes'] },
      { n: 3, title: 'Grenzen en conflicten', draft: true, paragraphs: ['Wat is een grens?', 'Conflicten om grondstoffen', 'Vluchtelingen'] },
      { n: 4, title: 'Aarde in beweging', paragraphs: ['Platentektoniek', 'Gebergtevorming', 'Het landschap van Nederland'] }
    ] },
    { slug: '4-havo', name: '4 havo', chapters: [
      { n: 1, title: 'Wereld: globalisering', paragraphs: ['Mondiale verbindingen', 'Centrum en periferie', 'Migratie', 'Geopolitiek'] },
      { n: 2, title: 'Aarde: klimaat en landschap', paragraphs: ['Het klimaatsysteem', 'Endogene processen', 'Exogene processen'] },
      { n: 3, title: 'Gebied: Brazilië', paragraphs: ['Ligging en natuur', 'Bevolking en verstedelijking', 'Amazonegebied'] }
    ] },
    { slug: '5-vwo', name: '5 vwo', chapters: [
      { n: 1, title: 'Wereld: arm en rijk', paragraphs: ['Mondiale ongelijkheid', 'Grondstoffen en macht', 'Mondiale netwerken'] },
      { n: 2, title: 'Gebied: Zuidoost-Azië', paragraphs: ['Natuurlijke gesteldheid', 'Moessonklimaat', 'Economische groei', 'Megasteden'] },
      { n: 3, title: 'Leefomgeving: de stad', paragraphs: ['Stedelijke vernieuwing', 'Gentrificatie', 'Klimaatbestendige stad'] }
    ] }
  ],
  news: [
    { title: 'Kustonderhoud: meer zand nodig dan gedacht', source: 'De Dagkrant', date: '28 oktober 2026', tags: ['Klimaat', 'Water'], href: 'nieuws.html' },
    { title: 'Windpark op zee levert eerste stroom', source: 'Geo Weekblad', date: '24 oktober 2026', tags: ['Energie'], href: 'nieuws.html' },
    { title: 'Middelgrote steden groeien sneller dan de Randstad', source: 'Stadsjournaal', date: '19 oktober 2026', tags: ['Verstedelijking'], href: 'nieuws.html' },
    { title: 'Droogte op de Rijn raakt binnenvaart opnieuw', source: 'De Dagkrant', date: '14 oktober 2026', tags: ['Water', 'Economie'], href: 'nieuws.html' },
    { title: 'Nieuwe kaart toont bodemdaling tot op de straat', source: 'Wetenschapsbericht', date: '9 oktober 2026', tags: ['Fysische geografie'], href: 'nieuws.html' },
    { title: 'Arbeidsmigratie verschuift naar Oost-Europa', source: 'Geo Weekblad', date: '2 oktober 2026', tags: ['Migratie'], href: 'nieuws.html' }
  ],
  maps: [
    { title: 'Reliëf van een middelgebergte', tags: ['Fysische geografie'], href: 'kaarten.html#reliefkaart' },
    { title: 'Zeediepte en kustlijn', tags: ['Fysische geografie'], href: 'kaarten.html#dieptekaart' },
    { title: 'Klimaatzones', tags: ['Klimaat'], href: 'kaarten.html#klimaat' },
    { title: 'Bevolkingsdichtheid', tags: ['Bevolking'], href: 'kaarten.html#bevolking' },
    { title: 'Opgewekte duurzame energie per gebied', tags: ['Economie', 'Energie'], href: 'kaarten.html#energie' },
    { title: 'Een rivierdelta', tags: ['Fysische geografie'], href: 'kaarten.html#delta' }
  ],
  apps: [
    { title: 'Topografie Nederland', tags: ['Topografie'], href: 'interactief.html#topografie' },
    { title: 'Raad de stad', tags: ['Topografie', 'Steden'], href: 'interactief.html#raad-de-stad' },
    { title: 'De groeiende stad', tags: ['Verstedelijking'], href: 'interactief.html#groeiende-stad' },
    { title: 'Klimaatdiagram maken', tags: ['Klimaat'], href: 'interactief.html#klimaatdiagram' }
  ]
};
