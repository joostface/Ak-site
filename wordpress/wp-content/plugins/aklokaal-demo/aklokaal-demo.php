<?php
/**
 * Plugin Name: Aardrijkskundelokaal Demo-inhoud
 * Description: Zet met één knop voorbeeldhoofdstukken, materiaal, nieuws, kaarten en toepassingen neer, en ruimt ze ook weer op. Bedoeld om de site te bekijken en te testen. Verwijder deze plugin als je met echte inhoud begint.
 * Version:     1.0.0
 * Requires PHP: 8.1
 * License:     GPL-2.0-or-later
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		add_submenu_page(
			function_exists( 'aklokaal_can_manage' ) ? 'aklokaal' : 'tools.php',
			'Demo-inhoud',
			'Demo-inhoud',
			'manage_options',
			'aklokaal-demo',
			'aklokaal_demo_pagina',
			90
		);
	}
);

function aklokaal_demo_pagina() {
	$uitvoer = '';
	if ( isset( $_POST['aklokaal_demo'] ) && check_admin_referer( 'aklokaal_demo' ) && current_user_can( 'manage_options' ) ) {
		$aklokaal_demo_actie = 'opruimen' === $_POST['aklokaal_demo'] ? 'opruimen' : 'plaatsen';
		if ( 'plaatsen' === $aklokaal_demo_actie && ! function_exists( 'aklokaal_get_chapters' ) ) {
			$uitvoer = 'Activeer eerst de plugin “Aardrijkskundelokaal Core”.';
		} else {
			// phpcs:ignore WordPress.PHP.IniSet -- het neerzetten van afbeeldingen kan even duren
			@set_time_limit( 300 );
			ob_start();
			include __DIR__ . '/demo-content.php';
			$uitvoer = ob_get_clean();
		}
	}
	$aantal = count( get_posts( array( 'post_type' => 'any', 'post_status' => 'any', 'posts_per_page' => -1, 'meta_key' => 'ak_demo', 'meta_value' => '1', 'fields' => 'ids' ) ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
	?>
	<div class="wrap">
		<h1>Demo-inhoud</h1>
		<p style="max-width:60ch">Zet voorbeeldinhoud neer om de site te bekijken: hoofdstukken voor vier leerjaren, een volledig uitgewerkt hoofdstuk <em>Energie</em> (3 vwo), nieuwsartikelen met verzonnen voorbeeldbronnen, een nieuwsbundel, kaarten en interactieve toepassingen. Ook worden het thema geactiveerd en de permalinks ingesteld.</p>
		<p style="max-width:60ch">Alles wat de demo maakt, is gemarkeerd. Met <strong>Opruimen</strong> verdwijnt het weer; je eigen inhoud blijft staan.</p>
		<p>Nu aanwezig: <strong><?php echo (int) $aantal; ?></strong> demo-items.</p>
		<form method="post" style="display:flex;gap:8px">
			<?php wp_nonce_field( 'aklokaal_demo' ); ?>
			<button class="button button-primary" name="aklokaal_demo" value="plaatsen">Demo-inhoud plaatsen</button>
			<button class="button" name="aklokaal_demo" value="opruimen" onclick="return confirm('Alle demo-inhoud verwijderen?')">Opruimen</button>
		</form>
		<?php if ( $uitvoer ) : ?>
			<pre style="background:#fff;padding:12px;max-width:80ch;white-space:pre-wrap"><?php echo esc_html( $uitvoer ); ?></pre>
			<p><a class="button" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" rel="noopener">Bekijk de website</a></p>
		<?php endif; ?>
	</div>
	<?php
}
