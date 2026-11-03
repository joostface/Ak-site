<?php defined( 'ABSPATH' ) || exit; /* Opmaak van de wereldatlas; gebaseerd op het oorspronkelijke bestand "wereldatlas-lagen.html". */ ?>
<div id="geo-atlas" class="geo-atlas-shell" lang="nl">
  <aside class="atlas-sidebar" aria-label="Kaartlagen">
    <header class="atlas-brand">
      <div class="atlas-mark" aria-hidden="true"><i data-lucide="layers-3"></i></div>
      <div class="atlas-brand-copy">
        <span class="atlas-kicker">INTERACTIEVE WERELDATLAS</span>
        <strong>Laag voor laag</strong>
      </div>
      <button class="atlas-icon-button atlas-close" type="button" aria-label="Lagenpaneel sluiten" data-tooltip="Paneel sluiten">
        <i data-lucide="panel-left-close" aria-hidden="true"></i>
      </button>
    </header>

    <section class="atlas-basemaps" aria-labelledby="basemap-label">
      <div class="atlas-section-heading">
        <span id="basemap-label">Ondergrond</span>
        <span class="atlas-section-note">kies één</span>
      </div>
      <div class="atlas-segmented" role="radiogroup" aria-label="Ondergrond">
        <label><input type="radio" name="basemap" value="light" checked><span>Atlas</span></label>
        <label><input type="radio" name="basemap" value="osm"><span>Street Map English</span></label>
        <label><input type="radio" name="basemap" value="satellite"><span>Satelliet</span></label>
      </div>
    </section>

    <div class="atlas-layer-summary" aria-live="polite">
      <span><strong id="active-count">0</strong> actieve lagen</span>
      <button class="atlas-text-button" id="clear-layers" type="button">Alles uit</button>
    </div>

    <div class="atlas-search">
      <i data-lucide="search" aria-hidden="true"></i>
      <input id="atlas-layer-search" type="search" placeholder="Zoek een laag, bron of jaartal" autocomplete="off" aria-label="Zoek in de kaartlagen">
    </div>
    <p id="atlas-search-empty" class="atlas-search-empty" hidden>Geen laag gevonden. Probeer een ander woord, bijvoorbeeld klimaat, 2025 of NOAA.</p>
    <div id="layer-catalog" class="atlas-layer-catalog"></div>

    <footer class="atlas-sidebar-footer">
      <label class="atlas-upload-button" for="geojson-upload">
        <i data-lucide="file-up" aria-hidden="true"></i>
        Eigen GeoJSON bekijken
      </label>
      <input id="geojson-upload" type="file" accept=".geojson,.json,application/geo+json,application/json" hidden>
      <button class="atlas-footer-button" id="open-sources" type="button">
        <i data-lucide="info" aria-hidden="true"></i>
        Bronnen & toelichting
      </button>
    </footer>
  </aside>

  <div class="atlas-map-wrap" role="region" aria-label="Kaart">
    <div id="atlas-map" role="application" aria-label="Interactieve wereldkaart met combineerbare aardrijkskundelagen"></div>

    <div id="population-marginals" class="atlas-population-marginals" aria-label="Bevolkingsverdeling per lengte- en breedtegraad" hidden>
      <svg id="population-longitude-chart" class="atlas-population-svg" role="img" aria-label="Wereldbevolking per lengtegraad"></svg>
      <svg id="population-latitude-chart" class="atlas-population-svg" role="img" aria-label="Wereldbevolking per breedtegraad"></svg>
      <div class="atlas-population-label">Bevolking per strook van 1° · 2020</div>
      <div id="population-strip-tooltip" class="atlas-population-tooltip" role="tooltip" hidden></div>
    </div>

    <div class="atlas-map-title">
      <span class="atlas-pin"><i data-lucide="map" aria-hidden="true"></i></span>
      <div><strong>WERELD</strong><small>combineer patronen & processen</small></div>
    </div>

    <button class="atlas-icon-button atlas-menu" type="button" aria-label="Lagenpaneel openen" data-tooltip="Lagen openen">
      <i data-lucide="layers-3" aria-hidden="true"></i>
    </button>

    <div class="atlas-map-tools" aria-label="Kaartfuncties">
      <button class="atlas-map-button" id="climate-chart-tool" type="button" aria-pressed="false" data-tooltip="Klik daarna op de kaart">
        <i data-lucide="chart-no-axes-combined" aria-hidden="true"></i><span>Klimaatgrafiek</span>
      </button>
      <button class="atlas-map-button" id="reset-view" type="button" data-tooltip="Hele wereld">
        <i data-lucide="maximize-2" aria-hidden="true"></i><span>Wereld</span>
      </button>
      <button class="atlas-map-button" id="pacific-view" type="button" data-tooltip="Stille Oceaan centraal">
        <i data-lucide="globe-2" aria-hidden="true"></i><span>Stille Oceaan</span>
      </button>
      <button class="atlas-map-button" id="toggle-legend" type="button" aria-expanded="false">
        <i data-lucide="list" aria-hidden="true"></i><span>Legenda</span><b id="legend-count">0</b>
      </button>
    </div>

    <div id="legend-panel" class="atlas-legend-panel" aria-label="Legenda" hidden>
      <div class="atlas-panel-head"><strong>Legenda</strong><button class="atlas-icon-button" id="close-legend" type="button" aria-label="Legenda sluiten"><i data-lucide="x" aria-hidden="true"></i></button></div>
      <div id="legend-content"></div>
    </div>

    <div id="map-detail" class="atlas-map-detail" hidden>
      <button class="atlas-icon-button" id="close-detail" type="button" aria-label="Details sluiten"><i data-lucide="x" aria-hidden="true"></i></button>
      <div id="map-detail-content"></div>
    </div>

    <div class="atlas-coordinate-readout" aria-live="polite"><span id="mouse-coords">18.0° N · 0.0° E</span><span id="zoom-readout">zoom 2</span></div>
  </div>

  <dialog id="sources-dialog" class="atlas-dialog">
    <form method="dialog" class="atlas-dialog-card">
      <header><div><span class="atlas-kicker">OVER DEZE ATLAS</span><h2>Bronnen & gebruik</h2></div><button class="atlas-icon-button" value="cancel" aria-label="Sluiten"><i data-lucide="x" aria-hidden="true"></i></button></header>
      <div class="atlas-dialog-body">
        <p>De kaart is gemaakt om geografische verbanden te onderzoeken. Combineer bijvoorbeeld klimaat, bevolkingsdichtheid en inkomen. De conflictgebieden zijn datagedreven maar indicatief: ze volgen de spreiding van geregistreerde gebeurtenissen en zijn geen exacte frontlijnen. De historische etnolinguïstische vlakken zijn evenmin actuele, harde grenzen van identiteit of bewoning.</p>
        <dl id="atlas-sources-list"></dl>
        <div class="atlas-teacher-note"><i data-lucide="graduation-cap" aria-hidden="true"></i><p><strong>Lestip</strong> — zet één natuurlijke en één menselijke laag aan. Laat leerlingen eerst een ruimtelijk patroon beschrijven, daarna een verklaring formuleren en ten slotte uitzonderingen zoeken.</p></div>
      </div>
      <footer><button class="btn btn-primary" value="default">Sluiten</button></footer>
    </form>
  </dialog>
  <div id="atlas-toast" class="atlas-toast" role="status" aria-live="polite" hidden></div>
</div>
