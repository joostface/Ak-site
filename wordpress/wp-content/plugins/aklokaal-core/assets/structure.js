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
  async function itemsPanel(container, allParagraphs, allChapters) {
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
        const note = h('input', { type: 'text', class: 'aks-input aks-small aks-note', value: it.note || '', placeholder: 'Toelichting hier (optioneel)', 'aria-label': 'Toelichting bij ' + it.title });
        note.addEventListener('change', saveOrder);
        const statusTekst = { draft: ' (concept)', ak_archief: ' (archief)' }[it.status] || '';
        const archief = h('button', { type: 'button', class: 'aks-icon aks-archive', title: it.status === 'ak_archief' ? 'Terughalen uit archief' : 'Archiveren', 'aria-label': (it.status === 'ak_archief' ? 'Terughalen: ' : 'Archiveer ') + it.title, text: it.status === 'ak_archief' ? '↺' : '⌫', onclick: async () => {
          await api('items/status', { method: 'POST', json: { ids: [it.id], status: it.status === 'ak_archief' ? 'publish' : 'ak_archief' } });
          say(it.status === 'ak_archief' ? 'Teruggehaald en gepubliceerd.' : 'Gearchiveerd: niet meer zichtbaar voor bezoekers, wel bewaard.'); render();
        } });
        return h('li', { 'data-id': it.id, draggable: 'true', class: 'aks-item' + (it.status !== 'publish' ? ' is-draft' : '') },
          h('input', { type: 'checkbox', class: 'aks-select', 'aria-label': 'Selecteer ' + it.title }),
          h('span', { class: 'aks-grip', 'aria-hidden': 'true', text: '⋮⋮' }),
          h('span', { class: 'aks-kind', text: it.label }),
          h('a', { href: it.edit, class: 'aks-item-title', text: it.title + statusTekst }),
          it.used > 1 ? h('span', { class: 'aks-badge', title: 'Staat op meerdere plekken', text: `${it.used}×` }) : null,
          note, move, moveButtons(it.title), archief,
          h('button', { type: 'button', class: 'aks-icon', 'aria-label': 'Haal ' + it.title + ' uit deze paragraaf', text: '×', onclick: async () => {
            const rest = [...list.children].filter((li) => Number(li.dataset.id) !== it.id).map(toItem);
            await api('items/' + container, { method: 'POST', json: { items: rest } });
            say('Uit de paragraaf gehaald. Het materiaal zelf blijft bewaard.'); render();
          } }));
      }));
      if (!items.length) list.append(h('li', { class: 'aks-empty', text: 'Nog geen materiaal.' }));
    };
    const toItem = (li) => ({ id: Number(li.dataset.id), note: (li.querySelector('.aks-note') || {}).value || '' });
    const geselecteerd = () => [...list.querySelectorAll('.aks-select:checked')].map((c) => Number(c.closest('li').dataset.id));

    // meerdere items tegelijk
    const bulkMove = h('select', { class: 'aks-input aks-small', 'aria-label': 'Geselecteerde verplaatsen naar' },
      h('option', { value: '', text: 'Geselecteerde verplaatsen naar…' }),
      ...allParagraphs.filter((p) => p.id !== container).map((p) => h('option', { value: p.id, text: p.label })));
    bulkMove.addEventListener('change', async () => {
      const ids = geselecteerd();
      if (!bulkMove.value || !ids.length) { bulkMove.value = ''; say('Vink eerst één of meer items aan.'); return; }
      await api('items/move', { method: 'POST', json: { ids, from: container, to: Number(bulkMove.value) } });
      say(`${ids.length} ${ids.length === 1 ? 'item' : 'items'} verplaatst.`); refreshAll();
    });
    const bulkStatus = (status, tekst) => h('button', { type: 'button', class: 'button', text: tekst, onclick: async () => {
      const ids = geselecteerd();
      if (!ids.length) { say('Vink eerst één of meer items aan.'); return; }
      await api('items/status', { method: 'POST', json: { ids, status } });
      say(`${ids.length} ${ids.length === 1 ? 'item' : 'items'}: ${tekst.toLowerCase()}.`); render();
    } });
    const bulkCopy = h('select', { class: 'aks-input aks-small', 'aria-label': 'Geselecteerde ook plaatsen in' },
      h('option', { value: '', text: 'Ook plaatsen in…' }),
      ...allParagraphs.filter((p) => p.id !== container).map((p) => h('option', { value: p.id, text: p.label })));
    bulkCopy.addEventListener('change', async () => {
      const ids = geselecteerd();
      if (!bulkCopy.value || !ids.length) { bulkCopy.value = ''; say('Vink eerst één of meer items aan.'); return; }
      for (const id of ids) await api(`items/${bulkCopy.value}/add`, { method: 'POST', json: { item: id } });
      say(`${ids.length} ${ids.length === 1 ? 'item staat' : 'items staan'} nu ook op de tweede plek (hetzelfde bestand, niet gekopieerd).`);
      bulkCopy.value = ''; refreshAll();
    });
    const bulk = h('div', { class: 'aks-bulk' },
      h('label', { class: 'aks-all' }, h('input', { type: 'checkbox', 'aria-label': 'Alles selecteren', onchange: (e) => list.querySelectorAll('.aks-select').forEach((c) => (c.checked = e.target.checked)) }), ' Alles'),
      bulkMove, bulkCopy, bulkStatus('publish', 'Publiceren'), bulkStatus('draft', 'Naar concept'), bulkStatus('ak_archief', 'Archiveren'));
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
    const chapterId = () => Number(wrap.closest('[data-chapter]').dataset.chapter);
    const moveParagraph = h('select', { class: 'aks-input aks-small', 'aria-label': 'Deze paragraaf verplaatsen naar hoofdstuk' },
      h('option', { value: '', text: 'Hele paragraaf verplaatsen naar hoofdstuk…' }),
      ...allChapters.map((c) => h('option', { value: c.id, text: c.label })));
    moveParagraph.addEventListener('change', async () => {
      if (!moveParagraph.value || Number(moveParagraph.value) === chapterId()) { moveParagraph.value = ''; return; }
      await api('paragraphs/' + container, { method: 'POST', json: { chapter: Number(moveParagraph.value) } });
      say('Paragraaf verplaatst, met al het materiaal. Hij staat achteraan in het nieuwe hoofdstuk.');
      refreshAll();
    });
    wrap.append(bulk, list, h('div', { class: 'aks-tools' },
      h('button', { type: 'button', class: 'button button-primary', text: '+ Nieuw materiaal', onclick: () => open({ context: { chapter: wrap.closest('[data-chapter]').dataset.chapter * 1, paragraph: container }, onDone: render }) }),
      search), results, h('div', { class: 'aks-tools' }, moveParagraph));
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
    const allChapters = [];
    state.forEach((v) => v.years.forEach((y) => y.chapters.forEach((c) => {
      allChapters.push({ id: c.id, label: `${y.name} · H${c.number || '?'} ${c.title}${c.status !== 'publish' ? ' (concept)' : ''}` });
      c.paragraphs.forEach((p) => allParagraphs.push({ id: p.id, label: `${y.name} · H${c.number || '?'} · ${p.label}` }));
    })));
    const losse = h('section', { class: 'aks-losse' });
    api('library?unplaced=1').then((items) => {
      if (!items.length) return;
      losse.append(
        h('h2', { text: `Materiaal zonder plek (${items.length})` }),
        h('p', { class: 'description', text: 'Dit materiaal staat in geen enkele paragraaf, bijvoorbeeld omdat een paragraaf is verwijderd. Kies waar het moet komen.' }),
        h('ul', { class: 'aks-item-list' }, ...items.map((it) => {
          const naar = h('select', { class: 'aks-input aks-small', 'aria-label': 'Plaats ' + it.title + ' in' },
            h('option', { value: '', text: 'Plaats in…' }), ...allParagraphs.map((p) => h('option', { value: p.id, text: p.label })));
          naar.addEventListener('change', async () => {
            if (!naar.value) return;
            await api(`items/${naar.value}/add`, { method: 'POST', json: { item: it.id } });
            say(`${it.title} geplaatst.`); refreshAll();
          });
          return h('li', { class: 'aks-item aks-item--los' }, h('span', { class: 'aks-kind', text: it.label }), h('a', { href: it.edit, class: 'aks-item-title', text: it.title }), naar);
        })));
    }).catch(() => {});

    root.replaceChildren(live, losse, ...state.map((vak) => h('section', { class: 'aks-vak' },
      h('h2', { text: vak.name }),
      ...vak.years.map((jaar) => {
        const list = h('ol', { class: 'aks-chapters' });
        jaar.chapters.forEach((c) => {
          const paras = h('ol', { class: 'aks-paragraphs' });
          c.paragraphs.forEach((p) => {
            const det = h('details', { class: 'aks-para' },
              h('summary', {},
                h('span', { class: 'aks-grip', 'aria-hidden': 'true', text: '⋮⋮' }),
                editable(p.number ? '§' + p.number : '§ –', (n) => api('paragraphs/' + p.id, { method: 'POST', json: { number: n.replace(/^§\s*/, '').replace(/^–$/, '-').trim() } }).then(refreshAll), 'Paragraafnummer (leeg = automatisch, - = geen nummer)'),
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
              if (det.open && !det.dataset.loaded) { det.dataset.loaded = '1'; det.append(await itemsPanel(p.id, allParagraphs, allChapters)); }
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
              moveButtons('Hoofdstuk ' + c.title),
              h('button', { type: 'button', class: 'aks-icon', title: `Weghalen uit ${jaar.name}`, 'aria-label': `Haal hoofdstuk ${c.title} weg uit ${jaar.name}`, text: '×', onclick: async (e) => {
                e.preventDefault();
                const gedeeld = (c.years || []).length > 1;
                const vraag = gedeeld
                  ? `“${c.title}” weghalen uit ${jaar.name}? Het hoofdstuk blijft bestaan in de andere leerjaren, met al zijn materiaal.`
                  : `“${c.title}” weghalen uit ${jaar.name}? Dit verwijdert alleen deze versie (met ${c.paragraphs.length} paragrafen) naar de prullenbak. Hoofdstukken met dezelfde naam in andere leerjaren blijven staan.`;
                if (!confirm(vraag)) return;
                try { await api(`chapters/${c.id}?leerjaar=${jaar.id}`, { method: 'DELETE' }); }
                catch (err) {
                  if (!confirm(err.message + '\n\nToch weghalen?')) return;
                  await api(`chapters/${c.id}?leerjaar=${jaar.id}&force=1`, { method: 'DELETE' });
                }
                say(gedeeld ? `Weggehaald uit ${jaar.name}; het hoofdstuk staat nog in de andere leerjaren.` : 'Hoofdstuk verwijderd. Eventueel materiaal staat bovenaan onder “Materiaal zonder plek”.');
                refreshAll();
              } })),
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
