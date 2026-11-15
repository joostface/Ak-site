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
		// Alleen echte .json/.geojson-bestanden (atlasdata). REST-antwoorden zijn ook JSON, maar lopen via
		// index.php en vallen hier dus buiten: die blijven altijd vers.
		'<FilesMatch "\\.(geo)?json$">',
		'ExpiresDefault "access plus 1 week"',
		'</FilesMatch>',
		'</IfModule>',
		'<IfModule mod_mime.c>',
		'AddType application/geo+json .geojson',
		'AddType font/woff2 .woff2',
		'</IfModule>',
		// Beveiligingsheaders ook hier: een cache-plugin levert pagina's als kant-en-klaar bestand af, buiten
		// WordPress om, en dan komen de headers uit de plugin (send_headers) niet mee.
		'<IfModule mod_headers.c>',
		'Header set X-Content-Type-Options "nosniff"',
		'Header set Referrer-Policy "strict-origin-when-cross-origin"',
		'Header set X-Frame-Options "SAMEORIGIN"',
		'Header set Permissions-Policy "camera=(), microphone=(), payment=(), usb=()"',
		'Header set Strict-Transport-Security "max-age=15552000" env=HTTPS',
		'Header unset X-Powered-By',
		'</IfModule>',
		// Bestanden die alleen de WordPress-versie verraden.
		'<IfModule mod_authz_core.c>',
		'<FilesMatch "^(readme\\.html|license\\.txt|wp-config-sample\\.php)$">',
		'Require all denied',
		'</FilesMatch>',
		'</IfModule>',
	);
}

/** Kenmerk van de huidige regels, om na een update te zien of .htaccess moet worden bijgewerkt. */
function aklokaal_cache_rules_version() {
	return md5( implode( "\n", aklokaal_cache_rules() ) );
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
		update_option( 'aklokaal_cache_auto', 1, false );
		delete_option( 'aklokaal_cache_rules' );
		return true;
	}
	insert_with_markers( $file, 'Aardrijkskundelokaal cache', aklokaal_cache_rules() );
	$checks = array( home_url( '/' ), get_stylesheet_uri() );
	foreach ( $checks as $url ) {
		$res = wp_remote_get(
			add_query_arg( 'aklokaal-cachetest', time(), $url ),
			array(
				'timeout'   => 15,
				/** Zelfde instelling als de eigen controles van WordPress voor verzoeken naar de eigen site. */
				'sslverify' => apply_filters( 'https_local_ssl_verify', false ),
			)
		);
		// Een fout in .htaccess geeft een 500-fout. Lukt de testverbinding zelf niet, dan kan er niets getest worden.
		$code = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		if ( $code >= 500 ) {
			insert_with_markers( $file, 'Aardrijkskundelokaal cache', array() );
			return new WP_Error( 'aklokaal_cache', __( 'De server accepteerde de cacheregels niet; ze zijn direct weer verwijderd. De site werkt gewoon zoals eerst.', 'aklokaal' ) );
		}
	}
	update_option( 'aklokaal_cache_rules', aklokaal_cache_rules_version(), false );
	return true;
}

/**
 * Na een update: de regels in .htaccess één keer aanzetten (met dezelfde test en terugdraaiing als de knop)
 * en ze bijwerken als de plugin nieuwe regels heeft. Wie ze bewust uitzet, houdt ze uit.
 */
add_action(
	'admin_init',
	function () {
		if ( ! current_user_can( 'manage_options' ) || wp_doing_ajax() || ! empty( $_POST ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$versie = aklokaal_cache_rules_version();
		if ( get_option( 'aklokaal_cache_rules' ) === $versie || get_transient( 'aklokaal_cache_poging' ) ) {
			return;
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		$status  = aklokaal_cache_status();
		$eerste  = ! get_option( 'aklokaal_cache_auto' );
		if ( 'aan' !== $status && ! $eerste ) {
			return; // bewust uitgezet
		}
		// Hooguit één poging per dag, zodat een server die de regels weigert niet bij elke klik opnieuw getest wordt.
		set_transient( 'aklokaal_cache_poging', 1, DAY_IN_SECONDS );
		update_option( 'aklokaal_cache_auto', 1, false );
		aklokaal_cache_toggle( true );
	}
);

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
			<p><strong><?php esc_html_e( 'Browsercache en beveiligingsheaders:', 'aklokaal' ); ?></strong>
				<?php echo 'aan' === $status ? esc_html__( 'staat aan. Afbeeldingen, lettertypen en stijlen worden in de browser bewaard, zodat pagina’s sneller laden. De beveiligingsheaders gaan ook mee met pagina’s uit een cache-plugin.', 'aklokaal' ) : esc_html__( 'staat uit. Aanzetten laat browsers afbeeldingen, lettertypen en stijlen bewaren, zodat elke volgende pagina sneller laadt. De plugin test meteen of alles nog werkt en draait het anders terug.', 'aklokaal' ); ?>
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
		if ( ! aklokaal_can_manage() || wp_doing_ajax() ) {
			return;
		}

		// Over-pagina: video's en presentaties staan nu direct in beeld; de privacytekst zegt dat ook.
		if ( ! get_option( 'aklokaal_fix_privacy_0_13' ) ) {
			update_option( 'aklokaal_fix_privacy_0_13', 1 );
			$over = get_page_by_path( 'over' );
			$oud  = 'Video’s van YouTube laden pas als je op afspelen klikt.';
			if ( $over && false !== strpos( $over->post_content, $oud ) ) {
				wp_update_post(
					wp_slash(
						array(
							'ID'           => $over->ID,
							'post_content' => str_replace( $oud, aklokaal_privacy_media_text(), $over->post_content ),
						)
					)
				);
			}
		}

		// Privacytekst aanvullen met kaartdiensten, nieuwsafbeeldingen en (als die draait) de bezoekersteller.
		if ( ! get_option( 'aklokaal_fix_privacy_0_18' ) ) {
			update_option( 'aklokaal_fix_privacy_0_18', 1 );
			$over = get_page_by_path( 'over' );
			$anker = aklokaal_privacy_media_text();
			if ( $over && false !== strpos( $over->post_content, $anker ) && false === strpos( $over->post_content, 'kaartdienst' ) ) {
				wp_update_post(
					wp_slash(
						array(
							'ID'           => $over->ID,
							'post_content' => str_replace( $anker, $anker . ' ' . aklokaal_privacy_extern_text(), $over->post_content ),
						)
					)
				);
			}
		}

		// Voorbeeldinhoud van WordPress zelf ("Voorbeeldpagina", "Hallo wereld") terug naar concept:
		// die stond in de sitemap en in de zoekresultaten. Alleen als de tekst nog de standaardtekst is.
		if ( ! get_option( 'aklokaal_fix_voorbeeld_0_18' ) ) {
			update_option( 'aklokaal_fix_voorbeeld_0_18', 1 );
			$kandidaten = array_filter(
				array(
					get_page_by_path( 'sample-page' ),
					get_page_by_path( 'voorbeeld-pagina' ),
					get_page_by_path( 'hello-world', OBJECT, 'post' ),
					get_page_by_path( 'hallo-wereld', OBJECT, 'post' ),
				)
			);
			foreach ( $kandidaten as $vb ) {
				$standaard = false !== strpos( $vb->post_content, 'XYZ Doohickey' ) || false !== strpos( $vb->post_content, 'Welcome to WordPress' ) || false !== strpos( $vb->post_content, 'Welkom bij WordPress' ) || false !== stripos( $vb->post_content, 'voorbeeldpagina' ) || false !== stripos( $vb->post_content, 'example page' );
				if ( 'publish' === $vb->post_status && $standaard ) {
					wp_update_post(
						array(
							'ID'          => $vb->ID,
							'post_status' => 'draft',
						)
					);
				}
			}
		}

		// Adressen van materiaal zonder gecodeerde tekens (§ werd %c2%a7). Het oude adres blijft doorverwijzen.
		if ( ! get_option( 'aklokaal_fix_slugs_0_18' ) ) {
			update_option( 'aklokaal_fix_slugs_0_18', 1 );
			global $wpdb;
			$ids = $wpdb->get_col( "SELECT ID FROM {$wpdb->posts} WHERE post_type IN ('ak_materiaal','ak_nieuws','ak_kaart','ak_toepassing','ak_collectie') AND post_name LIKE '%\\%%' LIMIT 500" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			foreach ( $ids as $pid ) {
				$it = get_post( (int) $pid );
				if ( $it ) {
					wp_update_post(
						wp_slash(
							array(
								'ID'        => $it->ID,
								'post_name' => aklokaal_clean_slug( $it->post_title ),
							)
						)
					);
				}
			}
		}

		// Video's die alleen de domeinnaam als titel kregen ("www.youtube.com"): echte titel ophalen.
		// Hooguit drie per paginalading (elke poging is een verzoek naar YouTube) en elke video maar één keer.
		if ( get_option( 'aklokaal_fix_videotitels_0_13' ) ) {
			return;
		}
		$hosts = array( 'www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com', 'vimeo.com', 'www.vimeo.com', 'player.vimeo.com' );
		$todo  = array();
		foreach ( get_posts(
			array(
				'post_type'      => 'ak_materiaal',
				'post_status'    => array( 'publish', 'draft', 'ak_archief' ),
				'posts_per_page' => -1,
				'meta_key'       => 'ak_type', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => 'video', // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		) as $it ) {
			if ( in_array( strtolower( $it->post_title ), $hosts, true ) && ! get_post_meta( $it->ID, '_ak_titel_geprobeerd', true ) ) {
				$todo[] = $it;
			}
		}
		if ( ! $todo ) {
			update_option( 'aklokaal_fix_videotitels_0_13', 1 );
			return;
		}
		foreach ( array_slice( $todo, 0, 3 ) as $it ) {
			update_post_meta( $it->ID, '_ak_titel_geprobeerd', 1 );
			$title = aklokaal_title_for_link( (string) get_post_meta( $it->ID, 'ak_url', true ), 'video' );
			if ( $title && ! in_array( strtolower( $title ), $hosts, true ) ) {
				wp_update_post(
					wp_slash(
						array(
							'ID'         => $it->ID,
							'post_title' => $title,
							'post_name'  => '',
						)
					)
				);
			}
		}
	}
);

/** Zin over video's en presentaties voor de privacytekst. */
function aklokaal_privacy_media_text() {
	return 'Video’s worden getoond via de privacymodus van YouTube (youtube-nocookie.com), zonder advertentiecookies. Presentaties worden getoond met de viewer van Microsoft Office; die laadt pas als je naar de presentatie scrolt.';
}

/** Zin over kaarten, satellietbeelden en nieuwsafbeeldingen voor de privacytekst. */
function aklokaal_privacy_extern_text() {
	$tekst = 'Kaartlagen en satellietbeelden in de atlas en de spellen komen rechtstreeks van de kaartdienst (zoals Esri, NASA of OpenStreetMap), en afbeeldingen bij nieuwsberichten van de uitgever zelf. Die partijen zien daarbij je IP-adres, zoals bij elk bezoek aan een website, maar niet welke pagina je hier bekijkt.';
	if ( defined( 'KOKO_ANALYTICS_VERSION' ) ) {
		$tekst .= ' Bezoeken worden anoniem geteld op de eigen server (Koko Analytics); er gaan geen gegevens naar advertentie- of analysebedrijven.';
	}
	return $tekst;
}


/* ---------------------------------------------------------------- nette adressen */

/** Adresdeel uit een titel, zonder tekens die in een link gecodeerd worden (§, °, ½ …). */
function aklokaal_clean_slug( $title ) {
	$title = remove_accents( (string) $title );
	$slug  = sanitize_title_with_dashes( preg_replace( '/[^\x20-\x7E]+/u', ' ', $title ), '', 'save' );
	$slug  = trim( preg_replace( '/%[0-9a-f]{2}/i', '', $slug ), '-' );
	return $slug ? $slug : 'item';
}

/** Nieuwe items krijgen meteen een net adres ("§3.1 Water" wordt 3-1-water in plaats van %c2%a73-1-water). */
add_filter(
	'wp_insert_post_data',
	function ( $data, $postarr ) {
		$types = array( 'ak_materiaal', 'ak_nieuws', 'ak_kaart', 'ak_toepassing', 'ak_collectie', 'ak_hoofdstuk', 'ak_paragraaf' );
		if ( in_array( $data['post_type'], $types, true ) && false !== strpos( (string) $data['post_name'], '%' ) ) {
			$data['post_name'] = wp_unique_post_slug( aklokaal_clean_slug( wp_unslash( $data['post_title'] ) ), isset( $postarr['ID'] ) ? (int) $postarr['ID'] : 0, $data['post_status'], $data['post_type'], (int) $data['post_parent'] );
		}
		return $data;
	},
	10,
	2
);

/* ---------------------------------------------------------------- paginacache legen */

/**
 * Een cache-plugin bewaart kant-en-klare pagina's. Verandert er iets (nieuw materiaal, andere volgorde,
 * een kaartlaag), dan moet die voorraad weg, anders zien bezoekers nog een tijd de oude pagina.
 * WordPress leegt zelf alleen de pagina van het bewerkte item, niet het hoofdstuk waar het in staat.
 * Het legen gebeurt één keer, aan het eind van het verzoek.
 */
function aklokaal_purge_page_cache() {
	static $gepland = false;
	if ( $gepland ) {
		return;
	}
	$gepland = true;
	add_action(
		'shutdown',
		function () {
			if ( function_exists( 'wp_cache_clear_cache' ) ) {
				wp_cache_clear_cache(); // WP Super Cache
			}
			if ( function_exists( 'w3tc_flush_all' ) ) {
				w3tc_flush_all(); // W3 Total Cache
			}
			if ( function_exists( 'rocket_clean_domain' ) ) {
				rocket_clean_domain(); // WP Rocket
			}
			if ( function_exists( 'wpfc_clear_all_cache' ) ) {
				wpfc_clear_all_cache( true ); // WP Fastest Cache
			}
			if ( class_exists( 'autoptimizeCache' ) && method_exists( 'autoptimizeCache', 'clearall' ) ) {
				autoptimizeCache::clearall();
			}
			do_action( 'litespeed_purge_all' ); // LiteSpeed Cache
			do_action( 'aklokaal_page_cache_purged' );
		}
	);
}

/** Welke berichten tellen als inhoud van de site. */
function aklokaal_is_site_content( $post_id ) {
	return 0 === strpos( (string) get_post_type( $post_id ), 'ak_' ) || 'page' === get_post_type( $post_id );
}

add_action(
	'save_post',
	function ( $post_id ) {
		if ( ! wp_is_post_revision( $post_id ) && ! wp_is_post_autosave( $post_id ) && aklokaal_is_site_content( $post_id ) ) {
			aklokaal_purge_page_cache();
		}
	}
);
add_action(
	'before_delete_post',
	function ( $post_id ) {
		if ( aklokaal_is_site_content( $post_id ) ) {
			aklokaal_purge_page_cache();
		}
	}
);
foreach ( array( 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ) as $aklokaal_hook ) {
	add_action(
		$aklokaal_hook,
		function ( $meta_id, $post_id, $meta_key ) {
			// Alleen eigen velden (plaatsingen, volgorde, weergave): niet de bewerk-vergrendeling van WordPress zelf.
			if ( 0 === strpos( (string) $meta_key, 'ak_' ) && aklokaal_is_site_content( $post_id ) ) {
				aklokaal_purge_page_cache();
			}
		},
		10,
		3
	);
}
unset( $aklokaal_hook );
foreach ( array( 'created_term', 'edited_term', 'delete_term' ) as $aklokaal_hook ) {
	add_action(
		$aklokaal_hook,
		function ( $term_id, $tt_id, $taxonomy ) {
			if ( 0 === strpos( (string) $taxonomy, 'ak_' ) ) {
				aklokaal_purge_page_cache();
			}
		},
		10,
		3
	);
}
unset( $aklokaal_hook );
add_action( 'customize_save_after', 'aklokaal_purge_page_cache' );
add_action( 'wp_update_nav_menu', 'aklokaal_purge_page_cache' );
