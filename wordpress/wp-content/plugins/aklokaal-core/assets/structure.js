/* Aardrijkskundelokaal — structuurbeheer in wp-admin.
   Vak → leerjaar → hoofdstukken → paragrafen → materiaal.
   Slepen (of de pijltjes, voor toetsenbord) bepaalt de volgorde. */
(() => {
  const root = document.getElementById('aklokaal-structure');
  if (!root || !window.AKLokaalAdd) return;
  const { api, loadStructure, h, open } = window.AKLokaalAdd;
  const say = (msg) => { live.textContent = msg; };
  const live = h('p', { class: 'aks-live', role: 'status' });

  /* ---------- slepen ---------- */
  function sortable(list, onEnd) {
    let dragging = null;
    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest('li');
      if (!li || li.parentElement !== list) return;
      dragging = li; li.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.dataset.id);
      e.stopPropagation();
    });
    list.addEventListener('dragover', (e) => {
      if (!dragging || dragging.parentElement !== list) return;
      e.preventDefault();
      const after = [...list.children].find((c) => c !== dragging && e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
      list.insertBefore(dragging, after || null);
    });
    list.addEventListener('dragend', () => {
      if (!dragging) return;
      dragging.classList.remove('is-dragging'); dragging = null;
      onEnd([...list.children].map((li) => Number(li.dataset.id)));
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-move]');
      if (!b) return;
      const li = b.closest('li');
      if (li.parentElement !== list) return;
      if (b.dataset.move === 'up' && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
      if (b.dataset.move === 'down' && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
      b.focus();
      onEnd([...list.children].map((x) => Number(x.dataset.id)));
    });
  }
  const moveButtons = (label) => h('span', { class: 'aks-move' },
    h('button', { type: 'button', class: 'aks-icon', 'data-move': 'up', 'aria-label': label + ' omhoog', text: '↑' }),
    h('button', { type: 'button', class: 'aks-icon', 'data-move': 'down', 'aria-label': label + ' omlaag', text: '↓' }));

  /* ---------- hernoemen ---------- */
  function editable(text, save, label) {
    const span = h('button', { type: 'button', class: 'aks-title', title: 'Klik om te hernoemen', 'aria-label': label + ': ' + text + ' (hernoemen)', text });
    span.addEventListener('click', () => {
      const input = h('input', { type: 'text', class: 'aks-input', value: span.textContent, 'aria-label': label });
      span.replaceWith(input); input.focus(); input.select();
      const done = async (ok) => {
        input.replaceWith(span);
        if (ok && input.value.trim() && input.value !== span.textContent) {
          span.textContent = input.value.trim();
          try { await save(input.value.trim()); say('Opgeslagen.'); } catch (e) { say(e.message); }
        }
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
      input.addEventListener('blur', () => done(true));
    });
    return span;
  }

  /* ---------- materiaal in een paragraaf ---------- */
  async function itemsPanel(container, allParagraphs) {
    const wrap = h('div', { class: 'aks-items' });
    const list = h('ol', { class: 'aks-item-list' });
    const render = async () => {
      const items = await api('items/' + container);
      list.replaceChildren(...items.map((it) => {
        const move = h('select', { class: 'aks-input aks-small', 'aria-label': 'Verplaats naar' },
          h('option', { value: '', text: 'Verplaats naar…' }),
          ...allParagraphs.filter((p) => p.id !== container).map((p) => h('option', { value: p.id, text: p.label })));
        move.addEventListener('change', async () => {
          if (!move.value) return;
          await api('items/move', { method: 'POST', json: { ids: [it.id], from: container, to: Number(move.value) } });
          say('Verplaatst.'); refreshAll();
        });
        const note = h('input', { type: 'text', class: 'aks-input aks-small', value: it.note || '', placeholder: 'Toelichting hier (optioneel)', 'aria-label': 'Toelichting bij ' + it.title });
        note.addEventListener('change', saveOrder);
        return h('li', { 'data-id': it.id, draggable: 'true', class: 'aks-item' + (it.status !== 'publish' ? ' is-draft' : '') },
          h('span', { class: 'aks-grip', 'aria-hidden': 'true', text: '⋮⋮' }),
          h('span', { class: 'aks-kind', text: it.label }),
          h('a', { href: it.edit, class: 'aks-item-title', text: it.title + (it.status !== 'publish' ? ' (concept)' : '') }),
          it.used > 1 ? h('span', { class: 'aks-badge', title: 'Staat op meerdere plekken', text: `${it.used}×` }) : null,
          note, move, moveButtons(it.title),
          h('button', { type: 'button', class: 'aks-icon', 'aria-label': 'Haal ' + it.title + ' uit deze paragraaf', text: '×', onclick: async () => {
            const rest = [...list.children].filter((li) => Number(li.dataset.id) !== it.id).map(toItem);
            await api('items/' + container, { method: 'POST', json: { items: rest } });
            say('Uit de paragraaf gehaald. Het materiaal zelf blijft bewaard.'); render();
          } }));
      }));
      if (!items.length) list.append(h('li', { class: 'aks-empty', text: 'Nog geen materiaal.' }));
    };
    const toItem = (li) => ({ id: Number(li.dataset.id), note: (li.querySelector('input') || {}).value || '' });
    async function saveOrder() {
      const items = [...list.children].filter((li) => li.dataset.id).map(toItem);
      await api('items/' + container, { method: 'POST', json: { items } });
      say('Volgorde opgeslagen.');
    }
    sortable(list, saveOrder);

    // bestaand materiaal hergebruiken
    const search = h('input', { type: 'search', class: 'aks-input aks-small', placeholder: 'Bestaand materiaal zoeken en plaatsen…', 'aria-label': 'Bestaand materiaal zoeken' });
    const results = h('ul', { class: 'aks-results' });
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        if (search.value.trim().length < 2) { results.replaceChildren(); return; }
        const found = await api('library?q=' + encodeURIComponent(search.value.trim()));
        results.replaceChildren(...found.map((it) => h('li', {}, h('button', { type: 'button', class: 'aks-link', onclick: async () => {
          await api(`items/${container}/add`, { method: 'POST', json: { item: it.id } });
          search.value = ''; results.replaceChildren(); say(`${it.title} geplaatst.`); render();
        } }, `${it.label}: ${it.title}`))));
      }, 300);
    });
    wrap.append(list, h('div', { class: 'aks-tools' },
      h('button', { type: 'button', class: 'button button-primary', text: '+ Nieuw materiaal', onclick: () => open({ context: { chapter: wrap.closest('[data-chapter]').dataset.chapter * 1, paragraph: container }, onDone: render }) }),
      search), results);
    await render();
    return wrap;
  }

  /* ---------- de boom ---------- */
  let state = null;
  async function refreshAll() {
    const openIds = [...root.querySelectorAll('details[open][data-chapter]')].map((d) => d.dataset.chapter);
    state = await loadStructure(true);
    render(openIds);
  }

  function render(openIds = []) {
    const allParagraphs = [];
    state.forEach((v) => v.years.forEach((y) => y.chapters.forEach((c) => c.paragraphs.forEach((p) => allParagraphs.push({ id: p.id, label: `${y.name} · §${p.number} ${p.title}` })))));

    root.replaceChildren(live, ...state.map((vak) => h('section', { class: 'aks-vak' },
      h('h2', { text: vak.name }),
      ...vak.years.map((jaar) => {
        const list = h('ol', { class: 'aks-chapters' });
        jaar.chapters.forEach((c) => {
          const paras = h('ol', { class: 'aks-paragraphs' });
          c.paragraphs.forEach((p) => {
            const det = h('details', { class: 'aks-para' },
              h('summary', {},
                h('span', { class: 'aks-grip', 'aria-hidden': 'true', text: '⋮⋮' }),
                h('span', { class: 'aks-num', text: '§' + p.number }),
                editable(p.title, (title) => api('paragraphs/' + p.id, { method: 'POST', json: { title } }), 'Paragraaf'),
                h('span', { class: 'aks-count', text: `${p.count} items` }),
                moveButtons('Paragraaf ' + p.title),
                h('button', { type: 'button', class: 'aks-icon', 'aria-label': 'Verwijder paragraaf ' + p.title, text: '×', onclick: async (e) => {
                  e.preventDefault();
                  if (!confirm(`Paragraaf “${p.title}” verwijderen? Hij gaat naar de prullenbak.`)) return;
                  try { await api('paragraphs/' + p.id, { method: 'DELETE' }); }
                  catch (err) {
                    if (!confirm(err.message + '\n\nToch verwijderen? Het materiaal zelf blijft bewaard.')) return;
                    await api('paragraphs/' + p.id + '?force=1', { method: 'DELETE' });
                  }
                  say('Paragraaf verwijderd.'); refreshAll();
                } })));
            det.addEventListener('toggle', async () => {
              if (det.open && !det.dataset.loaded) { det.dataset.loaded = '1'; det.append(await itemsPanel(p.id, allParagraphs)); }
            }, { once: false });
            paras.append(h('li', { 'data-id': p.id, draggable: 'true' }, det));
          });
          sortable(paras, async (ids) => { await api('structure/order', { method: 'POST', json: { ids } }); say('Volgorde van paragrafen opgeslagen. Nummers zijn bijgewerkt.'); refreshAll(); });

          const addPara = h('form', { class: 'aks-add', onsubmit: async (e) => {
            e.preventDefault();
            const input = e.target.querySelector('input');
            if (!input.value.trim()) return;
            await api('paragraphs', { method: 'POST', json: { chapter: c.id, title: input.value.trim() } });
            say('Paragraaf toegevoegd.'); refreshAll();
          } }, h('input', { type: 'text', class: 'aks-input', placeholder: 'Nieuwe paragraaf…', 'aria-label': 'Titel nieuwe paragraaf in ' + c.title }), h('button', { class: 'button', text: 'Toevoegen' }));

          const statusBtn = h('button', { type: 'button', class: 'button aks-status ' + (c.status === 'publish' ? 'is-live' : ''), text: c.status === 'publish' ? 'Gepubliceerd' : 'Concept', title: 'Klik om te wisselen', onclick: async (e) => {
            e.preventDefault();
            await api('chapters/' + c.id, { method: 'POST', json: { status: c.status === 'publish' ? 'draft' : 'publish' } });
            refreshAll();
          } });

          const det = h('details', { class: 'aks-chapter', 'data-chapter': c.id, open: openIds.includes(String(c.id)) },
            h('summary', {},
              h('span', { class: 'aks-grip', 'aria-hidden': 'true', text: '⋮⋮' }),
              editable('H' + (c.number || '?'), (n) => api('chapters/' + c.id, { method: 'POST', json: { number: n.replace(/^H/i, '') } }), 'Hoofdstuknummer'),
              editable(c.title, (title) => api('chapters/' + c.id, { method: 'POST', json: { title } }), 'Hoofdstuk'),
              h('span', { class: 'aks-count', text: `${c.paragraphs.length} paragrafen` }),
              statusBtn,
              h('a', { class: 'button-link', href: c.url, target: '_blank', rel: 'noopener', text: 'Bekijk' }),
              moveButtons('Hoofdstuk ' + c.title)),
            paras, addPara);
          list.append(h('li', { 'data-id': c.id, draggable: 'true' }, det));
        });
        sortable(list, async (ids) => { await api('structure/order', { method: 'POST', json: { ids } }); say('Volgorde van hoofdstukken opgeslagen.'); });

        const addCh = h('form', { class: 'aks-add', onsubmit: async (e) => {
          e.preventDefault();
          const [num, title] = e.target.querySelectorAll('input');
          if (!title.value.trim()) return;
          await api('chapters', { method: 'POST', json: { title: title.value.trim(), number: num.value.trim(), vak: vak.id, leerjaar: jaar.id, status: 'draft', first_paragraph: 'Inleiding' } });
          say('Hoofdstuk aangemaakt als concept.'); refreshAll();
        } },
          h('input', { type: 'text', class: 'aks-input aks-num-input', placeholder: 'Nr.', 'aria-label': 'Hoofdstuknummer' }),
          h('input', { type: 'text', class: 'aks-input', placeholder: 'Nieuw hoofdstuk in ' + jaar.name + '…', 'aria-label': 'Titel nieuw hoofdstuk in ' + jaar.name }),
          h('button', { class: 'button', text: 'Hoofdstuk maken' }));

        return h('div', { class: 'aks-year' }, h('h3', { text: jaar.name }), list, addCh);
      }))));
  }

  refreshAll().catch((e) => root.replaceChildren(h('p', { text: e.message })));
})();
