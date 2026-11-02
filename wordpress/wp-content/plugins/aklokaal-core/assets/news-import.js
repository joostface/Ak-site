/* Nieuws importeren in wp-admin: hetzelfde formulier, meteen op "Link plakken". */
(() => {
  const el = document.getElementById('aklokaal-news-import');
  if (!el || !window.AKLokaalAdd) return;
  const f = window.AKLokaalAdd.buildForm({});
  el.append(f.form);
  f.setMode('link');
  // Geopend via de bladwijzerknop: #ak={...}
  if (location.hash.startsWith('#ak=')) {
    try {
      const d = JSON.parse(decodeURIComponent(location.hash.slice(4)));
      history.replaceState(null, '', location.pathname + location.search);
      f.prefillNews(d);
    } catch { /* ongeldige gegevens: gewoon leeg formulier */ }
  }
})();
