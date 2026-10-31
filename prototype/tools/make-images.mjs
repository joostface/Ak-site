// Genereert de voorbeeldkaarten (rasterafbeeldingen) voor het prototype.
// Het zijn getekende kaarten op basis van ruis: reliëf, diepte, bevolkingsdichtheid, klimaat.
// Ze staan in voor echt kaartmateriaal en worden later vervangen door eigen uploads.
// Gebruik: node prototype/tools/make-images.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'img');
mkdirSync(out, { recursive: true });

const jobs = [
  { name: 'reliefkaart', kind: 'relief', seed: 7, w: 2400, h: 1350, sea: 0.34 },
  { name: 'reliefkaart-berg', kind: 'relief', seed: 21, w: 1600, h: 2000, sea: 0.18 },
  { name: 'dieptekaart', kind: 'sea', seed: 3, w: 1600, h: 1000, sea: 0.62 },
  { name: 'delta', kind: 'relief', seed: 42, w: 1600, h: 1000, sea: 0.5, flat: true },
  { name: 'bevolking', kind: 'dots', seed: 11, w: 1600, h: 1000, sea: 0.45 },
  { name: 'klimaat', kind: 'climate', seed: 5, w: 1600, h: 1000, sea: 0.42 },
  { name: 'energie', kind: 'hex', seed: 9, w: 1600, h: 1200, sea: 0.4 },
  { name: 'rivier', kind: 'relief', seed: 77, w: 1200, h: 1500, sea: 0.28 },
];

const pageScript = String.raw`
window.draw = ({ kind, seed, w, h, sea, flat }) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  // value noise
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const N = 256, perm = [], val = [];
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = rnd(); }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const P = (i) => perm[i & 255];
  const lerp = (a, b, t) => a + (b - a) * t, fade = (t) => t * t * (3 - 2 * t);
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
    const a = val[P(xi + P(yi))], b = val[P(xi + 1 + P(yi))], c2 = val[P(xi + P(yi + 1))], d = val[P(xi + 1 + P(yi + 1))];
    return lerp(lerp(a, b, xf), lerp(c2, d, xf), yf);
  };
  const fbm = (x, y) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < 7; o++) { v += a * vn(x * f, y * f); a *= 0.5; f *= 2.03; } return v; };
  const sc = 5 / Math.max(w, h) * (flat ? 0.8 : 1);
  const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = fbm(x * sc, y * sc);
    v = Math.pow(v, flat ? 1.6 : 1.25) * 1.25;
    H[y * w + x] = v;
  }
  const img = g.createImageData(w, h), d = img.data;
  const ramp = (stops, t) => {
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => v + (c1[j] - v) * k);
    }
    return stops[stops.length - 1][1];
  };
  const landStops = [[0, [86, 120, 92]], [0.12, [124, 150, 104]], [0.3, [176, 170, 120]], [0.5, [160, 128, 92]], [0.7, [128, 104, 86]], [1, [236, 232, 222]]];
  const seaStops = [[0, [16, 34, 46]], [0.5, [34, 70, 86]], [0.85, [70, 118, 128]], [1, [118, 160, 160]]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = H[i];
    const dx = (H[i + 1] ?? v) - (H[i - 1] ?? v), dy = (H[i + w] ?? v) - (H[i - w] ?? v);
    const shade = Math.max(0.55, Math.min(1.25, 1 + (-dx * 0.7 + -dy * 0.7) * (flat ? 260 : 140)));
    let col;
    if (kind === 'climate') {
      const lat = y / h, t = Math.max(0, Math.min(1, lat * 0.85 + (v - 0.5) * 0.35));
      col = v < sea ? ramp(seaStops, v / sea) : ramp([[0, [214, 226, 228]], [0.3, [150, 182, 150]], [0.55, [96, 140, 96]], [0.75, [196, 172, 108]], [1, [210, 130, 84]]], t);
      if (v >= sea) col = col.map((c) => c * (0.85 + 0.15 * shade));
    } else if (kind === 'dots' || kind === 'hex') {
      col = v < sea ? [20, 28, 26] : [38, 52, 44].map((c) => c * (0.9 + 0.1 * shade));
    } else if (v < sea) {
      col = ramp(seaStops, Math.pow(v / sea, kind === 'sea' ? 1.4 : 2.5));
      if (kind === 'sea' && Math.abs(((v / sea) * 14) % 1) < 0.05) col = col.map((c) => c + 22);
    } else {
      col = ramp(landStops, (v - sea) / (1.15 - sea)).map((c) => c * shade);
      const ct = ((v - sea) * (flat ? 70 : 34)) % 1;
      if (ct < (flat ? 0.04 : 0.06)) col = col.map((c) => c * 0.78);
    }
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (kind === 'dots') {
    for (let k = 0; k < 26000; k++) {
      const x = rnd() * w, y = rnd() * h, v = H[(y | 0) * w + (x | 0)];
      const dens = vn(x * sc * 3 + 50, y * sc * 3 + 50);
      if (v < sea || rnd() > Math.pow(dens, 4) * 3) continue;
      g.fillStyle = 'rgba(245, 230, 170,' + (0.35 + rnd() * 0.6) + ')';
      g.beginPath(); g.arc(x, y, 0.8 + rnd() * 2.2 * dens, 0, 7); g.fill();
    }
  }
  if (kind === 'hex') {
    const r = 26, hh = Math.sqrt(3) * r;
    for (let row = 0; row * hh * 0.5 < h + hh; row++) for (let col = 0; col * r * 3 < w + r * 3; col++) {
      const cx = col * r * 3 + (row % 2) * r * 1.5, cy = row * hh * 0.5;
      const v = H[Math.min(h - 1, cy | 0) * w + Math.min(w - 1, cx | 0)];
      if (v < sea) continue;
      const t = vn(cx * sc * 2 + 9, cy * sc * 2 + 9);
      const col2 = ramp([[0, [60, 84, 70]], [0.5, [120, 168, 126]], [0.8, [190, 214, 160]], [1, [236, 226, 150]]], t);
      g.fillStyle = 'rgb(' + col2.map(Math.round).join(',') + ')';
      g.beginPath();
      for (let a = 0; a < 6; a++) { const an = Math.PI / 3 * a; g.lineTo(cx + Math.cos(an) * (r - 2), cy + Math.sin(an) * (r - 2)); }
      g.closePath(); g.fill();
    }
  }
  return c.toDataURL('image/jpeg', 0.84);
};`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: pageScript });
for (const job of jobs) {
  const url = await page.evaluate((j) => window.draw(j), job);
  writeFileSync(join(out, job.name + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', job.name);
}
await browser.close();
