// Rooktest voor een draaiende WordPress-installatie met demo-inhoud.
// Controleert de drie belangrijkste onderdelen in een echte browser:
//   1. de hoofdstukpagina met vast paragrafenmenu en deelbare ankers
//   2. materiaal toevoegen via "+ Toevoegen" vanaf een geopende hoofdstukpagina
//   3. een nieuwsartikel toevoegen door een link te plakken (handmatige aanvulling)
// en daarnaast: structuurbeheer, licht/donker, zoeken, mobiel menu.
//
// Gebruik:  SITE=http://localhost:8080 WP_USER=docent WP_PASS=... node tools/smoke-test.mjs
// Schermafbeeldingen komen in ./.smoke/
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const { chromium } = playwright;

const SITE = process.env.SITE || 'http://localhost:8080';
const USER = process.env.WP_USER || 'docent';
const PASS = process.env.WP_PASS || '';
const OUT = '.smoke';
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FOUT'} ${msg}`); if (!cond) failures++; };

const browser = await chromium.launch();
const errors = [];

/* ---------- als bezoeker ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(SITE + '/');
  ok(await page.locator('h1').first().isVisible(), 'homepage heeft een h1');
  ok((await page.getAttribute('html', 'data-theme')) === 'dark', 'standaard donker');
  await page.click('[data-theme-toggle]');
  ok((await page.getAttribute('html', 'data-theme')) === 'light', 'wisselen naar licht');
  await page.reload();
  ok((await page.getAttribute('html', 'data-theme')) === 'light', 'keuze wordt onthouden');
  await page.click('[data-theme-toggle]');
  await page.screenshot({ path: `${OUT}/home.png` });

  await page.fill('#home-search', 'kringloop');
  await page.waitForSelector('#home-results a', { timeout: 5000 }).catch(() => {});
  ok((await page.locator('#home-results a').count()) > 0, 'live zoeken geeft resultaten');

  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  const sections = await page.locator('section.paragraph').count();
  ok(sections === 5, `hoofdstuk toont alle ${sections} paragrafen op één pagina`);
  await page.locator('#paragraaf-2-3').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(600);
  const active = await page.locator('.toc a[aria-current="true"]').first().textContent();
  ok(/2\.3|2\.4/.test(active || ''), `menu markeert de actieve paragraaf (${(active || '').trim()})`);
  const tocTop = await page.locator('.toc').boundingBox();
  ok(tocTop && tocTop.y < 200, 'paragrafenmenu blijft in beeld tijdens scrollen');
  await page.screenshot({ path: `${OUT}/hoofdstuk.png` });

  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/#paragraaf-2-4');
  await page.waitForTimeout(500);
  const y = await page.locator('#paragraaf-2-4').boundingBox();
  ok(y && y.y < 260, 'ankerlink opent direct bij de juiste paragraaf');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', (e) => errors.push(e.message));
  await mobile.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  ok(await mobile.locator('.toc-mobile__button').isVisible(), 'mobiel: uitklapbaar paragrafenmenu');
  await mobile.click('.toc-mobile__button');
  await mobile.click('.toc-mobile__list a >> nth=2');
  await mobile.waitForTimeout(700);
  ok(await mobile.locator('.toc-mobile__list').isHidden(), 'mobiel: menu sluit na kiezen');
  await mobile.screenshot({ path: `${OUT}/hoofdstuk-mobiel.png` });
  await mobile.click('[data-menu-toggle]');
  ok(await mobile.locator('#site-nav').isVisible(), 'mobiel: hoofdmenu opent');
  await mobile.close();

  for (const path of ['/lesmateriaal/', '/nieuws/', '/kaarten/', '/kaarten/klimaatzones/', '/interactief/', '/bundels/water-te-veel-en-te-weinig/', '/over/', '/?s=energie']) {
    const res = await page.goto(SITE + path);
    ok(res.status() === 200, `${path} laadt (${res.status()})`);
  }
  await page.close();
}

/* ---------- als beheerder ---------- */
if (PASS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(SITE + '/wp-login.php');
  await page.fill('#user_login', USER);
  await page.fill('#user_pass', PASS);
  await page.click('#wp-submit');
  await page.waitForLoadState('networkidle');

  // 2. Bestand toevoegen vanaf de hoofdstukpagina
  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/#paragraaf-2-2');
  await page.waitForTimeout(600);
  await page.click('[data-add-open]');
  await page.waitForSelector('.akq-dialog[open]');
  await page.waitForFunction(() => document.querySelectorAll('.akq-dest select')[3]?.options.length > 1);
  const chosen = await page.evaluate(() => {
    const s = document.querySelectorAll('.akq-dest select');
    return [s[2].selectedOptions[0]?.textContent, s[3].selectedOptions[0]?.textContent];
  });
  ok(/Energie/.test(chosen[0]) && /2\.2/.test(chosen[1]), `bestemming al ingevuld: ${chosen.join(' / ')}`);
  const pdf = join(tmpdir(), 'Werkblad_kringloop-v2.pdf');
  writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  await page.setInputFiles('.akq-dialog input[type=file]', pdf);
  const title = await page.inputValue('.akq-files input');
  ok(title === 'Werkblad kringloop v2', `titel voorgesteld uit bestandsnaam: "${title}"`);
  await page.screenshot({ path: `${OUT}/toevoegen.png` });
  await page.click('.akq-dialog .akq-btn--main');
  await page.waitForSelector('.akq-status a', { timeout: 15000 }).catch(() => {});
  ok(/gepubliceerd/.test(await page.textContent('.akq-status')), 'bestand gepubliceerd: ' + (await page.textContent('.akq-status')));
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  ok((await page.locator('#paragraaf-2-2 h3', { hasText: 'Werkblad kringloop v2' }).count()) === 1, 'nieuw materiaal staat in §2.2 in de huisstijl');

  // Ongeldig bestand wordt geweigerd
  const bad = join(tmpdir(), 'script.php');
  writeFileSync(bad, '<?php echo 1;');
  const resBad = await page.evaluate(async (cfg) => {
    const fd = new FormData();
    fd.append('files[]', new Blob(['<?php echo 1;'], { type: 'application/x-php' }), 'script.php');
    const r = await fetch(cfg.rest + 'materials', { method: 'POST', headers: { 'X-WP-Nonce': cfg.nonce }, body: fd, credentials: 'same-origin' });
    return r.json();
  }, await page.evaluate(() => window.AKLOKAAL));
  ok(resBad.errors && resBad.errors.length === 1 && !resBad.created.length, 'PHP-bestand wordt geweigerd');

  // 3. Nieuws via link (de testomgeving heeft geen internet: handmatige aanvulling)
  await page.goto(SITE + '/wp-admin/admin.php?page=aklokaal-nieuws');
  await page.fill('.akq-form input[type=url]', 'https://example.org/artikel/zeespiegel-stijgt?utm_source=test');
  await page.waitForSelector('.akq-news:not([hidden])', { timeout: 20000 });
  const news = page.locator('.akq-news');
  await news.locator('input[type=text]').first().fill('Zeespiegel stijgt sneller langs de Noordzeekust');
  await news.locator('input[type=text]').nth(1).fill('Voorbeeldkrant');
  await news.locator('input[type=date]').fill('2026-10-30');
  await news.locator('textarea').fill('Nieuwe metingen laten zien dat de zeespiegel sneller stijgt dan verwacht.');
  await page.screenshot({ path: `${OUT}/nieuws-import.png` });
  await page.click('.akq-form .akq-btn--main');
  await page.waitForFunction(() => /gepubliceerd|al in/.test(document.querySelector('.akq-status')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  ok(/gepubliceerd/.test(await page.textContent('.akq-status')), 'nieuwsartikel gepubliceerd');
  await page.fill('.akq-form input[type=url]', 'https://www.example.org/artikel/zeespiegel-stijgt');
  await page.waitForSelector('.akq-warn:has-text("staat al")', { timeout: 25000 }).catch(() => {});
  const dupCount = await page.locator('.akq-warn', { hasText: 'staat al' }).count();
  ok(dupCount === 1, 'dubbele URL wordt herkend (ook met www en zonder utm)' + (dupCount === 1 ? '' : ` [status: ${await page.textContent('.akq-status')}]`));
  await page.goto(SITE + '/nieuws/');
  const cards = await page.locator('.news-card', { hasText: 'Zeespiegel stijgt sneller' }).count();
  ok(cards >= 1, 'artikel verschijnt als uniforme nieuwskaart' + (cards >= 1 ? '' : ` [${(await page.locator('.news-card h2').allTextContents()).join(' | ')}]`));

  // Structuurbeheer
  await page.goto(SITE + '/wp-admin/admin.php?page=aklokaal');
  await page.waitForSelector('.aks-chapter');
  ok((await page.locator('.aks-chapter').count()) >= 8, 'structuur toont de hoofdstukken');
  const ch = page.locator('details.aks-chapter', { hasText: 'Energie' }).first();
  await ch.locator('summary .aks-grip').first().click();
  await ch.locator('.aks-add input').fill('Extra: energie in het nieuws');
  await ch.locator('.aks-add button').click();
  await page.waitForTimeout(1500);
  const chOpen = page.locator('details.aks-chapter', { hasText: 'Energie' }).first();
  ok((await chOpen.locator('.aks-paragraphs > li').count()) === 6, 'paragraaf toegevoegd');
  // de nieuwe (laatste) paragraaf één omhoog
  await chOpen.locator('.aks-paragraphs > li').last().locator('[data-move="up"]').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/structuur.png`, fullPage: true });
  const structure = await (await page.request.get(SITE + '/wp-json/aklokaal/v1/structure')).json();
  const energie = structure[0].years.flatMap((y) => y.chapters).find((c) => c.title === 'Energie');
  ok(energie.paragraphs[4].title === 'Extra: energie in het nieuws' && energie.paragraphs[4].number === '2.5', 'volgorde en nummering bijgewerkt na verplaatsen');
  ok(energie.paragraphs[5].number === '2.6' && energie.paragraphs[5].title === 'Duurzame keuzes', 'volgende paragraaf hernummerd');
  // Meerdere items tegelijk verplaatsen en archiveren
  await page.goto(SITE + '/wp-admin/admin.php?page=aklokaal');
  await page.waitForSelector('.aks-chapter');
  const en = page.locator('details.aks-chapter', { hasText: 'Energie' }).first();
  await en.locator('summary .aks-grip').first().click();
  const p22 = en.locator('details.aks-para', { hasText: 'De koolstofkringloop' }).first();
  await p22.locator('summary .aks-grip').first().click();
  await p22.locator('.aks-item').first().waitFor();
  const before22 = await p22.locator('.aks-item').count();
  await p22.locator('.aks-select').nth(0).check();
  await p22.locator('.aks-select').nth(1).check();
  const target = await p22.locator('.aks-bulk select option', { hasText: '§2.3 De energietransitie' }).first().getAttribute('value');
  await p22.locator('.aks-bulk select').first().selectOption(target);
  await page.waitForTimeout(1800);
  const s1 = await (await page.request.get(SITE + '/wp-json/aklokaal/v1/structure')).json();
  const e1 = s1[0].years.flatMap((y) => y.chapters).find((c) => c.title === 'Energie');
  const c22 = e1.paragraphs.find((x) => x.title === 'De koolstofkringloop').count;
  ok(c22 === before22 - 2, `twee items tegelijk verplaatst (${before22} → ${c22})`);
  await page.goto(SITE + '/wp-admin/admin.php?page=aklokaal');
  await page.waitForSelector('.aks-chapter');
  const en2 = page.locator('details.aks-chapter', { hasText: 'Energie' }).first();
  await en2.locator('summary .aks-grip').first().click();
  const p23 = en2.locator('details.aks-para', { hasText: 'De energietransitie' }).first();
  await p23.locator('summary .aks-grip').first().click();
  await p23.locator('.aks-item').first().waitFor();
  const archTitle = (await p23.locator('.aks-item-title').first().textContent()).trim();
  await p23.locator('.aks-archive').first().click();
  await page.waitForTimeout(1200);
  ok(/archief/.test(await p23.locator('.aks-item-title').first().textContent()), 'item gearchiveerd in beheer');
  const anon = await browser.newPage();
  await anon.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  ok((await anon.locator('#paragraaf-2-3 h3', { hasText: archTitle }).count()) === 0, `gearchiveerd item niet zichtbaar voor bezoekers (${archTitle})`);
  await anon.close();

  // Materiaal op de hoofdstukpagina zelf verplaatsen naar een andere paragraaf
  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  const P_BRON = 'section[data-paragraph*="Duurzame keuzes"]', P_DOEL = 'section[data-paragraph*="koolstofkringloop"]';
  await page.waitForSelector(P_BRON + ' .akb select', { timeout: 15000 });
  const bron = page.locator(P_BRON + ' .ak-beheer-item').first();
  const verplaatsTitel = await bron.getAttribute('data-ak-title');
  const doel = await bron.locator('.akb select').first().locator('option', { hasText: 'De koolstofkringloop' }).first().getAttribute('value');
  await bron.locator('.akb select').first().selectOption(doel);
  await page.waitForLoadState('load'); await page.waitForTimeout(1500);
  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  ok((await page.locator(`${P_DOEL} .ak-beheer-item[data-ak-title="${verplaatsTitel}"]`).count()) === 1 && (await page.locator(`${P_BRON} .ak-beheer-item[data-ak-title="${verplaatsTitel}"]`).count()) === 0, `materiaal verplaatst vanaf de hoofdstukpagina ("${verplaatsTitel}" van Duurzame keuzes naar De koolstofkringloop)`);
  const anonPage = await browser.newPage();
  await anonPage.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  ok((await anonPage.locator('.akb').count()) === 0, 'bezoekers zien geen beheerbalk');
  await anonPage.close();

  // Link met eigen voorbeeldafbeelding
  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/#paragraaf-2-4');
  await page.waitForTimeout(600);
  await page.click('[data-add-open]');
  await page.waitForSelector('.akq-dialog[open]');
  await page.click('.akq-dialog .akq-tab >> text=Link plakken');
  await page.fill('.akq-dialog input[type=url]', 'https://www.youtube.com/watch?v=abcdefghijk');
  await page.fill('.akq-dialog input[placeholder="Titel"]', 'Windmolens van dichtbij');
  await page.click('.akq-dialog summary');
  const png = join(tmpdir(), 'thumb.png');
  writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQI12NkYGD4z8DAwMDAxMDAAAAPGAEDX7k1TwAAAABJRU5ErkJggg==', 'base64'));
  await page.setInputFiles('.akq-dialog .akq-more input[type=file]', png);
  await page.click('.akq-dialog .akq-btn--main');
  await page.waitForFunction(() => /gepubliceerd/.test(document.querySelector('.akq-dialog .akq-status')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
  ok(/gepubliceerd in §2\.4/.test(await page.textContent('.akq-dialog .akq-status')), 'video met eigen afbeelding toegevoegd: ' + (await page.textContent('.akq-dialog .akq-status')));
  await page.waitForTimeout(1500);
  await page.goto(SITE + '/lesmateriaal/aardrijkskunde/3-vwo/energie/');
  const vid = page.locator('#paragraaf-2-4 article', { hasText: 'Windmolens van dichtbij' });
  ok((await vid.locator('.video-consent img').count()) === 1, 'video toont de eigen voorbeeldafbeelding');
  await ctx.close();
}

/* ---------- filters en toepassingen ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(SITE + '/?s=&soort=ak_kaart');
  ok((await page.locator('[aria-labelledby="res-ak_kaart"] .band').count()) >= 6 && (await page.locator('#res-ak_nieuws').count()) === 0, 'zoeken: filter op soort (kaarten)');
  await page.goto(SITE + '/?s=&leerjaar=3-vwo&soort=ak_hoofdstuk');
  const titles = await page.locator('[aria-labelledby="res-ak_hoofdstuk"] .band__title').allTextContents();
  ok(titles.some((t) => t.includes('Energie')) && !titles.some((t) => t.includes('Water')), 'zoeken: filter op leerjaar');
  await page.goto(SITE + '/nieuws/');
  const months = await page.locator('nav.filters a.chip').count();
  ok(months >= 2, `nieuws: filter per maand (${months} knoppen)`);
  await page.goto(SITE + '/nieuws/?maand=202609');
  ok((await page.locator('.card-grid .news-card').count()) === 1, 'nieuws: maandfilter beperkt de artikelen');
  await page.goto(SITE + '/bundels/water-te-veel-en-te-weinig/');
  ok((await page.locator('.placed-in a').count()) >= 1, 'bundel toont waar hij in de lessen staat');
  await page.goto(SITE + '/interactief/topografie-nederland/');
  const frame = page.frameLocator('iframe.map-viewer__app');
  await frame.locator('#vraag').waitFor({ timeout: 10000 }).catch(() => {});
  ok(/Waar ligt/.test((await frame.locator('#vraag').textContent().catch(() => '')) || ''), 'topografie-toepassing draait in het afgeschermde venster');
  ok((await page.getAttribute('iframe.map-viewer__app', 'sandbox')).includes('allow-scripts'), 'toepassing heeft sandbox');
  await page.goto(SITE + '/kaarten/wereldkaart-met-lagen/');
  const wf = page.frameLocator('iframe.map-viewer__app');
  await wf.locator('[data-laag="landen"] path').first().waitFor({ timeout: 10000 }).catch(() => {});
  ok((await wf.locator('[data-laag="landen"] path').count()) > 150, 'wereldkaart met lagen laadt in de kaartenbibliotheek');
  await page.close();
}

/* ---------- beveiliging ---------- */
{
  const ctx = await browser.newContext();
  const r = await ctx.request.post(SITE + '/wp-json/aklokaal/v1/chapters', { data: { title: 'hack' } });
  ok(r.status() === 401 || r.status() === 403, `wijzigen zonder login geweigerd (${r.status()})`);
  const u = await ctx.request.get(SITE + '/wp-json/wp/v2/users');
  ok(u.status() === 404, `gebruikerslijst niet openbaar (${u.status()})`);
  const draft = await (await ctx.request.get(SITE + '/wp-json/aklokaal/v1/structure?all=1')).json();
  ok(!JSON.stringify(draft).includes('Grenzen en conflicten'), 'concepthoofdstukken niet zichtbaar voor bezoekers');
  await ctx.close();
}

ok(errors.length === 0, 'geen JavaScript-fouten' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(failures ? `\n${failures} test(s) mislukt` : '\nAlles in orde');
process.exit(failures ? 1 : 0);
