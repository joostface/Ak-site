<?php
/**
 * Toepassingen die met de plugin worden meegeleverd (assets/apps/<naam>/index.html).
 * Ze staan op de eigen site, dus er is geen apart subdomein nodig. Bij de eerste keer dat de
 * beheerder het beheer opent, wordt voor elke toepassing een item onder Interactief aangemaakt
 * (één keer: daarna kun je titel, tekst en plaats gewoon zelf aanpassen of het item verwijderen).
 *
 * Ze draaien in een afgeschermd venster (sandbox) zonder toegang tot de rest van de site.
 */

defined( 'ABSPATH' ) || exit;

/** De meegeleverde toepassingen. */
function aklokaal_builtin_apps() {
	return array(
		'platentektoniek' => array(
			'title'   => 'Platentektoniek in lagen',
			'excerpt' => 'Een doorsnede van de aarde op ware schaal, van de zeebodem tot 700 km diep. Kies een plaatgrens en zie wat er gebeurt, volgens de huidige wetenschap.',
			'content' => 'Scroll omlaag door de lagen van de aarde: aardkorst, lithosfeer, asthenosfeer en mantel. Kies daarna een plaatgrens (bijvoorbeeld de Andes, de Himalaya, de Mid-Atlantische Rug of de Hawaï-keten) en bekijk in 3D wat daar onder de grond gebeurt. Met bronnen uit recent onderzoek.',
			'height'  => 820,
			'themes'  => array( 'Fysische geografie' ),
			// Ingebouwd in de pagina (in de stijl van de site), niet in een apart venster.
			'markup'  => 'includes/app-platentektoniek.php',
			'scripts' => array( 'three.min.js', 'OrbitControls.js', 'platentektoniek.js' ),
			'styles'  => array( 'platentektoniek.css' ),
		),
	);
}

/** Adres van een meegeleverde toepassing. */
function aklokaal_builtin_app_url( $key ) {
	return AKLOKAAL_URL . 'assets/apps/' . $key . '/index.html';
}

add_action(
	'admin_init',
	function () {
		if ( ! aklokaal_can_manage() || wp_doing_ajax() ) {
			return;
		}
		foreach ( aklokaal_builtin_apps() as $key => $app ) {
			if ( get_option( 'aklokaal_app_' . $key ) ) {
				continue;
			}
			update_option( 'aklokaal_app_' . $key, 1 );
			$url = aklokaal_builtin_app_url( $key );
			$id  = wp_insert_post(
				wp_slash(
					array(
						'post_type'    => 'ak_toepassing',
						'post_status'  => 'publish',
						'post_title'   => $app['title'],
						'post_excerpt' => $app['excerpt'],
						'post_content' => $app['content'],
					)
				),
				true
			);
			if ( is_wp_error( $id ) ) {
				continue;
			}
			update_post_meta( $id, 'ak_app_url', $url );
			update_post_meta( $id, 'ak_height', (int) $app['height'] );
			update_post_meta( $id, 'ak_builtin_app', $key );
			if ( ! empty( $app['themes'] ) ) {
				wp_set_object_terms( $id, $app['themes'], 'ak_thema' );
			}
			// Voorbeeldafbeelding in de mediabibliotheek zetten.
			$img = AKLOKAAL_DIR . 'assets/apps/' . $key . '/voorbeeld.webp';
			if ( file_exists( $img ) ) {
				require_once ABSPATH . 'wp-admin/includes/media.php';
				require_once ABSPATH . 'wp-admin/includes/file.php';
				require_once ABSPATH . 'wp-admin/includes/image.php';
				$tmp = wp_tempnam( $key . '.webp' );
				copy( $img, $tmp );
				$att = media_handle_sideload(
					array(
						'name'     => $key . '.webp',
						'tmp_name' => $tmp,
					),
					$id,
					$app['title']
				);
				if ( ! is_wp_error( $att ) ) {
					set_post_thumbnail( $id, $att );
				} else {
					wp_delete_file( $tmp );
				}
			}
		}
	}
);

/**
 * Verhuist de site (ander domein), dan wijst het opgeslagen adres van een meegeleverde
 * toepassing nog naar het oude domein. Bij het tonen altijd het actuele plugin-adres gebruiken.
 */
add_filter(
	'get_post_metadata',
	function ( $value, $object_id, $meta_key, $single ) {
		static $busy = false;
		if ( $busy || 'ak_app_url' !== $meta_key || 'ak_toepassing' !== get_post_type( $object_id ) ) {
			return $value;
		}
		$busy   = true;
		$key    = get_post_meta( $object_id, 'ak_builtin_app', true );
		$stored = (string) get_post_meta( $object_id, 'ak_app_url', true );
		$busy   = false;
		// Alleen als het adres nog naar de meegeleverde toepassing wijst (niet zelf aangepast).
		if ( $key && isset( aklokaal_builtin_apps()[ $key ] ) && false !== strpos( $stored, '/assets/apps/' . $key . '/index.html' ) ) {
			$url = aklokaal_builtin_app_url( $key );
			return $single ? $url : array( $url );
		}
		return $value;
	},
	10,
	4
);

/**
 * Ingebouwde weergave van een meegeleverde toepassing, of '' als die er niet is (dan toont het
 * thema de toepassing in een afgeschermd venster).
 */
function aklokaal_app_integrated( $post_id ) {
	$key  = get_post_meta( $post_id, 'ak_builtin_app', true );
	$apps = aklokaal_builtin_apps();
	if ( ! $key || empty( $apps[ $key ]['markup'] ) ) {
		return '';
	}
	// Wie het adres zelf heeft aangepast, krijgt gewoon het venster met dat adres.
	if ( false === strpos( (string) get_post_meta( $post_id, 'ak_app_url', true ), '/assets/apps/' . $key . '/' ) ) {
		return '';
	}
	$app  = $apps[ $key ];
	$base = AKLOKAAL_URL . 'assets/apps/' . $key . '/';
	aklokaal_app_enqueue( $key );
	$img = $base . 'img/';
	ob_start();
	include AKLOKAAL_DIR . $app['markup'];
	return (string) ob_get_clean();
}

/** Stijl en scripts van een ingebouwde toepassing (stijl in de kop, scripts onderaan). */
function aklokaal_app_enqueue( $key ) {
	$app  = aklokaal_builtin_apps()[ $key ] ?? null;
	if ( ! $app || empty( $app['markup'] ) ) {
		return;
	}
	$base = AKLOKAAL_URL . 'assets/apps/' . $key . '/';
	foreach ( $app['styles'] as $i => $file ) {
		wp_enqueue_style( 'aklokaal-app-' . $key . '-' . $i, $base . $file, array(), AKLOKAAL_VERSION );
	}
	$prev = array();
	foreach ( $app['scripts'] as $i => $file ) {
		$handle = 'aklokaal-app-' . $key . '-' . $i;
		wp_enqueue_script( $handle, $base . $file, $prev, 'three.min.js' === $file ? '0.128.0' : AKLOKAAL_VERSION, true );
		$prev = array( $handle );
	}
}

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( is_singular( 'ak_toepassing' ) ) {
			$key = get_post_meta( get_queried_object_id(), 'ak_builtin_app', true );
			if ( $key ) {
				aklokaal_app_enqueue( $key );
			}
		}
	}
);

