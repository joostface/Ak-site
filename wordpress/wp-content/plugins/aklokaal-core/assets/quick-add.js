/* Aardrijkskundelokaal — "+ Toevoegen"
   Eén formulier voor bestanden en links, in een venster op de website of
   ingebed in wp-admin. Praat alleen met /wp-json/aklokaal/v1/ (met nonce). */
(() => {
  const C = window.AKLOKAAL;
  if (!C) return;

  /* ---------- hulpjes ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const store = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } }
  };
  async function api(path, { method = 'GET', body, json } = {}) {
    const opts = { method, credentials: 'same-origin', headers: { 'X-WP-Nonce': C.nonce } };
    if (json) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(json); }
    else if (body) opts.body = body;
    const res = await fetch(C.rest + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.message || 'Er ging iets mis.'); e.data = data; throw e; }
    return data;
  }
  function upload(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', C.rest + path);
      x.setRequestHeader('X-WP-Nonce', C.nonce);
      x.withCredentials = true;
      x.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(e.loaded / e.total);
      x.onload = () => {
        let d = {}; try { d = JSON.parse(x.responseText); } catch { /* */ }
        x.status < 300 ? resolve(d) : reject(new Error(d.message || 'Uploaden mislukt.'));
      };
      x.onerror = () => reject(new Error('Geen verbinding met de server.'));
      x.send(formData);
    });
  }
  let structure = null;
  const loadStructure = async (fresh) => (structure = !fresh && structure ? structure : await api('structure?all=1'));

  const kindFor = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    return { pptx: 'Presentatie', ppt: 'Presentatie', odp: 'Presentatie', pdf: 'PDF', docx: 'Document', doc: 'Document', odt: 'Document', jpg: 'Afbeelding', jpeg: 'Afbeelding', png: 'Afbeelding', webp: 'Afbeelding', gif: 'Afbeelding' }[ext] || 'Bestand';
  };
  const titleFor = (name) => {
    const t = name.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const fmtSize = (b) => (b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' kB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB');
  const isVideo = (u) => /(youtube\.com|youtu\.be|vimeo\.com|schooltv\.nl|npostart\.nl)/i.test(u);

  /* Bestemming van de huidige pagina: hoofdstuk en zichtbare paragraaf */
  function pageContext() {
    const chapter = Number(document.body.dataset.akChapter || 0);
    if (!chapter) return null;
    // Eerst de paragraaf die het menu als actief markeert, anders de bovenste in beeld.
    const active = document.querySelector('.toc a[aria-current="true"]');
    const fromMenu = active && document.getElementById(active.hash.slice(1));
    if (fromMenu && fromMenu.dataset.akParagraphId) return { chapter, paragraph: Number(fromMenu.dataset.akParagraphId) };
    const paras = [...document.querySelectorAll('[data-ak-paragraph-id]')];
    let current = paras[0];
    for (const p of paras) if (p.getBoundingClientRect().top < innerHeight * 0.35) current = p;
    return { chapter, paragraph: current ? Number(current.dataset.akParagraphId) : 0 };
  }

  /* ---------- het formulier ---------- */
  function buildForm({ context, onDone, compact } = {}) {
    let files = [];
    let mode = 'files';
    let news = null;

    const fileInput = h('input', { type: 'file', multiple: true, accept: C.accept, class: 'akq-hidden', 'aria-label': 'Bestanden kiezen' });
    const list = h('ul', { class: 'akq-files' });
    const drop = h('label', { class: 'akq-drop' },
      h('strong', { text: 'Sleep bestanden hierheen' }),
      h('span', {}, 'of ', h('u', { text: 'kies bestanden' }), ' op je computer'),
      h('small', { text: 'PowerPoint, PDF, Word, JPG, PNG of WebP. Meerdere tegelijk mag.' }),
      fileInput);

    const urlInput = h('input', { type: 'url', class: 'akq-input', placeholder: 'https://', 'aria-describedby': 'akq-url-help' });
    const urlKind = h('select', { class: 'akq-input', 'aria-label': 'Soort link' },
      h('option', { value: 'nieuws', text: 'Nieuwsartikel' }),
      h('option', { value: 'video', text: 'Video' }),
      h('option', { value: 'weblink', text: 'Website' }));
    const urlTitle = h('input', { type: 'text', class: 'akq-input', placeholder: 'Titel', 'aria-label': 'Titel van de link' });
    const newsBox = h('div', { class: 'akq-news', hidden: true });

    const sel = (label) => { const s = h('select', { class: 'akq-input' }); return [s, h('label', { class: 'akq-field' }, h('span', { text: label }), s)]; };
    const [sVak, lVak] = sel('Vak');
    const [sJaar, lJaar] = sel('Leerjaar');
    const [sCh, lCh] = sel('Hoofdstuk');
    const [sPar, lPar] = sel('Paragraaf');
    // Nieuws: eerst kiezen of het alleen in het nieuwsarchief komt of ook bij een les.
    const sWaar = h('select', { class: 'akq-input', 'aria-label': 'Waar komt het nieuwsartikel?' },
      h('option', { value: 'nieuws', text: 'Alleen bij Nieuws (niet in een les)' }),
      h('option', { value: 'les', text: 'Ook in een les plaatsen' }));
    const waarVeld = h('label', { class: 'akq-field' }, sWaar);
    const destGrid = h('div', { class: 'akq-grid' }, lVak, lJaar, lCh, lPar);
    const isNieuws = () => mode === 'link' && urlKind.value === 'nieuws';
    const alleenNieuws = () => isNieuws() && sWaar.value === 'nieuws';
    const updateWaar = () => { waarVeld.hidden = !isNieuws(); destGrid.hidden = alleenNieuws(); };
    sWaar.addEventListener('change', updateWaar);
    const desc = h('textarea', { class: 'akq-input', rows: 2, placeholder: 'Korte toelichting (optioneel)' });
    const themes = h('input', { type: 'text', class: 'akq-input', placeholder: 'Thema’s, bijvoorbeeld: Energie, Klimaat' });
    const thumb = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp', class: 'akq-input' });
    const thumbField = h('label', { class: 'akq-field' }, h('span', { text: 'Eigen voorbeeldafbeelding (optioneel)' }), thumb, h('small', { class: 'akq-help', text: 'Wordt getoond bij presentaties, video’s, nieuws en in overzichten. JPG, PNG of WebP.' }));
    const status = h('p', { class: 'akq-status', role: 'status' });
    const btnPub = h('button', { type: 'submit', class: 'akq-btn akq-btn--main', value: 'publish', text: 'Publiceren' });
    const btnDraft = h('button', { type: 'submit', class: 'akq-btn', value: 'draft', text: 'Als concept bewaren' });

    const tabFiles = h('button', { type: 'button', class: 'akq-tab', 'aria-pressed': 'true', text: 'Bestanden' });
    const tabLink = h('button', { type: 'button', class: 'akq-tab', 'aria-pressed': 'false', text: 'Link plakken' });
    const paneFiles = h('div', {}, drop, list);
    const paneLink = h('div', { hidden: true },
      h('label', { class: 'akq-field' }, h('span', { text: 'Link' }), urlInput),
      h('p', { class: 'akq-help', id: 'akq-url-help', text: 'Plak een nieuwsartikel, een video (YouTube, Vimeo, Schooltv) of een website.' }),
      h('div', { class: 'akq-row' }, h('label', { class: 'akq-field' }, h('span', { text: 'Soort' }), urlKind), h('label', { class: 'akq-field akq-grow' }, h('span', { text: 'Titel' }), urlTitle)),
      newsBox);

    const form = h('form', { class: 'akq-form' + (compact ? ' akq-form--compact' : ''), novalidate: true },
      h('div', { class: 'akq-tabs', role: 'group', 'aria-label': 'Wat wil je toevoegen?' }, tabFiles, tabLink),
      paneFiles, paneLink,
      h('fieldset', { class: 'akq-dest' }, h('legend', { text: 'Waar komt het?' }), waarVeld, destGrid),
      h('details', { class: 'akq-more' }, h('summary', { text: 'Toelichting, thema’s en afbeelding' }), desc, themes, thumbField),
      h('div', { class: 'akq-actions' }, btnPub, btnDraft),
      status);

    const setMode = (m) => {
      mode = m;
      tabFiles.setAttribute('aria-pressed', String(m === 'files'));
      tabLink.setAttribute('aria-pressed', String(m === 'link'));
      paneFiles.hidden = m !== 'files';
      paneLink.hidden = m !== 'link';
      updateWaar();
      if (m === 'link') urlInput.focus();
    };
    tabFiles.addEventListener('click', () => setMode('files'));
    tabLink.addEventListener('click', () => setMode('link'));

    /* bestanden */
    const renderFiles = () => {
      list.replaceChildren(...files.map((f, i) => h('li', {},
        h('span', { class: 'akq-kind', text: kindFor(f.file.name) }),
        h('input', { type: 'text', class: 'akq-input', value: f.title, 'aria-label': 'Titel voor ' + f.file.name, oninput: (e) => (f.title = e.target.value) }),
        h('span', { class: 'akq-size', text: fmtSize(f.file.size) }),
        h('progress', { max: 1, value: f.progress || 0, hidden: !f.progress }),
        h('button', { type: 'button', class: 'akq-x', 'aria-label': 'Verwijder ' + f.file.name, text: '×', onclick: () => { files.splice(i, 1); renderFiles(); } }))));
    };
    const addFiles = (fl) => {
      for (const file of fl) {
        if (C.maxSize && file.size > C.maxSize) { status.textContent = `${file.name} is te groot (max. ${fmtSize(C.maxSize)}).`; continue; }
        files.push({ file, title: titleFor(file.name) });
      }
      renderFiles();
    };
    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { setMode('files'); addFiles(e.dataTransfer.files); });

    /* links en nieuws */
    let lookupTimer;
    const field = (label, input, note) => h('label', { class: 'akq-field' }, h('span', { text: label }), input, note ? h('small', { class: 'akq-help', text: note }) : null);
    const renderNews = (d) => {
      news = {
        title: h('input', { type: 'text', class: 'akq-input', value: d.title || '' }),
        publisher: h('input', { type: 'text', class: 'akq-input', value: d.publisher || '' }),
        author: h('input', { type: 'text', class: 'akq-input', value: d.author || '' }),
        published: h('input', { type: 'date', class: 'akq-input', value: d.published || '' }),
        description: h('textarea', { class: 'akq-input', rows: 3 }, d.description || ''),
        image_url: h('input', { type: 'url', class: 'akq-input', value: d.image_url || '' }),
        show_image: h('input', { type: 'checkbox', checked: !!d.image_url }),
        question: h('input', { type: 'text', class: 'akq-input', placeholder: 'Bijvoorbeeld: Waarom treft droogte juist de binnenvaart?' }),
        canonical: d.canonical || '',
        url: d.url
      };
      const warn = [];
      if (d.duplicate) warn.push(h('p', { class: 'akq-warn' }, 'Dit artikel staat al in het archief: ', h('a', { href: d.duplicate.edit, text: d.duplicate.title }), '. Je hoeft het niet opnieuw te importeren; plaats het bestaande artikel via de structuur.'));
      if (d.warning) warn.push(h('p', { class: 'akq-warn', text: d.warning }));
      if (d.missing && d.missing.length) warn.push(h('p', { class: 'akq-help', text: 'Niet gevonden in de metadata: ' + d.missing.join(', ') + '. Vul dit zelf aan als je het weet.' }));
      if (d.ai && d.ai.notes) warn.push(h('p', { class: 'akq-help', text: 'AI-voorstel (controleer!): ' + d.ai.notes }));
      newsBox.replaceChildren(...[
        ...warn,
        d.image_url ? h('img', { class: 'akq-news__img', src: d.image_url, alt: '' }) : null,
        field('Titel', news.title),
        h('div', { class: 'akq-row' }, field('Uitgever', news.publisher), field('Auteur', news.author), field('Datum', news.published)),
        field('Korte beschrijving', news.description, 'Een eigen omschrijving is beter dan die van de uitgever.'),
        field('Afbeelding (link bij de bron)', news.image_url),
        h('label', { class: 'akq-check' }, news.show_image, ' Afbeelding van de bron tonen'),
        field('Geografische vraag (optioneel)', news.question)].filter(Boolean));
      newsBox.hidden = false;
      if (d.title) urlTitle.value = d.title;
    };
    const lookup = async () => {
      const u = urlInput.value.trim();
      if (!/^https?:\/\/\S+\.\S+/.test(u)) return;
      if (urlKind.value !== 'nieuws') { newsBox.hidden = true; news = null; return; }
      status.textContent = 'Gegevens ophalen…';
      try { renderNews(await api('news/lookup', { method: 'POST', json: { url: u } })); status.textContent = 'Controleer de gegevens en publiceer.'; }
      catch (e) { status.textContent = e.message; renderNews({ url: u, missing: ['alles'] }); }
    };
    urlInput.addEventListener('input', () => {
      const u = urlInput.value.trim();
      if (isVideo(u)) urlKind.value = 'video';
      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(lookup, 500);
    });
    urlKind.addEventListener('change', lookup);

    /* bestemming */
    const opt = (v, t) => h('option', { value: v, text: t });
    const findChapter = (id) => {
      for (const v of structure) for (const y of v.years) for (const c of y.chapters) if (c.id === id) return { v, y, c };
      return null;
    };
    const fillVak = () => { sVak.replaceChildren(...structure.map((v) => opt(v.id, v.name))); };
    const fillJaar = () => { const v = structure.find((x) => x.id == sVak.value) || structure[0]; sJaar.replaceChildren(...(v ? v.years : []).map((y) => opt(y.id, y.name + (y.chapters.length ? '' : ' (leeg)')))); };
    const fillCh = () => {
      const v = structure.find((x) => x.id == sVak.value); const y = v && v.years.find((x) => x.id == sJaar.value);
      const ch = y ? y.chapters : [];
      sCh.replaceChildren(...(ch.length ? ch.map((c) => opt(c.id, `H${c.number} ${c.title}${c.status === 'draft' ? ' (concept)' : ''}`)) : [opt('', 'Nog geen hoofdstukken')]));
    };
    const fillPar = () => {
      const f = findChapter(Number(sCh.value));
      const ps = f ? f.c.paragraphs : [];
      sPar.replaceChildren(opt('', f ? '— alleen bij het hoofdstuk —' : '—'), ...ps.map((p) => opt(p.id, p.label)));
      sPar.disabled = !f;
    };
    sVak.addEventListener('change', () => { fillJaar(); fillCh(); fillPar(); });
    sJaar.addEventListener('change', () => { fillCh(); fillPar(); });
    sCh.addEventListener('change', fillPar);
    const applyDestination = (dest) => {
      fillVak();
      const f = dest && dest.chapter ? findChapter(dest.chapter) : null;
      if (f) { sVak.value = f.v.id; fillJaar(); sJaar.value = f.y.id; fillCh(); sCh.value = f.c.id; fillPar(); sPar.value = dest.paragraph || ''; }
      else { fillJaar(); fillCh(); fillPar(); }
      // Geopend vanaf een hoofdstukpagina: nieuws standaard bij die les; anders alleen bij Nieuws.
      sWaar.value = context && context.chapter ? 'les' : 'nieuws';
      updateWaar();
    };
    loadStructure().then(() => applyDestination(context || store.get('aklokaal-last'))).catch((e) => (status.textContent = e.message));
    urlKind.addEventListener('change', updateWaar);

    /* versturen */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const publish = (e.submitter && e.submitter.value) !== 'draft';
      const container = alleenNieuws() ? 0 : Number(sPar.value || sCh.value || 0);
      const dest = container ? { chapter: Number(sCh.value), paragraph: Number(sPar.value) || 0 } : { none: true };
      btnPub.disabled = btnDraft.disabled = true;
      const ids = [];
      try {
        let created = 0; let newsResult = null;
        if (mode === 'files') {
          if (!files.length) throw new Error('Kies eerst één of meer bestanden.');
          for (const f of files) {
            const fd = new FormData();
            fd.append('files[]', f.file);
            fd.append('titles[]', f.title);
            fd.append('container', container);
            fd.append('status', publish ? 'publish' : 'draft');
            fd.append('description', desc.value);
            fd.append('themes', themes.value);
            status.textContent = `Uploaden: ${f.title}…`;
            const res = await upload('materials', fd, (p) => { f.progress = p; renderFiles(); });
            if (res.errors && res.errors.length) throw new Error(res.errors.map((x) => `${x.file}: ${x.message}`).join(' '));
            created += res.created.length;
            res.created.forEach((c) => ids.push(c.id));
          }
          files = []; renderFiles();
        } else {
          const u = urlInput.value.trim();
          if (!u) throw new Error('Plak eerst een link.');
          if (urlKind.value === 'nieuws') {
            if (!news) await lookup();
            const payload = { url: u, canonical: news.canonical, status: publish ? 'publish' : 'draft', container, themes: themes.value };
            for (const k of ['title', 'publisher', 'author', 'published', 'description', 'image_url', 'question']) payload[k] = news[k].value;
            payload.show_image = news.show_image.checked;
            const n = await api('news', { method: 'POST', json: payload });
            ids.push(n.id);
            newsResult = n;
          } else {
            const m = await api('materials', { method: 'POST', json: { url: u, type: urlKind.value, titles: [urlTitle.value], container, status: publish ? 'publish' : 'draft', description: desc.value, themes: themes.value } });
            m.created.forEach((c) => ids.push(c.id));
          }
          created = 1;
          urlInput.value = ''; urlTitle.value = ''; newsBox.hidden = true; newsBox.replaceChildren(); news = null;
        }
        if (thumb.files[0]) {
          status.textContent = 'Voorbeeldafbeelding toevoegen…';
          for (const id of ids) {
            const fd = new FormData();
            fd.append('file', thumb.files[0]);
            await upload(`items/${id}/thumbnail`, fd);
          }
          thumb.value = '';
        }
        if (dest.chapter) store.set('aklokaal-last', dest);
        // Opslaan is gelukt; een mislukte verversing van het structuurlijstje mag dat niet als fout laten lijken.
        try { await loadStructure(true); } catch { /* structuur blijft de vorige */ }
        const f = dest.chapter ? findChapter(dest.chapter) : null;
        const where = f ? (f.c.paragraphs.find((p) => p.id === dest.paragraph) || null) : null;
        if (newsResult && newsResult.duplicate) {
          status.replaceChildren('Dit artikel stond er al; er is geen tweede kopie gemaakt. ', h('a', { href: newsResult.url, text: 'Bekijken' }));
        } else if (newsResult && !f) {
          status.replaceChildren(`Nieuwsartikel ${publish ? 'gepubliceerd' : 'als concept bewaard'}. Het staat nu bij Nieuws. `, h('a', { href: newsResult.url, text: 'Bekijken' }));
        } else {
          status.replaceChildren(`${created} ${created === 1 ? 'item' : 'items'} ${publish ? 'gepubliceerd' : 'als concept bewaard'}${where ? ` in ${where.label}` : ''}. `, f ? h('a', { href: f.c.url + (where ? '#' + where.anchor : ''), text: 'Bekijken' }) : '');
        }
        onDone && onDone({ chapter: dest.chapter });
      } catch (err) {
        status.textContent = err.message;
      } finally {
        btnPub.disabled = btnDraft.disabled = false;
      }
    });

    /* Vooraf ingevuld vanuit de bladwijzerknop: gegevens uit de browser van de docent. */
    async function prefillNews(d) {
      setMode('link');
      urlKind.value = 'nieuws';
      urlInput.value = d.url || '';
      updateWaar();
      status.textContent = 'Gegevens uit je browser overgenomen. Controleer ze en publiceer.';
      let server = {};
      try { server = await api('news/lookup', { method: 'POST', json: { url: d.url } }); } catch { /* geen probleem */ }
      const merged = Object.assign({}, server);
      for (const [k, v] of Object.entries(d)) if (v && String(v).trim()) merged[k] = String(v).trim();
      merged.warning = '';
      const namen = { title: 'titel', publisher: 'uitgever', author: 'auteur', published: 'publicatiedatum', description: 'beschrijving', image_url: 'afbeelding' };
      merged.missing = Object.keys(namen).filter((k) => !merged[k]).map((k) => namen[k]);
      renderNews(merged);
    }

    return { form, setMode, applyDestination, addFiles, prefillNews };
  }

  /* ---------- venster ---------- */
  let dialog, current;
  function open(opts = {}) {
    if (!dialog) {
      dialog = h('dialog', { class: 'akq-dialog', 'aria-label': 'Materiaal toevoegen' });
      document.body.append(dialog);
      dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    }
    const ctx = opts.context || pageContext();
    current = buildForm({
      context: ctx,
      onDone: ({ chapter }) => {
        if (Number(document.body.dataset.akChapter) === chapter) setTimeout(() => location.reload(), 900);
        opts.onDone && opts.onDone();
      }
    });
    dialog.replaceChildren(
      h('div', { class: 'akq-head' }, h('h2', { text: 'Materiaal toevoegen' }), h('button', { type: 'button', class: 'akq-x', 'aria-label': 'Sluiten', text: '×', onclick: () => dialog.close() })),
      current.form);
    if (opts.mode) current.setMode(opts.mode);
    dialog.showModal();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add-open], #wp-admin-bar-aklokaal-add > a, #wp-admin-bar-aklokaal-add-materiaal > a');
    if (!t) return;
    e.preventDefault();
    open();
  });

  /* ingebed op de beheerpagina */
  document.querySelectorAll('[data-aklokaal-inline]').forEach((el) => el.append(buildForm({ compact: false }).form));

  /* Sleep een bestand op een open hoofdstukpagina → venster opent met die paragraaf */
  if (document.body.dataset.akChapter) {
    let shown = false;
    document.addEventListener('dragenter', (e) => {
      if (shown || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files') || (dialog && dialog.open)) return;
      shown = true; open(); setTimeout(() => (shown = false), 1500);
    });
  }

  /* ---------- beheerbalk bij elk materiaal op de hoofdstukpagina ---------- */
  async function initItemTools() {
    const items = [...document.querySelectorAll('.ak-beheer-item')];
    if (!items.length) return;
    const data = await loadStructure();
    const huidig = Number(document.body.dataset.akChapter || 0);
    // Keuzelijst: eerst de paragrafen van dit hoofdstuk, daarna alle andere, gegroepeerd per hoofdstuk.
    const groepen = [];
    data.forEach((v) => v.years.forEach((y) => y.chapters.forEach((c) => {
      const label = `${y.name} · H${c.number || '?'} ${c.title}${c.status !== 'publish' ? ' (concept)' : ''}`;
      const opts = [{ id: c.id, label: `Bij het hoofdstuk zelf (boven de paragrafen)` }, ...c.paragraphs.map((p) => ({ id: p.id, label: p.label }))];
      groepen[c.id === huidig ? 'unshift' : 'push']({ label: c.id === huidig ? 'Dit hoofdstuk' : label, opts });
    })));
    const keuzelijst = (eerste, behalve) => {
      const s = h('select', { class: 'akb-select', 'aria-label': eerste }, h('option', { value: '', text: eerste }));
      groepen.forEach((g) => {
        const og = h('optgroup', { label: g.label });
        g.opts.filter((o) => o.id !== behalve).forEach((o) => og.append(h('option', { value: o.id, text: o.label })));
        s.append(og);
      });
      return s;
    };
    const herlaad = (msg, el) => { if (el) el.textContent = msg; setTimeout(() => location.reload(), 600); };
    items.forEach((wrap) => {
      const id = Number(wrap.dataset.akItem), van = Number(wrap.dataset.akContainer), titel = wrap.dataset.akTitle;
      const melding = h('span', { class: 'akb-msg', role: 'status' });
      const verplaats = keuzelijst('Verplaats naar…', van);
      verplaats.addEventListener('change', async () => {
        if (!verplaats.value) return;
        verplaats.disabled = true;
        await api('items/move', { method: 'POST', json: { ids: [id], from: van, to: Number(verplaats.value) } });
        herlaad('Verplaatst.', melding);
      });
      const ook = keuzelijst('Ook plaatsen in…', van);
      ook.addEventListener('change', async () => {
        if (!ook.value) return;
        await api(`items/${ook.value}/add`, { method: 'POST', json: { item: id } });
        melding.textContent = 'Staat nu ook daar (zelfde bestand).';
        ook.value = '';
      });
      const omhoog = h('button', { type: 'button', class: 'akb-btn', title: 'Omhoog', 'aria-label': 'Verplaats ' + titel + ' omhoog', text: '↑' });
      const omlaag = h('button', { type: 'button', class: 'akb-btn', title: 'Omlaag', 'aria-label': 'Verplaats ' + titel + ' omlaag', text: '↓' });
      const schuif = async (richting) => {
        const lijst = await api('items/' + van);
        const i = lijst.findIndex((x) => x.id === id), j = i + richting;
        if (i < 0 || j < 0 || j >= lijst.length) return;
        [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
        await api('items/' + van, { method: 'POST', json: { items: lijst.map((x) => ({ id: x.id, note: x.note })) } });
        herlaad('Volgorde aangepast.', melding);
      };
      omhoog.addEventListener('click', () => schuif(-1));
      omlaag.addEventListener('click', () => schuif(1));
      const weg = h('button', { type: 'button', class: 'akb-btn', text: 'Weghalen', title: 'Haal weg uit deze paragraaf (het materiaal blijft bewaard)', onclick: async () => {
        if (!confirm(`“${titel}” weghalen uit deze paragraaf? Het materiaal zelf blijft bewaard.`)) return;
        const lijst = await api('items/' + van);
        await api('items/' + van, { method: 'POST', json: { items: lijst.filter((x) => x.id !== id).map((x) => ({ id: x.id, note: x.note })) } });
        herlaad('Weggehaald.', melding);
      } });
      const balk = h('div', { class: 'akb', role: 'group', 'aria-label': 'Beheer: ' + titel },
        h('span', { class: 'akb-label', text: 'Beheer' }),
        verplaats, ook, omhoog, omlaag, weg,
        wrap.dataset.akEdit ? h('a', { class: 'akb-btn', href: wrap.dataset.akEdit, text: 'Bewerken' }) : null,
        wrap.dataset.akStatus !== 'publish' ? h('span', { class: 'akb-label', text: '(concept)' }) : null,
        melding);
      wrap.prepend(balk);
    });
  }
  initItemTools().catch(() => {});

  window.AKLokaalAdd = { open, api, loadStructure, buildForm, h };
})();
