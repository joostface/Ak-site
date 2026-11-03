<?php
/**
 * Beheer van de wereldatlas: Lesmateriaal → Wereldatlas.
 * De pagina zelf is een kleine JavaScript-app (assets/atlas-admin.js) op de REST-routes uit atlas.php.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'aklokaal', __( 'Wereldatlas', 'aklokaal' ), __( 'Wereldatlas', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal-atlas', 'aklokaal_render_atlas_admin', 4 );
	},
	12
);

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( false === strpos( $hook, 'aklokaal-atlas' ) ) {
			return;
		}
		wp_enqueue_script( 'aklokaal-atlas-icons', AKLOKAAL_URL . 'assets/atlas/icons.js', array(), AKLOKAAL_VERSION, true );
		wp_enqueue_script( 'aklokaal-atlas-admin', AKLOKAAL_URL . 'assets/atlas-admin.js', array( 'aklokaal-quick-add', 'aklokaal-atlas-icons' ), AKLOKAAL_VERSION, true );
		$page = get_page_by_path( 'atlas' );
		wp_add_inline_script(
			'aklokaal-atlas-admin',
			'window.AKAtlasAdmin = ' . wp_json_encode(
				array(
					'atlasUrl' => $page ? get_permalink( $page ) : '',
					'maxMb'    => 25,
				)
			) . ';',
			'before'
		);
	},
	20
);

function aklokaal_render_atlas_admin() {
	?>
	<div class="wrap aklokaal-admin aka">
		<h1><?php esc_html_e( 'Wereldatlas', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Hier bepaal je welke kaartlagen in de atlas staan. Zoek een laag in de openbare kaartcatalogus, plak een link of upload een bestand, kies een categorie en sla op. Verwijderde lagen kun je onderaan terugzetten.', 'aklokaal' ); ?></p>
		<div id="aka-app"><p><?php esc_html_e( 'Laden…', 'aklokaal' ); ?></p></div>
	</div>
	<?php
}
