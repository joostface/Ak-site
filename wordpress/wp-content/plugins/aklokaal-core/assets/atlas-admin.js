/* Beheer van de wereldatlas: lagen toevoegen (zoeken, link, bestand), bewerken, ordenen, verwijderen. */
(() => {
  const C = window.AKLOKAAL || {};
  const A = window.AKAtlasAdmin || {};
  const ICONS = window.AKAtlasIcons || {};
  const app = document.getElementById('aka-app');
  if (!app) return;

  /* ---------- hulpjes ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().filter((k) => k != null && k !== false).forEach((k) => el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  };
  const icon = (name) => h('span', { class: 'aka-ico', 'aria-hidden': 'true', html: ICONS[name] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>` : '' });
  async function api(path, { method = 'GET', json, body } = {}) {
    const opts = { method, credentials: 'same-origin', headers: { 'X-WP-Nonce': C.nonce } };
    if (json) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(json); } else if (body) opts.body = body;
    const res = await fetch(C.rest + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Er ging iets mis (${res.status}).`);
    return data;
  }
  const kindLabel = { ingebouwd: 'ingebouwd', geojson: 'GeoJSON', arcgis: 'ArcGIS-vormen', tegels: 'tegelkaart', kaartbeeld: 'kaartbeeld' };

  /* ---------- toestand ---------- */
  let groups = [], layers = [], icons = [];
  let draft = null; // laag die in het formulier staat
  let tab = 'zoeken';
  const flash = h('div', { class: 'aka-flash', role: 'status', 'aria-live': 'polite', hidden: true });
  const say = (msg, kind = 'ok') => { flash.className = `aka-flash aka-flash--${kind}`; flash.textContent = msg; flash.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => (flash.hidden = true), 5000); };

  async function load() {
    const d = await api('atlas?all=1');
    groups = d.groups; layers = d.layers; icons = d.icons;
    render();
  }

  /* ---------- toevoegen ---------- */
  function addPanel() {
    const tabs = [['zoeken', 'Zoeken in de kaartcatalogus'], ['link', 'Link plakken'], ['bestand', 'Bestand uploaden']];
    const body = h('div', { class: 'aka-tabbody' });
    const bar = h('div', { class: 'aka-tabs', role: 'tablist' }, tabs.map(([id, label]) => h('button', { type: 'button', role: 'tab', class: 'aka-tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; render(); } }, label)));
    if (tab === 'zoeken') body.append(searchTab());
    if (tab === 'link') body.append(linkTab());
    if (tab === 'bestand') body.append(fileTab());
    return h('section', { class: 'aka-card' }, h('h2', { text: 'Laag toevoegen' }), bar, body);
  }

  let lastResults = [], lastQuery = '', lastTerms = [], wereld = true, alleenGoed = true;
  const FIT = {
    goed: ['aka-fit aka-fit--goed', '✓ Werkt goed'],
    traag: ['aka-fit aka-fit--traag', '◐ Laadt in delen'],
    'te-groot': ['aka-fit aka-fit--groot', '✕ Te groot voor de atlas'],
    onbekend: ['aka-fit', '? Niet getest'],
  };
  function searchTab() {
    const input = h('input', { type: 'search', class: 'regular-text', placeholder: 'Bijvoorbeeld: waterschaarste, bevolkingsdichtheid, aardbevingen', value: lastQuery });
    const results = h('div', { class: 'aka-results' });
    const status = h('p', { class: 'description' });
    const cbWereld = h('input', { type: 'checkbox', checked: wereld });
    const cbGoed = h('input', { type: 'checkbox', checked: alleenGoed });
    const showResults = () => {
      const lijst = lastResults.filter((r) => !alleenGoed || r.check.fit !== 'te-groot');
      const weg = lastResults.length - lijst.length;
      status.textContent = lastResults.length
        ? `${lijst.length} kaartlagen${lastTerms.length ? ` (ook gezocht op: ${lastTerms.join(', ')})` : ''}. Bovenaan: kaarten die goed werken en van een officiële bron komen.${weg ? ` ${weg} te grote lagen verborgen.` : ''}`
        : 'Niets gevonden. Probeer een ander woord, of zet “alleen wereldkaarten” uit.';
      results.replaceChildren(...lijst.map((r) => h('article', { class: 'aka-result' },
        r.thumb ? h('img', { src: r.thumb, alt: '', loading: 'lazy' }) : h('div', { class: 'aka-result__nothumb' }, icon('map')),
        h('div', { class: 'aka-result__body' },
          h('strong', { text: r.title }),
          h('p', { class: 'aka-meta' },
            h('span', { class: FIT[r.check.fit][0], text: FIT[r.check.fit][1] }),
            r.trusted ? h('span', { class: 'aka-fit aka-fit--bron', text: '★ Officiële bron' }) : r.credited ? h('span', { class: 'aka-fit', text: 'Data van een bekende organisatie' }) : null),
          h('p', { class: 'aka-meta' }, h('span', { text: `Bron: ${r.source || r.owner || 'onbekend'}` }), r.year ? h('span', { text: `bijgewerkt: ${r.year}` }) : null),
          r.check.reason ? h('p', { class: 'aka-snippet', text: r.check.reason }) : null,
          r.snippet ? h('p', { class: 'aka-snippet', text: r.snippet }) : null,
          h('p', { class: 'aka-actions' },
            h('button', { type: 'button', class: 'button' + (r.check.fit === 'te-groot' ? '' : ' button-primary'), onclick: () => fromSearch(r) }, 'Toevoegen…'),
            h('a', { href: r.item, target: '_blank', rel: 'noopener' }, 'Bekijk bij de bron')))
      )));
    };
    const go = async () => {
      lastQuery = input.value.trim();
      if (lastQuery.length < 2) return;
      status.textContent = 'Zoeken en de kaarten testen… (een paar seconden)';
      results.replaceChildren();
      try {
        const d = await api('atlas/search?q=' + encodeURIComponent(lastQuery) + '&wereld=' + (wereld ? '1' : '0'));
        lastResults = d.results || []; lastTerms = d.terms || [];
        showResults();
      } catch (e) { status.textContent = e.message; }
    };
    cbWereld.addEventListener('change', () => { wereld = cbWereld.checked; if (lastQuery) go(); });
    cbGoed.addEventListener('change', () => { alleenGoed = cbGoed.checked; showResults(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    if (lastResults.length) showResults();
    return h('div', {},
      h('p', { class: 'description', text: 'Zoekt in de openbare catalogus van ArcGIS Online. Je mag in het Nederlands zoeken: aardrijkskundetermen worden vertaald naar Engels. Elk resultaat wordt vooraf getest: werkt het in de atlas, en komt het van een officiële bron?' }),
      h('p', { class: 'aka-row' }, input, h('button', { type: 'button', class: 'button', onclick: go }, 'Zoeken')),
      h('p', { class: 'aka-row aka-filters' },
        h('label', { class: 'aka-check' }, cbWereld, ' Alleen wereldkaarten'),
        h('label', { class: 'aka-check' }, cbGoed, ' Te grote lagen verbergen')),
      status, results);
  }

  // Na zoeken of plakken: de dienst laten beoordelen en het advies in het formulier zetten.
  async function analyseEnOpen(url, base) {
    say('De kaartdienst bekijken…', 'info');
    try {
      const info = await api('atlas/inspect?url=' + encodeURIComponent(url));
      const adv = info.advice || {};
      openForm({
        ...base,
        kind: adv.kind || base.kind, url: adv.url || url,
        title: base.title || info.name || '',
        source: base.source || info.copyright || '',
        note: base.note || (info.description || '').slice(0, 400),
        advice: adv, legend: info.legend || [], colorFields: info.fields || [],
        fields: (info.fields || []).map((f) => f.name),
        serviceLayers: info.layers, serviceUrl: info.url,
      });
      flash.hidden = true;
    } catch (e) { say(e.message, 'error'); }
  }

  async function fromSearch(r) {
    const base = { title: r.title, source: r.source || r.owner, year: r.year, note: r.snippet, kind: r.check.kind, url: r.check.url || r.url, subtitle: '', group: groups[0]?.slug || '', color: '#2f7f77', opacity: 0.8 };
    if (r.check.kind === 'geojson') { openForm(base); return; }
    analyseEnOpen(base.url, base);
  }

  function linkTab() {
    const input = h('input', { type: 'url', class: 'large-text', placeholder: 'https://…' });
    const status = h('p', { class: 'description' });
    const go = async () => {
      const url = input.value.trim();
      if (!/^https?:\/\//i.test(url)) { status.textContent = 'Plak een volledig adres, beginnend met https://'; return; }
      const base = { title: '', source: '', year: String(new Date().getFullYear()), note: '', url, subtitle: '', group: groups[0]?.slug || '', color: '#2f7f77', opacity: 0.8 };
      if (/\/(FeatureServer|MapServer|ImageServer)(\/\d+)?\/?(\?.*)?$/i.test(url)) { status.textContent = ''; analyseEnOpen(url, base); return; }
      openForm({ ...base, kind: /\{z\}/.test(url) ? 'tegels' : 'geojson' });
    };
    return h('div', {},
      h('p', { class: 'description', html: 'Werkt met: een ArcGIS-dienst (<code>…/FeatureServer/0</code>, <code>…/MapServer</code> of <code>…/ImageServer</code>), een tegelkaart (<code>…/{z}/{x}/{y}.png</code>) of een GeoJSON-adres. Een ArcGIS-dienst wordt eerst bekeken: je krijgt advies over hoe hij het best in de atlas komt.' }),
      h('p', { class: 'aka-row' }, input, h('button', { type: 'button', class: 'button', onclick: go }, 'Verder')), status);
  }

  function fileTab() {
    const input = h('input', { type: 'file', accept: '.geojson,.json,application/geo+json,application/json' });
    const status = h('p', { class: 'description' });
    input.addEventListener('change', async () => {
      const f = input.files[0]; if (!f) return;
      if (f.size > (A.maxMb || 25) * 1048576) { status.textContent = `Dit bestand is groter dan ${A.maxMb || 25} MB.`; return; }
      status.textContent = 'Uploaden…';
      const fd = new FormData(); fd.append('file', f);
      try {
        const d = await api('atlas/upload', { method: 'POST', body: fd });
        status.textContent = `${d.count} objecten gelezen. Vul de gegevens hieronder aan.`;
        openForm({ title: d.title, kind: 'geojson', url: d.url, source: '', year: String(new Date().getFullYear()), note: '', subtitle: '', labelField: d.labelField, fields: d.fields, group: groups[0]?.slug || '', color: '#2f7f77', opacity: 0.8 });
      } catch (e) { status.textContent = e.message; }
    });
    return h('div', {},
      h('p', { class: 'description', text: 'Een GeoJSON-bestand van je eigen computer (bijvoorbeeld geëxporteerd uit QGIS of geojson.io). Het komt in de mediabibliotheek.' }),
      input, status);
  }

  /* ---------- formulier ---------- */
  function openForm(d) {
    draft = { status: 'publish', defaultOn: false, ...d };
    render();
    document.getElementById('aka-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formPanel() {
    if (!draft) return null;
    const d = draft;
    const isNew = !d.id;
    const builtin = d.kind === 'ingebouwd';
    const f = {};
    const field = (label, el, help, req) => h('div', { class: 'aka-field' }, h('label', {}, h('strong', { text: label }), req ? h('em', { text: ' verplicht' }) : h('em', { text: ' optioneel' })), el, help ? h('p', { class: 'description', text: help }) : null);
    f.title = h('input', { type: 'text', class: 'large-text', value: d.title || '' });
    f.group = h('select', {}, groups.map((g) => h('option', { value: g.slug, selected: g.slug === d.group, text: g.title })), h('option', { value: '__nieuw', text: '+ Nieuwe categorie…' }));
    f.newGroup = h('input', { type: 'text', class: 'regular-text', placeholder: 'Naam van de nieuwe categorie', hidden: true });
    f.group.addEventListener('change', () => { f.newGroup.hidden = f.group.value !== '__nieuw'; if (!f.newGroup.hidden) f.newGroup.focus(); });
    f.subtitle = h('input', { type: 'text', class: 'large-text', value: d.subtitle || '', placeholder: 'Bijvoorbeeld: grootste rivieren · per stroomgebied' });
    f.source = h('input', { type: 'text', class: 'large-text', value: d.source || '' });
    f.year = h('input', { type: 'text', class: 'small-text', value: d.year || '', placeholder: '2025' });
    f.note = h('textarea', { rows: 3, class: 'large-text' }, d.note || '');
    f.color = h('input', { type: 'color', value: d.color || '#2f7f77' });
    f.opacity = h('input', { type: 'range', min: 10, max: 100, value: Math.round((d.opacity ?? 0.8) * 100) });
    const opOut = h('output', { text: f.opacity.value + '%' });
    f.opacity.addEventListener('input', () => (opOut.textContent = f.opacity.value + '%'));
    f.defaultOn = h('input', { type: 'checkbox', checked: !!d.defaultOn });
    f.url = h('input', { type: 'url', class: 'large-text', value: d.url || '', disabled: builtin });
    f.labelField = d.fields?.length
      ? h('select', {}, h('option', { value: '', text: '— automatisch —' }), d.fields.map((x) => h('option', { value: x, selected: x === d.labelField, text: x })))
      : h('input', { type: 'text', class: 'regular-text', value: d.labelField || '', placeholder: 'bijvoorbeeld: name' });
    let layerPick = null;
    if (d.serviceLayers?.length > 1) {
      layerPick = h('select', {}, d.serviceLayers.map((l) => h('option', { value: d.serviceUrl + '/' + l.id, selected: f.url.value.endsWith('/' + l.id), text: `${l.id}: ${l.name}${l.geometry ? ' (' + l.geometry.replace('esriGeometry', '').toLowerCase() + ')' : ''}` })));
      // Andere laag gekozen: die opnieuw laten beoordelen (aantal vormen, kleuren, velden).
      layerPick.addEventListener('change', () => analyseEnOpen(layerPick.value, { ...d, url: layerPick.value, title: f.title.value, source: f.source.value, note: f.note.value, year: f.year.value, subtitle: f.subtitle.value }));
    }
    const vormen = ['arcgis', 'geojson'].includes(d.kind);
    f.colorField = d.colorFields?.length
      ? h('select', {}, h('option', { value: '', text: d.legend?.length ? '— kleuren van de dienst —' : '— één kleur —' }), d.colorFields.map((x) => h('option', { value: x.name, selected: x.name === d.colorField, text: x.alias && x.alias !== x.name ? `${x.alias} (${x.name})` : x.name })))
      : h('input', { type: 'text', class: 'regular-text', value: d.colorField || '', placeholder: 'veldnaam, bijvoorbeeld bws_cat' });
    const advies = d.advice ? h('p', { class: 'aka-advice aka-advice--' + (d.advice.fit || 'onbekend') },
      h('strong', { text: (FIT[d.advice.fit] || FIT.onbekend)[1] + ' · ' + (kindLabel[d.advice.kind] || d.advice.kind) + '. ' }),
      d.advice.reason || '',
      d.advice.fit === 'te-groot' ? h('span', {}, ' ', h('button', { type: 'button', class: 'button-link', onclick: () => { tab = 'zoeken'; lastQuery = (f.title.value || '').replace(/[_-]+/g, ' '); draft = null; render(); } }, 'Zoek een andere versie')) : null) : null;
    const legendaVoorbeeld = d.legend?.length ? h('div', { class: 'aka-legend' }, d.legend.slice(0, 12).map(([lab, sw]) => h('span', { class: 'aka-lg' },
      /^data:image\//.test(sw) ? h('img', { src: sw, alt: '' }) : h('i', { style: `background:${sw}` }), lab))) : null;

    const save = async (e) => {
      e.preventDefault();
      if (!f.title.value.trim()) { say('Geef de laag een titel.', 'error'); f.title.focus(); return; }
      if (!builtin && !f.url.value.trim()) { say('Het adres van de laag ontbreekt.', 'error'); return; }
      if (!f.source.value.trim()) { say('Vul de bron in: wie heeft deze data gemaakt?', 'error'); f.source.focus(); return; }
      const payload = {
        title: f.title.value, subtitle: f.subtitle.value, source: f.source.value, year: f.year.value, note: f.note.value,
        color: f.color.value, opacity: Number(f.opacity.value) / 100, default_on: f.defaultOn.checked,
        label_field: f.labelField.value, group: f.group.value === '__nieuw' ? f.newGroup.value : f.group.value,
        color_field: f.colorField.value,
      };
      if (Array.isArray(d.legend) && (isNew || d.advice)) payload.legend = d.legend;
      if (!builtin) payload.url = f.url.value;
      if (isNew) payload.kind = d.kind;
      try {
        await api('atlas/layers' + (isNew ? '' : '/' + d.id), { method: 'POST', json: payload });
        say(isNew ? `“${payload.title}” staat nu in de atlas.` : `“${payload.title}” is bijgewerkt.`);
        draft = null;
        await load();
      } catch (err) { say(err.message, 'error'); }
    };

    return h('section', { class: 'aka-card aka-form', id: 'aka-form' },
      h('h2', { text: isNew ? 'Nieuwe laag: gegevens controleren' : `Laag bewerken: ${d.title}` }),
      advies,
      h('form', { onsubmit: save },
        h('div', { class: 'aka-grid' },
          h('div', {},
            field('Titel', f.title, 'Zoals hij in het lagenpaneel staat.', true),
            field('Categorie', h('div', {}, f.group, f.newGroup), 'Bijvoorbeeld “Aarde & risico’s”. Een nieuwe categorie maak je hier ook aan.', true),
            field('Korte omschrijving', f.subtitle, 'Eén regel onder de titel.'),
            field('Bron', f.source, 'Wie heeft de data gemaakt? Bijvoorbeeld: USGS, NOAA NCEI, Eurostat.', true),
            field('Jaartal', f.year, 'Van de data (niet van vandaag). Mag ook “live” of “2020–2024” zijn.'),
            field('Toelichting', f.note, 'Komt bij “Bronnen & toelichting” en bij het i-knopje in de atlas.')),
          h('div', {},
            builtin ? h('p', { class: 'description', text: 'Ingebouwde laag: de kaartgegevens zitten in de atlas zelf. Je kunt titel, categorie, bron, jaartal en weergave aanpassen.' })
              : field(`Adres (${kindLabel[d.kind] || d.kind})`, f.url, d.kind === 'arcgis' ? 'Een laag uit een ArcGIS-dienst, eindigend op een nummer (…/FeatureServer/0).' : d.kind === 'tegels' ? 'Een tegelkaart met {z}, {x} en {y}, of een ArcGIS MapServer met tegels.' : d.kind === 'kaartbeeld' ? 'Een ArcGIS MapServer of ImageServer; de dienst tekent de kaart zelf.' : 'Een GeoJSON-bestand of -adres.', true),
            legendaVoorbeeld ? field('Legenda (van de dienst)', legendaVoorbeeld, 'Zo verschijnt de legenda in de atlas.') : null,
            layerPick ? field('Welke laag uit deze dienst?', layerPick, 'Deze dienst bevat meerdere lagen.') : null,
            builtin || !vormen ? null : field('Naamveld', f.labelField, 'Welk veld de naam bevat die bij aanwijzen verschijnt. Leeg = automatisch.'),
            builtin || !vormen ? null : field('Kleur op veld', f.colorField, 'Kleurt de vormen naar de waarde in dit veld: getallen in vijf klassen, tekst per categorie. Leeg = de kleuren van de dienst, of één kleur.'),
            field('Kleur', h('div', { class: 'aka-row' }, f.color, h('span', { class: 'description', text: builtin ? 'Kleur van het bolletje in het paneel.' : 'Kleur van punten, lijnen en vlakken.' }))),
            field('Dekking', h('div', { class: 'aka-row' }, f.opacity, opOut)),
            h('label', { class: 'aka-check' }, f.defaultOn, ' Meteen aan als iemand de atlas opent'))),
        h('p', { class: 'aka-actions' },
          h('button', { class: 'button button-primary button-large' }, isNew ? 'Toevoegen aan de atlas' : 'Opslaan'),
          h('button', { type: 'button', class: 'button button-large', onclick: () => { draft = null; render(); } }, 'Annuleren'))));
  }

  /* ---------- lijst ---------- */
  function sortedIds() { return layers.filter((l) => l.status !== 'trash').sort((a, b) => a.order - b.order || a.id - b.id).map((l) => l.id); }
  async function move(layer, dir) {
    const same = layers.filter((l) => l.status !== 'trash' && l.group === layer.group).sort((a, b) => a.order - b.order || a.id - b.id);
    const i = same.findIndex((l) => l.id === layer.id), j = i + dir;
    if (j < 0 || j >= same.length) return;
    const a = same[i], b = same[j];
    [a.order, b.order] = [b.order, a.order];
    if (a.order === b.order) a.order += dir;
    render();
    await api('atlas/order', { method: 'POST', json: { layers: sortedIds() } }).catch((e) => say(e.message, 'error'));
    await load();
  }
  async function moveGroup(g, dir) {
    const i = groups.indexOf(g), j = i + dir;
    if (j < 0 || j >= groups.length) return;
    [groups[i], groups[j]] = [groups[j], groups[i]];
    render();
    await api('atlas/order', { method: 'POST', json: { groups: groups.map((x) => x.id) } }).catch((e) => say(e.message, 'error'));
  }
  async function act(fn, msg) { try { await fn(); if (msg) say(msg); await load(); } catch (e) { say(e.message, 'error'); } }

  function groupBlock(g, list) {
    const iconSel = h('select', { class: 'aka-iconsel', 'aria-label': 'Icoon van de categorie' }, icons.map((n) => h('option', { value: n, selected: n === g.icon, text: n })));
    iconSel.addEventListener('change', () => act(() => api('atlas/groups/' + g.id, { method: 'POST', json: { icon: iconSel.value } }), 'Icoon aangepast.'));
    const rename = () => { const t = prompt('Nieuwe naam voor de categorie', g.title); if (t && t.trim()) act(() => api('atlas/groups/' + g.id, { method: 'POST', json: { title: t.trim() } }), 'Categorie hernoemd.'); };
    const remove = () => { if (confirm(`Categorie “${g.title}” verwijderen?`)) act(() => api('atlas/groups/' + g.id, { method: 'DELETE' }), 'Categorie verwijderd.'); };
    return h('section', { class: 'aka-group' },
      h('header', { class: 'aka-group__head' },
        icon(g.icon), h('h3', { text: g.title }), h('span', { class: 'aka-count', text: `${list.length} ${list.length === 1 ? 'laag' : 'lagen'}` }),
        h('span', { class: 'aka-group__tools' },
          h('button', { type: 'button', class: 'button button-small', title: 'Categorie omhoog', 'aria-label': 'Categorie omhoog', onclick: () => moveGroup(g, -1) }, '↑'),
          h('button', { type: 'button', class: 'button button-small', title: 'Categorie omlaag', 'aria-label': 'Categorie omlaag', onclick: () => moveGroup(g, 1) }, '↓'),
          iconSel,
          h('button', { type: 'button', class: 'button button-small', onclick: rename }, 'Hernoemen'),
          list.length ? null : h('button', { type: 'button', class: 'button button-small button-link-delete', onclick: remove }, 'Verwijderen'))),
      list.length ? h('ul', { class: 'aka-list' }, list.map((l) => layerRow(l))) : h('p', { class: 'description aka-empty', text: 'Nog geen lagen in deze categorie.' }));
  }

  function layerRow(l) {
    const hidden = l.status === 'draft';
    return h('li', { class: 'aka-layer' + (hidden ? ' is-hidden' : '') },
      h('span', { class: 'aka-dot', style: `--c:${l.color}` }),
      h('div', { class: 'aka-layer__text' },
        h('strong', { text: l.title }),
        l.subtitle ? h('span', { text: l.subtitle }) : null,
        h('span', { class: 'aka-meta' },
          h('span', { text: `Bron: ${l.source || '—'}` }), h('span', { text: `jaartal: ${l.year || '—'}` }),
          h('span', { class: 'aka-badge', text: kindLabel[l.kind] || l.kind }),
          l.defaultOn ? h('span', { class: 'aka-badge aka-badge--on', text: 'aan bij openen' }) : null,
          hidden ? h('span', { class: 'aka-badge', text: 'verborgen' }) : null)),
      h('span', { class: 'aka-layer__tools' },
        h('button', { type: 'button', class: 'button button-small', 'aria-label': `${l.title} omhoog`, onclick: () => move(l, -1) }, '↑'),
        h('button', { type: 'button', class: 'button button-small', 'aria-label': `${l.title} omlaag`, onclick: () => move(l, 1) }, '↓'),
        h('button', { type: 'button', class: 'button button-small', onclick: () => openForm({ ...l }) }, 'Bewerken'),
        h('button', { type: 'button', class: 'button button-small', onclick: () => act(() => api('atlas/layers/' + l.id, { method: 'POST', json: { status: hidden ? 'publish' : 'draft' } }), hidden ? 'Laag staat weer in de atlas.' : 'Laag verborgen (blijft bewaard).') }, hidden ? 'Tonen' : 'Verbergen'),
        h('button', { type: 'button', class: 'button button-small button-link-delete', onclick: () => act(() => api('atlas/layers/' + l.id, { method: 'DELETE' }), `“${l.title}” verwijderd. Terugzetten kan onderaan.`) }, 'Verwijderen')));
  }

  function listPanel() {
    const live = layers.filter((l) => l.status !== 'trash');
    const known = new Set(groups.map((g) => g.slug));
    const blocks = groups.map((g) => groupBlock(g, live.filter((l) => l.group === g.slug).sort((a, b) => a.order - b.order || a.id - b.id)));
    const loose = live.filter((l) => !known.has(l.group));
    if (loose.length) blocks.push(h('section', { class: 'aka-group' }, h('header', { class: 'aka-group__head' }, h('h3', { text: 'Zonder categorie' })), h('ul', { class: 'aka-list' }, loose.map(layerRow))));
    const newGroup = () => { const t = prompt('Naam van de nieuwe categorie, bijvoorbeeld “Water & rivieren”'); if (t && t.trim()) act(() => api('atlas/groups', { method: 'POST', json: { title: t.trim() } }), 'Categorie toegevoegd.'); };
    return h('section', { class: 'aka-card' },
      h('div', { class: 'aka-head' }, h('h2', { text: `Lagen in de atlas (${live.length})` }),
        h('span', {}, h('button', { type: 'button', class: 'button', onclick: newGroup }, '+ Nieuwe categorie'), ' ', A.atlasUrl ? h('a', { class: 'button', href: A.atlasUrl, target: '_blank' }, 'Bekijk de atlas') : null)),
      h('p', { class: 'description', text: 'De volgorde hier is de volgorde in de atlas. Een laag naar een andere categorie verplaatsen: Bewerken → Categorie.' }),
      blocks);
  }

  function trashPanel() {
    const gone = layers.filter((l) => l.status === 'trash');
    if (!gone.length) return null;
    return h('details', { class: 'aka-card aka-trash' },
      h('summary', { text: `Verwijderde lagen (${gone.length})` }),
      h('ul', { class: 'aka-list' }, gone.map((l) => h('li', { class: 'aka-layer' },
        h('span', { class: 'aka-dot', style: `--c:${l.color}` }),
        h('div', { class: 'aka-layer__text' }, h('strong', { text: l.title }), h('span', { class: 'aka-meta', text: `Bron: ${l.source || '—'} · jaartal: ${l.year || '—'}` })),
        h('span', { class: 'aka-layer__tools' },
          h('button', { type: 'button', class: 'button button-small', onclick: () => act(() => api(`atlas/layers/${l.id}/restore`, { method: 'POST' }), `“${l.title}” staat weer in de atlas.`) }, 'Terugzetten'),
          h('button', { type: 'button', class: 'button button-small button-link-delete', onclick: () => { if (confirm(`“${l.title}” definitief verwijderen? Dit kan niet ongedaan worden.`)) act(() => api(`atlas/layers/${l.id}?force=1`, { method: 'DELETE' }), 'Definitief verwijderd.'); } }, 'Definitief verwijderen'))))));
  }

  function render() {
    const keepScroll = window.scrollY;
    app.replaceChildren(flash, addPanel(), formPanel() || '', listPanel(), trashPanel() || '');
    window.scrollTo(0, keepScroll);
  }

  load().catch((e) => { app.textContent = e.message; });
})();
