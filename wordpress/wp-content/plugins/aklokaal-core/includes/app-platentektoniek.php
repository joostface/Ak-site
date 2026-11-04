<?php
/**
 * Platentektoniek in lagen: opmaak van de ingebouwde versie (in de stijl van de site).
 * Rekenkern: assets/apps/platentektoniek/platentektoniek.js. Stijl: platentektoniek.css.
 *
 * @var string $img  Map met afbeeldingen (eindigt op /).
 */
defined( 'ABSPATH' ) || exit;
?>
<div class="pt" id="pt" data-img="<?php echo esc_url( $img ); ?>">
<div class="pt-depthbar" id="bar" aria-hidden="false"><span class="pt-depthbar__sw" aria-hidden="true"></span><span class="pt-depthbar__now" id="depthNow" aria-live="polite"><b>0 km</b> · de zee</span><a href="#simulatie">Naar de simulatie</a></div>
<section id="top" data-depth="0 km" data-layer="de zee" data-bg="var(--ocean)" data-ink="var(--ocean-pale)">
  <div class="inner">
    <h1 aria-label="Platentektoniek"><span class="l1">Platen-</span><span class="l2">tektoniek</span></h1>
    <p class="support rise">Een doorsnede van de aarde op ware schaal, van de zeebodem tot 700 km diep. Kies een plaatgrens en zie wat er gebeurt.</p>
    <a class="button button--accent rise" style="--d:120ms" href="#simulatie">Naar de doorsnede</a>
    <ol class="descent rise" style="--d:160ms" aria-label="De lagen van deze pagina">
      <li><a class="d0" href="#top"><span>De zee</span><b>0 km</b></a></li>
      <li><a href="#simulatie" style="background:var(--crust);color:var(--crust-ink)"><span>Aardkorst: de doorsnede</span><b>35 km</b></a></li>
      <li><a href="#motor" style="background:var(--litho);color:var(--litho-dark)"><span>Lithosfeer: wat drijft de platen</span><b>100 km</b></a></li>
      <li><a href="#grenzen" style="background:var(--asth);color:var(--asth-ink)"><span>Asthenosfeer: acht grenzen</span><b>250 km</b></a></li>
      <li><a href="#inzicht" style="background:var(--tz);color:var(--tz-ink)"><span>Overgangszone: nieuw inzicht</span><b>660 km</b></a></li>
      <li><a href="#klopt" style="background:var(--deep);color:var(--deep-ink)"><span>Ondermantel: klopt het wel?</span><b>2.900 km</b></a></li>
      <li><a href="#kern" style="background:var(--core);color:var(--core-ink)"><span>Kern</span><b>6.371 km</b></a></li>
    </ol>
    <p class="seafloor rise" style="--d:200ms">Onder deze zee ligt 7 km basalt, daaronder een stijve plaat van 90 km en dan 2.800 km mantel. Scroll omlaag en je daalt af door de aarde.</p>
  </div>
</section>

<section class="pt-chapter" id="simulatie" data-depth="35 km" data-layer="de aardkorst" data-bg="var(--crust)" data-ink="var(--crust-ink)" aria-labelledby="scTitle">
  <div class="pt-wrap">
    <div class="sthead">
      <h2 id="scTitle" class="rise">Subductie</h2>
      <div class="tabs rise" role="group" aria-label="Niveau" style="--d:80ms">
        <button id="lvOnder" aria-pressed="true">Onderbouw</button>
        <button id="lvBoven" aria-pressed="false">Bovenbouw</button>
      </div>
    </div>
    <nav class="picker rise" id="chips" aria-label="Kies een plaatgrens" data-ui style="--d:120ms"></nav>
    <div class="plate">
      <div class="stage">
      <div class="canvaswrap rise" id="wrap" data-ui style="--d:80ms">
        <canvas id="topo" aria-hidden="true"></canvas>
        <canvas id="cv" role="img" aria-label="Doorsnede van de aarde"></canvas>
        <canvas id="gl" role="img" aria-label="Draaibaar 3D-blokdiagram van de aarde" hidden></canvas>
        <canvas id="lab" aria-hidden="true" hidden></canvas>
        <div class="hint3d" id="hint3d" hidden>Sleep om te draaien, scroll of knijp om te zoomen</div>
        <div id="tip" hidden></div>
      </div>
        <div class="transport" data-ui>
          <div class="playrow">
            <button class="button button--accent" id="play" aria-label="Afspelen"></button>
            <button class="button button--quiet" id="reset" aria-label="Terug naar het begin">Terug naar begin</button>
            <span class="timebig" id="timeBig">–</span>
          </div>
          <input type="range" id="slider" min="0" max="100" step="0.01" value="0" aria-label="Tijd">
          <div class="phasebar" id="phasebar"></div>
          <span class="badge" id="veBadge"></span>
        </div>
      </div>
      <aside class="tool" data-ui aria-label="Opties voor de simulatie">
        <h3 class="toolh">Opties</h3>
        <div class="toolbar">
        <div class="cgroup" id="gDim"><span class="lbl">Weergave</span>
          <div class="seg" role="group" aria-label="Weergave">
            <button data-dim="3d" aria-pressed="true">3D-blok</button>
            <button data-dim="2d" aria-pressed="false">Doorsnede</button>
            <button id="camReset" title="Zet het blok terug in de beginstand">Draai terug</button>
          </div></div>
        <div class="cgroup" id="gDepth"><label class="lbl" for="depth">Hoe diep kijk je?</label>
          <div class="depthrow"><input type="range" id="depth" min="0" max="1000" step="1" value="1000"><span class="depthval" id="depthVal">720 km</span></div></div>
        <div class="cgroup" id="gMode" hidden><span class="lbl">Tijdschaal</span>
          <div class="seg" role="group" aria-label="Tijdschaal">
            <button data-mode="cyclus" aria-pressed="true">Aardbevingscyclus (jaren)</button>
            <button data-mode="geo" aria-pressed="false">Geologisch (miljoenen jaren)</button>
          </div></div>
        <div class="cgroup" role="group" aria-labelledby="tonenLbl"><span class="lbl" id="tonenLbl">Wat wil je zien?</span>
          <div class="tgs">
            <label class="ck"><input type="checkbox" data-tg="markers" checked><span class="box" aria-hidden="true"></span>Merkers</label>
            <label class="ck"><input type="checkbox" data-tg="forces" checked><span class="box" aria-hidden="true"></span>Bewegingen en krachten</label>
            <label class="ck"><input type="checkbox" data-tg="labels"><span class="box" aria-hidden="true"></span>Labels</label>
            <label class="ck"><input type="checkbox" data-tg="volc"><span class="box" aria-hidden="true"></span>Vulkanen</label>
            <label class="ck"><input type="checkbox" data-tg="eq"><span class="box" aria-hidden="true"></span>Aardbevingen</label>
          </div></div>
        </div>
      <details class="more" id="more">
        <summary>Meer instellingen: overdrijving en snelheid</summary>
        <div class="toolbar">
          <div class="cgroup" id="gVe"><span class="lbl">Lagen verticaal</span>
            <div class="seg" role="group" aria-label="Verticale overdrijving">
              <button data-ve="1" aria-pressed="true">×1 echt</button>
              <button data-ve="2" aria-pressed="false">×2</button>
              <button data-ve="4" aria-pressed="false">×4</button>
            </div></div>
          <div class="cgroup" id="gRel"><span class="lbl">Bergen boven zee</span>
            <div class="seg" role="group" aria-label="Overdrijving van het reliëf boven zeeniveau">
              <button data-rel="auto" aria-pressed="true">auto</button>
              <button data-rel="1" aria-pressed="false">×1</button>
              <button data-rel="3" aria-pressed="false">×3</button>
              <button data-rel="10" aria-pressed="false">×10</button>
            </div></div>
          <div class="cgroup"><label class="lbl" for="speed">Snelheid</label>
            <select id="speed"><option value="0.4">langzaam</option><option value="1" selected>normaal</option><option value="2.5">snel</option></select></div>
        </div>
      </details>
      <details class="legendbar" id="legWrap" open><summary>Legenda</summary><div class="legend" id="legend"></div></details>
      </aside>
    </div>

    <div class="story">
      <div class="phase rise">
        <h3 id="phaseT"></h3>
        <div id="phaseText"></div>
      </div>
      <figure class="loc rise" style="--d:120ms;margin:0">
        <img id="locMap" src="<?php echo esc_url( $img ); ?>kaart-sub.webp" width="640" height="640" alt="Kaart van de plek van deze doorsnede">
        <figcaption id="locCap">Waar deze doorsnede ligt. De zwarte lijn is de doorsnede.</figcaption>
      </figure>
    </div>

    <div class="effects">
      <h3 class="rise">Wat merk je aan het oppervlak?</h3>
      <ul class="fx" id="effects"></ul>
    </div>
  </div>
</section>

<section class="pt-chapter" id="motor" data-depth="100 km" data-layer="de lithosfeer" data-bg="var(--litho)" data-ink="var(--litho-dark)" aria-labelledby="motorH">
  <div class="pt-wrap pt-grid">
    <h2 id="motorH" class="rise">Wat drijft de platen?</h2>
    <p class="stair rise" style="--d:90ms"><span>Niet de mantel sleept</span><span>de platen mee. Zware,</span><span>koude platen zinken</span><span>en trekken de rest</span><span>achter zich aan.</span></p>
    <div class="pair">
      <figure class="rise" style="--d:180ms"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-westelijke-grote-oceaan.webp" width="417" height="527" alt="Kaart van de westelijke Grote Oceaan met plaatgrenzen en aardbevingen langs de subductiezones" loading="lazy"><figcaption>Waar platen zinken, liggen de meeste aardbevingen.</figcaption></figure>
      <figure class="rise" style="--d:260ms"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-atlantische-oceaan.webp" width="583" height="666" alt="Kaart van de Atlantische Oceaan met de mid-oceanische rug" loading="lazy"><figcaption>De Atlantische rug: hier groeit oceaanbodem aan.</figcaption></figure>
    </div>
    <div class="forces rise" style="--d:200ms" aria-label="Verdeling van de aandrijvende krachten"><div class="sp">Slab pull, de trek van zinkende platen · ±90%</div><div class="rp">±10%</div></div>
    <p class="motor-note rise" style="--d:260ms">Ridge push, het afglijden van de rug, levert de overige ±10% (Lithgow-Bertelloni, 2014). Stromingen in de mantel zijn vooral een gevolg van bewegende platen, geen oorzaak.</p>
  </div>
</section>

<section class="pt-chapter" id="grenzen" data-depth="250 km" data-layer="de asthenosfeer" data-bg="var(--asth)" data-ink="var(--asth-ink)" aria-labelledby="grenzenH">
  <div class="wall" id="wall">
    <div class="pt-tile head"><h2 id="grenzenH">Acht grenzen</h2><p>Elk getal hoort bij een plaatgrens. Kies er een en bekijk hem in de doorsnede.</p></div>
    <button class="pt-tile t1 rise" style="--d:0ms" data-sc="rug" aria-label="Mid-oceanische rug: 3,5 cm per jaar uit elkaar. Bekijk in de doorsnede"><span class="big">3,5 cm</span><span class="cap"><b>Mid-oceanische rug</b><br>per jaar uit elkaar</span></button>
    <button class="pt-tile t2 rise" style="--d:60ms" data-sc="slenk" aria-label="Slenk wordt oceaan: 40 km zo breed is een slenk. Bekijk in de doorsnede"><span class="big">40 km</span><span class="cap"><b>Slenk wordt oceaan</b><br>zo breed is een slenk</span></button>
    <figure class="pt-tile photo rise" style="--d:120ms;margin:0"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-sub.webp" width="640" height="640" alt="Kaart: De Andes langs de Zuid-Amerikaanse kust, met plaatgrenzen, aardbevingen en vulkanen" loading="lazy"><figcaption class="cap">De Andes langs de Zuid-Amerikaanse kust</figcaption></figure>
    <button class="pt-tile t3 rise" style="--d:180ms" data-sc="sub" aria-label="Oceaan onder continent: 660 km zo diep gaan de bevingen. Bekijk in de doorsnede"><span class="big">660 km</span><span class="cap"><b>Oceaan onder continent</b><br>zo diep gaan de bevingen</span></button>
    <button class="pt-tile t4 rise" style="--d:0ms" data-sc="boog" aria-label="Eilandboog: 11 km zo diep is de Marianentrog. Bekijk in de doorsnede"><span class="big">11 km</span><span class="cap"><b>Eilandboog</b><br>zo diep is de Marianentrog</span></button>
    <button class="pt-tile t1 rise" style="--d:60ms" data-sc="botsing" aria-label="Botsing: 8,8 km zo hoog is de Mount Everest. Bekijk in de doorsnede"><span class="big">8,8 km</span><span class="cap"><b>Botsing</b><br>zo hoog is de Mount Everest</span></button>
    <figure class="pt-tile photo rise" style="--d:120ms;margin:0"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-botsing.webp" width="640" height="640" alt="Kaart: De Himalaya, waar India tegen Azië drukt, met plaatgrenzen, aardbevingen en vulkanen" loading="lazy"><figcaption class="cap">De Himalaya, waar India tegen Azië drukt</figcaption></figure>
    <button class="pt-tile t2 rise" style="--d:180ms" data-sc="transform" aria-label="Transforme breuk: M7,9 San Francisco, 1906. Bekijk in de doorsnede"><span class="big">M7,9</span><span class="cap"><b>Transforme breuk</b><br>San Francisco, 1906</span></button>
    <button class="pt-tile t3 rise" style="--d:0ms" data-sc="hotspot" aria-label="Hotspot: 8 cm per jaar schuift Hawaï door. Bekijk in de doorsnede"><span class="big">8 cm</span><span class="cap"><b>Hotspot</b><br>per jaar schuift Hawaï door</span></button>
    <figure class="pt-tile photo rise" style="--d:60ms;margin:0"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-hotspot.webp" width="640" height="640" alt="Kaart: De Hawaï-keten in de Grote Oceaan, met plaatgrenzen, aardbevingen en vulkanen" loading="lazy"><figcaption class="cap">De Hawaï-keten in de Grote Oceaan</figcaption></figure>
    <figure class="pt-tile photo only-sm rise" style="--d:120ms;margin:0"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-boog.webp" width="640" height="640" alt="Kaart: De Marianen in de Grote Oceaan, met plaatgrenzen, aardbevingen en vulkanen" loading="lazy"><figcaption class="cap">De Marianen in de Grote Oceaan</figcaption></figure>
    <button class="pt-tile t4 rise" style="--d:180ms" data-sc="ng" aria-label="Nieuw-Guinea: 600 km zo diep ligt de oude plaat. Bekijk in de doorsnede"><span class="big">600 km</span><span class="cap"><b>Nieuw-Guinea</b><br>zo diep ligt de oude plaat</span></button>
  </div>
</section>

<section class="pt-chapter" id="inzicht" data-depth="660 km" data-layer="de overgangszone" data-bg="var(--tz)" data-ink="var(--tz-ink)" aria-labelledby="inzichtH">
  <div class="panel">
    <h2 id="inzichtH" class="rise">De mantel ligt bijna stil</h2>
    <div class="texts">
      <div class="rise" style="--d:120ms"><h3>Getrokken, niet meegesleept</h3><p id="insA"></p></div>
      <div class="rise" style="--d:200ms"><h3>Wat Nieuw-Guinea liet zien</h3><p id="insB"></p></div>
      <button class="button button--accent rise" style="--d:260ms" id="toNg">Bekijk het Nieuw-Guinea-recept</button>
    </div>
    <div class="shape rise" style="--d:160ms"><img loading="lazy" decoding="async" src="<?php echo esc_url( $img ); ?>kaart-zuidoost-azie.webp" width="760" height="760" alt="Kaart van Zuidoost-Azië en de westelijke Grote Oceaan met plaatgrenzen en aardbevingen" loading="lazy"></div>
    <p class="shape-cap rise" style="--d:240ms">Onder Nieuw-Guinea liggen resten van een plaat die 25 miljoen jaar geleden wegzonk, nu op ±600 km diepte.</p>
  </div>
</section>

<section class="pt-chapter" id="klopt" data-depth="2.900 km" data-layer="de ondermantel" data-bg="var(--deep)" data-ink="var(--deep-ink)" aria-labelledby="kloptH">
  <div class="pt-wrap pt-grid">
    <h2 id="kloptH">Klopt het wel?</h2>
    <div class="faq">
      <details name="faq"><summary>Is dit op ware schaal?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>Ja, alles onder zeeniveau. De oceaankorst is 7 km dik, een oceaanplaat ±90 km, een duikende plaat zakt onder ±45° tot ±660 km. Zet ‘Lagen verticaal’ op ×2 of ×4 om de lagen dikker te maken; dan klopt de verhouding niet meer.</p></div></details>
      <details name="faq"><summary>Waarom zijn de bergen hoger dan in het echt?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>Alleen wat boven zeeniveau uitsteekt is uitgerekt (in het 3D-blok standaard ×10 bij het hele blok). De Mount Everest is 8,8 km hoog en de mantel is 2.900 km dik: zonder overdrijving zie je geen bergen. Bij ‘Bergen boven zee’ kun je ×1 kiezen.</p></div></details>
      <details name="faq"><summary>Wat is er bij deze plaatgrens vereenvoudigd?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><ul id="scaleList"></ul></div></details>
      <details name="faq"><summary>Waarom blijven de stipjes in de mantel liggen?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>De stipjes staan vast ten opzichte van de diepe mantel; de driehoekjes zitten vast aan de plaat. Zo zie je dat de platen over een bijna stilliggende mantel schuiven. Dat is wat Van Hinsbergen en collega’s in 2020 lieten zien.</p></div></details>
      <details name="faq"><summary>Waar zijn de draaiende convectiestromen?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>Die zitten er bewust niet in. Grote convectiecellen kunnen niet verklaren dat ruggen zelf verschuiven, dat platen in een paar miljoen jaar van richting veranderen, of hoe de San Andreasbreuk werkt. Stroming in de mantel is vooral een gevolg van zinkende platen.</p></div></details>
      <details name="faq"><summary>Hoe snel gaat het echt?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><p>Platen bewegen 2 tot 10 cm per jaar, ongeveer zo snel als je nagels groeien. In de simulatie is 1 seconde ongeveer 1 miljoen jaar; bij de transforme breuk kies je ook jaren.</p></div></details>
      <details name="faq"><summary>Waar komt deze kennis vandaan?<span class="pm" aria-hidden="true"></span></summary><div class="ans"><ul>
        <li>L. &amp; D.J.J. van Hinsbergen (2021), <a href="https://geografie.nl/artikel/platentektoniek-in-het-onderwijs" target="_blank" rel="noopener">Platentektoniek in het onderwijs</a>, Geografie 2021-4.</li>
        <li>Redactie Geografie (2020), <a href="https://geografie.nl/artikel/platentektoniek-anders-dan-we-dachten" target="_blank" rel="noopener">Platentektoniek: anders dan we dachten</a>; <a href="https://www.uu.nl/nieuws/op-zoek-naar-goud-en-dan-een-nog-grotere-schat-vinden" target="_blank" rel="noopener">persbericht Universiteit Utrecht</a>.</li>
        <li>Van Hinsbergen e.a. (2020), <a href="https://doi.org/10.1029/2020GL087484" target="_blank" rel="noopener">Arc-type magmatism due to continental-edge plowing through ancient subduction-enriched mantle</a>, Geophysical Research Letters 47.</li>
        <li>Lithgow-Bertelloni (2014), slab pull en ridge push; Conrad &amp; Lithgow-Bertelloni (2004).</li>
        <li><a href="https://authors.library.caltech.edu/records/y4f7g-9b073" target="_blank" rel="noopener">India–Eurasia collision predominantly driven by Sumatra–Java slab pull</a> (2025).</li>
        <li>Steinberger &amp; Becker (2018), lithosfeerdikte; Van der Meer e.a. (2018), Atlas of the Underworld.</li>
      </ul></div></details>
    </div>
  </div>
</section>

<footer id="kern" class="pt-wrap" data-depth="6.371 km" data-layer="de kern" data-bg="var(--core)" data-ink="var(--core-ink)">
  <div class="knotes">
    <p>Platentektoniek in doorsnede. Gemaakt voor aardrijkskunde in de onder- en bovenbouw.</p>
    <p>Kaarten getekend uit open data: plaatgrenzen PB2002 (Bird, 2003; ODC-By), kustlijnen Natural Earth, aardbevingen M5,5+ 1965–2016 (USGS) en vulkanen (Smithsonian GVP).</p>
    <p>Je bent nu bij de kern, 6.371 km onder je voeten.</p>
    <a class="totop" href="#top">Naar boven</a>
  </div>
  <p class="kline"><a href="#top"><span>Naar de</span><span>oppervlakte</span></a></p>
  <div class="kmeta">
    <p><a href="#klopt">Bronnen</a> · <a href="#simulatie">Simulatie</a></p>
    <p>Naar een idee en ontwerp van de docent · 2026</p>
  </div>
</footer>
</div>