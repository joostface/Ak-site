/* Aardrijkskundelokaal — kleine kaartbibliotheek voor de toepassingen in apps/.
   Zonder externe afhankelijkheden: TopoJSON/GeoJSON lezen, projecteren, als SVG tekenen,
   zoomen en verschuiven (muis, vinger, toetsenbord) en schermvullend.

   Gebruik in een toepassing:
     <link rel="stylesheet" href="../_gedeeld/kaart.css">
     <script src="../_gedeeld/geo.js"></script>
     const kaart = AKGeo.kaart(document.querySelector('#kaart'), { projectie: 'wereld' });
     kaart.laag('landen', features, { klasse: 'land', klik: (f) => ... });
*/
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const RAD = Math.PI / 180;

  /* ---------- thema: ?theme=light of de voorkeur die de website meegeeft ---------- */
  const q = new URLSearchParams(location.search);
  if (q.get('theme') === 'light') document.documentElement.dataset.theme = 'light';

  /* ---------- data ---------- */
  function topoNaarFeatures(topo, object) {
    const t = topo.transform;
    const arcs = topo.arcs.map((a) => {
      let x = 0, y = 0;
      return a.map((p) => {
        x += p[0]; y += p[1];
        return t ? [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]] : [p[0], p[1]];
      });
    });
    const ring = (ids) => {
      const pts = [];
      for (const i of ids) {
        const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
        pts.push(...(pts.length ? a.slice(1) : a));
      }
      return pts;
    };
    return topo.objects[object].geometries
      .filter((g) => g.type === 'Polygon' || g.type === 'MultiPolygon')
      .map((g) => ({
        type: 'Feature',
        id: g.id,
        properties: g.properties || {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: (g.type === 'Polygon' ? [g.arcs] : g.arcs).map((p) => p.map(ring))
        }
      }));
  }

  async function laad(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Kaartdata niet gevonden: ' + url);
    return r.json();
  }

  /* ---------- projecties ---------- */
  // Equal Earth (gelijk-oppervlak, geschikt voor wereldkaarten)
  const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
  function equalEarth(lon, lat) {
    const l = lon * RAD, th = Math.asin(M * Math.sin(lat * RAD));
    const t2 = th * th, t6 = t2 * t2 * t2;
    const x = (l * Math.cos(th)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
    const y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
    return [x * 100, -y * 100];
  }
  // Lokaal (kleine gebieden zoals Nederland): lengtegraden schalen met cos(breedte)
  function lokaal(midLat) {
    const k = Math.cos(midLat * RAD);
    return (lon, lat) => [lon * k * 100, -lat * 100];
  }

  /* ---------- tekenen ---------- */
  function padVan(geom, proj) {
    let d = '';
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    for (const poly of polys) {
      for (const ring0 of poly) {
        // Ringen die over de datumgrens (180°) lopen: westelijke punten 360° doorschuiven,
        // zodat er geen streep dwars over de kaart ontstaat.
        let ring = ring0;
        if (ring.some((pt, i) => i && Math.abs(pt[0] - ring[i - 1][0]) > 180)) ring = ring.map((pt) => (pt[0] < 0 ? [pt[0] + 360, pt[1]] : pt));
        ring.forEach((pt, i) => {
          const [x, y] = proj(pt[0], pt[1]);
          d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
        });
        d += 'Z';
      }
    }
    if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
      const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
      for (const line of lines) line.forEach((pt, i) => { const [x, y] = proj(pt[0], pt[1]); d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); });
    }
    return d;
  }

  /** Rechthoek (in kaarteenheden) rond een geografisch kader; bemonsterd omdat projecties krommen. */
  function omkader(proj, k) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= 24; i++) {
      for (let j = 0; j <= 24; j++) {
        const [x, y] = proj(k[0] + ((k[2] - k[0]) * i) / 24, k[1] + ((k[3] - k[1]) * j) / 24);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /**
   * Maak een interactieve kaart in een container.
   * opties: projectie ('wereld' | {lokaal: breedtegraad}), kader [minLon, minLat, maxLon, maxLat], label (toegankelijke naam)
   */
  function kaart(container, opties = {}) {
    const proj = opties.projectie && opties.projectie.lokaal ? lokaal(opties.projectie.lokaal) : equalEarth;
    container.classList.add('akg');
    const svg = el('svg', { class: 'akg-svg', role: 'img', 'aria-label': opties.label || 'Kaart', tabindex: '0' });
    const wereld = el('g', { class: 'akg-wereld' });
    svg.append(wereld);
    container.append(svg);

    // beginkader
    const start = omkader(proj, opties.kader || [-180, -60, 180, 85]);
    let vb = start.slice();
    const zet = () => svg.setAttribute('viewBox', vb.map((n) => n.toFixed(3)).join(' '));
    zet();
    const schaal = () => start[2] / vb[2];

    function zoom(factor, cx, cy) {
      const nieuw = Math.min(start[2], Math.max(start[2] / 40, vb[2] / factor));
      const f = nieuw / vb[2];
      if (cx == null) { cx = vb[0] + vb[2] / 2; cy = vb[1] + vb[3] / 2; }
      vb = [cx - (cx - vb[0]) * f, cy - (cy - vb[1]) * f, vb[2] * f, vb[3] * f];
      begrens(); zet();
      container.style.setProperty('--akg-zoom', schaal());
    }
    function begrens() {
      vb[0] = Math.min(start[0] + start[2] - vb[2], Math.max(start[0], vb[0]));
      vb[1] = Math.min(start[1] + start[3] - vb[3], Math.max(start[1], vb[1]));
    }
    function naarKaart(clientX, clientY) {
      const r = svg.getBoundingClientRect();
      // preserveAspectRatio xMidYMid meet: bereken de werkelijk getoonde schaal
      const s = Math.min(r.width / vb[2], r.height / vb[3]);
      const ox = (r.width - vb[2] * s) / 2, oy = (r.height - vb[3] * s) / 2;
      return [vb[0] + (clientX - r.left - ox) / s, vb[1] + (clientY - r.top - oy) / s, s];
    }

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [x, y] = naarKaart(e.clientX, e.clientY);
      zoom(e.deltaY < 0 ? 1.25 : 0.8, x, y);
    }, { passive: false });

    const punten = new Map();
    let vorige = null, knijp = null, versleept = 0;
    svg.addEventListener('pointerdown', (e) => { punten.set(e.pointerId, e); vorige = e; versleept = 0; });
    svg.addEventListener('pointermove', (e) => {
      if (!punten.has(e.pointerId)) return;
      punten.set(e.pointerId, e);
      if (punten.size === 2) {
        const [a, b] = [...punten.values()];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (knijp) { const [x, y] = naarKaart((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2); zoom(d / knijp, x, y); }
        knijp = d; versleept = 99; return;
      }
      const s = naarKaart(0, 0)[2];
      const dx = (e.clientX - vorige.clientX) / s, dy = (e.clientY - vorige.clientY) / s;
      versleept += Math.abs(e.clientX - vorige.clientX) + Math.abs(e.clientY - vorige.clientY);
      if (versleept > 4) { svg.setPointerCapture(e.pointerId); vb[0] -= dx; vb[1] -= dy; begrens(); zet(); container.classList.add('is-slepen'); }
      vorige = e;
    });
    const los = (e) => { punten.delete(e.pointerId); knijp = null; vorige = [...punten.values()][0] || null; container.classList.remove('is-slepen'); };
    svg.addEventListener('pointerup', los);
    svg.addEventListener('pointercancel', los);
    // een klik na slepen telt niet als klik op een land
    svg.addEventListener('click', (e) => { if (versleept > 4) { e.stopPropagation(); e.preventDefault(); } }, true);

    svg.addEventListener('keydown', (e) => {
      const stap = vb[2] / 10;
      const m = { ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, -stap], ArrowDown: [0, stap] }[e.key];
      if (m) { e.preventDefault(); vb[0] += m[0]; vb[1] += m[1]; begrens(); zet(); }
      if (e.key === '+' || e.key === '=') zoom(1.4);
      if (e.key === '-') zoom(1 / 1.4);
      if (e.key === '0') herstel();
    });

    function herstel() { vb = start.slice(); zet(); container.style.setProperty('--akg-zoom', 1); }

    // knoppen
    const balk = document.createElement('div');
    balk.className = 'akg-knoppen';
    const knop = (label, tekst, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.textContent = tekst; b.addEventListener('click', fn); balk.append(b); return b; };
    knop('Inzoomen', '+', () => zoom(1.5));
    knop('Uitzoomen', '−', () => zoom(1 / 1.5));
    knop('Hele kaart', '⤢', herstel);
    if (container.requestFullscreen) knop('Schermvullend', '⛶', () => (document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen()));
    container.append(balk);

    const lagen = {};
    return {
      svg, proj, zoom, herstel,
      /** Voeg een laag toe met features. opties: klasse, klik(feature, pad), titel(feature) */
      laag(naam, features, o = {}) {
        const g = el('g', { class: 'akg-laag ' + (o.klasse || ''), 'data-laag': naam });
        for (const f of features) {
          const p = el('path', { d: padVan(f.geometry, proj), 'vector-effect': 'non-scaling-stroke' });
          if (f.id != null) p.dataset.id = f.id;
          if (o.titel) { const t = el('title', {}); t.textContent = o.titel(f); p.append(t); }
          if (o.klik) {
            p.classList.add('akg-klikbaar');
            p.addEventListener('click', (e) => o.klik(f, p, e));
          }
          f._pad = p;
          g.append(p);
        }
        wereld.append(g);
        lagen[naam] = g;
        return g;
      },
      /** Punten (bijvoorbeeld steden). opties: klasse, klik(punt, element), straal */
      punten(naam, lijst, o = {}) {
        const g = el('g', { class: 'akg-laag akg-punten ' + (o.klasse || ''), 'data-laag': naam });
        for (const pt of lijst) {
          const [x, y] = proj(pt.lon, pt.lat);
          const groep = el('g', { class: 'akg-punt', transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` });
          const raak = el('circle', { r: o.raak || 9, class: 'akg-raak' });
          const c = el('circle', { r: o.straal || 3.2, class: 'akg-stip' });
          const label = el('text', { x: 7, y: 4, class: 'akg-label' });
          label.textContent = pt.naam;
          groep.append(raak, c, label);
          if (o.klik) {
            groep.classList.add('akg-klikbaar');
            groep.setAttribute('tabindex', '0');
            groep.setAttribute('role', 'button');
            groep.setAttribute('aria-label', o.toegankelijk ? o.toegankelijk(pt) : pt.naam);
            groep.addEventListener('click', () => o.klik(pt, groep));
            groep.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.klik(pt, groep); } });
          }
          pt._el = groep;
          g.append(groep);
        }
        wereld.append(g);
        lagen[naam] = g;
        return g;
      },
      lijnen(naam, features, o = {}) { return this.laag(naam, features, Object.assign({ klasse: 'akg-lijnen ' + (o.klasse || '') }, o)); },
      toon(naam, aan) { if (lagen[naam]) lagen[naam].style.display = aan ? '' : 'none'; },
      /** Zoom naar een kader [minLon, minLat, maxLon, maxLat] */
      naar(kader) {
        const [x, y, w, h] = omkader(proj, kader);
        const f = Math.min(1, Math.max(w / start[2], h / start[3]) * 1.1);
        vb = [x - (start[2] * f - w) / 2, y - (start[3] * f - h) / 2, start[2] * f, start[3] * f];
        begrens(); zet(); container.style.setProperty('--akg-zoom', schaal());
      }
    };
  }

  /** Graadnet en bijzondere breedtecirkels als lijnen. */
  function graadnet(stap = 30) {
    const lijnen = [];
    for (let lon = -180; lon <= 180; lon += stap) { const c = []; for (let lat = -90; lat <= 90; lat += 2) c.push([lon, lat]); lijnen.push({ type: 'Feature', properties: { soort: 'meridiaan' }, geometry: { type: 'LineString', coordinates: c } }); }
    for (let lat = -90 + stap; lat < 90; lat += stap) lijnen.push(breedtecirkel(lat, 'parallel'));
    return lijnen;
  }
  function breedtecirkel(lat, naam) {
    const c = [];
    for (let lon = -180; lon <= 180; lon += 2) c.push([lon, lat]);
    return { type: 'Feature', properties: { naam }, geometry: { type: 'LineString', coordinates: c } };
  }
  function omtrek() {
    const c = [];
    for (let lat = -90; lat <= 90; lat += 2) c.push([-180, lat]);
    for (let lat = 90; lat >= -90; lat -= 2) c.push([180, lat]);
    return [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [c] } }];
  }

  window.AKGeo = { kaart, laad, topoNaarFeatures, graadnet, breedtecirkel, omtrek, equalEarth, lokaal };
})();
