<?php
/**
 * Kaarten toevoegen door links te plakken.
 *
 * Een interactieve kaart (eigen HTML, bijvoorbeeld van kaarten.thejoast.org) wordt een ak_kaart
 * met soort "interactief". De titel, beschrijving en voorbeeldafbeelding komen uit de pagina zelf
 * (titel, og:description, og:image); wat ontbreekt vul je later aan.
 */

defined( 'ABSPATH' ) || exit;

/** Bestaande kaart met hetzelfde adres (zonder www, slash en utm-parameters). */
function aklokaal_find_map_by_url( $url ) {
	$key = aklokaal_normalize_url( $url );
	if ( ! $key ) {
		return 0;
	}
	$maps = get_posts(
		array(
			'post_type'      => 'ak_kaart',
			'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'ak_archief' ),
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => 'ak_app_url', // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
	foreach ( $maps as $id ) {
		if ( aklokaal_normalize_url( get_post_meta( $id, 'ak_app_url', true ) ) === $key ) {
			return (int) $id;
		}
	}
	return 0;
}

/**
 * Maak een interactieve kaart aan.
 *
 * @param array $args url, title, description, themes, status.
 * @return int|WP_Error Post-ID, of een fout (bij een bestaande kaart met het ID in de foutgegevens).
 */
function aklokaal_create_map( $args ) {
	$url = esc_url_raw( trim( (string) ( $args['url'] ?? '' ) ), array( 'http', 'https' ) );
	if ( ! $url || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
		return new WP_Error( 'aklokaal_url', __( 'Dit is geen geldig webadres. Plak de volledige link, beginnend met https://', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$existing = aklokaal_find_map_by_url( $url );
	if ( $existing ) {
		return new WP_Error( 'aklokaal_map_exists', __( 'Deze kaart staat er al.', 'aklokaal' ), array( 'status' => 409, 'id' => $existing ) );
	}

	$title = sanitize_text_field( (string) ( $args['title'] ?? '' ) );
	$desc  = sanitize_textarea_field( (string) ( $args['description'] ?? '' ) );
	$image = '';
	$meta  = aklokaal_fetch_article_metadata( $url );
	if ( ! is_wp_error( $meta ) ) {
		$title = $title ? $title : (string) $meta['title'];
		$desc  = $desc ? $desc : (string) $meta['description'];
		$image = (string) $meta['image_url'];
	}
	if ( ! $title ) {
		// Laatste stuk van het adres: /kaarten/klimaatzones/ → Klimaatzones.
		$path  = trim( (string) wp_parse_url( $url, PHP_URL_PATH ), '/' );
		$last  = $path ? basename( $path ) : (string) wp_parse_url( $url, PHP_URL_HOST );
		$title = ucfirst( str_replace( array( '-', '_' ), ' ', preg_replace( '/\.html?$/i', '', $last ) ) );
	}

	$id = wp_insert_post(
		array(
			'post_type'    => 'ak_kaart',
			'post_status'  => ( isset( $args['status'] ) && 'draft' === $args['status'] ) ? 'draft' : 'publish',
			'post_title'   => $title,
			'post_excerpt' => $desc,
		),
		true
	);
	if ( is_wp_error( $id ) ) {
		return $id;
	}
	update_post_meta( $id, 'ak_kind', 'interactief' );
	update_post_meta( $id, 'ak_app_url', $url );
	if ( ! empty( $args['themes'] ) ) {
		wp_set_object_terms( $id, array_filter( array_map( 'trim', explode( ',', (string) $args['themes'] ) ) ), 'ak_thema' );
	}
	// Voorbeeldafbeelding van de kaartpagina zelf (og:image), als die er is.
	if ( $image ) {
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$att = media_sideload_image( $image, $id, $title, 'id' );
		if ( ! is_wp_error( $att ) ) {
			set_post_thumbnail( $id, $att );
		}
	}
	return (int) $id;
}

/**
 * Een geplakte lijst omzetten: één kaart per regel, "https://…" of "Titel | https://…".
 *
 * @return array[] lijst van array( title, url ).
 */
function aklokaal_parse_map_lines( $text ) {
	$out = array();
	foreach ( preg_split( '/\R/', (string) $text ) as $line ) {
		$line = trim( $line );
		if ( ! preg_match( '#https?://\S+#i', $line, $m ) ) {
			continue;
		}
		$url   = rtrim( $m[0], '.,;)' );
		$title = trim( str_replace( $m[0], '', $line ), " \t|-–:" );
		$out[] = array(
			'title' => $title,
			'url'   => $url,
		);
	}
	return $out;
}

/* ---------------------------------------------------------------- beheerpagina */

add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'aklokaal', __( 'Kaarten toevoegen', 'aklokaal' ), __( 'Kaarten toevoegen', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal-kaarten', 'aklokaal_render_maps_page', 3 );
	},
	11
);

function aklokaal_render_maps_page() {
	if ( ! aklokaal_can_manage() ) {
		wp_die( esc_html__( 'Geen toegang.', 'aklokaal' ) );
	}
	$results = array();
	if ( isset( $_POST['aklokaal_maps_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['aklokaal_maps_nonce'] ), 'aklokaal_maps' ) ) {
		$lines  = aklokaal_parse_map_lines( wp_unslash( $_POST['aklokaal_maps'] ?? '' ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- per regel gesaneerd
		$themes = sanitize_text_field( wp_unslash( $_POST['aklokaal_maps_themes'] ?? '' ) );
		foreach ( array_slice( $lines, 0, 40 ) as $l ) {
			$id        = aklokaal_create_map( array_merge( $l, array( 'themes' => $themes ) ) );
			$results[] = array( $l['url'], $id );
		}
	}
	$maps = get_posts(
		array(
			'post_type'      => 'ak_kaart',
			'post_status'    => array( 'publish', 'draft' ),
			'posts_per_page' => -1,
			'orderby'        => array(
				'menu_order' => 'ASC',
				'title'      => 'ASC',
			),
		)
	);
	?>
	<div class="wrap aklokaal-admin">
		<h1><?php esc_html_e( 'Kaarten toevoegen', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Plak de link van een kaart, of een hele lijst: één kaart per regel. Titel, beschrijving en voorbeeldafbeelding worden van de kaartpagina gehaald. Wil je zelf een titel kiezen, schrijf dan: Titel | https://…', 'aklokaal' ); ?></p>

		<?php if ( $results ) : ?>
			<div class="notice notice-info"><ul>
				<?php foreach ( $results as $res ) : ?>
					<li>
						<?php if ( is_wp_error( $res[1] ) ) : ?>
							<?php $eid = (int) ( $res[1]->get_error_data()['id'] ?? 0 ); ?>
							<strong><?php echo esc_html( $res[0] ); ?></strong> — <?php echo esc_html( $res[1]->get_error_message() ); ?>
							<?php if ( $eid ) : ?><a href="<?php echo esc_url( get_permalink( $eid ) ); ?>"><?php echo esc_html( get_the_title( $eid ) ); ?></a><?php endif; ?>
						<?php else : ?>
							✓ <a href="<?php echo esc_url( get_permalink( $res[1] ) ); ?>"><?php echo esc_html( get_the_title( $res[1] ) ); ?></a>
							· <a href="<?php echo esc_url( get_edit_post_link( $res[1] ) ); ?>"><?php esc_html_e( 'bewerken', 'aklokaal' ); ?></a>
						<?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ul></div>
		<?php endif; ?>

		<form method="post">
			<?php wp_nonce_field( 'aklokaal_maps', 'aklokaal_maps_nonce' ); ?>
			<p><textarea name="aklokaal_maps" rows="8" class="large-text code" placeholder="https://kaarten.thejoast.org/klimaatzones/&#10;Bevolkingsdichtheid | https://kaarten.thejoast.org/bevolking/"></textarea></p>
			<p><label><?php esc_html_e( 'Thema’s (optioneel, voor alle kaarten hierboven)', 'aklokaal' ); ?><br>
				<input type="text" name="aklokaal_maps_themes" class="regular-text" placeholder="<?php esc_attr_e( 'Bijvoorbeeld: Klimaat, Water', 'aklokaal' ); ?>"></label></p>
			<p><button class="button button-primary"><?php esc_html_e( 'Kaarten toevoegen', 'aklokaal' ); ?></button></p>
		</form>

		<?php if ( $maps ) : ?>
			<h2><?php esc_html_e( 'Alle kaarten', 'aklokaal' ); ?></h2>
			<p class="description"><?php esc_html_e( 'De volgorde hier is ook de volgorde op de site. Pas hem aan met het veld "Volgorde" in het bewerkscherm (Pagina-attributen), of laat het alfabetisch.', 'aklokaal' ); ?></p>
			<table class="widefat striped" style="max-width:900px">
				<tbody>
				<?php foreach ( $maps as $m ) : ?>
					<tr>
						<td style="width:90px"><?php echo get_the_post_thumbnail( $m, array( 80, 50 ) ); // phpcs:ignore ?></td>
						<td><strong><a href="<?php echo esc_url( get_edit_post_link( $m ) ); ?>"><?php echo esc_html( get_the_title( $m ) ); ?></a></strong><?php echo 'draft' === $m->post_status ? ' — ' . esc_html__( 'concept', 'aklokaal' ) : ''; ?><br>
							<code><?php echo esc_html( get_post_meta( $m->ID, 'ak_app_url', true ) ); ?></code></td>
						<td><a href="<?php echo esc_url( get_permalink( $m ) ); ?>"><?php esc_html_e( 'Bekijken', 'aklokaal' ); ?></a></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * Handmatig aangemaakte kaart met een adres maar zonder afbeelding is altijd interactief.
 * (Voorkomt een lege kaartpagina als "Soort kaart" op Afbeelding bleef staan.)
 */
add_action(
	'save_post',
	function ( $post_id, $post ) {
		if ( 'ak_kaart' !== $post->post_type || wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( get_post_meta( $post_id, 'ak_app_url', true ) && ! get_post_meta( $post_id, 'ak_attachment_id', true ) ) {
			update_post_meta( $post_id, 'ak_kind', 'interactief' );
		}
	},
	20,
	2
);
