<?php
/**
 * Site-brede instellingen: wat zoekmachines zien (sitemap, noindex), beveiligingsheaders,
 * browsercache en eenmalige reparaties na een update.
 */

defined( 'ABSPATH' ) || exit;

/* ---------------------------------------------------------------- sitemap en zoekmachines */

/**
 * De sitemap bevat alleen wat leerlingen zoeken: hoofdstukken, materiaal, nieuws, kaarten,
 * toepassingen, bundels en pagina's. Geen gebruikerspagina's (die verraden je inlognaam),
 * geen standaard-WordPressberichten en categorieën (die gebruikt deze site niet).
 */
add_filter(
	'wp_sitemaps_add_provider',
	function ( $provider, $name ) {
		return 'users' === $name ? false : $provider;
	},
	10,
	2
);
add_filter(
	'wp_sitemaps_post_types',
	function ( $types ) {
		unset( $types['post'], $types['attachment'] );
		return $types;
	}
);
add_filter(
	'wp_sitemaps_taxonomies',
	function ( $taxes ) {
		unset( $taxes['category'], $taxes['post_tag'], $taxes['post_format'] );
		return $taxes;
	}
);

/** Zoekresultaten en lege pagina's niet in Google; wel de links erop volgen. */
add_filter(
	'wp_robots',
	function ( $robots ) {
		if ( is_search() || is_404() ) {
			$robots['noindex'] = true;
			$robots['follow']  = true;
		}
		return $robots;
	}
);

/* ---------------------------------------------------------------- beveiligingsheaders */

/**
 * Standaard beveiligingsheaders voor elke pagina. Ze verbieden onder meer dat een andere site
 * deze site in een frame laadt (clickjacking) en dat de browser bestandstypen gaat raden.
 */
add_action(
	'send_headers',
	function () {
		if ( headers_sent() ) {
			return;
		}
		header_remove( 'X-Powered-By' ); // verraadt de PHP-versie
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Referrer-Policy: strict-origin-when-cross-origin' );
		header( 'X-Frame-Options: SAMEORIGIN' );
		header( 'Permissions-Policy: camera=(), microphone=(), payment=(), usb=()' );
		if ( is_ssl() && apply_filters( 'aklokaal_hsts', true ) ) {
			// Een half jaar: de browser gebruikt daarna altijd https. Geen preload, zodat het terug te draaien is.
			header( 'Strict-Transport-Security: max-age=15552000' );
		}
	}
);

/* ---------------------------------------------------------------- browsercache (.htaccess) */

/** Regels voor Apache: afbeeldingen, lettertypen, CSS en JS lang bewaren in de browser. */
function aklokaal_cache_rules() {
	return array(
		'<IfModule mod_expires.c>',
		'ExpiresActive On',
		'ExpiresByType text/css "access plus 1 year"',
		'ExpiresByType application/javascript "access plus 1 year"',
		'ExpiresByType text/javascript "access plus 1 year"',
		'ExpiresByType font/woff2 "access plus 1 year"',
		'ExpiresByType image/webp "access plus 1 month"',
		'ExpiresByType image/png "access plus 1 month"',
		'ExpiresByType image/jpeg "access plus 1 month"',
		'ExpiresByType image/svg+xml "access plus 1 month"',
		'ExpiresByType image/x-icon "access plus 6 months"',
		'ExpiresByType application/json "access plus 1 week"',
		'ExpiresByType application/geo+json "access plus 1 week"',
		'</IfModule>',
		'<IfModule mod_mime.c>',
		'AddType application/geo+json .geojson',
		'AddType font/woff2 .woff2',
		'</IfModule>',
	);
}

/** Staat de browsercache aan? */
function aklokaal_cache_status() {
	$file = get_home_path() . '.htaccess';
	if ( ! file_exists( $file ) ) {
		return 'geen';
	}
	return extract_from_markers( $file, 'Aardrijkskundelokaal cache' ) ? 'aan' : 'uit';
}

/**
 * Browsercache aan of uit zetten. Na het aanzetten test de plugin meteen of de site en een
 * stijlbestand nog laden; zo niet, dan worden de regels direct weer verwijderd.
 *
 * @return true|WP_Error
 */
function aklokaal_cache_toggle( $enable ) {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/misc.php';
	$file = get_home_path() . '.htaccess';
	if ( ( file_exists( $file ) && ! wp_is_writable( $file ) ) || ( ! file_exists( $file ) && ! wp_is_writable( get_home_path() ) ) ) {
		return new WP_Error( 'aklokaal_cache', __( 'Het bestand .htaccess kan niet worden aangepast. Vraag je hostingpartij om schrijfrechten, of laat het zo: de site werkt ook zonder.', 'aklokaal' ) );
	}
	if ( ! $enable ) {
		insert_with_markers( $file, 'Aardrijkskundelokaal cache', array() );
		return true;
	}
	insert_with_markers( $file, 'Aardrijkskundelokaal cache', aklokaal_cache_rules() );
	$checks = array( home_url( '/' ), get_stylesheet_uri() );
	foreach ( $checks as $url ) {
		$res = wp_remote_get(
			add_query_arg( 'aklokaal-cachetest', time(), $url ),
			array(
				'timeout'   => 15,
				'sslverify' => false,
			)
		);
		// Een fout in .htaccess geeft een 500-fout. Lukt de testverbinding zelf niet, dan kan er niets getest worden.
		$code = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		if ( $code >= 500 ) {
			insert_with_markers( $file, 'Aardrijkskundelokaal cache', array() );
			return new WP_Error( 'aklokaal_cache', __( 'De server accepteerde de cacheregels niet; ze zijn direct weer verwijderd. De site werkt gewoon zoals eerst.', 'aklokaal' ) );
		}
	}
	return true;
}

add_action(
	'admin_post_aklokaal_cache',
	function () {
		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'aklokaal_cache' ) ) {
			wp_die( esc_html__( 'Geen toegang.', 'aklokaal' ) );
		}
		$res = aklokaal_cache_toggle( ! empty( $_POST['aan'] ) );
		$arg = is_wp_error( $res ) ? array( 'aklokaal_cache_fout' => rawurlencode( $res->get_error_message() ) ) : array( 'aklokaal_cache' => ! empty( $_POST['aan'] ) ? 'aan' : 'uit' );
		wp_safe_redirect( add_query_arg( $arg, admin_url( 'admin.php?page=aklokaal-handleiding' ) ) );
		exit;
	}
);

/** Blok op de Handleiding-pagina: browsercache aan/uit en de stand van zoekmachines. */
function aklokaal_render_site_box() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/misc.php';
	$status = aklokaal_cache_status();
	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- alleen een melding tonen
	if ( isset( $_GET['aklokaal_cache_fout'] ) ) {
		echo '<div class="notice notice-error"><p>' . esc_html( rawurldecode( sanitize_text_field( wp_unslash( $_GET['aklokaal_cache_fout'] ) ) ) ) . '</p></div>';
	} elseif ( isset( $_GET['aklokaal_cache'] ) ) {
		echo '<div class="notice notice-success"><p>' . esc_html( 'aan' === $_GET['aklokaal_cache'] ? __( 'Browsercache staat aan en de site laadt nog goed.', 'aklokaal' ) : __( 'Browsercache staat uit.', 'aklokaal' ) ) . '</p></div>';
	}
	// phpcs:enable
	?>
	<div class="aklokaal-site-box">
		<h2><?php esc_html_e( 'Snelheid en zoekmachines', 'aklokaal' ); ?></h2>
		<p>
			<strong><?php esc_html_e( 'Google en andere zoekmachines:', 'aklokaal' ); ?></strong>
			<?php if ( get_option( 'blog_public' ) ) : ?>
				<?php esc_html_e( 'de site mag geïndexeerd worden.', 'aklokaal' ); ?>
				<a href="<?php echo esc_url( home_url( '/wp-sitemap.xml' ) ); ?>" target="_blank"><?php esc_html_e( 'Bekijk de sitemap', 'aklokaal' ); ?></a>
			<?php else : ?>
				<?php esc_html_e( 'staat uit (Instellingen → Lezen → “Zoekmachines ontmoedigen”).', 'aklokaal' ); ?>
			<?php endif; ?>
		</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="aklokaal_cache">
			<?php wp_nonce_field( 'aklokaal_cache' ); ?>
			<p><strong><?php esc_html_e( 'Browsercache:', 'aklokaal' ); ?></strong>
				<?php echo 'aan' === $status ? esc_html__( 'staat aan. Afbeeldingen, lettertypen en stijlen worden in de browser bewaard, zodat pagina’s sneller laden.', 'aklokaal' ) : esc_html__( 'staat uit. Aanzetten laat browsers afbeeldingen, lettertypen en stijlen bewaren, zodat elke volgende pagina sneller laadt. De plugin test meteen of alles nog werkt en draait het anders terug.', 'aklokaal' ); ?>
			</p>
			<p><button class="button <?php echo 'aan' === $status ? '' : 'button-primary'; ?>" name="aan" value="<?php echo 'aan' === $status ? '' : '1'; ?>"><?php echo 'aan' === $status ? esc_html__( 'Browsercache uitzetten', 'aklokaal' ) : esc_html__( 'Browsercache aanzetten', 'aklokaal' ); ?></button></p>
		</form>
	</div>
	<?php
}

/* ---------------------------------------------------------------- eenmalige reparaties */

add_action(
	'admin_init',
	function () {
		if ( get_option( 'aklokaal_fix_0_13' ) || ! aklokaal_can_manage() ) {
			return;
		}
		update_option( 'aklokaal_fix_0_13', 1 );

		// Over-pagina: video's staan nu direct in beeld (privacymodus), niet meer "pas na klikken".
		$over = get_page_by_path( 'over' );
		$oud  = 'Video’s van YouTube laden pas als je op afspelen klikt.';
		if ( $over && false !== strpos( $over->post_content, $oud ) ) {
			wp_update_post(
				array(
					'ID'           => $over->ID,
					'post_content' => str_replace( $oud, 'Video’s worden getoond via de privacymodus van YouTube (youtube-nocookie.com), zonder advertentiecookies.', $over->post_content ),
				)
			);
		}

		// Video's die alleen de domeinnaam als titel kregen ("www.youtube.com"): echte titel ophalen.
		$hosts = array( 'www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com', 'vimeo.com', 'www.vimeo.com' );
		$items = get_posts(
			array(
				'post_type'      => 'ak_materiaal',
				'post_status'    => array( 'publish', 'draft', 'ak_archief' ),
				'posts_per_page' => 20,
				'meta_key'       => 'ak_type', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => 'video', // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		foreach ( $items as $it ) {
			if ( ! in_array( strtolower( $it->post_title ), $hosts, true ) ) {
				continue;
			}
			$title = aklokaal_title_for_link( (string) get_post_meta( $it->ID, 'ak_url', true ), 'video' );
			if ( $title && ! in_array( strtolower( $title ), $hosts, true ) && strtolower( $title ) !== preg_replace( '/^www\./', '', strtolower( $it->post_title ) ) ) {
				wp_update_post(
					array(
						'ID'         => $it->ID,
						'post_title' => $title,
						'post_name'  => '',
					)
				);
			}
		}
	}
);
