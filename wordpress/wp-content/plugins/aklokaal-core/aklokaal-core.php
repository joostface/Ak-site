<?php
/**
 * Plugin Name:       Aardrijkskundelokaal Core
 * Description:       Inhoudsmodel en beheer voor het digitale aardrijkskundelokaal: vakken, leerjaren, hoofdstukken, paragrafen, materiaal, nieuws, collecties, kaarten en interactieve toepassingen. Bevat de eenvoudige uploadworkflow en de nieuwsimport.
 * Version:           0.4.0
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

define( 'AKLOKAAL_VERSION', '0.4.0' );
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
	$years = array( '1 havo/vwo', '2 havo/vwo', '3 havo', '3 vwo', '4 havo', '4 vwo', '5 havo', '5 vwo', '6 vwo' );
	foreach ( $years as $i => $name ) {
		if ( ! term_exists( sanitize_title( str_replace( '/', '-', $name ) ), 'ak_leerjaar' ) ) {
			$t = wp_insert_term( $name, 'ak_leerjaar', array( 'slug' => sanitize_title( str_replace( '/', '-', $name ) ) ) );
			if ( ! is_wp_error( $t ) ) {
				update_term_meta( $t['term_id'], 'ak_order', $i + 1 );
			}
		}
	}
	flush_rewrite_rules();
}
