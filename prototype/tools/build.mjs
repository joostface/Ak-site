// Vult de gedeelde onderdelen in alle pagina's van het prototype.
// Gedeelde stukken staan tussen markeringen, bijvoorbeeld
//   <!-- partial:header --> ... <!-- /partial:header -->
//   <!-- gen:year-tabs --> ... <!-- /gen:year-tabs -->
// Pas een partial of data.js aan en draai: node prototype/tools/build.mjs
// (In WordPress doen template-parts en PHP hetzelfde werk.)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const partial = (n) => readFileSync(join(dir, 'partials', n + '.html'), 'utf8').trim();
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(dir, 'assets/js/data.js'), 'utf8'), ctx);
const data = ctx.window.AK_DATA;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Schatting van materiaal per hoofdstuk, alleen voor het prototype
const materials = (c) => c.paragraphs.length * 4 + (c.n % 3);

function bands(year, headingLevel = 'h3') {
  return `<ol class="bands">\n${year.chapters.map((c) => `      <li><a class="band${c.draft ? ' band--draft' : ''}" href="${c.href || 'hoofdstuk.html'}">
        <span class="band__num">H${c.n}</span>
        <span class="band__title">${esc(c.title)}<span class="band__note">${esc(c.paragraphs.slice(0, 3).join(' · '))}${c.paragraphs.length > 3 ? ' …' : ''}</span></span>
        <span class="band__meta">${c.draft ? 'Concept, nog niet zichtbaar' : `${count(c.paragraphs.length, 'paragraaf', 'paragrafen')} · ${materials(c)} materialen`}</span>
      </a></li>`).join('\n')}\n    </ol>`;
}

const yearImages = ['delta', 'klimaat', 'bevolking', 'energie', 'dieptekaart', 'reliefkaart-berg'];

const gens = {
  'year-tabs': () => {
    const def = data.years.findIndex((y) => y.slug === '3-vwo');
    return `<div class="years__body" data-tabs data-default="${def}">
  <div class="years__tabs" role="tablist" aria-label="Leerjaren" aria-orientation="vertical">
${data.years.map((y) => `    <button class="year-tab" role="tab" type="button" id="tab-${y.slug}" aria-controls="panel-${y.slug}" aria-selected="false" data-year="${y.slug}"><strong>${esc(y.name)}</strong><span>${count(y.chapters.length, 'hoofdstuk', 'hoofdstukken')}</span></button>`).join('\n')}
  </div>
  <div>
${data.years.map((y) => `  <div class="year-panel" role="tabpanel" id="panel-${y.slug}" aria-labelledby="tab-${y.slug}">
    <h3 class="visually-hidden">${esc(y.name)}</h3>
    ${bands(y)}
  </div>`).join('\n')}
  </div>
</div>`;
  },
  'year-blocks': () => data.years.map((y, i) => `<section class="year-block" id="leerjaar-${y.slug}" aria-labelledby="h-${y.slug}">
  <div class="year-block__head" data-reveal><div>
    <h2 id="h-${y.slug}">${esc(y.name)}</h2>
    <p>${count(y.chapters.length, 'hoofdstuk', 'hoofdstukken')}, ${count(y.chapters.reduce((a, c) => a + c.paragraphs.length, 0), 'paragraaf', 'paragrafen')}.</p>
    <img class="year-block__img" src="assets/img/${yearImages[i % yearImages.length]}.jpg" loading="lazy" alt="">
  </div></div>
  ${bands(y)}
</section>`).join('\n\n'),
};

const pages = readdirSync(dir).filter((f) => f.endsWith('.html'));
for (const f of pages) {
  let html = readFileSync(join(dir, f), 'utf8');
  html = html.replace(/<!-- partial:(\w+) -->[\s\S]*?<!-- \/partial:\1 -->/g, (_, n) => `<!-- partial:${n} -->\n${partial(n)}\n<!-- /partial:${n} -->`);
  html = html.replace(/<!-- gen:([\w-]+) -->[\s\S]*?<!-- \/gen:\1 -->/g, (_, n) => `<!-- gen:${n} -->\n${gens[n]()}\n<!-- /gen:${n} -->`);
  writeFileSync(join(dir, f), html);
  console.log('bijgewerkt', f);
}
