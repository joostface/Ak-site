/* Nieuws importeren in wp-admin: hetzelfde formulier, meteen op "Link plakken". */
(() => {
  const el = document.getElementById('aklokaal-news-import');
  if (!el || !window.AKLokaalAdd) return;
  const f = window.AKLokaalAdd.buildForm({ context: { none: true } });
  el.append(f.form);
  f.setMode('link');
})();
