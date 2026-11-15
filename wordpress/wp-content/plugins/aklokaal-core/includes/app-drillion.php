<?php
/**
 * Drillion: opmaak van de ingebouwde versie (in de stijl van de site).
 * Het beginscherm is een gewone pagina; het spel opent schermvullend als laag over de site.
 * Spel: assets/apps/drillion/drillion.js (+ drillion-vragen.js). Stijl: basis.css (origineel, afgeschermd)
 * en drillion.css (kleuren, letters en hoeken van de site).
 *
 * @var string $img     Map met afbeeldingen (eindigt op /).
 * @var int    $post_id Het item onder Interactief.
 */
defined( 'ABSPATH' ) || exit;
$dr_title = get_the_title( $post_id );
?>
<div class="dr" id="dr-root" data-img="<?php echo esc_url( $img ); ?>">
<div id="dr-home" class="dr-home">
  <div class="home-pic"><img src="<?php echo esc_url( $img . 'groeve.webp' ); ?>" alt="Gele boorinstallatie op een heuvel, met daaronder de aardlagen in doorsnede." width="832" height="600"></div>
  <div class="home-body"><div class="home-lead"><h1><?php echo esc_html( $dr_title ); ?></h1>
    <p>Zeven aardrijkskundevragen, elk met tientallen goede antwoorden. Hoe zeldzamer jouw antwoord, hoe dieper je boort.</p>
    <noscript><p>Zet JavaScript aan om Drillion te spelen.</p></noscript></div></div>
</div>
<div id="dr-game" hidden>
  <div class="expedition-view" id="dr-view" role="img" aria-label="Boorinstallatie boven een doorsnede van de aarde"><div class="camera-plane" id="dr-cam"></div><div class="mine-vignette" id="dr-vignette"></div></div>
  <div class="flash" id="dr-flash"></div><div class="sparks" id="dr-sparks"></div>
  <div class="hud">
    <button class="icon-btn" data-act="pause" aria-label="Pauze of stoppen"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button>
    <div><div class="depth" aria-live="off"><strong id="dr-depth">0000 m</strong><span id="dr-layer">Aan de oppervlakte</span></div><div class="steps" id="dr-steps" role="img"></div></div>
    <button class="icon-btn" data-act="sound" aria-label="Geluid"></button>
  </div>
  <section class="sheet" id="dr-sheet" aria-label="Vraag"><div id="dr-stop"></div><form class="q-form parked" id="dr-qform" autocomplete="off"><input id="dr-ans" type="text" inputmode="text" enterkeyhint="go" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength="80" aria-label="Jouw antwoord" placeholder="Jouw antwoord"><button type="button" class="btn" data-press="dive">Boor</button></form><div id="dr-sbot"></div></section>
</div>
<dialog id="dr-dlg" aria-label="Drillion"><div class="dlg" id="dr-dlg-body"></div></dialog>
</div>
