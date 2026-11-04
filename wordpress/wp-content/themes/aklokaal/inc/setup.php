<?php
/**
 * Thema-instellingen, scripts, menu's en de aanpasser (Weergave → Customizer).
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'after_setup_theme',
	function () {
		load_theme_textdomain( 'aklokaal', get_template_directory() . '/languages' );
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
		add_theme_support( 'responsive-embeds' );
		// Eigen kaart of foto als grote afbeelding op de homepage (Weergave → Customizer → Headerafbeelding).
		add_theme_support(
			'custom-header',
			array(
				'width'         => 2400,
				'height'        => 1350,
				'flex-width'    => true,
				'flex-height'   => true,
				'header-text'   => false,
				'default-image' => '',
			)
		);
		register_nav_menus(
			array(
				'hoofdmenu' => __( 'Hoofdmenu', 'aklokaal' ),
			)
		);
		// Formaten voor kleinere schermen; WordPress maakt ze bij het uploaden.
		add_image_size( 'ak-card', 800, 500, true );
		add_image_size( 'ak-wide', 1600, 1000, false );
		add_image_size( 'ak-hero', 2400, 1350, false );
	}
);

add_action(
	'wp_enqueue_scripts',
	function () {
		$uri = get_template_directory_uri() . '/assets';
		wp_enqueue_style( 'aklokaal-tokens', $uri . '/css/tokens.css', array(), AKTHEME_VERSION );
		wp_enqueue_style( 'aklokaal-site', $uri . '/css/site.css', array( 'aklokaal-tokens' ), AKTHEME_VERSION );
		wp_enqueue_script( 'aklokaal-app', $uri . '/js/app.js', array(), AKTHEME_VERSION, array( 'strategy' => 'defer' ) );
		if ( is_singular( 'ak_kaart' ) ) {
			wp_enqueue_script( 'aklokaal-map', $uri . '/js/map-viewer.js', array(), AKTHEME_VERSION, array( 'strategy' => 'defer' ) );
		}
		// Geen standaard blokbibliotheek-CSS nodig op de voorkant (scheelt laadtijd).
		if ( ! is_singular( array( 'post', 'page' ) ) ) {
			wp_dequeue_style( 'wp-block-library' );
			wp_dequeue_style( 'global-styles' );
			wp_dequeue_style( 'classic-theme-styles' );
		}
	},
	20
);

/** Lettertypen vooraf laden en het thema vóór de eerste weergave instellen (geen flits). */
add_action(
	'wp_head',
	function () {
		$uri = get_template_directory_uri() . '/assets/fonts';
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $uri . '/young-serif-latin.woff2' ) );
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $uri . '/source-serif-4-latin.woff2' ) );
		echo "<script>(function(){var d=document.documentElement;d.classList.add('js');var t=null;try{t=localStorage.getItem('ak-theme');}catch(e){}var def=d.getAttribute('data-theme-default')||'dark';if(t==='light'||t==='dark')d.dataset.theme=t;else if(def!=='system')d.dataset.theme=def;})();</script>\n";
	},
	1
);

/** Attributen op <html>: standaardmodus en zoek-API. */
function aktheme_html_attrs() {
	$default = get_theme_mod( 'ak_theme_default', 'dark' );
	printf(
		' data-theme-default="%1$s" data-search-api="%2$s"',
		esc_attr( in_array( $default, array( 'dark', 'light', 'system' ), true ) ? $default : 'dark' ),
		esc_url( rest_url( 'aklokaal/v1/search' ) )
	);
}

/** Lichaamsattributen voor de hoofdstukpagina (gebruikt door "+ Toevoegen"). */
function aktheme_body_attrs() {
	if ( is_singular( 'ak_hoofdstuk' ) ) {
		printf( ' data-ak-chapter="%d"', (int) get_queried_object_id() );
	}
	$page = 'home';
	if ( is_post_type_archive( 'ak_hoofdstuk' ) || is_singular( array( 'ak_hoofdstuk', 'ak_materiaal' ) ) ) {
		$page = 'lesmateriaal';
	} elseif ( is_post_type_archive( array( 'ak_nieuws', 'ak_collectie' ) ) || is_singular( array( 'ak_nieuws', 'ak_collectie' ) ) ) {
		$page = 'nieuws';
	} elseif ( is_post_type_archive( 'ak_kaart' ) || is_singular( 'ak_kaart' ) ) {
		$page = 'kaarten';
	} elseif ( is_post_type_archive( 'ak_toepassing' ) || is_singular( 'ak_toepassing' ) ) {
		$page = 'interactief';
	} elseif ( is_page( 'over' ) ) {
		$page = 'over';
	} elseif ( ! is_front_page() ) {
		$page = '';
	}
	printf( ' data-page="%s"', esc_attr( $page ) );
}

/**
 * Hoofdmenu. Zonder ingesteld WordPress-menu tonen we de vaste indeling.
 */
function aktheme_nav_items() {
	$over = get_page_by_path( 'over' );
	return array(
		'home'         => array( __( 'Home', 'aklokaal' ), home_url( '/' ) ),
		'lesmateriaal' => array( __( 'Lesmateriaal', 'aklokaal' ), get_post_type_archive_link( 'ak_hoofdstuk' ) ),
		'nieuws'       => array( __( 'Nieuws & actualiteit', 'aklokaal' ), get_post_type_archive_link( 'ak_nieuws' ) ),
		'kaarten'      => array( __( 'Kaarten', 'aklokaal' ), get_post_type_archive_link( 'ak_kaart' ) ),
		'interactief'  => array( __( 'Interactief', 'aklokaal' ), get_post_type_archive_link( 'ak_toepassing' ) ),
		'over'         => array( __( 'Over deze website', 'aklokaal' ), $over ? get_permalink( $over ) : home_url( '/over/' ) ),
	);
}

function aktheme_nav() {
	if ( has_nav_menu( 'hoofdmenu' ) ) {
		wp_nav_menu(
			array(
				'theme_location' => 'hoofdmenu',
				'container'      => false,
				'items_wrap'     => '%3$s',
				'depth'          => 1,
				'walker'         => new AKTheme_Flat_Walker(),
			)
		);
		return;
	}
	foreach ( aktheme_nav_items() as $key => $item ) {
		if ( ! $item[1] ) {
			continue;
		}
		printf( '<a href="%1$s" data-nav="%2$s">%3$s</a>', esc_url( $item[1] ), esc_attr( $key ), esc_html( $item[0] ) );
	}
}

/** Menu als losse links, zonder lijst (past bij de vormgeving). */
class AKTheme_Flat_Walker extends Walker_Nav_Menu {
	public function start_el( &$output, $item, $depth = 0, $args = null, $id = 0 ) {
		$current = in_array( 'current-menu-item', (array) $item->classes, true ) ? ' aria-current="page"' : '';
		$output .= sprintf( '<a href="%1$s"%2$s>%3$s</a>', esc_url( $item->url ), $current, esc_html( $item->title ) );
	}
	public function end_el( &$output, $item, $depth = 0, $args = null ) {}
}

/* ---------------------------------------------------------------- aanpasser */

add_action(
	'customize_register',
	function ( $wp_customize ) {
		$wp_customize->add_section(
			'aklokaal',
			array(
				'title'    => __( 'Aardrijkskundelokaal', 'aklokaal' ),
				'priority' => 30,
			)
		);
		$settings = array(
			'ak_theme_default' => array( __( 'Standaardweergave', 'aklokaal' ), 'select', 'dark' ),
			'ak_hero_line_1'   => array( __( 'Kop, regel 1', 'aklokaal' ), 'text', 'Aardrijkskunde' ),
			'ak_hero_line_2'   => array( __( 'Kop, regel 2', 'aklokaal' ), 'text', 'in één lokaal' ),
			'ak_hero_text'     => array( __( 'Zin onder de kop', 'aklokaal' ), 'textarea', 'Lesmateriaal, kaarten en actueel nieuws voor elk leerjaar. Kies je klas en je staat meteen bij de goede paragraaf.' ),
			'ak_slogan'        => array( __( 'Slogan (tegel)', 'aklokaal' ), 'text', 'Kijk, vergelijk, verklaar' ),
			'ak_intro'         => array( __( 'Introductietekst', 'aklokaal' ), 'textarea', 'Dit is het lokaal waar je alles terugvindt wat we in de les gebruiken: de presentaties, de werkbladen, de kaarten en de nieuwsberichten waar we het over hadden. Elk hoofdstuk staat op één pagina, paragraaf onder paragraaf, zodat je kunt teruglezen wat je gemist hebt of vooruit kunt kijken naar wat komt.' ),
			'ak_intro_aside'   => array( __( 'Korte regel naast de introductie', 'aklokaal' ), 'text', 'Voor leerlingen, collega’s en iedereen die nieuwsgierig is. Geen account nodig.' ),
			'ak_tools_title'   => array( __( 'Kop boven de interactieve toepassingen', 'aklokaal' ), 'text', 'Oefenen, spelen, onderzoeken' ),
			'ak_footer_note'   => array( __( 'Regel onderaan', 'aklokaal' ), 'text', 'Lesmateriaal mag vrij gebruikt worden in de les. Nieuwsartikelen blijven van hun oorspronkelijke uitgever.' ),
		);
		$wp_customize->add_setting(
			'ak_office_viewer',
			array(
				'default'           => true,
				'sanitize_callback' => 'rest_sanitize_boolean',
			)
		);
		$wp_customize->add_control(
			'ak_office_viewer',
			array(
				'label'       => __( 'PowerPoint en Word in de browser tonen (viewer van Microsoft Office)', 'aklokaal' ),
				'description' => __( 'Presentaties staan direct in beeld; de viewer laadt als een bezoeker ernaartoe scrolt. Werkt tot 10 MB per bestand en alleen op de online site.', 'aklokaal' ),
				'section'     => 'aklokaal',
				'type'        => 'checkbox',
			)
		);
		// Weergave van materiaal: per soort groot (onder elkaar) of compact (kaartjes naast elkaar).
		$wp_customize->add_section(
			'aklokaal_weergave',
			array(
				'title'       => __( 'Weergave van materiaal', 'aklokaal' ),
				'description' => __( 'Groot: het materiaal staat breed in beeld (presentatie, video). Compact: een klein kaartje; meerdere compacte items na elkaar komen naast elkaar in een rij die opzij scrolt. Per item kun je dit op de hoofdstukpagina ook anders kiezen (Beheer → Weergave).', 'aklokaal' ),
				'priority'    => 31,
			)
		);
		$kinds = array_merge(
			function_exists( 'aklokaal_material_types' ) ? aklokaal_material_types() : array(),
			array(
				'ak_nieuws'     => __( 'Nieuwsartikel', 'aklokaal' ),
				'ak_kaart'      => __( 'Kaart', 'aklokaal' ),
				'ak_toepassing' => __( 'Interactieve toepassing', 'aklokaal' ),
			)
		);
		$defaults = aktheme_view_defaults();
		foreach ( $kinds as $kind => $name ) {
			$wp_customize->add_setting(
				'ak_weergave_' . $kind,
				array(
					'default'           => isset( $defaults[ $kind ] ) ? $defaults[ $kind ] : 'groot',
					'sanitize_callback' => function ( $v ) {
						return 'compact' === $v ? 'compact' : 'groot';
					},
				)
			);
			$wp_customize->add_control(
				'ak_weergave_' . $kind,
				array(
					'label'   => $name,
					'section' => 'aklokaal_weergave',
					'type'    => 'radio',
					'choices' => array(
						'groot'   => __( 'Groot', 'aklokaal' ),
						'compact' => __( 'Compact', 'aklokaal' ),
					),
				)
			);
		}
		foreach ( $settings as $id => $s ) {
			$wp_customize->add_setting(
				$id,
				array(
					'default'           => $s[2],
					'sanitize_callback' => 'textarea' === $s[1] ? 'sanitize_textarea_field' : 'sanitize_text_field',
				)
			);
			$control = array(
				'label'   => $s[0],
				'section' => 'aklokaal',
				'type'    => $s[1],
			);
			if ( 'select' === $s[1] ) {
				$control['choices'] = array(
					'dark'   => __( 'Donker (schoolbord)', 'aklokaal' ),
					'light'  => __( 'Licht', 'aklokaal' ),
					'system' => __( 'Volg de instelling van de bezoeker', 'aklokaal' ),
				);
			}
			$wp_customize->add_control( $id, $control );
		}
	}
);

function aktheme_mod( $id, $fallback = '' ) {
	$v = get_theme_mod( $id, null );
	return null === $v || '' === $v ? $fallback : $v;
}

/** Melding als de plugin uit staat. */
add_action(
	'admin_notices',
	function () {
		if ( ! function_exists( 'aklokaal_get_chapters' ) && current_user_can( 'activate_plugins' ) ) {
			echo '<div class="notice notice-warning"><p>' . esc_html__( 'Het thema Aardrijkskundelokaal heeft de plugin “Aardrijkskundelokaal Core” nodig. Activeer die onder Plugins.', 'aklokaal' ) . '</p></div>';
		}
	}
);

/** Zoekresultaten: ook de eigen inhoudstypen, niet de interne paragrafen. */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( ! is_admin() && $q->is_main_query() && $q->is_search() ) {
			$types = aktheme_search_types();
			// phpcs:disable WordPress.Security.NonceVerification -- openbaar zoekfilter, alleen lezen
			$soort = isset( $_GET['soort'] ) ? sanitize_key( wp_unslash( $_GET['soort'] ) ) : '';
			$jaar  = isset( $_GET['leerjaar'] ) ? sanitize_title( wp_unslash( $_GET['leerjaar'] ) ) : '';
			// phpcs:enable
			$q->set( 'post_type', isset( $types[ $soort ] ) ? array( $soort ) : array_keys( $types ) );
			$q->set( 'posts_per_page', 40 );
			if ( $jaar && function_exists( 'aklokaal_get_chapters' ) ) {
				$q->set( 'post__in', aktheme_ids_in_year( $jaar ) );
			}
		}
		if ( ! is_admin() && $q->is_main_query() && ( $q->is_post_type_archive( array( 'ak_kaart', 'ak_toepassing' ) ) ) ) {
			$q->set( 'posts_per_page', 60 );
			if ( $q->is_post_type_archive( 'ak_kaart' ) ) {
				$q->set( 'orderby', array( 'menu_order' => 'ASC', 'title' => 'ASC' ) );
			}
		}
		if ( ! is_admin() && $q->is_main_query() && $q->is_post_type_archive( 'ak_nieuws' ) ) {
			$q->set( 'posts_per_page', 24 );
			$maand = aktheme_news_month_param();
			if ( $maand ) {
				$q->set(
					'date_query',
					array(
						array(
							'year'  => (int) substr( $maand, 0, 4 ),
							'month' => (int) substr( $maand, 4, 2 ),
						),
					)
				);
			}
		}
	}
);

/** Soorten inhoud in de zoekfunctie, met hun naam. */
function aktheme_search_types() {
	return array(
		'ak_hoofdstuk'  => __( 'Hoofdstukken', 'aklokaal' ),
		'ak_materiaal'  => __( 'Materiaal', 'aklokaal' ),
		'ak_nieuws'     => __( 'Nieuws', 'aklokaal' ),
		'ak_collectie'  => __( 'Nieuwsbundels', 'aklokaal' ),
		'ak_kaart'      => __( 'Kaarten', 'aklokaal' ),
		'ak_toepassing' => __( 'Interactief', 'aklokaal' ),
		'page'          => __( 'Pagina’s', 'aklokaal' ),
	);
}

/** Alles wat bij een leerjaar hoort: de hoofdstukken en alles wat in hun paragrafen staat. */
function aktheme_ids_in_year( $slug ) {
	$ids = array();
	foreach ( aklokaal_get_chapters( array( 'leerjaar' => $slug ) ) as $c ) {
		$ids[] = $c->ID;
		foreach ( array_merge( array( $c ), aklokaal_get_paragraphs( $c->ID ) ) as $container ) {
			foreach ( aklokaal_get_items( $container->ID ) as $it ) {
				$ids[] = (int) $it['id'];
			}
		}
	}
	return $ids ? array_values( array_unique( $ids ) ) : array( 0 );
}

/** Maanden waarin nieuwsartikelen verschenen, nieuwste eerst: [ '202610' => 'oktober 2026', ... ]. */
function aktheme_news_months() {
	global $wpdb;
	// Bewust zonder MySQL-datumfuncties: werkt ook met SQLite (bijvoorbeeld WordPress Studio).
	$dates = $wpdb->get_col( "SELECT post_date FROM {$wpdb->posts} WHERE post_type = 'ak_nieuws' AND post_status = 'publish' ORDER BY post_date DESC LIMIT 3000" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$out   = array();
	foreach ( $dates as $d ) {
		$k = substr( $d, 0, 4 ) . substr( $d, 5, 2 );
		if ( ! isset( $out[ $k ] ) && count( $out ) < 36 ) {
			$out[ $k ] = date_i18n( 'F Y', mktime( 12, 0, 0, (int) substr( $d, 5, 2 ), 1, (int) substr( $d, 0, 4 ) ) );
		}
	}
	return $out;
}

/** Gekozen maand in het nieuwsarchief (?maand=202610), of ''. */
function aktheme_news_month_param() {
	// phpcs:ignore WordPress.Security.NonceVerification -- openbaar filter, alleen lezen
	$m = isset( $_GET['maand'] ) ? sanitize_text_field( wp_unslash( $_GET['maand'] ) ) : '';
	return preg_match( '/^\d{6}$/', $m ) ? $m : '';
}
