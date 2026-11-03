<?php
/**
 * Wereldatlas: interactieve kaart met lagen die de beheerder zelf toevoegt, ordent en verwijdert.
 *
 * - Elke kaartlaag is een bericht van het type ak_atlaslaag (titel, bron, jaartal, toelichting,
 *   kleur, dekking, categorie). Verwijderen = naar de prullenbak; terugzetten kan.
 * - Categorieën (Klimaat & landschap, Aarde & risico's …) zijn termen van ak_atlasgroep.
 * - Soorten lagen: "ingebouwd" (met eigen code en data in assets/atlas), "geojson" (een bestand
 *   of webadres), "arcgis" (een ArcGIS Feature Service-laag) en "tegels" (een tegelkaart).
 * - Toevoegen kan door te zoeken in de openbare ArcGIS Online-catalogus, een link te plakken
 *   of een GeoJSON-bestand te uploaden.
 * - Op de site: shortcode [wereldatlas], automatisch op de pagina /atlas/.
 */

defined( 'ABSPATH' ) || exit;

/* ---------------------------------------------------------------- inhoudsmodel */

add_action(
	'init',
	function () {
		register_post_type(
			'ak_atlaslaag',
			array(
				'labels'          => aklokaal_labels( 'Atlaslaag', 'Atlaslagen' ),
				'public'          => false,
				'show_ui'         => false,
				'show_in_rest'    => false,
				'capability_type' => array( 'ak_item', 'ak_items' ),
				'map_meta_cap'    => true,
				'supports'        => array( 'title', 'page-attributes' ),
			)
		);
		register_taxonomy(
			'ak_atlasgroep',
			'ak_atlaslaag',
			array(
				'labels'       => aklokaal_labels( 'Atlascategorie', 'Atlascategorieën' ),
				'public'       => false,
				'show_ui'      => false,
				'hierarchical' => false,
				'rewrite'      => false,
			)
		);
	}
);

/** Soorten lagen die de beheerder kan toevoegen. */
function aklokaal_atlas_kinds() {
	return array(
		'ingebouwd' => __( 'Ingebouwde laag', 'aklokaal' ),
		'geojson'   => __( 'GeoJSON (bestand of link)', 'aklokaal' ),
		'arcgis'    => __( 'ArcGIS Feature Service', 'aklokaal' ),
		'tegels'    => __( 'Tegelkaart', 'aklokaal' ),
	);
}

/** Iconen die bij een categorie gekozen kunnen worden (staan in assets/atlas/icons.js). */
function aklokaal_atlas_icons() {
	return array( 'cloud-sun', 'users', 'route', 'mountain', 'droplets', 'waves', 'flame', 'zap', 'factory', 'wheat', 'trees', 'building-2', 'ship', 'plane', 'landmark', 'shield-alert', 'activity', 'thermometer', 'wind', 'leaf', 'heart-pulse', 'earth', 'sprout', 'tractor', 'pickaxe', 'fuel', 'sun', 'snowflake', 'baby', 'languages', 'coins', 'scale', 'map-pin', 'layers-3', 'file-json' );
}

/** Eén laag als array voor de kaart en het beheer. */
function aklokaal_atlas_layer_json( $post ) {
	$post  = get_post( $post );
	$terms = get_the_terms( $post, 'ak_atlasgroep' );
	$m     = function ( $k ) use ( $post ) {
		return get_post_meta( $post->ID, $k, true );
	};
	return array(
		'id'         => (int) $post->ID,
		'status'     => $post->post_status,
		'kind'       => $m( 'ak_kind' ) ? $m( 'ak_kind' ) : 'geojson',
		'key'        => (string) $m( 'ak_key' ),
		'title'      => html_entity_decode( $post->post_title, ENT_QUOTES, 'UTF-8' ),
		'subtitle'   => (string) $m( 'ak_subtitle' ),
		'group'      => $terms && ! is_wp_error( $terms ) ? $terms[0]->slug : '',
		'color'      => $m( 'ak_color' ) ? $m( 'ak_color' ) : '#2f7f77',
		'opacity'    => '' !== $m( 'ak_opacity' ) ? (float) $m( 'ak_opacity' ) : 0.8,
		'defaultOn'  => (bool) $m( 'ak_default_on' ),
		'source'     => (string) $m( 'ak_source' ),
		'year'       => (string) $m( 'ak_year' ),
		'note'       => (string) $m( 'ak_note' ),
		'url'        => (string) $m( 'ak_url' ),
		'labelField' => (string) $m( 'ak_label_field' ),
		'order'      => (int) $post->menu_order,
	);
}

/** Alle categorieën, op volgorde. */
function aklokaal_atlas_groups() {
	$terms = get_terms(
		array(
			'taxonomy'   => 'ak_atlasgroep',
			'hide_empty' => false,
		)
	);
	if ( is_wp_error( $terms ) ) {
		return array();
	}
	$out = array_map(
		function ( $t ) {
			return array(
				'id'    => (int) $t->term_id,
				'slug'  => $t->slug,
				'title' => html_entity_decode( $t->name, ENT_QUOTES, 'UTF-8' ),
				'icon'  => get_term_meta( $t->term_id, 'ak_icon', true ) ? get_term_meta( $t->term_id, 'ak_icon', true ) : 'layers-3',
				'order' => (int) get_term_meta( $t->term_id, 'ak_order', true ),
			);
		},
		$terms
	);
	usort(
		$out,
		function ( $a, $b ) {
			return $a['order'] <=> $b['order'] ?: strcmp( $a['title'], $b['title'] );
		}
	);
	return $out;
}

/** Lagen ophalen. $statuses: array( 'publish' ) voor de kaart; meer voor het beheer. */
function aklokaal_atlas_layers( $statuses = array( 'publish' ) ) {
	$posts = get_posts(
		array(
			'post_type'      => 'ak_atlaslaag',
			'post_status'    => $statuses,
			'posts_per_page' => 300,
			'orderby'        => array(
				'menu_order' => 'ASC',
				'ID'         => 'ASC',
			),
		)
	);
	return array_map( 'aklokaal_atlas_layer_json', $posts );
}

/** Categorie zoeken of aanmaken op naam of slug. */
function aklokaal_atlas_group_term( $value ) {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return 0;
	}
	$t = get_term_by( 'slug', sanitize_title( $value ), 'ak_atlasgroep' );
	if ( ! $t ) {
		$t = get_term_by( 'name', $value, 'ak_atlasgroep' );
	}
	if ( $t ) {
		return (int) $t->term_id;
	}
	$new = wp_insert_term( $value, 'ak_atlasgroep' );
	if ( is_wp_error( $new ) ) {
		return 0;
	}
	update_term_meta( $new['term_id'], 'ak_icon', 'layers-3' );
	update_term_meta( $new['term_id'], 'ak_order', count( aklokaal_atlas_groups() ) * 10 );
	return (int) $new['term_id'];
}

/**
 * Laag opslaan (nieuw of bestaand).
 *
 * @param array $d   Velden: title, subtitle, group, kind, url, color, opacity, default_on, source, year, note, label_field, status.
 * @param int   $id  Bestaande laag of 0.
 * @return int|WP_Error
 */
function aklokaal_atlas_save_layer( $d, $id = 0 ) {
	$existing = $id ? get_post( $id ) : null;
	if ( $id && ( ! $existing || 'ak_atlaslaag' !== $existing->post_type ) ) {
		return new WP_Error( 'aklokaal_atlas_missing', __( 'Deze laag bestaat niet (meer).', 'aklokaal' ), array( 'status' => 404 ) );
	}
	$title = sanitize_text_field( (string) ( $d['title'] ?? '' ) );
	if ( ! $title && ! $existing ) {
		return new WP_Error( 'aklokaal_atlas_title', __( 'Geef de laag een titel.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$kind = $existing ? get_post_meta( $id, 'ak_kind', true ) : sanitize_key( (string) ( $d['kind'] ?? 'geojson' ) );
	if ( ! isset( aklokaal_atlas_kinds()[ $kind ] ) || ( ! $existing && 'ingebouwd' === $kind ) ) {
		return new WP_Error( 'aklokaal_atlas_kind', __( 'Onbekende soort laag.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	if ( 'ingebouwd' !== $kind && isset( $d['url'] ) ) {
		$url = esc_url_raw( trim( (string) $d['url'] ), array( 'http', 'https' ) );
		if ( ! $url ) {
			return new WP_Error( 'aklokaal_atlas_url', __( 'Vul een volledig webadres in, beginnend met https://', 'aklokaal' ), array( 'status' => 400 ) );
		}
	} elseif ( ! $existing && 'ingebouwd' !== $kind ) {
		return new WP_Error( 'aklokaal_atlas_url', __( 'Vul het adres van de kaartlaag in.', 'aklokaal' ), array( 'status' => 400 ) );
	}

	$postarr = array(
		'post_type'   => 'ak_atlaslaag',
		'post_status' => in_array( $d['status'] ?? '', array( 'publish', 'draft' ), true ) ? $d['status'] : ( $existing ? $existing->post_status : 'publish' ),
	);
	if ( $title ) {
		$postarr['post_title'] = $title;
	}
	if ( $existing ) {
		$postarr['ID'] = $id;
		if ( 'trash' === $existing->post_status ) {
			unset( $postarr['post_status'] );
		}
		$id = wp_update_post( $postarr, true );
	} else {
		$postarr['menu_order'] = 1000 + count( aklokaal_atlas_layers( array( 'publish', 'draft' ) ) );
		$id                    = wp_insert_post( $postarr, true );
	}
	if ( is_wp_error( $id ) ) {
		return $id;
	}
	if ( ! $existing ) {
		update_post_meta( $id, 'ak_kind', $kind );
	}
	if ( isset( $url ) ) {
		update_post_meta( $id, 'ak_url', $url );
	}
	$text = array(
		'subtitle'    => 'ak_subtitle',
		'source'      => 'ak_source',
		'year'        => 'ak_year',
		'label_field' => 'ak_label_field',
	);
	foreach ( $text as $in => $key ) {
		if ( isset( $d[ $in ] ) ) {
			update_post_meta( $id, $key, sanitize_text_field( (string) $d[ $in ] ) );
		}
	}
	if ( isset( $d['note'] ) ) {
		update_post_meta( $id, 'ak_note', sanitize_textarea_field( (string) $d['note'] ) );
	}
	if ( isset( $d['color'] ) && preg_match( '/^#[0-9a-f]{6}$/i', (string) $d['color'] ) ) {
		update_post_meta( $id, 'ak_color', strtolower( $d['color'] ) );
	}
	if ( isset( $d['opacity'] ) ) {
		update_post_meta( $id, 'ak_opacity', max( 0.1, min( 1, round( (float) $d['opacity'], 2 ) ) ) );
	}
	if ( isset( $d['default_on'] ) ) {
		update_post_meta( $id, 'ak_default_on', rest_sanitize_boolean( $d['default_on'] ) ? 1 : 0 );
	}
	if ( isset( $d['group'] ) ) {
		$term = aklokaal_atlas_group_term( $d['group'] );
		wp_set_object_terms( $id, $term ? array( $term ) : array(), 'ak_atlasgroep' );
	}
	return (int) $id;
}

/* ---------------------------------------------------------------- standaardlagen */

/** De lagen uit de oorspronkelijke wereldatlas, plus aardbevingen van de afgelopen 24 uur. */
function aklokaal_atlas_default_layers() {
	$k = 'klimaat-landschap';
	$m = 'mens-ontwikkeling';
	$g = 'geopolitiek-netwerken';
	$a = 'aarde-risico';
	return array(
		array( 'climate-main', $k, 'Hoofdklimaten (gegroepeerd)', '8 hoofdgroepen · exact geprojecteerd', '#df4b35', 0.72, true, 'Köppen–Geiger, Beck et al. (2018), via Wikimedia Commons', '1980–2016', 'Beide klimaatrasters zijn omgezet naar de Web Mercator-projectie van de kaart. Hooggebergte is geen afzonderlijke Köppenklasse en kan via de reliëflaag worden onderzocht. Wijs met de muis een plek aan om het klimaattype te zien.' ),
		array( 'koppen-detail', $k, 'Köppen–Geiger detail', 'Af, Am, Aw, BWh, Cfb, Df…', '#276bce', 0.78, false, 'Köppen–Geiger, Beck et al. (2018), via Wikimedia Commons', '1980–2016', 'Alle Köppen-klimaattypen afzonderlijk. Wijs een plek aan voor de code en de naam.' ),
		array( 'population-density', $m, 'Bevolkingsdichtheid', 'provincies & deelstaten · schatting 2025', '#e83f68', 1, false, 'Europese Commissie JRC, GHS-WUP-DUC R2025A · grenzen GADM 4.1', '2025', 'Officiële bevolkingsschatting voor 2025 op het niveau van provincies, deelstaten en vergelijkbare gebieden. De dichtheid is het aantal inwoners gedeeld door het landoppervlak van elk gebied.' ),
		array( 'population-marginals', $m, 'Waar wonen de meeste mensen?', 'per lengte- en breedtegraad · 2020', '#2c79c7', 0.86, false, 'NASA SEDAC / CIESIN GPWv4.11 Population Count', '2020', 'De oorspronkelijke totalen per 5° zijn vloeiend en totaalbehoudend verdeeld over staven van 1°.' ),
		array( 'income', $m, 'Gemiddeld inkomen', 'GNI per hoofd · nieuwste 2025/2024', '#873c38', 0.72, false, 'World Bank WDI, GNI per capita (NY.GNP.PCAP.CD)', '2025', 'Per land de nieuwste beschikbare waarde: eerst 2025, daarna 2024 en alleen waar nodig 2023. Het gebruikte jaar verschijnt bij aanwijzen.' ),
		array( 'megacities', $m, 'Megasteden', '33 agglomeraties boven 10 miljoen · 2025', '#171717', 0.9, false, 'VN DESA Population Division, World Urbanization Prospects', '2025', 'Alle stedelijke agglomeraties met meer dan 10 miljoen inwoners in 2025, met coördinaten en bevolking uit het VN-stedenbestand.' ),
		array( 'ethnolinguistic', $m, 'Etnolinguïstische gebieden', 'GREG-vlakken · label bij aanwijzen', '#6f5c91', 0.72, false, 'GREG / GeoEPR, historische atlaszones', 'historisch', 'Alleen grotere zones zijn opgenomen. Gebruik de laag als historisch vergelijkingsmateriaal, niet als actuele groepsgrens.' ),
		array( 'conflicts', $g, 'Conflicten & spanningen', 'UCDP Candidate GED · jan–jun 2026', '#e8462f', 0.72, false, 'UCDP Candidate GED (voorlopige gebeurtenisdata)', '2026', 'De gekleurde zones zijn omhullende vlakken rond geregistreerde gebeurtenissen: geschikt voor patroononderzoek, niet als precieze conflict- of frontgrens.' ),
		array( 'trade', $g, 'Wereldhandel & chokepoints', 'vaarcorridors via oceanen en zeestraten', '#1c5f66', 0.78, false, 'Didactische selectie van vaarroutes en zeestraten', '', 'Schematische vaarcorridors, geen exacte routes.' ),
		array( 'elevation-depth', $a, 'Hoogte & diepte', 'ETOPO 2022 · meters boven/onder zeeniveau', '#2f8b4f', 0.82, false, 'NOAA NCEI ETOPO 2022 (Ice Surface)', '2022', 'Naadloos wereldwijd model van landhoogte en oceaanbodem, voor de webweergave uitgedund. Niet gebruiken voor navigatie.' ),
		array( 'hillshade', $a, 'Reliëf & schaduw', 'wereldwijde hillshade', '#9c8b74', 0.58, false, 'Esri World Hillshade', '', 'Schaduwreliëf maakt gebergten en dalen zichtbaar.' ),
		array( 'volcanoes', $a, 'Vulkanen wereldwijd', '1.383 locaties · per vulkaantype', '#d13b2f', 0.88, false, 'NOAA NCEI Volcano Locations, op basis van Smithsonian Global Volcanism Program', '2025', 'Elke vulkaan is gekleurd naar zijn type (stratovulkaan, schildvulkaan, caldera …). Klik voor naam, type, hoogte, status en laatst bekende uitbarsting.' ),
		array( 'earthquakes-24h', $a, 'Aardbevingen afgelopen 24 uur', 'live · grootte en diepte', '#e0662f', 0.9, false, 'USGS Earthquake Hazards Program (live feed)', 'live', 'Alle geregistreerde aardbevingen van de afgelopen 24 uur, elke vijf minuten ververst. Grotere cirkel = zwaardere beving; de kleur toont de diepte van het haardgebied.' ),
		array( 'plate-boundaries', $a, 'Plaatgrenzen & beweging', 'convergent · divergent · transform', '#247b70', 0.9, false, 'NOAA NCEI / UTIG PLATES', '2025', 'De pijlen tonen de schematische relatieve beweging: naar elkaar toe, uit elkaar of langs elkaar. Geen exacte snelheid.' ),
		array( 'climate-risk', $a, 'Steden met klimaatrisico', '36 steden · ThinkHazard! update 2026', '#d48022', 0.85, false, 'ThinkHazard! (GFDRR / Wereldbank)', '2026', 'Gestandaardiseerde gevarenklassen per stedelijk of bestuurlijk gebied. Blootstelling en aanpassingsvermogen bepalen mede het uiteindelijke risico.' ),
	);
}

/** Categorieën en lagen één keer aanmaken; daarna beheert de docent alles zelf. */
function aklokaal_atlas_seed() {
	if ( get_option( 'aklokaal_atlas_seeded' ) ) {
		return;
	}
	$groups = array(
		'klimaat-landschap'     => array( 'Klimaat & landschap', 'cloud-sun' ),
		'mens-ontwikkeling'     => array( 'Mens & ontwikkeling', 'users' ),
		'geopolitiek-netwerken' => array( 'Geopolitiek & netwerken', 'route' ),
		'aarde-risico'          => array( 'Aarde & risico’s', 'mountain' ),
	);
	$i = 0;
	foreach ( $groups as $slug => $g ) {
		$i += 10;
		$t  = term_exists( $slug, 'ak_atlasgroep' );
		if ( ! $t ) {
			$t = wp_insert_term( $g[0], 'ak_atlasgroep', array( 'slug' => $slug ) );
		}
		if ( ! is_wp_error( $t ) ) {
			$tid = is_array( $t ) ? (int) $t['term_id'] : (int) $t;
			update_term_meta( $tid, 'ak_icon', $g[1] );
			update_term_meta( $tid, 'ak_order', $i );
		}
	}
	$n = 0;
	foreach ( aklokaal_atlas_default_layers() as $l ) {
		$n += 10;
		$id = wp_insert_post(
			array(
				'post_type'   => 'ak_atlaslaag',
				'post_status' => 'publish',
				'post_title'  => $l[2],
				'menu_order'  => $n,
			)
		);
		if ( ! $id || is_wp_error( $id ) ) {
			continue;
		}
		update_post_meta( $id, 'ak_kind', 'ingebouwd' );
		update_post_meta( $id, 'ak_key', $l[0] );
		update_post_meta( $id, 'ak_subtitle', $l[3] );
		update_post_meta( $id, 'ak_color', $l[4] );
		update_post_meta( $id, 'ak_opacity', $l[5] );
		update_post_meta( $id, 'ak_default_on', $l[6] ? 1 : 0 );
		update_post_meta( $id, 'ak_source', $l[7] );
		update_post_meta( $id, 'ak_year', $l[8] );
		update_post_meta( $id, 'ak_note', $l[9] );
		wp_set_object_terms( $id, array( $l[1] ), 'ak_atlasgroep' );
	}
	update_option( 'aklokaal_atlas_seeded', 1 );
}

/** Pagina /atlas/ met de shortcode, één keer. */
function aklokaal_atlas_ensure_page() {
	if ( get_option( 'aklokaal_atlas_page' ) || get_page_by_path( 'atlas' ) ) {
		update_option( 'aklokaal_atlas_page', 1 );
		return;
	}
	wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_name'    => 'atlas',
			'post_title'   => 'Wereldatlas',
			'post_status'  => 'publish',
			'post_excerpt' => 'Combineer kaartlagen en ontdek verbanden: klimaat, bevolking, inkomen, conflicten, vulkanen en aardbevingen.',
			'post_content' => '[wereldatlas]',
		)
	);
	update_option( 'aklokaal_atlas_page', 1 );
}

add_action(
	'admin_init',
	function () {
		if ( aklokaal_can_manage() && ( ! get_option( 'aklokaal_atlas_seeded' ) || ! get_option( 'aklokaal_atlas_page' ) ) ) {
			aklokaal_atlas_seed();
			if ( current_user_can( 'publish_pages' ) ) {
				aklokaal_atlas_ensure_page();
			}
		}
	}
);

/* ---------------------------------------------------------------- REST */

add_action(
	'rest_api_init',
	function () {
		$ns     = 'aklokaal/v1';
		$manage = function () {
			return aklokaal_can_manage();
		};
		register_rest_route(
			$ns,
			'/atlas',
			array(
				'methods'             => 'GET',
				'callback'            => function ( WP_REST_Request $r ) {
					$all = $r->get_param( 'all' ) && aklokaal_can_manage();
					return rest_ensure_response(
						array(
							'groups' => aklokaal_atlas_groups(),
							'layers' => aklokaal_atlas_layers( $all ? array( 'publish', 'draft', 'trash' ) : array( 'publish' ) ),
							'icons'  => $all ? aklokaal_atlas_icons() : array(),
						)
					);
				},
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			$ns,
			'/atlas/layers(?:/(?P<id>\d+))?',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => function ( WP_REST_Request $r ) {
						$id = aklokaal_atlas_save_layer( $r->get_json_params() ? $r->get_json_params() : $r->get_params(), (int) $r['id'] );
						return is_wp_error( $id ) ? $id : rest_ensure_response( aklokaal_atlas_layer_json( $id ) );
					},
					'permission_callback' => $manage,
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => function ( WP_REST_Request $r ) {
						$id = (int) $r['id'];
						if ( ! $id || 'ak_atlaslaag' !== get_post_type( $id ) ) {
							return new WP_Error( 'aklokaal_atlas_missing', __( 'Deze laag bestaat niet (meer).', 'aklokaal' ), array( 'status' => 404 ) );
						}
						if ( $r->get_param( 'force' ) ) {
							wp_delete_post( $id, true );
						} else {
							wp_trash_post( $id );
						}
						return rest_ensure_response( array( 'deleted' => $id ) );
					},
					'permission_callback' => $manage,
				),
			)
		);
		register_rest_route(
			$ns,
			'/atlas/layers/(?P<id>\d+)/restore',
			array(
				'methods'             => 'POST',
				'callback'            => function ( WP_REST_Request $r ) {
					$id = (int) $r['id'];
					if ( 'ak_atlaslaag' !== get_post_type( $id ) ) {
						return new WP_Error( 'aklokaal_atlas_missing', __( 'Deze laag bestaat niet (meer).', 'aklokaal' ), array( 'status' => 404 ) );
					}
					wp_untrash_post( $id );
					wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) );
					return rest_ensure_response( aklokaal_atlas_layer_json( $id ) );
				},
				'permission_callback' => $manage,
			)
		);
		register_rest_route(
			$ns,
			'/atlas/order',
			array(
				'methods'             => 'POST',
				'callback'            => function ( WP_REST_Request $r ) {
					foreach ( array_values( (array) $r->get_param( 'layers' ) ) as $i => $id ) {
						if ( 'ak_atlaslaag' === get_post_type( (int) $id ) ) {
							wp_update_post( array( 'ID' => (int) $id, 'menu_order' => ( $i + 1 ) * 10 ) );
						}
					}
					foreach ( array_values( (array) $r->get_param( 'groups' ) ) as $i => $tid ) {
						if ( term_exists( (int) $tid, 'ak_atlasgroep' ) ) {
							update_term_meta( (int) $tid, 'ak_order', ( $i + 1 ) * 10 );
						}
					}
					return rest_ensure_response( array( 'ok' => true ) );
				},
				'permission_callback' => $manage,
			)
		);
		register_rest_route(
			$ns,
			'/atlas/groups(?:/(?P<id>\d+))?',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => 'aklokaal_rest_atlas_group_save',
					'permission_callback' => $manage,
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => function ( WP_REST_Request $r ) {
						$tid = (int) $r['id'];
						$t   = get_term( $tid, 'ak_atlasgroep' );
						if ( ! $t || is_wp_error( $t ) ) {
							return new WP_Error( 'aklokaal_atlas_missing', __( 'Deze categorie bestaat niet.', 'aklokaal' ), array( 'status' => 404 ) );
						}
						$used = get_posts(
							array(
								'post_type'      => 'ak_atlaslaag',
								'post_status'    => array( 'publish', 'draft' ),
								'posts_per_page' => 1,
								'fields'         => 'ids',
								'tax_query'      => array( array( 'taxonomy' => 'ak_atlasgroep', 'terms' => $tid ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
							)
						);
						if ( $used ) {
							return new WP_Error( 'aklokaal_atlas_group_used', __( 'Er staan nog lagen in deze categorie. Verplaats of verwijder die eerst.', 'aklokaal' ), array( 'status' => 409 ) );
						}
						wp_delete_term( $tid, 'ak_atlasgroep' );
						return rest_ensure_response( array( 'deleted' => $tid ) );
					},
					'permission_callback' => $manage,
				),
			)
		);
		register_rest_route(
			$ns,
			'/atlas/search',
			array(
				'methods'             => 'GET',
				'callback'            => 'aklokaal_rest_atlas_search',
				'permission_callback' => $manage,
			)
		);
		register_rest_route(
			$ns,
			'/atlas/inspect',
			array(
				'methods'             => 'GET',
				'callback'            => 'aklokaal_rest_atlas_inspect',
				'permission_callback' => $manage,
			)
		);
		register_rest_route(
			$ns,
			'/atlas/upload',
			array(
				'methods'             => 'POST',
				'callback'            => 'aklokaal_rest_atlas_upload',
				'permission_callback' => $manage,
			)
		);
	}
);

function aklokaal_rest_atlas_group_save( WP_REST_Request $r ) {
	$tid   = (int) $r['id'];
	$title = sanitize_text_field( (string) $r->get_param( 'title' ) );
	$icon  = sanitize_key( (string) $r->get_param( 'icon' ) );
	if ( $tid ) {
		if ( ! term_exists( $tid, 'ak_atlasgroep' ) ) {
			return new WP_Error( 'aklokaal_atlas_missing', __( 'Deze categorie bestaat niet.', 'aklokaal' ), array( 'status' => 404 ) );
		}
		if ( $title ) {
			wp_update_term( $tid, 'ak_atlasgroep', array( 'name' => $title ) );
		}
	} else {
		if ( ! $title ) {
			return new WP_Error( 'aklokaal_atlas_title', __( 'Geef de categorie een naam.', 'aklokaal' ), array( 'status' => 400 ) );
		}
		$tid = aklokaal_atlas_group_term( $title );
	}
	if ( $icon && in_array( $icon, aklokaal_atlas_icons(), true ) ) {
		update_term_meta( $tid, 'ak_icon', $icon );
	}
	return rest_ensure_response( aklokaal_atlas_groups() );
}

/** Opvragen bij een externe dienst (alleen https, geen interne adressen). */
function aklokaal_atlas_remote_json( $url ) {
	$res = wp_safe_remote_get(
		$url,
		array(
			'timeout'             => 15,
			'limit_response_size' => 4 * MB_IN_BYTES,
			'user-agent'          => 'Aardrijkskundelokaal/' . AKLOKAAL_VERSION . ' (+' . home_url( '/' ) . ')',
		)
	);
	if ( is_wp_error( $res ) ) {
		return new WP_Error( 'aklokaal_atlas_remote', __( 'De kaartcatalogus is niet bereikbaar. Probeer het later opnieuw.', 'aklokaal' ), array( 'status' => 502 ) );
	}
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! is_array( $data ) ) {
		return new WP_Error( 'aklokaal_atlas_remote', __( 'De kaartcatalogus gaf een onleesbaar antwoord.', 'aklokaal' ), array( 'status' => 502 ) );
	}
	return $data;
}

/**
 * Zoeken in de openbare ArcGIS Online-catalogus. Geeft per resultaat titel, bron (eigenaar en
 * credits), het jaar van de laatste update en een voorstel voor de soort laag.
 */
function aklokaal_rest_atlas_search( WP_REST_Request $r ) {
	$q = trim( sanitize_text_field( (string) $r->get_param( 'q' ) ) );
	if ( mb_strlen( $q ) < 2 ) {
		return rest_ensure_response( array() );
	}
	$query = '(' . $q . ') AND (type:"Feature Service" OR type:"Map Service" OR type:"Image Service" OR type:"GeoJson") AND access:public';
	$url   = add_query_arg(
		array(
			'f'         => 'json',
			'num'       => 24,
			'sortField' => 'numviews',
			'sortOrder' => 'desc',
			'q'         => rawurlencode( $query ),
		),
		'https://www.arcgis.com/sharing/rest/search'
	);
	$data = aklokaal_atlas_remote_json( $url );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	$out = array();
	foreach ( (array) ( $data['results'] ?? array() ) as $it ) {
		$type = (string) ( $it['type'] ?? '' );
		$id   = preg_replace( '/[^a-f0-9]/i', '', (string) ( $it['id'] ?? '' ) );
		if ( ! $id ) {
			continue;
		}
		$kind = 'Feature Service' === $type ? 'arcgis' : ( 'GeoJson' === $type ? 'geojson' : 'tegels' );
		$url  = 'GeoJson' === $type ? 'https://www.arcgis.com/sharing/rest/content/items/' . $id . '/data' : (string) ( $it['url'] ?? '' );
		if ( ! $url ) {
			continue;
		}
		$modified = ! empty( $it['modified'] ) ? (int) floor( $it['modified'] / 1000 ) : 0;
		$credits  = trim( wp_strip_all_tags( (string) ( $it['accessInformation'] ?? '' ) ) );
		$out[]    = array(
			'id'       => $id,
			'title'    => (string) ( $it['title'] ?? '' ),
			'snippet'  => wp_strip_all_tags( (string) ( $it['snippet'] ?? '' ) ),
			'source'   => $credits ? mb_substr( $credits, 0, 160 ) : (string) ( $it['owner'] ?? '' ),
			'owner'    => (string) ( $it['owner'] ?? '' ),
			'year'     => $modified ? gmdate( 'Y', $modified ) : '',
			'type'     => $type,
			'kind'     => $kind,
			'url'      => esc_url_raw( $url ),
			'thumb'    => ! empty( $it['thumbnail'] ) ? 'https://www.arcgis.com/sharing/rest/content/items/' . $id . '/info/' . rawurlencode( basename( (string) $it['thumbnail'] ) ) : '',
			'item'     => 'https://www.arcgis.com/home/item.html?id=' . $id,
			'views'    => (int) ( $it['numViews'] ?? 0 ),
		);
	}
	return rest_ensure_response( $out );
}

/** Welke lagen zitten er in een ArcGIS-dienst? (voor de keuze na het zoeken of plakken) */
function aklokaal_rest_atlas_inspect( WP_REST_Request $r ) {
	$url = esc_url_raw( trim( (string) $r->get_param( 'url' ) ), array( 'https' ) );
	if ( ! $url || ! preg_match( '#/(FeatureServer|MapServer|ImageServer)(/\d+)?/?$#i', wp_parse_url( $url, PHP_URL_PATH ) ) ) {
		return new WP_Error( 'aklokaal_atlas_url', __( 'Dit is geen adres van een ArcGIS-dienst (…/FeatureServer, …/MapServer of …/ImageServer).', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$url  = untrailingslashit( $url );
	$data = aklokaal_atlas_remote_json( add_query_arg( 'f', 'json', $url ) );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	$layers = array();
	foreach ( array_merge( (array) ( $data['layers'] ?? array() ), (array) ( $data['tables'] ?? array() ) ) as $l ) {
		if ( isset( $l['id'] ) ) {
			$layers[] = array(
				'id'       => (int) $l['id'],
				'name'     => (string) ( $l['name'] ?? '' ),
				'geometry' => (string) ( $l['geometryType'] ?? '' ),
			);
		}
	}
	return rest_ensure_response(
		array(
			'url'         => $url,
			'name'        => (string) ( $data['name'] ?? $data['mapName'] ?? '' ),
			'description' => wp_strip_all_tags( (string) ( $data['serviceDescription'] ?? $data['description'] ?? '' ) ),
			'copyright'   => wp_strip_all_tags( (string) ( $data['copyrightText'] ?? '' ) ),
			'tiled'       => ! empty( $data['singleFusedMapCache'] ) || ! empty( $data['tileInfo'] ),
			'layers'      => $layers,
		)
	);
}

/** GeoJSON-bestand in de mediabibliotheek zetten en het adres teruggeven. */
function aklokaal_rest_atlas_upload( WP_REST_Request $r ) {
	$files = $r->get_file_params();
	$file  = $files['file'] ?? null;
	if ( ! $file || ! empty( $file['error'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
		return new WP_Error( 'aklokaal_atlas_upload', __( 'Het bestand is niet goed aangekomen.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$name = sanitize_file_name( $file['name'] );
	if ( ! preg_match( '/\.(geo)?json$/i', $name ) ) {
		return new WP_Error( 'aklokaal_atlas_upload', __( 'Alleen GeoJSON-bestanden (.geojson of .json).', 'aklokaal' ), array( 'status' => 400 ) );
	}
	if ( $file['size'] > 25 * MB_IN_BYTES ) {
		return new WP_Error( 'aklokaal_atlas_upload', __( 'Het bestand is groter dan 25 MB. Vereenvoudig de vormen eerst, bijvoorbeeld met mapshaper.org.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$raw  = file_get_contents( $file['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	$data = json_decode( (string) $raw, true );
	if ( ! is_array( $data ) || ! in_array( $data['type'] ?? '', array( 'FeatureCollection', 'Feature', 'GeometryCollection' ), true ) ) {
		return new WP_Error( 'aklokaal_atlas_upload', __( 'Dit bestand is geen geldige GeoJSON.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$features = 'FeatureCollection' === $data['type'] ? (array) ( $data['features'] ?? array() ) : array( $data );
	// Meest bruikbare naamveld voorstellen.
	$label = '';
	$props = isset( $features[0]['properties'] ) && is_array( $features[0]['properties'] ) ? $features[0]['properties'] : array();
	foreach ( array( 'name', 'naam', 'NAME', 'Name', 'title', 'titel', 'NAAM' ) as $k ) {
		if ( isset( $props[ $k ] ) && is_string( $props[ $k ] ) ) {
			$label = $k;
			break;
		}
	}
	if ( ! $label ) {
		foreach ( $props as $k => $v ) {
			if ( is_string( $v ) ) {
				$label = $k;
				break;
			}
		}
	}
	$name    = preg_replace( '/\.json$/i', '.geojson', $name );
	$allow   = function ( $m ) {
		$m['geojson'] = 'application/geo+json';
		return $m;
	};
	add_filter( 'upload_mimes', $allow );
	$up = wp_upload_bits( $name, null, $raw );
	remove_filter( 'upload_mimes', $allow );
	if ( ! empty( $up['error'] ) ) {
		return new WP_Error( 'aklokaal_atlas_upload', $up['error'], array( 'status' => 500 ) );
	}
	$att = wp_insert_attachment(
		array(
			'post_title'     => preg_replace( '/\.geojson$/i', '', $name ),
			'post_mime_type' => 'application/geo+json',
			'post_status'    => 'inherit',
		),
		$up['file']
	);
	return rest_ensure_response(
		array(
			'url'        => $up['url'],
			'attachment' => (int) $att,
			'count'      => count( $features ),
			'labelField' => $label,
			'fields'     => array_slice( array_keys( $props ), 0, 30 ),
			'title'      => ucfirst( str_replace( array( '-', '_' ), ' ', preg_replace( '/\.geojson$/i', '', $name ) ) ),
		)
	);
}

/* ---------------------------------------------------------------- op de site */

/** Scripts en stijl van de atlas, met de lagen uit de database. */
function aklokaal_atlas_enqueue() {
	$base = AKLOKAAL_URL . 'assets/atlas/';
	$v    = AKLOKAAL_VERSION;
	wp_enqueue_style( 'aklokaal-leaflet', $base . 'vendor/leaflet/leaflet.css', array(), '1.9.4' );
	wp_enqueue_style( 'aklokaal-atlas', $base . 'atlas.css', array( 'aklokaal-leaflet' ), $v );
	wp_enqueue_script( 'aklokaal-leaflet', $base . 'vendor/leaflet/leaflet.js', array(), '1.9.4', true );
	wp_enqueue_script( 'aklokaal-topojson', $base . 'vendor/topojson-client.min.js', array(), '3.1.0', true );
	wp_enqueue_script( 'aklokaal-atlas-icons', $base . 'icons.js', array(), $v, true );
	wp_enqueue_script( 'aklokaal-atlas-data', $base . 'data/kleine-data.js', array(), $v, true );
	wp_enqueue_script( 'aklokaal-atlas', $base . 'atlas.js', array( 'aklokaal-leaflet', 'aklokaal-topojson', 'aklokaal-atlas-icons', 'aklokaal-atlas-data' ), $v, true );
	wp_add_inline_script(
		'aklokaal-atlas',
		'window.AKAtlasConfig = ' . wp_json_encode(
			array(
				'base'     => $base,
				'groups'   => aklokaal_atlas_groups(),
				'layers'   => aklokaal_atlas_layers(),
				'manage'   => aklokaal_can_manage() ? admin_url( 'admin.php?page=aklokaal-atlas' ) : '',
			)
		) . ';',
		'before'
	);
}

add_shortcode(
	'wereldatlas',
	function () {
		aklokaal_atlas_enqueue();
		ob_start();
		include AKLOKAAL_DIR . 'includes/atlas-markup.php';
		return ob_get_clean();
	}
);
