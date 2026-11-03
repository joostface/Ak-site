/*
 * Wereldatlas voor het Aardrijkskundelokaal.
 * Gebaseerd op het oorspronkelijke bestand "wereldatlas-lagen.html"; de lagen komen nu uit de
 * database (window.AKAtlasConfig) en worden in het beheer toegevoegd, geordend en verwijderd.
 * Zware data (bevolking, taalgebieden, rasters) wordt pas geladen als iemand de laag aanzet.
 */
(async () => {
  const CFG = window.AKAtlasConfig || { base: '', groups: [], layers: [] };
  const DATA = window.AKAtlasData || {};
  const ICONS = window.AKAtlasIcons || {};
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svgIcon = (name) => ICONS[name] ? `<svg class="atlas-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>` : '';
  const renderIcons = (scope) => scope.querySelectorAll('i[data-lucide]').forEach((i) => { const svg = svgIcon(i.dataset.lucide); if (svg) i.outerHTML = svg; });
  const jsonCache = {};
  const loadJson = (name) => (jsonCache[name] ||= fetch(CFG.base + 'data/' + name).then((r) => { if (!r.ok) throw new Error(name); return r.json(); }));
  if (!document.getElementById('geo-atlas') || !window.L) return;


  const root = document.getElementById('geo-atlas');
  const mapNode = document.getElementById('atlas-map');
  const catalogNode = document.getElementById('layer-catalog');
  const legendNode = document.getElementById('legend-content');
  const detailPanel = document.getElementById('map-detail');
  const detailContent = document.getElementById('map-detail-content');
  const populationMarginalsNode = document.getElementById('population-marginals');
  const populationLongitudeSvg = document.getElementById('population-longitude-chart');
  const populationLatitudeSvg = document.getElementById('population-latitude-chart');
  const populationStripTooltip = document.getElementById('population-strip-tooltip');
  const populationLongitude5 = [0.1,0.3,0,0,1.5,0.1,0.7,0,0.1,0.1,0.2,28.9,36.2,19.6,16.5,51.5,95.9,53.5,70.3,88.4,123.4,125,47.2,31.5,41,32.1,80.7,52.8,36,4.8,0.3,0.8,21.7,28.8,92.5,165.7,175.4,283.3,178.3,122.2,110.1,207.9,352.6,309.9,141.4,119.7,59.1,41.1,27.3,110.4,397.2,592.6,345.1,345.4,165.2,97.2,251.4,390.4,474.8,456.1,330.8,141.7,38.3,86.7,28.6,9.5,12.8,0.8,0.4,0.8,3.4,2.2];
  const populationLatitude5 = [0,0,0,0.2,2.8,16.8,92.3,268.9,284.6,473.2,785,985.8,1068.7,954.3,466.8,628.9,465.7,220.5,228,311.6,97.3,106.4,116.5,84.1,74.1,20,4,0.9,0.5,0,0,0,0,0,0,0];
  const expandPopulationToOneDegree = (values, wrap=false) => values.flatMap((total,index) => {
    if (total <= 0) return [0,0,0,0,0];
    const previousIndex = index > 0 ? index-1 : (wrap ? values.length-1 : 0);
    const nextIndex = index < values.length-1 ? index+1 : (wrap ? 0 : values.length-1);
    const currentRate = total/5;
    const leftRate = (values[previousIndex]/5+currentRate)/2;
    const rightRate = (currentRate+values[nextIndex]/5)/2;
    const weights = Array.from({length:5},(_,part) => {
      const position=(part+.5)/5;
      return Math.max(0,leftRate*(1-position)+rightRate*position);
    });
    const weightTotal=weights.reduce((sum,value)=>sum+value,0) || 1;
    return weights.map(weight=>total*weight/weightTotal);
  });
  const populationLongitude1 = expandPopulationToOneDegree(populationLongitude5,true);
  const populationLatitude1 = expandPopulationToOneDegree(populationLatitude5);
  const koppenDetailUrl = CFG.base + 'data/koppen-detail.png';
  const koppenMainUrl = CFG.base + 'data/koppen-main.png';
  const elevationDataUrl = CFG.base + 'data/elevation.webp';
  const world = await loadJson('countries-110m.json');
  const worldGeo = topojson.feature(world, world.objects.features);

  const worldOffsets = [-360,0,360];
  function shiftCoordinates(value,offset) {
    if (!Array.isArray(value)) return value;
    if (typeof value[0]==='number') return [value[0]+offset,value[1],...value.slice(2)];
    return value.map(item=>shiftCoordinates(item,offset));
  }
  function shiftGeometry(geometry,offset) {
    if (!geometry || !offset) return geometry;
    if (geometry.type==='GeometryCollection') return {...geometry,geometries:geometry.geometries.map(item=>shiftGeometry(item,offset))};
    return {...geometry,coordinates:shiftCoordinates(geometry.coordinates,offset)};
  }
  function shiftGeoJson(data,offset) {
    if (!offset) return data;
    if (data.type==='FeatureCollection') return {...data,features:data.features.map(feature=>shiftGeoJson(feature,offset))};
    if (data.type==='Feature') return {...data,geometry:shiftGeometry(data.geometry,offset)};
    return shiftGeometry(data,offset);
  }
  function geoJsonWorldLayer(data,options) {
    const group=L.layerGroup(worldOffsets.map(offset=>L.geoJSON(shiftGeoJson(data,offset),options)));
    group.setStyle=value=>{group.eachLayer(layer=>layer.setStyle(value));return group;};
    return group;
  }
  function worldImageLayer(url,options={}) {
    const group=L.layerGroup(worldOffsets.map(offset=>L.imageOverlay(url,[[-85.05112878,-180+offset],[85.05112878,180+offset]],options)));
    group._managesOpacity=true;
    group.setOpacity=value=>{group.eachLayer(layer=>layer.setOpacity(value));return group;};
    return group;
  }

  const colorProbe = document.createElement('span');
  colorProbe.style.display = 'none';
  root.appendChild(colorProbe);
  const cssColor = (expr) => { colorProbe.style.color = ''; colorProbe.style.color = expr; return getComputedStyle(colorProbe).color || expr; };
  const contextStyle = (atlasMode = true) => ({ color: cssColor('var(--border)'), weight: .7, opacity: atlasMode ? .9 : .45, fillColor: cssColor('var(--muted)'), fillOpacity: atlasMode ? .28 : 0 });

  const map = L.map(mapNode, {
    center: [18, 0], zoom: 2, minZoom: 2, maxZoom: 9,
    zoomControl: false, worldCopyJump: true, preferCanvas: true
  });
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  const baseMaps = {
    light: L.layerGroup(),
    osm: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom:19,
      attribution:'Kaart &copy; Esri en gegevensleveranciers'
    }),
    satellite: L.layerGroup([
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, attribution: 'Beeld &copy; Esri en beeldleveranciers'
      }),
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, attribution: 'Grenzen en plaatsen &copy; Esri'
      })
    ])
  };
  let currentBase = baseMaps.light.addTo(map);

  ['contextPane','climatePane','rasterPane','surfacePane','linePane','pointPane','labelPane'].forEach((name, index) => {
    map.createPane(name);
    map.getPane(name).style.zIndex = String(320 + index * 45);
  });
  map.getPane('labelPane').style.pointerEvents = 'none';

  const contextLayer = geoJsonWorldLayer(worldGeo, {
    pane: 'contextPane', interactive: false,
    style: contextStyle(true)
  }).addTo(map);

  const incomeLatest = DATA.incomeLatest || {};

  const countryNames = DATA.countryNames || {};

  const conflictAreas2026 = DATA.conflictAreas2026 || { type: 'FeatureCollection', features: [] };

  const ethnolinguistic = [
    [31,42,'Arabisch','Afro-Aziatisch','Groot taalgebied in Noord-Afrika en West-Azië; veel regionale variatie.'],
    [10,8,'Hausa','Afro-Aziatisch','Belangrijke lingua franca in West-Afrika.'],[7.5,4,'Yorùbá','Niger-Congo','Vooral zuidwestelijk Nigeria en aangrenzende gebieden.'],
    [-1,22,'Bantoetalen','Niger-Congo','Zeer brede taalgroep; geen enkele etnische eenheid.'],[28,84,'Nepalees / Tibeto-Birmaans','Indo-Europees & Sino-Tibetaans','Sterk gelaagd Himalayagebied.'],
    [23,113,'Han-Chinees / Sinitisch','Sino-Tibetaans','Grote meerderheidstaalgroep met belangrijke interne variatie.'],[12,78,'Tamil','Dravidisch','Zuid-India en Sri Lanka, plus diaspora.'],
    [27,75,'Hindi-Urdu continuüm','Indo-Europees','Taalcontinuüm met meerdere standaarden en identiteiten.'],[39,35,'Turkse talen','Turks','Van Anatolië tot Centraal-Azië.'],
    [56,92,'Russisch','Indo-Europees','Groot verspreidingsgebied en lingua franca in delen van Eurazië.'],[-23,133,'Australische Aboriginaltalen','Meerdere families','Veel afzonderlijke taalgebieden; sterk vereenvoudigd.'],
    [-6,-55,'Inheemse talen Amazonië','Meerdere families','Zeer hoge taalkundige diversiteit; marker is geen grens.'],[16,-90,'Maya-talen','Maya','Zuid-Mexico, Guatemala en omliggende gebieden.'],
    [64,-22,'IJslands','Indo-Europees','Noord-Germaanse taal met relatief compact kerngebied.']
  ];

  const megacities = [
    [-6.3241,106.8189,'Jakarta',41.91,'Indonesië','hoog'],[23.6364,90.6228,'Dhaka',36.59,'Bangladesh','middel'],[35.6670,139.6543,'Tōkyō (Tokyo)',33.41,'Japan','hoog'],
    [28.6188,77.2194,'New Delhi',30.22,'India','hoog'],[31.2117,121.4363,'Shanghai',29.56,'China','hoog'],[23.0090,113.4114,'Guangzhou',27.56,'China','hoog'],
    [30.0694,31.2547,'Al-Qahirah (Cairo)',25.57,'Egypte','middel'],[14.5827,121.0189,'Manila',24.74,'Filipijnen','hoog'],[22.5759,88.3498,'Kolkata',22.55,'India','middel'],
    [37.4888,126.9452,'Seoul',22.49,'Zuid-Korea','middel'],[24.8979,67.0666,'Karachi',21.42,'Pakistan','middel'],[19.1338,72.8869,'Mumbai',20.20,'India','middel'],
    [-23.5761,-46.5991,'São Paulo',18.95,'Brazilië','hoog'],[13.7627,100.5538,'Krung Thep Maha Nakhon (Bangkok)',18.18,'Thailand','hoog'],[19.4490,-99.1019,'Ciudad de México (Mexico City)',17.73,'Mexico','hoog'],
    [39.9288,116.3724,'Beijing',17.01,'China','hoog'],[31.5359,74.2879,'Lahore',15.16,'Pakistan','middel'],[41.0125,28.9888,'Istanbul',15.01,'Turkije','middel'],
    [55.7493,37.6383,'Moskva (Moscow)',14.52,'Rusland','middel'],[10.8303,106.6938,'Ho Chi Minh City',14.05,'Vietnam','hoog'],[-34.6532,-58.5227,'Buenos Aires',14.02,'Argentinië','middel'],
    [40.7382,-73.9350,'New York City',13.92,'Verenigde Staten','hoog'],[22.6576,114.0103,'Shenzhen',13.88,'China','hoog'],[13.0142,77.5567,'Bengaluru',13.19,'India','middel'],
    [34.7217,135.4776,'Osaka',12.96,'Japan','hoog'],[6.5707,3.3095,'Lagos',12.79,'Nigeria','middel'],[33.9871,-118.0941,'Los Angeles',12.74,'Verenigde Staten','middel'],
    [-8.8850,13.3000,'Luanda',11.37,'Angola','hoog'],[13.0389,80.1946,'Chennai',11.15,'India','hoog'],[-4.3839,15.3266,'Kinshasa',10.94,'DR Congo','middel'],
    [4.6467,-74.1155,'Bogotá',10.62,'Colombia','middel'],[-12.0387,-77.0094,'Lima',10.58,'Peru','hoog'],[51.5098,-0.1263,'London',10.42,'Verenigd Koninkrijk','hoog']
  ];

  const volcanoDataUrl = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/Volcano_Locations/FeatureServer/0/query?where=1%3D1&outFields=NAME%2CCOUNTRY%2CLOCATION%2CELEVATION%2CMORPHOLOGY%2CSTATUS%2CTIME_ERUPT&outSR=4326&f=geojson';
  const plateBoundaryDataUrl = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/Plate_Boundaries_(UTIG)/FeatureServer/0/query?where=1%3D1&outFields=type%2Cgeogdesc%2Cdatatype%2Cplatecode&outSR=4326&f=geojson';
  let volcanoDataPromise;
  let plateBoundaryDataPromise;

  const climateRiskCities2026 = DATA.climateRiskCities2026 || [];

  const tradeRoutes = [
    {name:'Europa–Azië via Suez',points:[[51.9,4.5],[50.1,1.0],[49.5,-4.5],[45,-9],[36,-5.6],[37,3],[36,15],[34,24],[31,30],[30.2,32.5],[24,36],[18,40],[12.6,43.3],[12,52],[10,65],[6,80],[5,91],[2,100],[1.3,103.8],[7,108],[15,112],[22.3,114.2],[24.5,121],[30,128],[35.6,139.7]]},
    {name:'Trans-Pacifische route, westelijk deel',points:[[35.6,139.7],[38,150],[41,160],[43,170],[44,179.7]]},
    {name:'Trans-Pacifische route, oostelijk deel',points:[[44,-179.7],[42,-170],[39,-158],[35,-145],[32,-132],[34,-118.2]]},
    {name:'Panama–Noord-Europa',points:[[8.9,-79.5],[14,-77],[20,-70],[26,-60],[33,-45],[40,-30],[46,-18],[49.5,-6],[50.1,1],[51.9,4.5]]},
    {name:'Zuid-Atlantische route',points:[[-23.9,-46.3],[-18,-35],[-8,-25],[3,-20],[15,-18],[28,-15],[36,-9],[45,-9],[49.5,-4.5],[51.9,4.5]]},
    {name:'Kaaproute Europa–Azië',points:[[51.9,4.5],[49.5,-4.5],[42,-12],[30,-18],[15,-20],[0,-13],[-15,-5],[-30,8],[-36,18],[-32,30],[-24,42],[-14,53],[-6,68],[0,82],[3,94],[1.3,103.8]]},
    {name:'Perzische Golf–Straat van Hormuz',points:[[29.5,48.5],[27,51],[26.6,56.3],[22,60],[15,67],[8,76],[6,80]]}
  ];
  const chokepoints = [[36.0,-5.6,'Straat van Gibraltar'],[30.5,32.3,'Suezkanaal'],[12.6,43.3,'Bab el-Mandeb'],[26.6,56.3,'Straat van Hormuz'],[1.3,103.8,'Straat van Malakka'],[8.9,-79.5,'Panamakanaal'],[55.0,12.7,'Deense zeestraten'],[41.1,29.1,'Bosporus']];

  const mountainRanges = [
    {name:'Andes', points:[[10,-73],[3,-76],[-6,-78],[-15,-73],[-25,-68],[-35,-70],[-50,-73]]},
    {name:'Rocky Mountains', points:[[60,-137],[50,-116],[40,-106],[31,-105]]},
    {name:'Alpen', points:[[44.5,6],[46.5,10],[47.5,15]]},
    {name:'Himalaya', points:[[35,71],[33,78],[29,84],[28,91],[28,97]]},
    {name:'Oost-Afrikaanse hooglanden', points:[[12,39],[5,37],[-3,36],[-9,34]]},
    {name:'Nieuw-Guinees hoogland', points:[[-4,136],[-6,143],[-6,147]]}
  ];

  const groups = [
    ...CFG.groups.map((g) => ({ id: g.slug, title: g.title, icon: g.icon || 'layers-3' })),
    { id: 'overig', title: 'Overige lagen', icon: 'layers-3' },
    { id: 'custom', title: 'Eigen data', icon: 'file-json' }
  ];
  const legend = {
    climateMain: [
      ['#2563d8','Tropisch (Af/Am)'],['#57b3ef','Savanne (Aw/As)'],['#e7a527','Steppe (BS)'],['#df4b35','Woestijn (BW)'],
      ['#62a966','Zeeklimaat / gematigd (C)'],['#6f68a8','Landklimaat (D)'],['#b4d0cf','Toendra (ET)'],['#e2e5e5','Pool / ijskap (EF)']
    ],
    koppen: [
      ['#0000ff','Af'],['#0078ff','Am'],['#46aafa','Aw/As'],['#ff0000','BWh'],['#ff9696','BWk'],['#f5a500','BSh'],['#ffdc64','BSk'],
      ['#ffff00','Csa'],['#c8ff50','Csb'],['#64ff50','Csc'],['#96ff96','Cwa'],['#64c864','Cwb'],['#329633','Cwc'],['#00ff00','Cfa'],['#32c800','Cfb'],
      ['#ff00ff','Dsa'],['#c800c8','Dsb'],['#963296','Dsc/d'],['#aabfff','Dwa'],['#5a78dc','Dwb'],['#4b50b3','Dwc/d'],['#00ffff','Dfa'],['#37c8ff','Dfb'],['#007d7d','Dfc/d'],
      ['#b2b2b2','ET'],['#666666','EF']
    ]
  };

  const climateClasses = [
    {rgb:[0,0,255],code:'Af',name:'Tropisch regenwoud',group:'Tropisch'},
    {rgb:[0,120,255],code:'Am',name:'Tropisch moessonklimaat',group:'Tropisch'},
    {rgb:[70,170,250],code:'Aw/As',name:'Tropisch savanneklimaat',group:'Savanne'},
    {rgb:[255,0,0],code:'BWh',name:'Heet woestijnklimaat',group:'Woestijn'},
    {rgb:[255,150,150],code:'BWk',name:'Koud woestijnklimaat',group:'Woestijn'},
    {rgb:[245,165,0],code:'BSh',name:'Heet steppeklimaat',group:'Steppe'},
    {rgb:[255,220,100],code:'BSk',name:'Koud steppeklimaat',group:'Steppe'},
    {rgb:[255,255,0],code:'Csa',name:'Mediterraan, hete zomer',group:'Zeeklimaat / gematigd'},
    {rgb:[200,255,80],code:'Csb',name:'Mediterraan, zachte zomer',group:'Zeeklimaat / gematigd'},
    {rgb:[100,255,80],code:'Csc',name:'Mediterraan, koele zomer',group:'Zeeklimaat / gematigd'},
    {rgb:[150,255,150],code:'Cwa',name:'Droge winter, hete zomer',group:'Zeeklimaat / gematigd'},
    {rgb:[100,200,100],code:'Cwb',name:'Droge winter, zachte zomer',group:'Zeeklimaat / gematigd'},
    {rgb:[50,150,50],code:'Cwc',name:'Droge winter, koele zomer',group:'Zeeklimaat / gematigd'},
    {rgb:[0,255,0],code:'Cfa',name:'Vochtig subtropisch klimaat',group:'Zeeklimaat / gematigd'},
    {rgb:[50,200,0],code:'Cfb',name:'Gematigd zeeklimaat',group:'Zeeklimaat / gematigd'},
    {rgb:[255,0,255],code:'Dsa',name:'Continentaal, droge hete zomer',group:'Landklimaat'},
    {rgb:[200,0,200],code:'Dsb',name:'Continentaal, droge zachte zomer',group:'Landklimaat'},
    {rgb:[150,50,150],code:'Dsc/d',name:'Continentaal, droge koele zomer',group:'Landklimaat'},
    {rgb:[170,191,255],code:'Dwa',name:'Continentaal, droge winter en hete zomer',group:'Landklimaat'},
    {rgb:[90,120,220],code:'Dwb',name:'Continentaal, droge winter en zachte zomer',group:'Landklimaat'},
    {rgb:[75,80,179],code:'Dwc/d',name:'Continentaal, droge winter en koele zomer',group:'Landklimaat'},
    {rgb:[0,255,255],code:'Dfa',name:'Vochtig continentaal, hete zomer',group:'Landklimaat'},
    {rgb:[55,200,255],code:'Dfb',name:'Vochtig continentaal, zachte zomer',group:'Landklimaat'},
    {rgb:[0,125,125],code:'Dfc/d',name:'Subarctisch landklimaat',group:'Landklimaat'},
    {rgb:[178,178,178],code:'ET',name:'Toendraklimaat',group:'Toendra'},
    {rgb:[102,102,102],code:'EF',name:'IJskapklimaat',group:'Pool / ijskap'}
  ];
  const climateLookup = document.createElement('canvas');
  const climateLookupContext = climateLookup.getContext('2d', {willReadFrequently:true});
  let climateLookupReady = false;
  const climateLookupImage = new Image();
  climateLookupImage.onload = () => {
    climateLookup.width = climateLookupImage.naturalWidth;
    climateLookup.height = climateLookupImage.naturalHeight;
    climateLookupContext.drawImage(climateLookupImage,0,0);
    climateLookupReady = true;
  };
  climateLookupImage.src = koppenDetailUrl;
  const climateHover = L.tooltip({
    direction:'top', offset:[0,-9], opacity:.97, className:'atlas-climate-tooltip'
  });
  const hoveredMapFeatures = new Set();

  function prioritizeFeatureHover(layer) {
    const key = L.stamp(layer);
    layer.on('mouseover',()=>{
      hoveredMapFeatures.add(key);
      if (map.hasLayer(climateHover)) map.closeTooltip(climateHover);
    });
    layer.on('mouseout',()=>hoveredMapFeatures.delete(key));
    return layer;
  }

  function climateMainLayer() {
    return worldImageLayer(koppenMainUrl, {
      pane:'climatePane', opacity:.9, interactive:false
    });
  }

  function circleLayer(rows, options) {
    const g = L.layerGroup();
    rows.forEach(row => {
      worldOffsets.forEach(offset=>{
        const marker = L.circleMarker([row[0],row[1]+offset], {
          pane:'pointPane', radius: options.radius ? options.radius(row) : 6,
          color: options.stroke || options.color, weight: 1.5,
          fillColor: options.color, fillOpacity: .82, opacity: .95
        });
        marker.bindTooltip(options.tooltip(row), {
          sticky:true, direction:'top', opacity:.96, className:'atlas-area-tooltip'
        });
        prioritizeFeatureHover(marker);
        if (options.detail) marker.on('click', () => showDetail(options.detail(row)));
        marker.addTo(g);
      });
    });
    return g;
  }

  function loadOfficialGeoJson(url, label) {
    return fetch(url).then(response=>{
      if (!response.ok) throw new Error(`${label}: status ${response.status}`);
      return response.json();
    }).then(data=>{
      if (!data?.features?.length) throw new Error(`${label}: geen objecten ontvangen`);
      return data;
    });
  }

  // Vulkaantypes (MORPHOLOGY uit de NOAA/Smithsonian-catalogus) in het Nederlands, met een eigen kleur.
  const volcanoTypes = [
    { re: /submarine/i, nl: 'Onderzeese vulkaan', color: '#2c79c7' },
    { re: /subglacial/i, nl: 'Subglaciale vulkaan', color: '#8fc6e8' },
    { re: /caldera/i, nl: 'Caldera', color: '#6f5c91' },
    { re: /shield/i, nl: 'Schildvulkaan', color: '#e7a527' },
    { re: /complex/i, nl: 'Complexe vulkaan', color: '#873c38' },
    { re: /dome/i, nl: 'Lavakoepel', color: '#b46b3c' },
    { re: /fissure|crater row/i, nl: 'Spleetvulkaan', color: '#2f7f77' },
    { re: /field/i, nl: 'Vulkanisch veld', color: '#4c72a8' },
    { re: /maar|explosion|tuff/i, nl: 'Maar of explosiekrater', color: '#8a7352' },
    { re: /cinder|scoria|pyroclastic cone|lava cone|cone/i, nl: 'Sintelkegel', color: '#f07b3f' },
    { re: /strato|compound|somma/i, nl: 'Stratovulkaan', color: '#d13b2f' }
  ];
  const volcanoOther = { nl: 'Ander of onbekend type', color: '#8b8b8b' };
  const volcanoType = (morphology) => volcanoTypes.find((t) => t.re.test(morphology || '')) || volcanoOther;

  function volcanoLayer(item) {
    const group=L.layerGroup();
    volcanoDataPromise ||= loadOfficialGeoJson(volcanoDataUrl,'Vulkanendata');
    volcanoDataPromise.then(data=>{
      const geo=geoJsonWorldLayer(data,{
        pane:'pointPane',
        pointToLayer:(feature,latlng)=>{const t=volcanoType(feature.properties?.MORPHOLOGY);return L.circleMarker(latlng,{pane:'pointPane',radius:4.6,color:'#3b1410',weight:1,fillColor:t.color,fillOpacity:.9});},
        onEachFeature:(feature,layer)=>{
          const p=feature.properties||{};
          const t=volcanoType(p.MORPHOLOGY);
          const elevation=Number.isFinite(Number(p.ELEVATION))?`${Number(p.ELEVATION).toLocaleString('nl-NL')} m`:'onbekend';
          const typeText=`${t.nl}${p.MORPHOLOGY?` (${esc(p.MORPHOLOGY)})`:''}`;
          layer.bindTooltip(`<strong>${esc(p.NAME||'Naam onbekend')}</strong><span>${typeText}<br>${esc(p.COUNTRY||p.LOCATION||'Regio onbekend')} · hoogte ${elevation}</span>`,{sticky:true,direction:'top',opacity:.97,className:'atlas-area-tooltip'});
          prioritizeFeatureHover(layer);
          layer.on('click',()=>showDetail({title:esc(p.NAME||'Vulkaan'),subtitle:esc(`${item.source||'Smithsonian GVP · via NOAA NCEI'}${item.year?` (${item.year})`:''}`),facts:{'Vulkaantype':typeText,'Land / regio':esc(p.COUNTRY||p.LOCATION||'Onbekend'),'Hoogte':elevation,'Status':esc(p.STATUS||'Onbekend'),'Laatste eruptiecode':esc(p.TIME_ERUPT||'Onbekend')}}));
        }
      }).addTo(group);
      applyOpacity(geo,opacityState.get(item.id)??item.opacity);
    }).catch(()=>showToast('De officiële vulkanendata kon niet worden geladen.'));
    return group;
  }

  // Aardbevingen van de afgelopen 24 uur, live van USGS; elke vijf minuten ververst zolang de laag aanstaat.
  const earthquakeFeedUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  const quakeDepths = [
    { max: 70, color: '#e0452f', label: 'ondiep (0–70 km)' },
    { max: 300, color: '#f08c2a', label: 'middeldiep (70–300 km)' },
    { max: Infinity, color: '#f2c94c', label: 'diep (meer dan 300 km)' }
  ];
  const quakeColor = (depth) => (quakeDepths.find((d) => depth < d.max) || quakeDepths.at(-1)).color;
  const timeAgo = (ms) => {
    const rtf = new Intl.RelativeTimeFormat('nl', { numeric: 'auto' });
    const minutes = Math.round((ms - Date.now()) / 60000);
    return Math.abs(minutes) < 60 ? rtf.format(minutes, 'minute') : rtf.format(Math.round(minutes / 60), 'hour');
  };

  function earthquakeLayer(item) {
    const group=L.layerGroup();
    let timer=0, first=true;
    const load=()=>fetch(earthquakeFeedUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(data=>{
      group.clearLayers();
      const features=(data.features||[]).filter(f=>f.geometry?.coordinates).sort((a,b)=>(a.properties.mag||0)-(b.properties.mag||0));
      const geo=geoJsonWorldLayer({type:'FeatureCollection',features},{
        pane:'pointPane',
        pointToLayer:(f,latlng)=>{const m=Math.max(0,Number(f.properties.mag)||0);return L.circleMarker(latlng,{pane:'pointPane',radius:Math.min(30,2+m*m*.55),color:'#4a1a10',weight:.8,fillColor:quakeColor(f.geometry.coordinates[2]||0),fillOpacity:.78});},
        onEachFeature:(f,layer)=>{
          const p=f.properties||{}, depth=Math.round(f.geometry.coordinates[2]||0), mag=Number(p.mag);
          const magText=Number.isFinite(mag)?mag.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1}):'?';
          const when=p.time?`${timeAgo(p.time)} · ${new Date(p.time).toLocaleString('nl-NL',{dateStyle:'short',timeStyle:'short'})}`:'';
          layer.bindTooltip(`<strong>Magnitude ${magText}</strong><span>${esc(p.place||'Locatie onbekend')}<br>diepte ${depth} km · ${esc(when)}</span>`,{sticky:true,direction:'top',opacity:.97,className:'atlas-area-tooltip'});
          prioritizeFeatureHover(layer);
          layer.on('click',()=>showDetail({title:`Aardbeving, magnitude ${magText}`,subtitle:esc(p.place||''),facts:{'Tijdstip':esc(when),'Diepte':`${depth} km`,'Type magnitude':esc(p.magType||'onbekend'),'Tsunamiwaarschuwing':p.tsunami?'ja, zie de bron':'nee','Bron':p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">USGS-gebeurtenispagina</a>`:'USGS'}}));
        }
      });
      geo.addTo(group);
      applyOpacity(geo,opacityState.get(item.id)??item.opacity);
      if (first) { showToast(`${features.length} aardbevingen in de afgelopen 24 uur`); first=false; }
    }).catch(()=>showToast('De live aardbevingsdata van USGS kon niet worden geladen.'));
    group.on('add',()=>{load();clearInterval(timer);timer=setInterval(load,5*60*1000);});
    group.on('remove',()=>clearInterval(timer));
    return group;
  }

  const plateTypeInfo = {
    CONVERGENT:{label:'Convergente plaatgrens',motion:'platen bewegen naar elkaar toe',color:'#d1493f'},
    DIVERGENT:{label:'Divergente plaatgrens',motion:'platen bewegen uit elkaar',color:'#247b70'},
    TRANSFORM:{label:'Transforme plaatgrens',motion:'platen schuiven langs elkaar',color:'#6c4fa1'}
  };

  function pathAnchor(geometry) {
    const paths=geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?geometry.coordinates:[];
    let best=null;
    paths.forEach(path=>{
      if (!path || path.length<2) return;
      let total=0;
      const segments=[];
      for (let i=1;i<path.length;i++) {
        const a=path[i-1],b=path[i];
        let dx=b[0]-a[0]; if (dx>180) dx-=360; if (dx<-180) dx+=360;
        const dy=b[1]-a[1];
        const length=Math.hypot(dx*Math.cos((a[1]+b[1])*Math.PI/360),dy);
        segments.push({a,b,dx,dy,length}); total+=length;
      }
      if (!best || total>best.total) best={segments,total};
    });
    if (!best || !best.total) return null;
    const halfway=best.total/2;
    let walked=0,chosen=best.segments[0],ratio=.5;
    for (const segment of best.segments) {
      if (walked+segment.length>=halfway) { chosen=segment; ratio=(halfway-walked)/segment.length; break; }
      walked+=segment.length;
    }
    const lng=chosen.a[0]+chosen.dx*ratio;
    const lat=chosen.a[1]+chosen.dy*ratio;
    const screenDx=chosen.dx*Math.cos(lat*Math.PI/180),screenDy=-chosen.dy;
    return {lat,lng,tangent:Math.atan2(screenDy,screenDx)*180/Math.PI,total:best.total};
  }

  function textHash(value) {
    let hash=0;
    for (const char of value) hash=((hash<<5)-hash+char.charCodeAt(0))|0;
    return Math.abs(hash);
  }

  const PlateBoundaryLayer=L.LayerGroup.extend({
    initialize() {
      L.LayerGroup.prototype.initialize.call(this);
      this._arrowLayer=L.layerGroup().addTo(this);
      this._candidates=[];
      this._opacity=1;
      this._loaded=false;
    },
    onAdd(layerMap) {
      L.LayerGroup.prototype.onAdd.call(this,layerMap);
      this._mapRef=layerMap;
      layerMap.on('zoomend',this._updateArrows,this);
      if (!this._loaded) this._load(); else this._updateArrows();
    },
    onRemove(layerMap) {
      layerMap.off('zoomend',this._updateArrows,this);
      this._mapRef=null;
      L.LayerGroup.prototype.onRemove.call(this,layerMap);
    },
    setOpacity(value) {
      this._opacity=value;
      this.eachLayer(layer=>{if(layer!==this._arrowLayer)applyOpacity(layer,value);});
      this._arrowLayer.eachLayer(layer=>layer.setOpacity?.(value));
      return this;
    },
    _load() {
      plateBoundaryDataPromise ||= loadOfficialGeoJson(plateBoundaryDataUrl,'Plaatgrensdata');
      plateBoundaryDataPromise.then(data=>{
        const candidateByName=new Map();
        worldOffsets.forEach(offset=>{
          const geo=L.geoJSON(shiftGeoJson(data,offset),{
            pane:'linePane',
            style:feature=>{const info=plateTypeInfo[(feature.properties?.type||'').toUpperCase()]||plateTypeInfo.TRANSFORM;return{pane:'linePane',color:info.color,weight:2.35,opacity:.88};},
            onEachFeature:(feature,layer)=>{
              const p=feature.properties||{},type=(p.type||'').toUpperCase(),info=plateTypeInfo[type]||plateTypeInfo.TRANSFORM;
              const name=(p.geogdesc||info.label).replace(/\s+/g,' ').trim();
              layer.bindTooltip(`<strong>${name}</strong><span>${info.label} · ${info.motion}<br>Pijlen zijn schematisch; geen snelheidsmeting.</span>`,{sticky:true,direction:'top',opacity:.97,className:'atlas-area-tooltip'});
              prioritizeFeatureHover(layer);
              const anchor=pathAnchor(feature.geometry),key=`${offset}|${type}|${name}`;
              if (anchor && (!candidateByName.has(key)||candidateByName.get(key).total<anchor.total)) candidateByName.set(key,{...anchor,type,name});
            }
          }).addTo(this);
          applyOpacity(geo,this._opacity);
        });
        this._candidates=[...candidateByName.values()];
        this._loaded=true;
        this._updateArrows();
      }).catch(()=>showToast('De officiële plaatgrensdata kon niet worden geladen.'));
    },
    _updateArrows() {
      if (!this._mapRef) return;
      this._arrowLayer.clearLayers();
      const zoom=this._mapRef.getZoom(),divisor=zoom<=2?4:zoom===3?2:1;
      this._candidates.forEach(candidate=>{
        if (textHash(`${candidate.type}|${candidate.name}`)%divisor) return;
        const transform=candidate.type==='TRANSFORM';
        const angle=candidate.tangent+(transform?0:90);
        const arrows=transform?'<i>→</i><i>←</i>':candidate.type==='DIVERGENT'?'<i>←</i><b></b><i>→</i>':'<i>→</i><b></b><i>←</i>';
        const color=(plateTypeInfo[candidate.type]||plateTypeInfo.TRANSFORM).color;
        L.marker([candidate.lat,candidate.lng],{pane:'labelPane',interactive:false,keyboard:false,opacity:this._opacity,icon:L.divIcon({className:'atlas-plate-arrow-icon',iconSize:[42,34],iconAnchor:[21,17],html:`<span class="atlas-plate-motion ${transform?'is-transform':'is-cross'}" style="--plate-angle:${angle.toFixed(1)}deg;--plate-color:${color}">${arrows}</span>`})}).addTo(this._arrowLayer);
      });
    }
  });

  function plateBoundaryLayer() { return new PlateBoundaryLayer(); }

  function ethnolinguisticAreaLayer(item) {
    const group = L.layerGroup();
    const colors = ['#6f5c91','#2f7f77','#b46b3c','#4c72a8','#8a7352','#7d5068'];
    const colorFor = name => {
      let hash = 0;
      for (const char of name) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
      return colors[Math.abs(hash) % colors.length];
    };
    const areaStyle=feature => {
      const color = colorFor(feature.properties.name || '');
      return { color, weight:.55, opacity:.78, fillColor:color, fillOpacity:.5 };
    };
    loadJson('ethnolinguistic.json').then((ethnolinguisticGeo) => {
    const geo = geoJsonWorldLayer(ethnolinguisticGeo, {
      pane:'surfacePane',
      style:areaStyle,
      onEachFeature:(feature, layer) => {
        const p = feature.properties;
        const names = [p.name,p.name2,p.name3].map(v=>(v||'').trim()).filter(Boolean);
        const area = Math.round(p.area_km2 || 0).toLocaleString('nl-NL');
        layer.bindTooltip(
          `<strong>${names.join(' / ')}</strong><span>${p.country ? `${p.country} · ` : ''}ca. ${area} km² · historische GREG-zone</span>`,
          { sticky:false, direction:'top', offset:[0,-6], opacity:.97, className:'atlas-area-tooltip' }
        );
        prioritizeFeatureHover(layer);
        layer.on('mouseover',()=>{layer.setStyle({weight:1.6,fillOpacity:.72});layer.openTooltip();});
        layer.on('mouseout',()=>{layer.closeTooltip();layer.setStyle(areaStyle(feature));});
      }
    });
    geo.addTo(group);
    applyOpacity(geo, opacityState.get(item.id) ?? item.opacity);
    }).catch(() => showToast('De taalgebieden konden niet worden geladen.'));
    return group;
  }

  const populationDensityClasses = [
    {max:5,color:'#fff0a6',label:'minder dan 5 inw./km²'},
    {max:25,color:'#ffd166',label:'5–25 inw./km²'},
    {max:100,color:'#fca34d',label:'25–100 inw./km²'},
    {max:250,color:'#f56b55',label:'100–250 inw./km²'},
    {max:500,color:'#e83f68',label:'250–500 inw./km²'},
    {max:1000,color:'#b92372',label:'500–1.000 inw./km²'},
    {max:Infinity,color:'#68145f',label:'meer dan 1.000 inw./km²'}
  ];

  function populationDensityColor(value) {
    return (populationDensityClasses.find(item=>value<item.max)||populationDensityClasses.at(-1)).color;
  }

  function readableAreaName(value, fallback) {
    if (!value || value==='NA') return fallback;
    return value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/ofthe/g,' of the ').replace(/\s+/g,' ').trim();
  }

  function populationDensityLayer() {
    const group = L.layerGroup();
    let opacity=1;
    const style=feature=>({
      pane:'surfacePane',
      color:'#fffaf0',
      weight:.62,
      opacity:Math.min(1,opacity+.08),
      fillColor:populationDensityColor(feature.properties.density),
      fillOpacity:opacity
    });
    let geo = null;
    loadJson('population-adm1.json').then((populationAdm1Data) => {
    geo=geoJsonWorldLayer(populationAdm1Data,{
      pane:'surfacePane',
      style,
      onEachFeature:(feature,layer)=>{
        const p=feature.properties||{};
        const areaName=readableAreaName(p.name,p.id==='NLD.14_1'?'Zuid-Holland':`Gebied ${p.id||''}`);
        const countryName=readableAreaName(p.country,'');
        const density=Number(p.density||0).toLocaleString('nl-NL',{maximumFractionDigits:1});
        const population=Number(p.population||0).toLocaleString('nl-NL');
        layer.bindTooltip(`<strong>${areaName}</strong><span>${countryName?`${countryName} · `:''}${density} inwoners per km²<br>${population} inwoners · schatting 2025</span>`,{sticky:true,direction:'top',opacity:.98,className:'atlas-area-tooltip'});
        prioritizeFeatureHover(layer);
        layer.on('mouseover',()=>layer.setStyle({weight:1.7,color:'#442039',fillOpacity:1}));
        layer.on('mouseout',()=>layer.setStyle(style(feature)));
        layer.on('click',()=>showDetail({title:areaName,subtitle:`${countryName} · GHS-WUP-DUC R2025A`,facts:{'Bevolkingsdichtheid':`${density} inwoners per km²`,'Bevolking 2025':population,'Bestuursniveau':'provincie, deelstaat of vergelijkbaar ADM1-gebied','Grenscode':p.id}}));
      }
    });
    geo.addTo(group);
    geo.setStyle(style);
    }).catch(() => showToast('De bevolkingsdata kon niet worden geladen.'));
    group._managesOpacity=true;
    group.setOpacity=value=>{opacity=value;if(geo)geo.setStyle(style);return group;};
    return group;
  }

  function incomeLayer() {
    return geoJsonWorldLayer(worldGeo,{
      pane:'surfacePane',
      style:feature=>{
        const value=incomeLatest[feature.properties.id]?.value;
        return {color:cssColor('var(--border)'),weight:.55,opacity:.8,fillColor:incomeColor(value),fillOpacity:value==null?.14:.88};
      },
      onEachFeature:(feature,layer)=>{
        const iso=feature.properties.id;
        const entry=incomeLatest[iso];
        const value=entry?.value;
        const name=countryNames[iso]||iso;
        layer.bindTooltip(
          `<strong>${name}</strong><span>${value?`$ ${value.toLocaleString('nl-NL')} per inwoner · ${entry.year}`:'Geen recente waarde'}</span>`,
          {sticky:true,direction:'top',opacity:.97,className:'atlas-area-tooltip'}
        );
        prioritizeFeatureHover(layer);
        layer.on('click',()=>showDetail({
          title:name, subtitle:`World Bank · GNI per capita${entry?`, ${entry.year}`:''}`,
          facts:{'ISO-code':iso,'Inkomen':value?`$ ${value.toLocaleString('nl-NL')} per inwoner`:'Geen recente waarde','Indicator':'NY.GNP.PCAP.CD · current US$'}
        }));
      }
    });
  }

  function conflictAreaLayer() {
    let opacity=.72;
    const style=()=>({pane:'surfacePane',color:'#a92925',weight:1.35,opacity:Math.min(1,opacity+.18),fillColor:'#e8462f',fillOpacity:opacity});
    const geo=geoJsonWorldLayer(conflictAreas2026,{
      pane:'surfacePane',
      style,
      onEachFeature:(feature,layer)=>{
        const p=feature.properties||{};
        const events=Number(p.events||0).toLocaleString('nl-NL');
        const deaths=Number(p.deaths||0).toLocaleString('nl-NL');
        layer.bindTooltip(`<strong>${p.title}</strong><span>${events} geregistreerde gebeurtenissen · ${p.period}<br>Klik voor een korte samenvatting</span>`,{sticky:false,direction:'top',opacity:.98,className:'atlas-area-tooltip'});
        layer.bindPopup(`<article class="atlas-conflict-card"><h3>${p.title}</h3><p>${p.summary}</p><dl><dt>Periode</dt><dd>${p.period}</dd><dt>Gebeurtenissen</dt><dd>${events}</dd><dt>Dodelijke slachtoffers</dt><dd>${deaths} (beste UCDP-schatting)</dd></dl><small>Voorlopige UCDP Candidate GED-data. Het vlak omhult geregistreerde locaties en is geen exacte front- of conflictgrens.</small></article>`,{className:'atlas-conflict-popup',minWidth:270,maxWidth:340,autoPanPadding:[32,56]});
        prioritizeFeatureHover(layer);
        layer.on('mouseover',()=>layer.setStyle({weight:2.2,color:'#721b1d',fillOpacity:Math.min(1,opacity+.16)}));
        layer.on('mouseout',()=>layer.setStyle(style(feature)));
        layer.on('click',()=>layer.closeTooltip());
      }
    });
    geo._managesOpacity=true;
    geo.setOpacity=value=>{opacity=value;geo.setStyle(style);return geo;};
    return geo;
  }

  function climateRiskCityLayer() {
    const colors={hoog:'#c94a28',middel:'#d98a24',laag:'#d5b744'};
    const group=L.layerGroup();
    climateRiskCities2026.forEach(city=>{
      worldOffsets.forEach(offset=>{
        const color=colors[city.highest]||colors.middel;
        const marker=L.circleMarker([city.lat,city.lon+offset],{pane:'pointPane',radius:7.5,color:'#fff8ec',weight:1.4,fillColor:color,fillOpacity:.92,opacity:1});
        marker.bindTooltip(`<strong>${city.name}</strong><span>${city.hazards}<br>ThinkHazard! · update 2026 · hoogste klasse: ${city.highest}</span>`,{sticky:true,direction:'top',opacity:.98,className:'atlas-area-tooltip'});
        prioritizeFeatureHover(marker);
        marker.on('click',()=>showDetail({title:city.name,subtitle:'ThinkHazard! · stedelijk of bestuurlijk gebied',facts:{'Klimaatgevaren':city.hazards,'Hoogste klasse':city.highest,'Bron':`<a href="${city.url}" target="_blank" rel="noopener">Open het ThinkHazard!-rapport</a>`,'Duiding':'De klasse beschrijft gevaar. Blootstelling en aanpassingsvermogen bepalen mede het uiteindelijke risico.'}}));
        marker.addTo(group);
      });
    });
    return group;
  }

  function tradeLayer() {
    const group=L.layerGroup();
    tradeRoutes.forEach(route=>{
      worldOffsets.forEach(offset=>{
        const line=L.polyline(route.points.map(point=>[point[0],point[1]+offset]),{pane:'linePane',color:'#1c5f66',weight:3,opacity:.8,dashArray:'7 7'})
          .bindTooltip(`<strong>${route.name}</strong><span>Schematische vaarcorridor langs zee en belangrijke doorgangen</span>`,{sticky:true,direction:'top',className:'atlas-area-tooltip'});
        prioritizeFeatureHover(line);
        line.addTo(group);
      });
    });
    chokepoints.forEach(point=>{
      worldOffsets.forEach(offset=>{
        const marker=L.circleMarker([point[0],point[1]+offset],{pane:'pointPane',radius:5,color:'#f0a51f',fillColor:'#f0a51f',fillOpacity:1,weight:2})
          .bindTooltip(`<strong>${point[2]}</strong><span>Strategisch maritiem knelpunt</span>`,{sticky:true,direction:'top',className:'atlas-area-tooltip'})
          .on('click',()=>showDetail({title:point[2],subtitle:'Maritiem chokepoint',facts:{'Waarom relevant':'Veel internationale handelsstromen passeren een smalle doorgang.'}}));
        prioritizeFeatureHover(marker);
        marker.addTo(group);
      });
    });
    return group;
  }

  const climateChartPopup=L.popup({
    className:'atlas-climate-popup',maxWidth:420,minWidth:280,autoPanPadding:[36,72],closeButton:true
  });
  const climateChartButton=document.getElementById('climate-chart-tool');
  let climateChartMode=false;
  let climateChartRequest=0;

  function setClimateChartMode(enabled) {
    climateChartMode=enabled;
    climateChartButton.setAttribute('aria-pressed',String(enabled));
    root.classList.toggle('is-climate-chart-mode',enabled);
    showToast(enabled?'Klik op een locatie voor de klimaatgrafiek.':'Klimaatgrafiektool uitgeschakeld.');
  }

  function climateClassAt(latlng) {
    if (!climateLookupReady) return null;
    const lat=Math.max(-85.05112878,Math.min(85.05112878,latlng.lat));
    const lng=((latlng.lng+180)%360+360)%360-180;
    const x=Math.max(0,Math.min(climateLookup.width-1,Math.floor((lng+180)/360*climateLookup.width)));
    const sin=Math.sin(lat*Math.PI/180);
    const mercatorY=.5-Math.log((1+sin)/(1-sin))/(4*Math.PI);
    const y=Math.max(0,Math.min(climateLookup.height-1,Math.floor(mercatorY*climateLookup.height)));
    const pixel=climateLookupContext.getImageData(x,y,1,1).data;
    if (pixel[3]<20) return null;
    let nearest=climateClasses[0],nearestDistance=Infinity;
    for (const candidate of climateClasses) {
      const distance=(pixel[0]-candidate.rgb[0])**2+(pixel[1]-candidate.rgb[1])**2+(pixel[2]-candidate.rgb[2])**2;
      if (distance<nearestDistance) { nearestDistance=distance; nearest=candidate; }
    }
    return nearest;
  }

  function climateChartHTML(payload,latlng) {
    const monthKeys=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const monthLabels=['J','F','M','A','M','J','J','A','S','O','N','D'];
    const monthDays=[31,28.25,31,30,31,30,31,31,30,31,30,31];
    const parameters=payload.properties?.parameter||{};
    const temperatures=monthKeys.map(key=>Number(parameters.T2M?.[key]));
    const precipitationUnit=String(payload.parameters?.PRECTOTCORR?.units||'').toLowerCase();
    const precipitation=monthKeys.map((key,index)=>{
      const value=Number(parameters.PRECTOTCORR?.[key]);
      return precipitationUnit.includes('/day')?value*monthDays[index]:value;
    });
    if ([...temperatures,...precipitation].some(value=>!Number.isFinite(value)||value<-900)) {
      throw new Error('Geen volledige klimaatreeks beschikbaar');
    }

    const annualTemperature=temperatures.reduce((sum,value)=>sum+value,0)/12;
    const annualPrecipitation=precipitation.reduce((sum,value)=>sum+value,0);
    const minTemperature=Math.min(0,Math.floor(Math.min(...temperatures)/5)*5);
    const maxTemperature=Math.max(5,Math.ceil(Math.max(...temperatures)/5)*5);
    const maxPrecipitation=Math.max(50,Math.ceil(Math.max(...precipitation)/50)*50);
    const climate=climateClassAt(latlng);
    const width=380,height=166,left=38,right=342,top=14,bottom=122;
    const plotWidth=right-left,plotHeight=bottom-top,step=plotWidth/12;
    const temperatureY=value=>bottom-(value-minTemperature)/(maxTemperature-minTemperature)*plotHeight;
    const precipitationY=value=>bottom-value/maxPrecipitation*plotHeight;

    let grid='';
    for (let tick=0;tick<=4;tick++) {
      const y=bottom-tick*plotHeight/4;
      const temperatureValue=minTemperature+tick*(maxTemperature-minTemperature)/4;
      const precipitationValue=tick*maxPrecipitation/4;
      grid+=`<line class="grid" x1="${left}" y1="${y.toFixed(1)}" x2="${right}" y2="${y.toFixed(1)}"></line>`;
      grid+=`<text x="${left-5}" y="${(y+3).toFixed(1)}" text-anchor="end">${temperatureValue.toFixed(0)}</text>`;
      grid+=`<text x="${right+5}" y="${(y+3).toFixed(1)}">${precipitationValue.toFixed(0)}</text>`;
    }
    const bars=precipitation.map((value,index)=>{
      const x=left+index*step+3,y=precipitationY(value);
      return `<rect class="rain" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(step-6).toFixed(1)}" height="${(bottom-y).toFixed(1)}"><title>${monthKeys[index]}: ${value.toFixed(0)} mm</title></rect>`;
    }).join('');
    const linePoints=temperatures.map((value,index)=>`${(left+(index+.5)*step).toFixed(1)},${temperatureY(value).toFixed(1)}`).join(' ');
    const points=temperatures.map((value,index)=>{
      const x=left+(index+.5)*step,y=temperatureY(value);
      return `<circle class="temp-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"><title>${monthKeys[index]}: ${value.toFixed(1)} °C</title></circle>`;
    }).join('');
    const months=monthLabels.map((label,index)=>`<text x="${(left+(index+.5)*step).toFixed(1)}" y="143" text-anchor="middle">${label}</text>`).join('');
    const latText=`${Math.abs(latlng.lat).toFixed(2)}° ${latlng.lat>=0?'N':'Z'}`;
    const lngText=`${Math.abs(latlng.lng).toFixed(2)}° ${latlng.lng>=0?'O':'W'}`;
    return `<section class="atlas-climate-card">
      <header><div><h3>Klimaatgrafiek</h3><p>${latText} · ${lngText} · normaalperiode 1991–2020</p></div></header>
      <div class="atlas-climate-metrics"><span><strong>${annualTemperature.toFixed(1)} °C</strong> jaargemiddelde</span><span><strong>${Math.round(annualPrecipitation)} mm</strong> per jaar</span>${climate?`<span><strong>${climate.code}</strong> ${climate.name}</span>`:''}</div>
      <svg class="atlas-climate-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Klimaatgrafiek met maandtemperatuur in graden Celsius en maandneerslag in millimeter">
        <title>Klimaatgrafiek voor ${latText}, ${lngText}</title><desc>De lijn toont de gemiddelde maandtemperatuur in graden Celsius. De kolommen tonen de maandneerslag in millimeter.</desc>
        ${grid}<line class="axis" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"></line>
        <text x="${left}" y="10">°C</text><text x="${right}" y="10" text-anchor="end">mm</text>
        ${bars}<polyline class="temp-line" points="${linePoints}"></polyline>${points}${months}
      </svg>
      <div class="atlas-climate-legend"><span><i class="temp-key"></i>gemiddelde temperatuur (°C)</span><span><i class="rain-key"></i>neerslag (mm)</span></div>
      <p>Bron: NASA POWER, MERRA-2 klimaatnormalen. Waarden zijn model- en rastergegevens voor de gekozen locatie.</p>
    </section>`;
  }

  async function loadClimateChart(latlng) {
    const request=++climateChartRequest;
    climateChartPopup
      .setLatLng(latlng)
      .setContent('<section class="atlas-climate-card atlas-climate-loading"><div><strong>Klimaatgegevens laden…</strong><p>NASA POWER · 1991–2020</p></div></section>')
      .openOn(map);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),25000);
    const url=new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
    url.search=new URLSearchParams({
      parameters:'T2M,PRECTOTCORR',community:'AG',
      longitude:latlng.lng.toFixed(4),latitude:latlng.lat.toFixed(4),
      format:'JSON',start:'1991',end:'2020'
    });
    try {
      const response=await fetch(url,{signal:controller.signal});
      if (!response.ok) throw new Error(`NASA POWER gaf status ${response.status}`);
      const payload=await response.json();
      if (request!==climateChartRequest) return;
      climateChartPopup.setContent(climateChartHTML(payload,latlng));
      map.closePopup(climateChartPopup);
      climateChartPopup.openOn(map);
    } catch (error) {
      if (request!==climateChartRequest) return;
      climateChartPopup.setContent(`<section class="atlas-climate-card atlas-climate-loading"><div><strong class="atlas-climate-error">Geen klimaatgrafiek beschikbaar</strong><p>Controleer de internetverbinding en klik opnieuw op de kaart.</p></div></section>`);
      climateChartPopup.update();
    } finally {
      clearTimeout(timeout);
    }
  }

  function incomeColor(v) {
    if (v == null) return cssColor('color-mix(in srgb, var(--muted) 70%, transparent)');
    if (v < 1200) return '#f2d9bd'; if (v < 4500) return '#e6aa74'; if (v < 14000) return '#c76d49'; if (v < 40000) return '#873c38'; return '#401f2b';
  }

  const formatLongitude = value => value===0 ? '0°' : `${Math.abs(value)}° ${value<0?'W':'O'}`;
  const formatLatitude = value => value===0 ? '0°' : `${Math.abs(value)}° ${value<0?'Z':'N'}`;
  const formatPopulation = value => value>=1000 ? `${(value/1000).toFixed(2).replace('.',',')} miljard` : `${value.toFixed(value<10?1:0).replace('.',',')} miljoen`;
  let populationMarginalsFrame = 0;

  function drawPopulationMarginals() {
    populationMarginalsFrame = 0;
    if (populationMarginalsNode.hidden) return;
    const size = map.getSize(), width = size.x, height = size.y;
    if (!width || !height) return;
    const longitudeBase = height-24;
    const longitudeMaxHeight = Math.min(176,Math.max(108,height*.26));
    const latitudeBase = 42;
    const latitudeMaxWidth = Math.min(172,Math.max(108,width*.17));
    const longitudeMax = Math.max(...populationLongitude1);
    const latitudeMax = Math.max(...populationLatitude1);
    let longitudeBars = '', longitudeTicks = '';

    for (const shift of [-360,0,360]) {
      populationLongitude1.forEach((population,index)=>{
        const west=-180+index+shift, east=west+1;
        const xWest=map.latLngToContainerPoint([0,west]).x;
        const xEast=map.latLngToContainerPoint([0,east]).x;
        const x=Math.min(xWest,xEast)+.15, barWidth=Math.max(.7,Math.abs(xEast-xWest)-.3);
        if (x>width || x+barWidth<0 || population<=0) return;
        const barHeight=Math.max(1,population/longitudeMax*longitudeMaxHeight);
        const originalWest=-180+index, originalEast=originalWest+1;
        longitudeBars += `<rect class="atlas-population-bar" x="${x.toFixed(1)}" y="${(longitudeBase-barHeight).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" data-axis="Lengtegraad" data-range="${formatLongitude(originalWest)}–${formatLongitude(originalEast)}" data-population="${population}"></rect>`;
      });
      for (let longitude=-180;longitude<=180;longitude+=60) {
        const x=map.latLngToContainerPoint([0,longitude+shift]).x;
        if (x<0 || x>width) continue;
        longitudeTicks += `<line class="atlas-population-tick" x1="${x.toFixed(1)}" y1="${longitudeBase}" x2="${x.toFixed(1)}" y2="${longitudeBase+4}"></line><text class="atlas-population-axis-label" x="${x.toFixed(1)}" y="${longitudeBase+14}" text-anchor="middle">${formatLongitude(longitude===180?-180:longitude)}</text>`;
      }
    }
    populationLongitudeSvg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    populationLongitudeSvg.innerHTML = `<title>Wereldbevolking per lengtegraad</title><desc>Elke staaf benadert het aantal inwoners in een strook van één lengtegraad in 2020.</desc><line class="atlas-population-axis" x1="0" y1="${longitudeBase}" x2="${width}" y2="${longitudeBase}"></line>${longitudeBars}${longitudeTicks}`;

    let latitudeBars = '', latitudeTicks = '';
    populationLatitude1.forEach((population,index)=>{
      const north=90-index, south=north-1;
      const yNorth=map.latLngToContainerPoint([Math.min(85.0511,north),0]).y;
      const ySouth=map.latLngToContainerPoint([Math.max(-85.0511,south),0]).y;
      const y=Math.min(yNorth,ySouth)+.15, barHeight=Math.max(.7,Math.abs(ySouth-yNorth)-.3);
      if (y>height || y+barHeight<0 || population<=0) return;
      const barWidth=Math.max(1,population/latitudeMax*latitudeMaxWidth);
      latitudeBars += `<rect class="atlas-population-bar" x="${latitudeBase}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" data-axis="Breedtegraad" data-range="${formatLatitude(south)}–${formatLatitude(north)}" data-population="${population}"></rect>`;
    });
    for (const latitude of [-60,-30,0,30,60]) {
      const y=map.latLngToContainerPoint([latitude,0]).y;
      if (y<0 || y>height) continue;
      latitudeTicks += `<line class="atlas-population-tick" x1="${latitudeBase}" y1="${y.toFixed(1)}" x2="${latitudeBase-4}" y2="${y.toFixed(1)}"></line><text class="atlas-population-axis-label" x="${latitudeBase-7}" y="${(y+3).toFixed(1)}" text-anchor="end">${formatLatitude(latitude)}</text>`;
    }
    populationLatitudeSvg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    populationLatitudeSvg.innerHTML = `<title>Wereldbevolking per breedtegraad</title><desc>Elke staaf benadert het aantal inwoners in een strook van één breedtegraad in 2020. De verticale as staat links.</desc><line class="atlas-population-axis" x1="${latitudeBase}" y1="0" x2="${latitudeBase}" y2="${height}"></line>${latitudeBars}${latitudeTicks}`;
  }

  function schedulePopulationMarginals() {
    if (!populationMarginalsFrame) populationMarginalsFrame=requestAnimationFrame(drawPopulationMarginals);
  }

  populationMarginalsNode.addEventListener('pointermove',event=>{
    const bar=event.target.closest?.('.atlas-population-bar');
    if (!bar) { populationStripTooltip.hidden=true; return; }
    populationStripTooltip.innerHTML=`<strong>${bar.dataset.axis}: ${bar.dataset.range}</strong><span>ca. ${formatPopulation(Number(bar.dataset.population))} inwoners · 2020</span>`;
    populationStripTooltip.hidden=false;
    const mapBounds=mapNode.getBoundingClientRect();
    const tooltipWidth=populationStripTooltip.offsetWidth, tooltipHeight=populationStripTooltip.offsetHeight;
    populationStripTooltip.style.left=`${Math.max(8,Math.min(mapBounds.width-tooltipWidth-8,event.clientX-mapBounds.left+12))}px`;
    populationStripTooltip.style.top=`${Math.max(8,Math.min(mapBounds.height-tooltipHeight-8,event.clientY-mapBounds.top-tooltipHeight-10))}px`;
  });
  populationMarginalsNode.addEventListener('pointerleave',()=>populationStripTooltip.hidden=true);

  const PopulationMarginalsLayer = L.Layer.extend({
    onAdd(layerMap) {
      populationMarginalsNode.hidden=false;
      root.classList.add('is-population-marginals');
      layerMap.on('move zoom resize',schedulePopulationMarginals);
      schedulePopulationMarginals();
    },
    onRemove(layerMap) {
      layerMap.off('move zoom resize',schedulePopulationMarginals);
      populationMarginalsNode.hidden=true;
      populationStripTooltip.hidden=true;
      root.classList.remove('is-population-marginals');
    },
    setOpacity(value) {
      populationMarginalsNode.style.opacity=value;
      return this;
    }
  });

  function populationMarginalsLayer() { return new PopulationMarginalsLayer(); }

  // Ingebouwde lagen: code en data zitten in de atlas; titel, bron en categorie komen uit de database.
  const builtin = {
    'climate-main': { legend: legend.climateMain, factory: climateMainLayer },
    'koppen-detail': { legend: legend.koppen, factory: () => worldImageLayer(koppenDetailUrl, { pane: 'climatePane', opacity: 1, interactive: false }) },
    'population-density': { legend: populationDensityClasses.map((c) => [c.color, c.label]), factory: populationDensityLayer },
    'population-marginals': { legend: [['#2c79c7', 'inwoners per strook van 1° (benadering)']], factory: populationMarginalsLayer },
    'income': { legend: [['#f2d9bd', '< $1.200'], ['#e6aa74', '$1.200–4.500'], ['#c76d49', '$4.500–14.000'], ['#873c38', '$14.000–40.000'], ['#401f2b', '> $40.000']], factory: incomeLayer },
    'megacities': { legend: [['#171717', 'stedelijke agglomeratie > 10 miljoen']], factory: () => circleLayer(megacities, { color: '#171717', stroke: '#f5f7f2', radius: (r) => Math.max(5, Math.sqrt(r[3]) * 1.45), tooltip: (r) => `<strong>${r[2]}</strong><span>${r[4]} · ${r[3].toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} miljoen inwoners<br>VN-schatting 2025 · plausibiliteit ${r[5]}</span>`, detail: (r) => ({ title: r[2], subtitle: `${r[4]} · stedelijke agglomeratie`, facts: { 'Bevolking 2025': `${r[3].toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} miljoen`, 'Selectie': 'meer dan 10 miljoen inwoners', 'Plausibiliteitsklasse VN': r[5], 'Bron': 'World Urbanization Prospects 2025' } }) }) },
    'ethnolinguistic': { legend: [['#6f5c91', 'historisch etnolinguïstisch vlak']], factory: ethnolinguisticAreaLayer },
    'conflicts': { legend: [['#e8462f', 'omhullend gebied van geregistreerde gebeurtenissen']], factory: conflictAreaLayer },
    'trade': { legend: [['#1c5f66', 'schematische vaarcorridor'], ['#f0a51f', 'chokepoint']], factory: tradeLayer },
    'elevation-depth': { gradient: 'linear-gradient(90deg,#041248,#114e97,#6fbfda,#247e4d,#beba44,#e8a637,#dc5b2d,#4d0c1b)', gradientLabels: ['diepste oceaan', 'hoogste gebergte'], factory: () => worldImageLayer(elevationDataUrl, { pane: 'rasterPane', opacity: 1, interactive: false }) },
    'hillshade': { gradient: 'linear-gradient(90deg,#eee7dc,#a79a87,#403b35)', gradientLabels: ['laag/vlak', 'hoog/steil'], factory: () => L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', { pane: 'rasterPane', opacity: 1, maxZoom: 16, attribution: 'Hillshade &copy; Esri' }) },
    'volcanoes': { legend: [...volcanoTypes.map((t) => [t.color, t.nl]), [volcanoOther.color, volcanoOther.nl]], factory: volcanoLayer },
    'earthquakes-24h': { legend: [...quakeDepths.map((d) => [d.color, d.label]), ['transparent', 'grotere cirkel = zwaardere beving']], factory: earthquakeLayer },
    'plate-boundaries': { legend: [['#d1493f', 'convergent →←'], ['#247b70', 'divergent ←→'], ['#6c4fa1', 'transform ⇄']], factory: plateBoundaryLayer },
    'climate-risk': { legend: [['#c94a28', 'hoogste gevarenklasse: hoog'], ['#d98a24', 'hoogste gevarenklasse: middel'], ['#d5b744', 'hoogste gevarenklasse: laag']], factory: climateRiskCityLayer }
  };

  const groupIds = new Set(groups.map((g) => g.id));
  const catalog = (CFG.layers || []).map((l) => {
    const b = l.kind === 'ingebouwd' ? builtin[l.key] : null;
    if (l.kind === 'ingebouwd' && !b) return null;
    const item = {
      id: 'laag-' + l.id, dbId: l.id, key: l.key || '', kind: l.kind,
      group: groupIds.has(l.group) && l.group !== 'custom' ? l.group : 'overig',
      title: l.title, subtitle: l.subtitle || '', color: l.color || '#2f7f77', opacity: Number(l.opacity) || .8,
      defaultOn: !!l.defaultOn, source: l.source || '', year: l.year || '', note: l.note || '',
      url: l.url || '', labelField: l.labelField || '',
      legend: b?.legend || [[l.color || '#2f7f77', l.title]], gradient: b?.gradient, gradientLabels: b?.gradientLabels
    };
    item.factory = b ? () => b.factory(item) : () => genericLayer(item);
    return item;
  }).filter(Boolean);
  const isKeyActive = (key) => catalog.some((item) => item.key === key && active.has(item.id));

  // Toegevoegde lagen: GeoJSON (bestand of link), ArcGIS Feature Service of tegelkaart.
  const skipFields = /^(objectid|fid|shape|shape_.*|globalid|ogc_fid)$/i;
  function labelOf(p, field) {
    if (field && p[field] != null && p[field] !== '') return String(p[field]);
    for (const k of ['name', 'naam', 'NAME', 'Name', 'title', 'titel', 'NAAM', 'label']) if (typeof p[k] === 'string' && p[k]) return p[k];
    const first = Object.entries(p).find(([k, v]) => typeof v === 'string' && v && !skipFields.test(k));
    return first ? first[1] : '';
  }
  function factsOf(p) {
    const out = {};
    Object.entries(p).filter(([k, v]) => v != null && v !== '' && typeof v !== 'object' && !skipFields.test(k)).slice(0, 12).forEach(([k, v]) => {
      out[esc(k)] = typeof v === 'number' ? v.toLocaleString('nl-NL') : esc(String(v).slice(0, 200));
    });
    return out;
  }
  function genericLayer(item) {
    if (item.kind === 'tegels') {
      let url = item.url.replace(/\/$/, '');
      if (/\/(MapServer|ImageServer)$/i.test(url)) url += '/tile/{z}/{y}/{x}';
      return L.tileLayer(url, { pane: 'rasterPane', maxZoom: 18, attribution: esc(item.source) });
    }
    const group = L.layerGroup();
    let url = item.url;
    if (item.kind === 'arcgis') {
      url = url.replace(/\/$/, '');
      if (!/\/query$/i.test(url)) url += '/query';
      url += (url.includes('?') ? '&' : '?') + 'where=1%3D1&outFields=*&outSR=4326&f=geojson';
    }
    fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((data) => {
      if (data.error || !data.type) throw new Error('geen GeoJSON');
      const color = item.color;
      const geo = geoJsonWorldLayer(data, {
        pane: 'surfacePane',
        style: { pane: 'surfacePane', color, weight: 1.4, opacity: .9, fillColor: color, fillOpacity: .45 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { pane: 'pointPane', radius: 5, color: '#ffffff', weight: 1, fillColor: color, fillOpacity: .88 }),
        onEachFeature: (f, layer) => {
          const p = f.properties || {};
          const label = labelOf(p, item.labelField) || item.title;
          layer.bindTooltip(`<strong>${esc(label)}</strong><span>${esc(item.title)}${item.year ? ' · ' + esc(item.year) : ''}</span>`, { sticky: true, direction: 'top', opacity: .97, className: 'atlas-area-tooltip' });
          prioritizeFeatureHover(layer);
          layer.on('click', () => showDetail({ title: esc(label), subtitle: esc([item.source, item.year].filter(Boolean).join(' · ')), facts: factsOf(p) }));
        }
      });
      geo.addTo(group);
      applyOpacity(geo, opacityState.get(item.id) ?? item.opacity);
    }).catch(() => showToast(`De laag “${item.title}” kon niet worden geladen.`));
    return group;
  }

  const active = new Map();
  const opacityState = new Map(catalog.map(x=>[x.id,x.opacity]));

  function showDetail(data) {
    const facts = Object.entries(data.facts||{}).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
    detailContent.innerHTML = `<h3>${data.title}</h3><p>${data.subtitle||''}</p>${facts?`<dl>${facts}</dl>`:''}`;
    detailPanel.hidden = false;
  }

  function showToast(message) {
    const toast = document.getElementById('atlas-toast');
    toast.textContent = message; toast.hidden = false;
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>toast.hidden=true,2600);
  }

  function applyOpacity(layer, value) {
    if (!layer) return;
    if (typeof layer.setOpacity === 'function') {
      layer.setOpacity(value);
      if (layer._managesOpacity) return;
    } else if (typeof layer.setStyle === 'function') {
      layer.setStyle({opacity:Math.min(1,value+.12),fillOpacity:value*.82});
    }
    if (typeof layer.eachLayer === 'function') layer.eachLayer(child=>applyOpacity(child,value));
  }

  function setLayer(item, enabled) {
    if (enabled && !active.has(item.id)) {
      const layer = item.factory();
      active.set(item.id, layer);
      layer.addTo(map);
      applyOpacity(layer, opacityState.get(item.id) ?? item.opacity);
    } else if (!enabled && active.has(item.id)) {
      map.removeLayer(active.get(item.id)); active.delete(item.id);
    }
    updateUI();
  }

  function legendHTML(item) {
    if (item.gradient) return `<div class="atlas-legend-section"><strong>${esc(item.title)}</strong><div class="atlas-gradient" style="--gradient:${item.gradient}"></div><div class="atlas-gradient-labels"><span>${item.gradientLabels[0]}</span><span>${item.gradientLabels[1]}</span></div></div>`;
    const items = (item.legend||[[item.color,item.title]]).map(([color,label])=>`<span class="atlas-legend-item">${color==='transparent'?'':`<i class="atlas-swatch" style="--swatch:${color}"></i>`}${esc(label)}</span>`).join('');
    return `<div class="atlas-legend-section"><strong>${esc(item.title)}</strong><div class="atlas-legend-items">${items}</div></div>`;
  }

  function updateUI() {
    document.getElementById('active-count').textContent = active.size;
    document.getElementById('legend-count').textContent = active.size;
    legendNode.innerHTML = catalog.filter(item=>active.has(item.id)).map(legendHTML).join('') || '<div class="atlas-legend-section"><span class="atlas-legend-item">Zet een themalaag aan om de legenda te zien.</span></div>';
    catalogNode.querySelectorAll('[data-layer-id]').forEach(row=>{
      const id=row.dataset.layerId,on=active.has(id); row.querySelector('input[type=checkbox]').checked=on; row.querySelector('.atlas-opacity').hidden=!on;
    });
  }

  function renderCatalog() {
    const collapsed = new Set([...catalogNode.querySelectorAll('.is-collapsed')].map(el=>el.dataset.group));
    catalogNode.innerHTML = groups.map(group=>{
      const items = catalog.filter(x=>x.group===group.id);
      if (!items.length) return '';
      return `<section class="atlas-layer-group ${collapsed.has(group.id)?'is-collapsed':''}" data-group="${group.id}">
        <button class="atlas-group-toggle" type="button" aria-expanded="${collapsed.has(group.id)?'false':'true'}"><i data-lucide="${group.icon}" aria-hidden="true"></i><strong>${esc(group.title)}</strong><small>${items.length}</small><i data-lucide="chevron-down" aria-hidden="true"></i></button>
        <div class="atlas-group-body">${items.map(item=>`<div class="atlas-layer-row" data-layer-id="${item.id}">
          <label class="atlas-layer-main"><input type="checkbox" ${active.has(item.id)?'checked':''}><i class="atlas-layer-dot" style="--layer-color:${item.color}"></i><span class="atlas-layer-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small>${item.source||item.year?`<small class="atlas-layer-meta">${esc([item.source,item.year].filter(Boolean).join(' · '))}</small>`:''}</span><button class="atlas-layer-info" type="button" aria-label="Meer over ${esc(item.title)}" data-tooltip="${esc(item.subtitle)}"><i data-lucide="circle-help" aria-hidden="true"></i></button></label>
          <div class="atlas-opacity" ${active.has(item.id)?'':'hidden'}><label for="opacity-${item.id}">Dekking</label><input id="opacity-${item.id}" type="range" min="0" max="100" value="${Math.round((opacityState.get(item.id)??item.opacity)*100)}"><output>${Math.round((opacityState.get(item.id)??item.opacity)*100)}%</output></div>
        </div>`).join('')}</div></section>`;
    }).join('');
    catalogNode.querySelectorAll('.atlas-group-toggle').forEach(btn=>btn.addEventListener('click',()=>{const section=btn.closest('.atlas-layer-group');section.classList.toggle('is-collapsed');btn.setAttribute('aria-expanded',String(!section.classList.contains('is-collapsed')));}));
    catalogNode.querySelectorAll('.atlas-layer-row').forEach(row=>{
      const item=catalog.find(x=>x.id===row.dataset.layerId);
      row.querySelector('input[type=checkbox]').addEventListener('change',e=>setLayer(item,e.target.checked));
      row.querySelector('.atlas-layer-info').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const facts={'Categorie':esc(groups.find(g=>g.id===item.group)?.title||'Eigen data'),'Bron':esc(item.source||'Zie bronnen en toelichting')};if(item.year)facts['Jaartal']=esc(item.year);if(item.note)facts['Toelichting']=esc(item.note);showDetail({title:esc(item.title),subtitle:esc(item.subtitle),facts});});
      const range=row.querySelector('input[type=range]');
      range.addEventListener('input',e=>{const value=Number(e.target.value)/100;opacityState.set(item.id,value);row.querySelector('output').textContent=`${e.target.value}%`;applyOpacity(active.get(item.id),value);});
    });
    renderIcons(catalogNode);
    applySearch();
    updateUI();
  }

  // Zoeken in de lagen: titel, omschrijving, bron, jaartal, toelichting en categorie.
  const searchInput = document.getElementById('atlas-layer-search');
  const searchEmpty = document.getElementById('atlas-search-empty');
  const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function applySearch() {
    const words = norm(searchInput?.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    catalogNode.querySelectorAll('.atlas-layer-group').forEach((section) => {
      let inGroup = 0;
      const groupTitle = groups.find((g) => g.id === section.dataset.group)?.title || '';
      section.querySelectorAll('.atlas-layer-row').forEach((row) => {
        const item = catalog.find((x) => x.id === row.dataset.layerId);
        const hay = norm([item?.title, item?.subtitle, item?.source, item?.year, item?.note, groupTitle].join(' '));
        const hit = words.every((w) => hay.includes(w));
        row.hidden = !hit;
        if (hit) inGroup++;
      });
      section.hidden = !inGroup;
      if (words.length) section.classList.remove('is-collapsed');
      shown += inGroup;
    });
    if (searchEmpty) searchEmpty.hidden = shown > 0 || !words.length;
  }
  searchInput?.addEventListener('input', applySearch);

  document.querySelectorAll('input[name=basemap]').forEach(radio=>radio.addEventListener('change',e=>{
    map.removeLayer(currentBase);
    currentBase=baseMaps[e.target.value];
    currentBase.addTo(map);
    if (currentBase.bringToBack) currentBase.bringToBack();
    const atlasMode = e.target.value === 'light';
    contextLayer.setStyle(contextStyle(atlasMode));
  }));
  document.getElementById('reset-view').addEventListener('click',()=>map.setView([18,0],2));
  document.getElementById('pacific-view').addEventListener('click',()=>map.setView([18,180],2));
  document.getElementById('clear-layers').addEventListener('click',()=>{[...active.keys()].forEach(id=>setLayer(catalog.find(x=>x.id===id),false));});
  climateChartButton.addEventListener('click',()=>setClimateChartMode(!climateChartMode));
  document.getElementById('toggle-legend').addEventListener('click',e=>{const panel=document.getElementById('legend-panel');panel.hidden=!panel.hidden;e.currentTarget.setAttribute('aria-expanded',String(!panel.hidden));});
  document.getElementById('close-legend').addEventListener('click',()=>{document.getElementById('legend-panel').hidden=true;document.getElementById('toggle-legend').setAttribute('aria-expanded','false');});
  document.getElementById('close-detail').addEventListener('click',()=>detailPanel.hidden=true);
  document.getElementById('open-sources').addEventListener('click',()=>document.getElementById('sources-dialog').showModal());
  root.querySelector('.atlas-close').addEventListener('click',()=>root.classList.remove('is-sidebar-open'));
  root.querySelector('.atlas-menu').addEventListener('click',()=>root.classList.add('is-sidebar-open'));

  document.getElementById('geojson-upload').addEventListener('change',event=>{
    const file=event.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try {
        const data=JSON.parse(reader.result);
        const id=`custom-${Date.now()}`;
        const layer=L.geoJSON(data,{pane:'surfacePane',style:{color:'#2f7f77',weight:1.5,fillColor:'#2f7f77',fillOpacity:.45},pointToLayer:(f,latlng)=>L.circleMarker(latlng,{pane:'pointPane',radius:6,color:'#2f7f77',fillColor:'#2f7f77',fillOpacity:.8}),onEachFeature:(f,l)=>{const label=f.properties?.name||f.properties?.naam||file.name;l.bindTooltip(`<strong>${label}</strong>`);}});
        catalog.push({id,group:'custom',title:file.name.replace(/\.(geo)?json$/i,''),subtitle:'lokale GeoJSON-laag',color:'#2f7f77',opacity:.75,legend:[['#2f7f77','eigen data']],source:'Lokaal bestand',factory:()=>layer});
        opacityState.set(id,.75); renderCatalog(); setLayer(catalog.at(-1),true); map.fitBounds(layer.getBounds(),{padding:[30,30],maxZoom:6}); showToast(`${file.name} is toegevoegd`);
      } catch(error) { showToast('Dit bestand kon niet als GeoJSON worden gelezen.'); }
      event.target.value='';
    };
    reader.readAsText(file);
  });

  map.on('mousemove',e=>{
    const ns=e.latlng.lat>=0?'N':'Z',ew=e.latlng.lng>=0?'O':'W';
    document.getElementById('mouse-coords').textContent=`${Math.abs(e.latlng.lat).toFixed(1)}° ${ns} · ${Math.abs(e.latlng.lng).toFixed(1)}° ${ew}`;
    const overVector = e.originalEvent?.target?.closest?.('.leaflet-interactive');
    const climateOn = isKeyActive('climate-main') || isKeyActive('koppen-detail');
    if (!climateLookupReady || !climateOn || overVector || hoveredMapFeatures.size) {
      if (map.hasLayer(climateHover)) map.closeTooltip(climateHover);
      return;
    }
    const lat = Math.max(-85.05112878,Math.min(85.05112878,e.latlng.lat));
    const lng = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
    const x = Math.max(0,Math.min(climateLookup.width-1,Math.floor((lng+180)/360*climateLookup.width)));
    const sin = Math.sin(lat*Math.PI/180);
    const mercatorY = .5-Math.log((1+sin)/(1-sin))/(4*Math.PI);
    const y = Math.max(0,Math.min(climateLookup.height-1,Math.floor(mercatorY*climateLookup.height)));
    const pixel = climateLookupContext.getImageData(x,y,1,1).data;
    if (pixel[3] < 20) {
      if (map.hasLayer(climateHover)) map.closeTooltip(climateHover);
      return;
    }
    let nearest = climateClasses[0], nearestDistance = Infinity;
    for (const candidate of climateClasses) {
      const distance = (pixel[0]-candidate.rgb[0])**2+(pixel[1]-candidate.rgb[1])**2+(pixel[2]-candidate.rgb[2])**2;
      if (distance < nearestDistance) { nearestDistance=distance; nearest=candidate; }
    }
    const detailed = isKeyActive('koppen-detail');
    climateHover
      .setLatLng(e.latlng)
      .setContent(detailed
        ? `<strong>${nearest.code}</strong><br>${nearest.name}`
        : `<strong>${nearest.group}</strong><br>${nearest.code} · ${nearest.name}`)
      .openOn(map);
  });
  map.on('mouseout',()=>{if(map.hasLayer(climateHover))map.closeTooltip(climateHover);});
  map.on('zoomend',()=>document.getElementById('zoom-readout').textContent=`zoom ${map.getZoom()}`);
  map.on('click',e=>{
    if (climateChartMode) {
      detailPanel.hidden=true;
      loadClimateChart(e.latlng);
      return;
    }
    if(e.originalEvent?.target===mapNode)detailPanel.hidden=true;
  });

  // Bronnen & toelichting: per laag uit de database.
  const sourcesList = document.getElementById('atlas-sources-list');
  if (sourcesList) sourcesList.innerHTML = catalog.map((item) => `<div><dt>${esc(item.title)}${item.year ? `<small>${esc(item.year)}</small>` : ''}</dt><dd>${esc(item.source || 'Bron niet opgegeven')}${item.note ? ` — ${esc(item.note)}` : ''}</dd></div>`).join('')
    + '<div><dt>Ondergrond</dt><dd>Lokale atlasweergave op basis van Natural Earth; Esri World Street Map; Esri World Imagery.</dd></div>'
    + '<div><dt>Klimaatgrafiek</dt><dd>NASA POWER maandelijkse klimaatnormalen 1991–2020 (MERRA-2).</dd></div>';

  if (CFG.manage) {
    const footer = root.querySelector('.atlas-sidebar-footer');
    footer?.insertAdjacentHTML('beforeend', `<a class="atlas-manage-link" href="${esc(CFG.manage)}"><i data-lucide="layers-3" aria-hidden="true"></i>Lagen beheren</a>`);
  }

  // Licht/donker van de site: kaartkleuren opnieuw zetten.
  new MutationObserver(() => {
    const mode = document.querySelector('input[name=basemap]:checked')?.value || 'light';
    contextLayer.setStyle(contextStyle(mode === 'light'));
    catalog.filter((item) => item.key === 'income' && active.has(item.id)).forEach((item) => { setLayer(item, false); setLayer(item, true); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  renderCatalog();
  catalog.filter(x=>x.defaultOn).forEach(item=>setLayer(item,true));
  setTimeout(()=>map.invalidateSize(),100);
  renderIcons(root);
})();
