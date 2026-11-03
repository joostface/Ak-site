<?php
/**
 * Plugin Name:       Aardrijkskundelokaal Core
 * Description:       Inhoudsmodel en beheer voor het digitale aardrijkskundelokaal: vakken, leerjaren, hoofdstukken, paragrafen, materiaal, nieuws, collecties, kaarten en interactieve toepassingen. Bevat de eenvoudige uploadworkflow en de nieuwsimport.
 * Version:           0.10.1
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            Aardrijkskundelokaal
 * License:           GPL-2.0-or-later
 * Text Domain:       aklokaal
 *
 * Deze plugin bewaart alle inhoud en structuur. Het thema doet alleen de weergave.
 * Wissel je ooit van thema, dan blijven hoofdstukken, paragrafen en materiaal bestaan.
 */

defined( 'ABSPATH' ) || exit;

define( 'AKLOKAAL_VERSION', '0.10.1' );
define( 'AKLOKAAL_FILE', __FILE__ );
define( 'AKLOKAAL_DIR', plugin_dir_path( __FILE__ ) );
define( 'AKLOKAAL_URL', plugin_dir_url( __FILE__ ) );

/** De capability die alle beheerhandelingen beschermt. */
define( 'AKLOKAAL_CAP', 'aklokaal_manage' );

require_once AKLOKAAL_DIR . 'includes/helpers.php';
require_once AKLOKAAL_DIR . 'includes/content-model.php';
require_once AKLOKAAL_DIR . 'includes/placements.php';
require_once AKLOKAAL_DIR . 'includes/uploads.php';
require_once AKLOKAAL_DIR . 'includes/news-import.php';
require_once AKLOKAAL_DIR . 'includes/conversion.php';
require_once AKLOKAAL_DIR . 'includes/rest.php';
require_once AKLOKAAL_DIR . 'includes/admin.php';
require_once AKLOKAAL_DIR . 'includes/quick-add.php';
require_once AKLOKAAL_DIR . 'includes/ai.php';
require_once AKLOKAAL_DIR . 'includes/handleiding.php';
require_once AKLOKAAL_DIR . 'includes/import.php';

register_activation_hook( __FILE__, 'aklokaal_activate' );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

/** Primitieve rechten voor alle eigen post types (capability_type ak_item). */
function aklokaal_item_caps() {
	return array(
		'edit_ak_items',
		'edit_others_ak_items',
		'edit_private_ak_items',
		'edit_published_ak_items',
		'publish_ak_items',
		'read_private_ak_items',
		'delete_ak_items',
		'delete_others_ak_items',
		'delete_private_ak_items',
		'delete_published_ak_items',
	);
}

/**
 * Standaardleerjaren: één leerjaar per boek, zodat materiaal maar één keer geplaatst hoeft te worden.
 * Naam (kort, voor de tabbladen) => toelichting (voor welke klassen).
 */
function aklokaal_default_years() {
	return apply_filters(
		'aklokaal_default_years',
		array(
			'Klas 1' => 'Voor 1 vwo en 1 havo/vwo',
			'Klas 2' => 'Voor 2 vwo en 2 havo',
			'Klas 3' => 'Voor 3 havo en 3 vwo',
			'4 havo' => '',
			'4 vwo'  => '',
			'5 havo' => '',
			'5 vwo'  => '',
			'6 vwo'  => '',
		)
	);
}

/** Maak ontbrekende standaardleerjaren aan (bestaande blijven ongemoeid). */
function aklokaal_ensure_default_years() {
	$i = 0;
	foreach ( aklokaal_default_years() as $name => $desc ) {
		++$i;
		$slug = sanitize_title( str_replace( '/', '-', $name ) );
		if ( term_exists( $slug, 'ak_leerjaar' ) ) {
			continue;
		}
		$t = wp_insert_term(
			$name,
			'ak_leerjaar',
			array(
				'slug'        => $slug,
				'description' => $desc,
			)
		);
		if ( ! is_wp_error( $t ) ) {
			update_term_meta( $t['term_id'], 'ak_order', $i );
		}
	}
}

/**
 * Activering: rechten geven, basisstructuur aanmaken, permalinks verversen.
 */
function aklokaal_activate() {
	foreach ( array( 'administrator', 'editor' ) as $role_name ) {
		$role = get_role( $role_name );
		if ( $role ) {
			$role->add_cap( AKLOKAAL_CAP );
			foreach ( aklokaal_item_caps() as $cap ) {
				$role->add_cap( $cap );
			}
		}
	}

	aklokaal_register_content_model();

	if ( ! term_exists( 'aardrijkskunde', 'ak_vak' ) ) {
		$t = wp_insert_term( 'Aardrijkskunde', 'ak_vak', array( 'slug' => 'aardrijkskunde' ) );
		if ( ! is_wp_error( $t ) ) {
			update_term_meta( $t['term_id'], 'ak_order', 1 );
		}
	}
	aklokaal_ensure_default_years();
	flush_rewrite_rules();
}

/**
 * Pagina "Over deze website" (adres /over/): het menu en de voettekst linken ernaar,
 * met de ankers #bronnen en #privacy. Wordt één keer aangemaakt; daarna pas je hem
 * gewoon aan via Pagina's. Verwijder je hem, dan komt hij niet terug.
 */
function aklokaal_ensure_about_page() {
	if ( get_option( 'aklokaal_about_page' ) || get_page_by_path( 'over' ) ) {
		update_option( 'aklokaal_about_page', 1 );
		return;
	}
	wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_name'    => 'over',
			'post_title'   => 'Over dit lokaal',
			'post_status'  => 'publish',
			'post_excerpt' => 'Een openbare bibliotheek met al het materiaal uit de aardrijkskundeles. Gemaakt door een docent, voor leerlingen en collega’s.',
			'post_content' => "<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">Waarom</h2>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p>Lesmateriaal raakt verspreid: een presentatie in de ene map, een werkblad in een mail, een nieuwsbericht in een chat. Hier staat alles op één plek, geordend zoals in de les: per leerjaar, hoofdstuk en paragraaf.</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:heading -->\n<h2 class=\"wp-block-heading\" id=\"bronnen\">Bronnen en auteursrecht</h2>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p>Nieuwsartikelen van anderen worden niet overgenomen. Je ziet de titel, een korte beschrijving en de naam van de uitgever, met een link naar het origineel. Kaarten en afbeeldingen van anderen staan altijd met hun bron vermeld.</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:heading -->\n<h2 class=\"wp-block-heading\" id=\"privacy\">Privacy</h2>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p>Je hebt geen account nodig. Er staan geen gegevens van leerlingen op deze website. De site onthoudt alleen of je de lichte of donkere weergave gekozen hebt, op je eigen apparaat. Video’s van YouTube laden pas als je op afspelen klikt.</p>\n<!-- /wp:paragraph -->",
		)
	);
	update_option( 'aklokaal_about_page', 1 );
}
add_action(
	'admin_init',
	function () {
		if ( current_user_can( 'publish_pages' ) && ! get_option( 'aklokaal_about_page' ) ) {
			aklokaal_ensure_about_page();
		}
	}
);
