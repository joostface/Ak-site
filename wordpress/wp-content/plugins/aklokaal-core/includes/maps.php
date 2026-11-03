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
		// phpcs:disable WordPress.Security.ValidatedSanitizedInput -- hieronder of in aklokaal_create_map gesaneerd
		$themes = sanitize_text_field( wp_unslash( $_POST['aklokaal_maps_themes'] ?? '' ) );
		if ( ! empty( $_POST['aklokaal_map_url'] ) ) {
			// Eén kaart, met eventueel eigen titel, beschrijving en voorbeeldafbeelding.
			$url = esc_url_raw( wp_unslash( $_POST['aklokaal_map_url'] ) );
			$id  = aklokaal_create_map(
				array(
					'url'         => $url,
					'title'       => wp_unslash( $_POST['aklokaal_map_title'] ?? '' ),
					'description' => wp_unslash( $_POST['aklokaal_map_desc'] ?? '' ),
					'themes'      => sanitize_text_field( wp_unslash( $_POST['aklokaal_map_themes'] ?? '' ) ),
				)
			);
			if ( ! is_wp_error( $id ) && ! empty( $_FILES['aklokaal_map_image']['name'] ) ) {
				require_once ABSPATH . 'wp-admin/includes/media.php';
				require_once ABSPATH . 'wp-admin/includes/file.php';
				require_once ABSPATH . 'wp-admin/includes/image.php';
				$check = wp_check_filetype_and_ext( $_FILES['aklokaal_map_image']['tmp_name'], $_FILES['aklokaal_map_image']['name'] );
				if ( $check['type'] && 0 === strpos( $check['type'], 'image/' ) && 'image/svg+xml' !== $check['type'] ) {
					$att = media_handle_upload( 'aklokaal_map_image', $id );
					if ( ! is_wp_error( $att ) ) {
						set_post_thumbnail( $id, $att );
					}
				}
			}
			$results[] = array( $url, $id );
		}
		$lines = aklokaal_parse_map_lines( wp_unslash( $_POST['aklokaal_maps'] ?? '' ) );
		foreach ( array_slice( $lines, 0, 40 ) as $l ) {
			$results[] = array( $l['url'], aklokaal_create_map( array_merge( $l, array( 'themes' => $themes ) ) ) );
		}
		// phpcs:enable
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
	<div class="wrap aklokaal-admin aklokaal-maps">
		<h1><?php esc_html_e( 'Kaarten toevoegen', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Een kaart is een webpagina met een interactieve kaart, bijvoorbeeld van kaarten.thejoast.org. Je hoeft alleen het adres te plakken; de rest is optioneel. Rechts zie je meteen hoe de kaart op de site komt te staan.', 'aklokaal' ); ?></p>

		<?php if ( $results ) : ?>
			<div class="notice notice-success"><ul>
				<?php foreach ( $results as $res ) : ?>
					<li>
						<?php if ( is_wp_error( $res[1] ) ) : ?>
							<?php $eid = (int) ( $res[1]->get_error_data()['id'] ?? 0 ); ?>
							<strong><?php echo esc_html( $res[0] ); ?></strong> — <?php echo esc_html( $res[1]->get_error_message() ); ?>
							<?php if ( $eid ) : ?><a href="<?php echo esc_url( get_permalink( $eid ) ); ?>"><?php echo esc_html( get_the_title( $eid ) ); ?></a><?php endif; ?>
						<?php else : ?>
							✓ <?php esc_html_e( 'Toegevoegd:', 'aklokaal' ); ?> <a href="<?php echo esc_url( get_permalink( $res[1] ) ); ?>"><strong><?php echo esc_html( get_the_title( $res[1] ) ); ?></strong></a>
							· <a href="<?php echo esc_url( get_permalink( $res[1] ) ); ?>"><?php esc_html_e( 'bekijken op de site', 'aklokaal' ); ?></a>
							· <a href="<?php echo esc_url( get_edit_post_link( $res[1] ) ); ?>"><?php esc_html_e( 'aanpassen', 'aklokaal' ); ?></a>
						<?php endif; ?>
					</li>
				<?php endforeach; ?>
			</ul></div>
		<?php endif; ?>

		<div class="akm-layout">
			<form method="post" enctype="multipart/form-data" class="akm-form" id="akm-form">
				<?php wp_nonce_field( 'aklokaal_maps', 'aklokaal_maps_nonce' ); ?>
				<h2><?php esc_html_e( 'Eén kaart toevoegen', 'aklokaal' ); ?></h2>

				<div class="akm-field">
					<label for="akm-url"><span class="akm-step">1</span> <?php esc_html_e( 'Adres van de kaart', 'aklokaal' ); ?> <em><?php esc_html_e( 'verplicht', 'aklokaal' ); ?></em></label>
					<input type="url" id="akm-url" name="aklokaal_map_url" class="large-text" placeholder="https://kaarten.thejoast.org/…" required>
					<p class="description"><?php esc_html_e( 'Open de kaart in je browser, klik in de adresbalk en kopieer het adres. Gebruik het adres van één kaart, niet van de verzamelpagina.', 'aklokaal' ); ?></p>
				</div>

				<div class="akm-field">
					<label for="akm-title"><span class="akm-step">2</span> <?php esc_html_e( 'Titel', 'aklokaal' ); ?> <em><?php esc_html_e( 'optioneel', 'aklokaal' ); ?></em></label>
					<input type="text" id="akm-title" name="aklokaal_map_title" class="large-text">
					<p class="description"><?php esc_html_e( 'Leeg laten: dan nemen we de titel van de kaartpagina over (die zie je grijs in het veld zodra het adres is ingevuld).', 'aklokaal' ); ?></p>
				</div>

				<div class="akm-field">
					<label for="akm-desc"><span class="akm-step">3</span> <?php esc_html_e( 'Korte beschrijving', 'aklokaal' ); ?> <em><?php esc_html_e( 'optioneel', 'aklokaal' ); ?></em></label>
					<textarea id="akm-desc" name="aklokaal_map_desc" rows="2" class="large-text"></textarea>
					<p class="description"><?php esc_html_e( 'Eén of twee zinnen. Staat onder de titel in het overzicht en boven de kaart. Bijvoorbeeld: Waar wonen veel mensen en waar weinig?', 'aklokaal' ); ?></p>
				</div>

				<div class="akm-field">
					<label for="akm-themes"><span class="akm-step">4</span> <?php esc_html_e( 'Thema’s', 'aklokaal' ); ?> <em><?php esc_html_e( 'optioneel', 'aklokaal' ); ?></em></label>
					<input type="text" id="akm-themes" name="aklokaal_map_themes" class="large-text" placeholder="<?php esc_attr_e( 'Bijvoorbeeld: Klimaat, Water', 'aklokaal' ); ?>">
					<p class="description"><?php esc_html_e( 'Met komma’s ertussen. Daarmee kunnen bezoekers boven het overzicht filteren.', 'aklokaal' ); ?></p>
				</div>

				<div class="akm-field">
					<label for="akm-image"><span class="akm-step">5</span> <?php esc_html_e( 'Eigen voorbeeldafbeelding', 'aklokaal' ); ?> <em><?php esc_html_e( 'optioneel', 'aklokaal' ); ?></em></label>
					<input type="file" id="akm-image" name="aklokaal_map_image" accept="image/jpeg,image/png,image/webp">
					<p class="description"><?php esc_html_e( 'Bijvoorbeeld een schermafbeelding van de kaart. Zonder afbeelding toont het overzicht een verkleinde versie van de kaart zelf.', 'aklokaal' ); ?></p>
				</div>

				<p><button class="button button-primary button-hero"><?php esc_html_e( 'Kaart toevoegen', 'aklokaal' ); ?></button></p>

				<details class="akm-bulk">
					<summary><?php esc_html_e( 'Meerdere kaarten tegelijk toevoegen', 'aklokaal' ); ?></summary>
					<p class="description"><?php esc_html_e( 'Eén kaart per regel. Alleen het adres is genoeg; een eigen titel zet je ervoor met een streep: Titel | https://…', 'aklokaal' ); ?></p>
					<textarea name="aklokaal_maps" rows="6" class="large-text code" placeholder="https://kaarten.thejoast.org/kaart-1/&#10;Bevolkingsdichtheid | https://kaarten.thejoast.org/kaart-2/"></textarea>
					<p><label><?php esc_html_e( 'Thema’s voor al deze kaarten (optioneel)', 'aklokaal' ); ?><br>
						<input type="text" name="aklokaal_maps_themes" class="regular-text"></label></p>
					<p><button class="button" formnovalidate name="aklokaal_bulk" value="1"><?php esc_html_e( 'Lijst toevoegen', 'aklokaal' ); ?></button></p>
				</details>
			</form>

			<aside class="akm-preview" aria-live="polite">
				<h2><?php esc_html_e( 'Zo komt hij op de site', 'aklokaal' ); ?></h2>
				<p class="akm-preview__label"><?php esc_html_e( 'In het overzicht Kaarten:', 'aklokaal' ); ?></p>
				<div class="akm-card">
					<div class="akm-card__media" id="akm-card-media"><span class="akm-empty"><?php esc_html_e( 'Plak links een adres', 'aklokaal' ); ?></span></div>
					<div class="akm-card__body"><strong id="akm-card-title"><?php esc_html_e( 'Titel van de kaart', 'aklokaal' ); ?></strong><span id="akm-card-desc"></span></div>
				</div>
				<p class="akm-preview__label"><?php esc_html_e( 'Na klikken: de kaart groot op een eigen pagina, met bovenaan een strook met je andere kaarten.', 'aklokaal' ); ?></p>
				<div class="akm-big" id="akm-big"><span class="akm-empty">—</span></div>
				<p class="description" id="akm-hint" hidden><?php esc_html_e( 'Blijft het voorbeeld leeg of zie je een foutmelding? Dan staat de kaartsite niet toe dat hij in een andere website wordt getoond. Dat is met één instelling bij de kaartsite op te lossen; tot die tijd werkt de knop “Open in nieuw tabblad” op de kaartpagina.', 'aklokaal' ); ?></p>
			</aside>
		</div>

		<?php if ( $maps ) : ?>
			<h2><?php esc_html_e( 'Je kaarten', 'aklokaal' ); ?> (<?php echo (int) count( $maps ); ?>)</h2>
			<p class="description"><?php esc_html_e( 'In deze volgorde staan ze op de site (alfabetisch, tenzij je bij “aanpassen” een Volgorde-nummer invult: 1 komt eerst).', 'aklokaal' ); ?></p>
			<table class="widefat striped akm-table">
				<tbody>
				<?php foreach ( $maps as $m ) : ?>
					<tr>
						<td class="akm-table__thumb"><?php echo has_post_thumbnail( $m ) ? get_the_post_thumbnail( $m, array( 80, 50 ) ) : '<span class="akm-nothumb">' . esc_html__( 'live', 'aklokaal' ) . '</span>'; // phpcs:ignore ?></td>
						<td><strong><?php echo esc_html( get_the_title( $m ) ); ?></strong><?php echo 'draft' === $m->post_status ? ' — ' . esc_html__( 'concept', 'aklokaal' ) : ''; ?><br>
							<code><?php echo esc_html( get_post_meta( $m->ID, 'ak_app_url', true ) ); ?></code></td>
						<td class="akm-table__actions"><a class="button button-small" href="<?php echo esc_url( get_permalink( $m ) ); ?>"><?php esc_html_e( 'Bekijken', 'aklokaal' ); ?></a> <a class="button button-small" href="<?php echo esc_url( get_edit_post_link( $m ) ); ?>"><?php esc_html_e( 'Aanpassen', 'aklokaal' ); ?></a></td>
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

/** Op de gewone kaartenlijst en het nieuw-scherm: verwijzen naar de eenvoudige pagina. */
add_action(
	'admin_notices',
	function () {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'ak_kaart' !== $screen->post_type || ! in_array( $screen->base, array( 'edit', 'post' ), true ) ) {
			return;
		}
		if ( 'post' === $screen->base && 'add' !== $screen->action ) {
			return;
		}
		printf(
			'<div class="notice notice-info"><p>%s <a class="button button-primary" href="%s">%s</a></p></div>',
			esc_html__( 'Een interactieve kaart toevoegen gaat het makkelijkst door alleen het adres te plakken, met een voorbeeld van hoe hij op de site komt.', 'aklokaal' ),
			esc_url( admin_url( 'admin.php?page=aklokaal-kaarten' ) ),
			esc_html__( 'Naar Kaarten toevoegen', 'aklokaal' )
		);
	}
);
