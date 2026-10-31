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
 *   template-parts/      herbruikbare stukken (kop, voet, kaarten)
 *   assets/              CSS, JS en lettertypen (bron: prototype/assets, zie tools/sync-theme-assets.sh)
 */

defined( 'ABSPATH' ) || exit;

define( 'AKTHEME_VERSION', '0.4.0' );

require_once get_template_directory() . '/inc/setup.php';
require_once get_template_directory() . '/inc/render.php';
