// Maakt de kaartdata voor de toepassingen uit het pakket "world-atlas" (Natural Earth, publiek domein).
// Gebruik:  npm pack world-atlas@2 && tar -xzf world-atlas-*.tgz
//           node apps/_gedeeld/tools/maak-data.mjs ./package
// Resultaat in apps/_gedeeld/data/: wereld-110m.json en wereld-50m.json (TopoJSON, ongewijzigd)
// en nederland.json (GeoJSON van Nederland, België en Duitsland, vereenvoudigd).
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('Geef de map van world-atlas op.'); process.exit(1); }
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

copyFileSync(join(src, 'countries-110m.json'), join(out, 'wereld-110m.json'));
copyFileSync(join(src, 'countries-50m.json'), join(out, 'wereld-50m.json'));

// TopoJSON → GeoJSON (zelfde algoritme als apps/_gedeeld/geo.js)
const topo = JSON.parse(readFileSync(join(src, 'countries-10m.json'), 'utf8'));
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; }); });
const ring = (ids) => { const pts = []; for (const i of ids) { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };

// Alleen het Europese deel, en punten dunner maken (minimaal ~0.004° uit elkaar)
const inEurope = (r) => r.some(([x, y]) => x > -10 && x < 25 && y > 45 && y < 60);
const thin = (r, d) => { const o = [r[0]]; for (const p of r.slice(1)) { const q = o[o.length - 1]; if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > d) o.push(p); } o.push(r[r.length - 1]); return o.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]); };
const want = { '528': 'Nederland', '056': 'België', '276': 'Duitsland' };
const features = [];
for (const g of topo.objects.countries.geometries) {
  if (!want[g.id]) continue;
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  const coords = polys.map((p) => p.map(ring)).filter((p) => inEurope(p[0])).map((p) => p.map((r) => thin(r, g.id === '528' ? 0.004 : 0.02))).filter((p) => p[0].length > 3);
  features.push({ type: 'Feature', id: g.id, properties: { naam: want[g.id] }, geometry: { type: 'MultiPolygon', coordinates: coords } });
}
writeFileSync(join(out, 'nederland.json'), JSON.stringify({ type: 'FeatureCollection', features }));
console.log('klaar:', features.map((f) => f.properties.naam + ' ' + f.geometry.coordinates.length).join(', '));
