/* Kaartviewer: zoomen met knoppen, wiel, knijpen of toetsen; verschuiven met slepen of pijltjes; schermvullend. */
(() => {
  // Kaartenstrook: de huidige kaart in het midden van de strook zetten.
  const list = document.querySelector('[data-map-switch] .map-switch__list');
  const cur = list && list.querySelector('[aria-current="page"]');
  if (cur) {
    const lr = list.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    list.scrollLeft += (cr.left - lr.left) - (lr.width - cr.width) / 2;
  }
  const viewer = document.querySelector('[data-map-viewer]');
  if (!viewer) return;
  const stage = viewer.querySelector('[data-map-stage]');
  const img = viewer.querySelector('[data-map-img]');
  let s = 1, x = 0, y = 0;
  const apply = () => { if (img) img.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
  const clamp = () => {
    if (!stage || !img) return;
    const r = stage.getBoundingClientRect();
    const w = img.offsetWidth * s, h = img.offsetHeight * s;
    const mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
    x = Math.min(mx, Math.max(-mx, x)); y = Math.min(my, Math.max(-my, y));
  };
  const zoom = (f, cx = 0, cy = 0) => {
    const ns = Math.min(8, Math.max(1, s * f));
    x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns;
    clamp(); apply();
  };
  viewer.querySelectorAll('[data-map-zoom]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.mapZoom;
    if (m === 'in') zoom(1.4); else if (m === 'out') zoom(1 / 1.4); else { s = 1; x = y = 0; apply(); }
  }));
  viewer.querySelector('[data-map-full]')?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else viewer.requestFullscreen?.();
  });
  if (!stage || !img) return;
  const center = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, ...center(e)); }, { passive: false });
  const pts = new Map(); let last = null, pinch = null;
  stage.addEventListener('pointerdown', (e) => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); last = e; });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch) zoom(d / pinch);
      pinch = d; return;
    }
    x += e.clientX - last.clientX; y += e.clientY - last.clientY; last = e; clamp(); apply();
  });
  const up = (e) => { pts.delete(e.pointerId); pinch = null; last = [...pts.values()][0] || null; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', (e) => zoom(1.8, ...center(e)));
  stage.addEventListener('keydown', (e) => {
    const step = 60;
    const k = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (k) { e.preventDefault(); x += k[0]; y += k[1]; clamp(); apply(); }
    if (e.key === '+' || e.key === '=') zoom(1.4);
    if (e.key === '-') zoom(1 / 1.4);
    if (e.key === '0') { s = 1; x = y = 0; apply(); }
  });
})();
