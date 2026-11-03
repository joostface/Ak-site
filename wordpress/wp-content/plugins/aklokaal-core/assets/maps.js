/* Kaarten toevoegen: live voorbeeld van het kaartje in het overzicht en de kaart zelf. */
(() => {
  const C = window.AKLOKAAL || {};
  const $ = (id) => document.getElementById(id);
  const url = $('akm-url'); if (!url) return;
  const title = $('akm-title'), desc = $('akm-desc');
  const cardMedia = $('akm-card-media'), cardTitle = $('akm-card-title'), cardDesc = $('akm-card-desc'), big = $('akm-big'), hint = $('akm-hint');
  let fetched = { title: '', description: '' }, timer, last = '';

  const valid = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x : null; } catch { return null; } };
  const frame = (u, cls) => {
    const f = document.createElement('iframe');
    f.src = u; f.className = cls; f.title = ''; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
    // Andere herkomst: eigen opslag mag; zelfde herkomst: alleen scripts (net als op de site).
    f.setAttribute('sandbox', new URL(u).origin === location.origin ? 'allow-scripts' : 'allow-scripts allow-same-origin allow-popups');
    return f;
  };
  const text = () => {
    cardTitle.textContent = title.value.trim() || fetched.title || 'Titel van de kaart';
    cardDesc.textContent = desc.value.trim() || fetched.description || '';
    title.placeholder = fetched.title ? `Wordt: ${fetched.title}` : '';
  };
  const update = async () => {
    const u = url.value.trim();
    if (u === last) return; last = u;
    const ok = valid(u);
    if (!ok) { cardMedia.replaceChildren(Object.assign(document.createElement('span'), { className: 'akm-empty', textContent: u ? 'Dit is nog geen volledig adres (begin met https://)' : 'Plak links een adres' })); big.replaceChildren(); hint.hidden = true; return; }
    cardMedia.replaceChildren(frame(u, 'akm-live'));
    big.replaceChildren(frame(u, 'akm-big__frame'));
    hint.hidden = false;
    fetched = { title: '', description: '' }; text();
    try {
      const res = await fetch(C.rest + 'news/lookup', { method: 'POST', credentials: 'same-origin', headers: { 'X-WP-Nonce': C.nonce, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) });
      const d = await res.json();
      if (url.value.trim() === u && res.ok) { fetched = { title: d.title || '', description: d.description || '' }; text(); }
    } catch { /* geen voorbeeldtitel, niet erg */ }
  };
  url.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 450); });
  url.addEventListener('change', update);
  title.addEventListener('input', text); desc.addEventListener('input', text);
})();
