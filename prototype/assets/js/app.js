/* Aardrijkskundelokaal — gedrag
   Elk onderdeel is een kleine functie die alleen iets doet als zijn elementen
   op de pagina staan. Zonder JavaScript blijft alle inhoud zichtbaar en bruikbaar. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* privémodus */ } }
  };

  /* ---------- thema ---------- */
  function initTheme() {
    const btn = $('[data-theme-toggle]');
    if (!btn) return;
    const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const label = () => btn.setAttribute('aria-label', current() === 'dark' ? 'Lichte modus aanzetten' : 'Donkere modus aanzetten');
    label();
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      store.set('ak-theme', next);
      label();
    });
  }

  /* ---------- beheer (alleen prototype: ?beheer=1) ---------- */
  function initAdminDemo() {
    const p = new URLSearchParams(location.search);
    if (p.has('beheer')) store.set('ak-beheer', p.get('beheer') === '0' ? '' : '1');
    if (store.get('ak-beheer')) root.classList.add('is-admin');
  }

  /* ---------- mobiel menu ---------- */
  function initMenu() {
    const header = $('[data-header]');
    const btn = $('[data-menu-toggle]');
    if (!header || !btn) return;
    btn.addEventListener('click', () => {
      const open = header.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { btn.click(); btn.focus(); }
    });
  }

  /* ---------- zoeken ---------- */
  function buildIndex() {
    const d = window.AK_DATA;
    if (!d) return [];
    const idx = [];
    d.years.forEach((y) => y.chapters.forEach((c) => {
      if (c.draft) return;
      const href = c.href || 'hoofdstuk.html';
      idx.push({ t: `H${c.n} ${c.title}`, s: `Hoofdstuk · ${y.name}`, href });
      c.paragraphs.forEach((p, i) => idx.push({ t: `§${c.n}.${i + 1} ${p}`, s: `Paragraaf · ${y.name}, H${c.n} ${c.title}`, href: `${href}#paragraaf-${c.n}-${i + 1}` }));
    }));
    d.news.forEach((n) => idx.push({ t: n.title, s: `Nieuws · ${n.source} · ${n.tags.join(', ')}`, href: n.href }));
    d.maps.forEach((m) => idx.push({ t: m.title, s: `Kaart · ${m.tags.join(', ')}`, href: m.href }));
    d.apps.forEach((a) => idx.push({ t: a.title, s: `Interactief · ${a.tags.join(', ')}`, href: a.href }));
    return idx;
  }
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function search(idx, q, max = 8) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return idx
      .map((it) => {
        const hay = norm(it.t + ' ' + it.s);
        let score = 0;
        for (const w of words) {
          if (!hay.includes(w)) return null;
          score += norm(it.t).includes(w) ? 2 : 1;
        }
        return { it, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((r) => r.it);
  }
  function renderResults(box, list, q) {
    box.replaceChildren();
    if (!q.trim()) return;
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'search-empty';
      p.textContent = `Niets gevonden voor “${q}”. Probeer een ander woord, zoals energie of klimaat.`;
      box.append(p);
      return;
    }
    for (const r of list) {
      const a = document.createElement('a');
      a.href = r.href;
      a.textContent = r.t;
      const s = document.createElement('span');
      s.textContent = r.s;
      a.append(s);
      box.append(a);
    }
  }
  function initSearch() {
    const idx = buildIndex();
    // live zoeken in een vak op de pagina (home, zoekpagina)
    $$('[data-live-search]').forEach((form) => {
      const input = $('input', form);
      const box = $(form.dataset.liveSearch);
      if (!input || !box) return;
      input.addEventListener('input', () => renderResults(box, search(idx, input.value, 5), input.value));
      const q = new URLSearchParams(location.search).get('q');
      if (q && form.hasAttribute('data-from-query')) { input.value = q; renderResults(box, search(idx, q, 30), q); }
    });
    // zoekvenster in de kop
    const dlg = $('[data-search-dialog]');
    if (!dlg) return;
    const input = $('[data-search-input]', dlg);
    const box = $('[data-search-results]', dlg);
    const open = () => { dlg.showModal(); input.select(); };
    $$('[data-search-open]').forEach((b) => b.addEventListener('click', open));
    $('[data-search-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    input.addEventListener('input', () => renderResults(box, search(idx, input.value), input.value));
    document.addEventListener('keydown', (e) => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName || '');
      if ((e.key === '/' && !typing) || (e.key === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); open(); }
    });
  }

  /* ---------- leerjaar-tabbladen (home) ---------- */
  function initTabs() {
    $$('[data-tabs]').forEach((wrap) => {
      const tabs = $$('[role="tab"]', wrap);
      const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
      const select = (i, focus) => {
        tabs.forEach((t, j) => {
          const on = i === j;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          panels[j].hidden = !on;
        });
        if (focus) tabs[i].focus();
        store.set('ak-year', tabs[i].dataset.year || '');
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(i));
        t.addEventListener('keydown', (e) => {
          const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
          if (e.key === 'Home') { e.preventDefault(); select(0, true); }
          if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
        });
      });
      const saved = tabs.findIndex((t) => t.dataset.year === store.get('ak-year'));
      select(saved >= 0 ? saved : Number(wrap.dataset.default || 0));
    });
  }

  /* ---------- hoofdstuk: actieve paragraaf, mobiel menu, ankers ---------- */
  function initChapter() {
    const sections = $$('[data-paragraph]');
    if (!sections.length) return;
    const links = $$('[data-toc-link]');
    const label = $('[data-toc-current]');
    const bar = $('[data-toc-progress]');
    const setActive = (id) => {
      links.forEach((a) => a.setAttribute('aria-current', String(a.hash === '#' + id)));
      const s = document.getElementById(id);
      if (label && s) label.textContent = s.dataset.paragraph;
    };
    // de paragraaf die de lijn op 30% van het scherm kruist is actief
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
      const first = sections.find((s) => visible.get(s.id));
      if (first) setActive(first.id);
    }, { rootMargin: '-30% 0px -69% 0px' });
    sections.forEach((s) => io.observe(s));
    setActive(location.hash && document.getElementById(location.hash.slice(1)) ? location.hash.slice(1) : sections[0].id);

    // voortgangsbalk door het hoofdstuk
    const content = $('[data-chapter-content]');
    if (bar && content) {
      const update = () => {
        const r = content.getBoundingClientRect();
        const total = r.height - innerHeight * 0.6;
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
        bar.style.width = (p * 100).toFixed(1) + '%';
      };
      addEventListener('scroll', update, { passive: true });
      update();
    }

    // mobiel uitklapmenu
    const mBtn = $('[data-toc-toggle]');
    const mList = $('[data-toc-list]');
    if (mBtn && mList) {
      const close = () => { mList.hidden = true; mBtn.setAttribute('aria-expanded', 'false'); };
      mBtn.addEventListener('click', () => {
        const open = mList.hidden;
        mList.hidden = !open;
        mBtn.setAttribute('aria-expanded', String(open));
      });
      mList.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mList.hidden) { close(); mBtn.focus(); } });
    }

    // link naar paragraaf kopiëren
    $$('[data-copy-anchor]').forEach((b) => {
      const original = b.querySelector('span')?.textContent;
      b.addEventListener('click', async () => {
        const url = location.href.split('#')[0] + '#' + b.dataset.copyAnchor;
        try { await navigator.clipboard.writeText(url); } catch { location.hash = b.dataset.copyAnchor; }
        const span = b.querySelector('span');
        if (span) { span.textContent = 'Link gekopieerd'; setTimeout(() => (span.textContent = original), 1800); }
      });
    });
  }

  /* ---------- afbeelding vergroten ---------- */
  function initLightbox() {
    const dlg = $('[data-lightbox]');
    if (!dlg) return;
    const img = $('[data-lightbox-img]', dlg);
    const cap = $('[data-lightbox-caption]', dlg);
    const stage = $('[data-lightbox-stage]', dlg);
    $$('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      img.src = b.dataset.zoom;
      img.alt = b.querySelector('img')?.alt || '';
      cap.textContent = b.dataset.caption || '';
      stage.classList.remove('is-zoomed');
      dlg.showModal();
    }));
    $('[data-lightbox-close]', dlg).addEventListener('click', () => dlg.close());
    $('[data-lightbox-zoom]', dlg).addEventListener('click', () => stage.classList.toggle('is-zoomed'));
    stage.addEventListener('dblclick', () => stage.classList.toggle('is-zoomed'));
  }

  /* ---------- pdf-voorvertoning tonen ---------- */
  function initDisclosures() {
    $$('[data-toggle]').forEach((b) => {
      const target = document.getElementById(b.dataset.toggle);
      if (!target) return;
      b.setAttribute('aria-expanded', String(!target.hidden));
      b.addEventListener('click', () => {
        target.hidden = !target.hidden;
        b.setAttribute('aria-expanded', String(!target.hidden));
        const span = b.querySelector('span');
        if (span && b.dataset.labelOpen) span.textContent = target.hidden ? b.dataset.labelClosed : b.dataset.labelOpen;
      });
    });
    // video pas laden na klik: geen tracking zonder toestemming
    $$('[data-video]').forEach((box) => {
      $('button', box)?.addEventListener('click', () => {
        const f = document.createElement('iframe');
        f.src = box.dataset.video;
        f.title = box.dataset.title || 'Video';
        f.allow = 'fullscreen; picture-in-picture';
        f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
        box.replaceChildren(f);
      });
    });
  }

  /* ---------- filters (nieuws, kaarten) ---------- */
  function initFilters() {
    $$('[data-filter-group]').forEach((group) => {
      const items = $$(group.dataset.filterGroup);
      const chips = $$('[data-filter]', group);
      chips.forEach((c) => c.addEventListener('click', () => {
        chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        const f = c.dataset.filter;
        items.forEach((it) => { it.hidden = f !== 'alles' && !(it.dataset.tags || '').split(',').includes(f); });
      }));
    });
  }

  /* ---------- toevoegen (prototype van fase 3) ---------- */
  function initAdd() {
    const dlg = $('[data-add-dialog]');
    if (!dlg || !window.AK_DATA) return;
    const yearSel = $('[data-add-year]', dlg), chSel = $('[data-add-chapter]', dlg), pSel = $('[data-add-paragraph]', dlg);
    const list = $('[data-add-list]', dlg), files = $('[data-add-files]', dlg), zone = $('[data-dropzone]', dlg), status = $('[data-add-status]', dlg);
    const years = window.AK_DATA.years;
    const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    yearSel.replaceChildren(...years.map((y, i) => opt(i, y.name)));
    const fillCh = () => { chSel.replaceChildren(...years[yearSel.value].chapters.map((c, i) => opt(i, `H${c.n} ${c.title}`))); fillP(); };
    const fillP = () => { const c = years[yearSel.value].chapters[chSel.value]; pSel.replaceChildren(...c.paragraphs.map((p, i) => opt(i, `§${c.n}.${i + 1} ${p}`))); };
    yearSel.addEventListener('change', fillCh);
    chSel.addEventListener('change', fillP);
    const kinds = { pptx: 'PowerPoint', ppt: 'PowerPoint', pdf: 'PDF', docx: 'Word', doc: 'Word', jpg: 'Afbeelding', jpeg: 'Afbeelding', png: 'Afbeelding', webp: 'Afbeelding' };
    const titleFrom = (name) => {
      const t = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    const show = (fl) => {
      list.replaceChildren(...[...fl].map((f) => {
        const li = document.createElement('li');
        const b = document.createElement('b');
        b.textContent = kinds[f.name.split('.').pop().toLowerCase()] || 'Bestand';
        const input = document.createElement('input');
        input.type = 'text'; input.value = titleFrom(f.name); input.setAttribute('aria-label', 'Titel voor ' + f.name);
        li.append(b, input);
        return li;
      }));
    };
    files.addEventListener('change', () => show(files.files));
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
    zone.addEventListener('drop', (e) => show(e.dataTransfer.files));
    const openWith = () => {
      // bestemming: eerst de geopende hoofdstukpagina, anders de laatst gebruikte
      const ctx = document.body.dataset.context ? JSON.parse(document.body.dataset.context) : null;
      const last = ctx || JSON.parse(store.get('ak-last-destination') || 'null');
      if (last) { yearSel.value = last.y; fillCh(); chSel.value = last.c; fillP(); pSel.value = last.p ?? 0; } else fillCh();
      const active = $('[data-toc-link][aria-current="true"]');
      if (ctx && active) pSel.value = Number(active.hash.split('-').pop()) - 1;
      list.replaceChildren(); status.textContent = 'In het prototype wordt nog niets opgeslagen. In WordPress gaat dit naar de mediabibliotheek.';
      dlg.showModal();
    };
    $$('[data-add-open]').forEach((b) => b.addEventListener('click', openWith));
    dlg.addEventListener('close', () => {
      if (dlg.returnValue === 'publish' || dlg.returnValue === 'draft') {
        store.set('ak-last-destination', JSON.stringify({ y: yearSel.value, c: chSel.value, p: pSel.value }));
      }
    });
  }

  /* ---------- verschijnen bij scrollen ---------- */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    els.forEach((el) => [...el.children].forEach((c, i) => c.style.setProperty('--d', i)));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- navigatie: huidige pagina ---------- */
  function initNav() {
    const page = document.body.dataset.page;
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); });
  }

  initAdminDemo();
  initNav();
  initTheme();
  initMenu();
  initSearch();
  initTabs();
  initChapter();
  initLightbox();
  initDisclosures();
  initFilters();
  initAdd();
  initReveal();
})();
