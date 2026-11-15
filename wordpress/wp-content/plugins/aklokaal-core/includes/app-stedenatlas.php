<?php
/**
 * Stedenatlas: opmaak van de ingebouwde versie (in de stijl van de site).
 * De atlas vult het scherm onder de kop van de site. Spel: assets/apps/stedenatlas/stedenatlas.js
 * (+ stedenatlas-data.js en d3-geo.min.js). Stijl: basis.css (origineel, afgeschermd) en stedenatlas.css.
 */
defined( 'ABSPATH' ) || exit;
?>
<div class="sa" id="sa-root" data-screen="setup">
<header class="mast"><div class="mast-inner"><button class="brand" data-act="home" aria-label="Stedenatlas, naar het spelmenu"><svg viewBox="0 0 38 40" aria-hidden="true"><circle cx="19" cy="20" r="16.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 15q15 7 30-1M4 25q16 6 30-1M17 4c-10 12-10 22-2 31M21 4c9 9 11 22 3 31" fill="none" stroke="currentColor" stroke-width="1.55"/><circle cx="29" cy="9" r="5.4" fill="#ee784f" stroke="#faf8f1" stroke-width="2.3"/></svg><span>Stedenatlas</span></button>
<nav aria-label="Hoofdmenu"><button id="sa-nav-play" data-act="home">Spelen</button><button id="sa-nav-progress" data-act="progress">Voortgang</button></nav><button class="help" data-act="help" aria-label="Spelregels"><span class="help-icon">?</span><span>Spelregels</span></button><button id="sa-full" data-act="full" class="full-icon" aria-label="Volledig scherm" title="Volledig scherm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/></svg></button></div></header>
<main id="sa-main" tabindex="-1"></main><footer class="foot"><span><i class="offline-led"></i> Offline speelbaar</span><button data-act="sources">Kaartgegevens en bronnen <svg style="display:inline;vertical-align:middle;width:12px;height:12px" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7"/></svg></button></footer>
<dialog id="sa-dialog" aria-labelledby="sa-dialog-title"><div class="dialog-head"><h2 id="sa-dialog-title"></h2><button class="close" data-act="close" aria-label="Sluiten">×</button></div><div id="sa-dialog-body"></div></dialog>
<noscript><p class="sa-noscript">Zet JavaScript aan om de Stedenatlas te spelen.</p></noscript>
</div>
