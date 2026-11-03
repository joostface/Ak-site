<?php
/**
 * Aardrijkskundelokaal — thema.
 *
 * Het thema doet alleen weergave. Inhoud en structuur komen uit de plugin
 * "Aardrijkskundelokaal Core". Staat die plugin uit, dan toont het thema
 * gewone WordPress-pagina's en een melding voor beheerders.
 *
 * Bestanden
 *   inc/setup.php        thema-instellingen, scripts, menu, aanpasser
 *   inc/render.php       weergave van materiaal, nieuwskaarten, kaarten
 *   inc/seo.php          beschrijving, deelgegevens (Open Graph), canonical en gestructureerde data
 *   template-parts/      herbruikbare stukken (kop, voet, kaarten)
 *   assets/              CSS, JS en lettertypen (bron: prototype/assets, zie tools/sync-theme-assets.sh)
 */

defined( 'ABSPATH' ) || exit;

// Versie uit style.css: na elke thema-update laden browsers de nieuwe CSS en JS (anders blijft de oude in de cache).
define( 'AKTHEME_VERSION', (string) wp_get_theme( get_template() )->get( 'Version' ) );

require_once get_template_directory() . '/inc/setup.php';
require_once get_template_directory() . '/inc/render.php';
require_once get_template_directory() . '/inc/seo.php';
