<?php
/**
 * Welke stad?: opmaak van de ingebouwde versie (in de stijl van de site).
 * Spel: assets/apps/welke-stad/welke-stad.js (+ welke-stad-data.js). Stijl: welke-stad.css.
 * Het spelvenster zelf is gelijk aan het origineel; alleen de id's hebben het voorvoegsel ws-.
 *
 * @var int $post_id Het item onder Interactief.
 */
defined( 'ABSPATH' ) || exit;
$ws_title = get_the_title( $post_id );
$ws_lead  = get_the_excerpt( $post_id );
?>
<div class="ws-page">
<header class="ws-intro">
	<p class="ws-kicker">Satellietspel · eindeloos</p>
	<h1><?php echo esc_html( $ws_title ); ?></h1>
	<?php if ( $ws_lead ) : ?><p class="ws-lead"><?php echo esc_html( $ws_lead ); ?></p><?php endif; ?>
	<ol class="ws-steps">
		<li><b>Kijk</b> naar het satellietbeeld: wegen, rivieren, kust, bebouwing.</li>
		<li><b>Raad</b> de stad. Je ziet hoe ver je ernaast zit en of werelddeel en land kloppen.</li>
		<li><b>Zoom uit</b> na elke gok. Na vijf rondes weet je het antwoord, en dan volgt meteen de volgende stad.</li>
	</ol>
	<p class="ws-note">Speel zo lang je wil: elk potje een andere stad, en pas als je ze allemaal gehad hebt komt er een terug. Statistieken blijven alleen in deze browser.</p>
</header>
<div class="ws-frame">
<div class="ws" id="ws-app">
  <div id="ws-bar">
    <div id="ws-timer">00:00</div>
    <button class="ib" id="ws-bPause" aria-label="Pauze"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path id="ws-pauseIc" d="M10 8.5v7M14 8.5v7" stroke-linecap="round"/></svg></button>
    <div class="sp"></div>
    <button class="ib" id="ws-bInfo" aria-label="Uitleg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none"/></svg></button>
    <button class="ib" id="ws-bStats" aria-label="Statistieken"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="11" width="4.2" height="9" rx="1.5"/><rect x="9.9" y="6" width="4.2" height="14" rx="1.5"/><rect x="16.8" y="3" width="4.2" height="17" rx="1.5"/></svg></button>
    <button class="ib" id="ws-bSet" aria-label="Instellingen"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M10.3 2h3.4l.6 2.7 1.5.6 2.3-1.5 2.4 2.4-1.500 2.300.6 1.500 2.700.600v3.400l-2.700.600-.600 1.500 1.500 2.300-2.400 2.400-2.300-1.500-1.500.600-.600 2.700h-3.400l-.600-2.700-1.500-.600-2.300 1.500-2.400-2.400 1.500-2.300-.600-1.500L2 13.700v-3.400l2.700-.600.600-1.500-1.500-2.300 2.400-2.400 2.300 1.500 1.500-.600zM12 8.300a3.700 3.700 0 1 0 0 7.400 3.700 3.700 0 0 0 0-7.400z" fill-rule="evenodd"/></svg></button>
    <button class="ib" id="ws-bCal" aria-label="Nieuwe stad" title="Nieuwe stad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c2 0 3.3.9 4.4 2.6l2.2 3.8c1.1 1.7 2.4 2.6 4.4 2.6H21"/><path d="M3 17h3.5c1.4 0 2.5-.5 3.400-1.400M14 8.400c.9-.9 2-1.400 3.500-1.400H21"/><path d="M18.500 4.500 21 7l-2.500 2.500M18.500 14.500 21 17l-2.500 2.500"/></svg></button>
  </div>
  <div id="ws-srow">
    <label id="ws-sbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.500" cy="10.500" r="7"/><path d="M16 16l5 5" stroke-linecap="round"/></svg>
      <input id="ws-q" type="text" aria-label="Typ de stad" placeholder="typ de stad..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>
    <button class="tb" id="ws-bHints"><span>Hints</span></button>
    <button class="tb" id="ws-bAtt"><span>Pogingen</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>

  <div id="ws-stage">
    <div id="ws-map"><div id="ws-mk"></div><div id="ws-attr">Beeld: Esri, Maxar, Earthstar Geographics</div></div>
    <button class="cb" id="ws-pU" aria-label="Omhoog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg></button>
    <button class="cb" id="ws-pL" aria-label="Links"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
    <button class="cb" id="ws-pR" aria-label="Rechts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
    <button class="cb" id="ws-pD" aria-label="Omlaag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
    <button class="cb" id="ws-cC" aria-label="Centreren"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><circle cx="12" cy="12" r="6.500"/><circle cx="12" cy="12" r="2.200" fill="currentColor"/><path d="M12 2v3.500M12 18.500V22M2 12h3.500M18.500 12H22"/></svg></button>
    <button class="cb" id="ws-cP" aria-label="Inzoomen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
    <button class="cb" id="ws-cM" aria-label="Uitzoomen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
    <div id="ws-tileWarn">De satellietbeelden laden niet. Dit spel heeft een internetverbinding nodig en moet in een gewone browser geopend zijn.</div>
    <div id="ws-doneBar"><button class="btn" id="ws-bNext">Volgende stad</button><button class="btn sec" id="ws-bShowRes">Bekijk resultaat</button></div>
    <div id="ws-hints"><h3>Hints</h3><div id="ws-hintRows"></div></div>
    <div id="ws-pauseOv"><div>Gepauzeerd</div><button class="btn" style="width:200px" id="ws-bResume">Verder spelen</button></div>
    <div id="ws-sug">
      <div id="ws-sugEmpty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800"><circle cx="10.500" cy="10.500" r="7"/><path d="M16 16l5 5" stroke-linecap="round"/></svg></div>
      <div id="ws-sugList"></div>
      <div id="ws-sugBtns"><button id="ws-bClear">Clear</button><button id="ws-bSel">Selecteer</button></div>
    </div>
  </div>

  <!-- resultaat -->
  <div class="panel card" id="ws-pRes">
    <div class="ph"><div style="flex:1"><h2 id="ws-rCity"></h2><div id="ws-rRound"></div></div><button class="x" data-x aria-label="Sluiten"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><circle cx="20" cy="20" r="14"/><path d="M15 15l10 10M25 15L15 25"/></svg></button></div>
    <div class="pbody">
      <div id="ws-rBar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2.500V6M12 18v3.500M2.500 12H6M18 12h3.500"/></svg><div id="ws-rTrack"><div id="ws-rFill"></div></div></div>
      <div id="ws-rDist"></div>
      <div class="pill" id="ws-rCont"><span></span><svg viewBox="0 0 30 30" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="15" r="11"/><path/></svg></div>
      <div class="pill" id="ws-rCtry"><span></span><svg viewBox="0 0 30 30" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="15" r="11"/><path/></svg></div>
    </div>
    <div id="ws-rFinal"><div id="ws-rLabel"></div><div id="ws-rAns"></div><div id="ws-rNext"><button type="button" id="ws-bResStats">Bekijk statistieken</button></div></div>
    <div class="pfoot"><button class="btn" id="ws-rBtn" style="visibility:hidden">Volgende Ronde</button></div>
  </div>

  <!-- pogingen -->
  <div class="panel card" id="ws-pAtt">
    <div class="ph"><div style="flex:1"><h2 style="font-size:23px">Uw Pogingen</h2><div class="sub" style="font-size:19px">Bekijk Vorige Pogingen</div></div><button class="x" data-x aria-label="Sluiten"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><circle cx="20" cy="20" r="14"/><path d="M15 15l10 10M25 15L15 25"/></svg></button></div>
    <div class="pbody" id="ws-attBody"></div>
  </div>

  <!-- generiek -->
  <div class="panel card" id="ws-pGen">
    <div class="ph"><h2 id="ws-gTitle" style="font-size:25px;padding-top:6px"></h2><button class="x" data-x aria-label="Sluiten"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><circle cx="20" cy="20" r="14"/><path d="M15 15l10 10M25 15L15 25"/></svg></button></div>
    <div class="pbody" id="ws-gBody"></div>
  </div>

  <canvas id="ws-confetti"></canvas>
  <div id="ws-toast"></div>
</div>
</div>
</div>
