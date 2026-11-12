<?php
/**
 * Kaartlagen vinden en beoordelen voor de wereldatlas.
 *
 * - aklokaal_atlas_analyse(): bekijkt een ArcGIS-dienst en zegt hoe hij het best in de atlas komt
 *   (tegels, kaartbeeld of losse vormen), of hij geschikt is (aantal vormen tegenover wat de dienst
 *   per keer levert) en haalt de legenda op.
 * - aklokaal_rest_atlas_search(): zoekt in ArcGIS Online met Nederlandse aardrijkskundetermen die
 *   naar Engels worden vertaald, test de resultaten vooraf en zet betrouwbare, goed werkende
 *   kaarten bovenaan.
 */

defined( 'ABSPATH' ) || exit;

/** Hoeveel vormen de atlas nog vlot tekent (vlakken/lijnen; punten mogen meer). */
define( 'AKLOKAAL_ATLAS_MAX_VORMEN', 8000 );
define( 'AKLOKAAL_ATLAS_MAX_PUNTEN', 25000 );

/**
 * Nederlandse aardrijkskundetermen met Engelse zoektermen. De catalogus is grotendeels Engelstalig.
 * Uit te breiden met het filter 'aklokaal_atlas_woordenlijst'.
 */
function aklokaal_atlas_woordenlijst() {
	return apply_filters(
		'aklokaal_atlas_woordenlijst',
		array(
			'waterschaarste'      => array( 'water stress', 'water scarcity', 'water risk' ),
			'waterstress'         => array( 'water stress', 'baseline water stress' ),
			'droogte'             => array( 'drought' ),
			'overstroming'        => array( 'flood', 'flooding', 'flood risk' ),
			'overstromingen'      => array( 'flood', 'flood risk' ),
			'zeespiegel'          => array( 'sea level rise', 'sea level' ),
			'zeespiegelstijging'  => array( 'sea level rise' ),
			'neerslag'            => array( 'precipitation', 'rainfall' ),
			'temperatuur'         => array( 'temperature' ),
			'klimaat'             => array( 'climate' ),
			'klimaatverandering'  => array( 'climate change' ),
			'klimaatzones'        => array( 'climate zones', 'koppen' ),
			'bevolking'           => array( 'population' ),
			'bevolkingsdichtheid' => array( 'population density' ),
			'bevolkingsgroei'     => array( 'population growth' ),
			'migratie'            => array( 'migration', 'refugees' ),
			'vluchtelingen'       => array( 'refugees', 'displacement' ),
			'verstedelijking'     => array( 'urbanization', 'urban growth' ),
			'steden'              => array( 'cities', 'urban areas' ),
			'armoede'             => array( 'poverty' ),
			'inkomen'             => array( 'income', 'gdp per capita' ),
			'welvaart'            => array( 'gdp', 'human development index' ),
			'ontwikkeling'        => array( 'human development index', 'development' ),
			'levensverwachting'   => array( 'life expectancy' ),
			'landbouw'            => array( 'agriculture', 'cropland' ),
			'voedselzekerheid'    => array( 'food security' ),
			'honger'              => array( 'hunger', 'food insecurity' ),
			'ontbossing'          => array( 'deforestation', 'forest loss' ),
			'bos'                 => array( 'forest', 'tree cover' ),
			'bossen'              => array( 'forest', 'tree cover' ),
			'landgebruik'         => array( 'land cover', 'land use' ),
			'woestijn'            => array( 'desert', 'desertification' ),
			'woestijnvorming'     => array( 'desertification' ),
			'bodem'               => array( 'soil' ),
			'erosie'              => array( 'erosion' ),
			'aardbevingen'        => array( 'earthquakes', 'seismic' ),
			'aardbeving'          => array( 'earthquake' ),
			'vulkanen'            => array( 'volcanoes' ),
			'platen'              => array( 'tectonic plates', 'plate boundaries' ),
			'tsunami'             => array( 'tsunami' ),
			'orkanen'             => array( 'hurricanes', 'tropical cyclones' ),
			'gletsjers'           => array( 'glaciers' ),
			'ijs'                 => array( 'sea ice', 'ice' ),
			'rivieren'            => array( 'rivers' ),
			'stroomgebieden'      => array( 'watersheds', 'river basins' ),
			'oceaanstromingen'    => array( 'ocean currents' ),
			'energie'             => array( 'energy', 'power plants' ),
			'windenergie'         => array( 'wind energy', 'wind power' ),
			'zonne-energie'       => array( 'solar energy', 'solar potential' ),
			'luchtvervuiling'     => array( 'air pollution', 'air quality' ),
			'conflicten'          => array( 'conflict', 'armed conflict' ),
			'handel'              => array( 'trade', 'shipping' ),
			'scheepvaart'         => array( 'shipping lanes', 'shipping' ),
			'grenzen'             => array( 'boundaries', 'borders' ),
			'talen'               => array( 'languages' ),
			'religie'             => array( 'religion' ),
			'gezondheid'          => array( 'health' ),
			'malaria'             => array( 'malaria' ),
			'reliëf'              => array( 'elevation', 'terrain', 'hillshade' ),
			'hoogte'              => array( 'elevation' ),
		)
	);
}

/** Zoekopdracht uitbreiden: Nederlandse woorden aanvullen met Engelse zoektermen. */
function aklokaal_atlas_expand_query( $q ) {
	$lijst = aklokaal_atlas_woordenlijst();
	$extra = array();
	foreach ( preg_split( '/\s+/u', mb_strtolower( $q ) ) as $woord ) {
		$woord = trim( $woord, '.,;:!?"\'' );
		if ( isset( $lijst[ $woord ] ) ) {
			$extra = array_merge( $extra, $lijst[ $woord ] );
		}
	}
	return array_values( array_unique( $extra ) );
}

/**
 * Officiële uitgever: Esri Living Atlas of een bekende organisatie als eigenaar van het item.
 * (Willekeurige gebruikers kunnen data van zo'n organisatie opnieuw uploaden; dat telt hier niet.)
 */
function aklokaal_atlas_official( $owner ) {
	$pattern = apply_filters( 'aklokaal_atlas_official_owner_pattern', '/^(esri(_|$)|Esri_|EsriTrainingSvc|esri_livefeeds|wri_|WRI_|nasa|NASA_|noaa|NOAA_|usgs|USGS_|fao|FAO_|unep|UNEP_|un_|UN_|worldbank|WorldBank|undp|unhcr|ocha|OCHA|copernicus|esa_)/' );
	return (bool) preg_match( $pattern, (string) $owner );
}

/** Bronvermelding noemt een bekende organisatie (de data komt daar vandaan). */
function aklokaal_atlas_credited( $credits ) {
	$pattern = apply_filters( 'aklokaal_atlas_credit_pattern', '/World Resources Institute|\bWRI\b|NOAA|USGS|NASA|\bFAO\b|UNEP|United Nations|World Bank|UNHCR|OCHA|Copernicus|\bESA\b|Natural Earth|Smithsonian|\bCBS\b|PDOK|RIVM|KNMI|Rijkswaterstaat|WWF|IUCN|\bWHO\b|Esri\b/' );
	return (bool) preg_match( $pattern, (string) $credits );
}

/** Basisadres en laagnummer uit een ArcGIS-adres halen. */
function aklokaal_atlas_split_url( $url ) {
	$url = untrailingslashit( preg_replace( '/[?#].*$/', '', trim( (string) $url ) ) );
	if ( preg_match( '#^(.*?/(FeatureServer|MapServer|ImageServer))(?:/(\d+))?$#i', $url, $m ) ) {
		return array(
			'base'  => $m[1],
			'type'  => strtolower( $m[2] ),
			'layer' => isset( $m[3] ) && '' !== $m[3] ? (int) $m[3] : null,
		);
	}
	return array( 'base' => $url, 'type' => '', 'layer' => null );
}

/** JSON van een ArcGIS-dienst ophalen (met de certificaten van WordPress). */
function aklokaal_atlas_get( $url, $args = array() ) {
	$res = wp_safe_remote_get(
		add_query_arg( array_merge( array( 'f' => 'json' ), $args ), $url ),
		array(
			'timeout'             => 12,
			'limit_response_size' => 3 * MB_IN_BYTES,
			'user-agent'          => 'Aardrijkskundelokaal/' . AKLOKAAL_VERSION . ' (+' . home_url( '/' ) . ')',
		)
	);
	if ( is_wp_error( $res ) ) {
		return null;
	}
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	return is_array( $data ) && empty( $data['error'] ) ? $data : null;
}

/** Is een tegelschema bruikbaar in de atlas (Web Mercator, 256 px)? */
function aklokaal_atlas_tiles_ok( $info ) {
	if ( empty( $info['singleFusedMapCache'] ) && empty( $info['tileInfo'] ) ) {
		return false;
	}
	$wkid = (int) ( $info['tileInfo']['spatialReference']['latestWkid'] ?? $info['tileInfo']['spatialReference']['wkid'] ?? $info['spatialReference']['latestWkid'] ?? $info['spatialReference']['wkid'] ?? 0 );
	return in_array( $wkid, array( 3857, 102100, 102113, 900913 ), true );
}

/** Legenda van een MapServer of ImageServer: lijst van array( label, afbeelding ). */
function aklokaal_atlas_service_legend( $base ) {
	$data = aklokaal_atlas_get( $base . '/legend' );
	$out  = array();
	foreach ( (array) ( $data['layers'] ?? array() ) as $layer ) {
		foreach ( (array) ( $layer['legend'] ?? array() ) as $item ) {
			if ( empty( $item['imageData'] ) ) {
				continue;
			}
			$label = trim( (string) ( $item['label'] ?? '' ) );
			$out[] = array( $label ? $label : (string) ( $layer['layerName'] ?? '' ), 'data:' . ( $item['contentType'] ?? 'image/png' ) . ';base64,' . $item['imageData'] );
			if ( count( $out ) >= 16 ) {
				break 2;
			}
		}
	}
	return $out;
}

/** Legenda uit de tekenregels (renderer) van een vectorlaag. */
function aklokaal_atlas_renderer_legend( $renderer ) {
	$out  = array();
	$rgba = function ( $c ) {
		return is_array( $c ) && count( $c ) >= 3 ? sprintf( '#%02x%02x%02x', $c[0], $c[1], $c[2] ) : '';
	};
	$infos = array_merge( (array) ( $renderer['uniqueValueInfos'] ?? array() ), (array) ( $renderer['classBreakInfos'] ?? array() ) );
	foreach ( $infos as $info ) {
		$color = $rgba( $info['symbol']['color'] ?? null );
		if ( $color ) {
			$out[] = array( (string) ( $info['label'] ?? $info['value'] ?? '' ), $color );
		}
		if ( count( $out ) >= 16 ) {
			break;
		}
	}
	return $out;
}

/** Legenda veilig maken voor opslag: label (tekst) + kleur (#hex) of afbeelding (data-URI). */
function aklokaal_atlas_clean_legend( $legend ) {
	$out = array();
	foreach ( array_slice( (array) $legend, 0, 20 ) as $item ) {
		if ( ! is_array( $item ) || count( $item ) < 2 ) {
			continue;
		}
		$label = sanitize_text_field( (string) $item[0] );
		$sw    = (string) $item[1];
		if ( preg_match( '/^#[0-9a-f]{6}$/i', $sw ) || ( preg_match( '#^data:image/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$#', $sw ) && strlen( $sw ) < 20000 ) ) {
			$out[] = array( $label, $sw );
		}
	}
	return $out;
}

/**
 * Een ArcGIS-adres beoordelen.
 *
 * @return array|WP_Error  url, name, description, copyright, layers, tiled, fields, legend en
 *                         advice (kind, url, fit: goed|traag|te-groot|onbekend, reason, count).
 */
function aklokaal_atlas_analyse( $url ) {
	$url   = esc_url_raw( trim( (string) $url ), array( 'https', 'http' ) );
	$parts = aklokaal_atlas_split_url( $url );
	if ( ! $url || ! $parts['type'] ) {
		return new WP_Error( 'aklokaal_atlas_url', __( 'Dit is geen adres van een ArcGIS-dienst (…/FeatureServer, …/MapServer of …/ImageServer).', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$base = $parts['base'];
	$svc  = aklokaal_atlas_get( $base );
	if ( ! $svc ) {
		return new WP_Error( 'aklokaal_atlas_remote', __( 'De kaartdienst geeft geen antwoord. Controleer het adres, of probeer het later opnieuw.', 'aklokaal' ), array( 'status' => 502 ) );
	}
	$layers = array();
	foreach ( array_merge( (array) ( $svc['layers'] ?? array() ), (array) ( $svc['tables'] ?? array() ) ) as $l ) {
		if ( isset( $l['id'] ) ) {
			$layers[] = array(
				'id'       => (int) $l['id'],
				'name'     => (string) ( $l['name'] ?? '' ),
				'geometry' => (string) ( $l['geometryType'] ?? '' ),
			);
		}
	}
	$out = array(
		'url'         => $base,
		'name'        => (string) ( $svc['name'] ?? $svc['mapName'] ?? $svc['documentInfo']['Title'] ?? '' ),
		'description' => mb_substr( wp_strip_all_tags( (string) ( $svc['serviceDescription'] ?? $svc['description'] ?? '' ) ), 0, 500 ),
		'copyright'   => wp_strip_all_tags( (string) ( $svc['copyrightText'] ?? '' ) ),
		'layers'      => $layers,
		'tiled'       => aklokaal_atlas_tiles_ok( $svc ),
		'fields'      => array(),
		'legend'      => array(),
	);

	// 1. Tegels: de dienst tekent zelf, in zijn eigen kleuren. Altijd de beste keuze.
	if ( in_array( $parts['type'], array( 'mapserver', 'imageserver' ), true ) && $out['tiled'] ) {
		$out['legend'] = aklokaal_atlas_service_legend( $base );
		$out['advice'] = array( 'kind' => 'tegels', 'url' => $base, 'fit' => 'goed', 'reason' => __( 'Tegelkaart: snel en in de kleuren van de maker.', 'aklokaal' ) );
		return $out;
	}
	// 2. Kaartbeeld: een MapServer of ImageServer zonder tegels tekent per beeld een afbeelding.
	if ( in_array( $parts['type'], array( 'mapserver', 'imageserver' ), true ) && null === $parts['layer'] ) {
		$out['legend'] = aklokaal_atlas_service_legend( $base );
		$out['advice'] = array( 'kind' => 'kaartbeeld', 'url' => $base, 'fit' => 'goed', 'reason' => __( 'Kaartbeeld: de dienst tekent de kaart zelf, in zijn eigen kleuren. Laadt bij elke verschuiving een nieuw beeld.', 'aklokaal' ) );
		return $out;
	}
	// 3. Vectorlaag: tellen hoeveel vormen er zijn en hoeveel de dienst per keer levert.
	$lid = $parts['layer'];
	if ( null === $lid ) {
		foreach ( $layers as $l ) {
			if ( $l['geometry'] ) {
				$lid = $l['id'];
				break;
			}
		}
	}
	if ( null === $lid ) {
		return new WP_Error( 'aklokaal_atlas_remote', __( 'Deze dienst bevat geen kaartlaag.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$layer = aklokaal_atlas_get( $base . '/' . $lid );
	$count = aklokaal_atlas_get(
		$base . '/' . $lid . '/query',
		array(
			'where'           => '1%3D1',
			'returnCountOnly' => 'true',
		)
	);
	$n      = isset( $count['count'] ) ? (int) $count['count'] : -1;
	$geom   = (string) ( $layer['geometryType'] ?? '' );
	$max    = 'esriGeometryPoint' === $geom || 'esriGeometryMultipoint' === $geom ? AKLOKAAL_ATLAS_MAX_PUNTEN : AKLOKAAL_ATLAS_MAX_VORMEN;
	$per    = (int) ( $layer['maxRecordCount'] ?? $svc['maxRecordCount'] ?? 1000 );
	$geojson = false !== stripos( (string) ( $layer['supportedQueryFormats'] ?? $svc['supportedQueryFormats'] ?? '' ), 'geojson' );
	foreach ( (array) ( $layer['fields'] ?? array() ) as $f ) {
		if ( in_array( $f['type'] ?? '', array( 'esriFieldTypeGeometry', 'esriFieldTypeBlob', 'esriFieldTypeRaster' ), true ) ) {
			continue;
		}
		$out['fields'][] = array(
			'name'    => (string) $f['name'],
			'alias'   => (string) ( $f['alias'] ?? $f['name'] ),
			'numeric' => in_array( $f['type'] ?? '', array( 'esriFieldTypeInteger', 'esriFieldTypeSmallInteger', 'esriFieldTypeDouble', 'esriFieldTypeSingle' ), true ),
		);
	}
	$out['legend'] = aklokaal_atlas_renderer_legend( (array) ( $layer['drawingInfo']['renderer'] ?? array() ) );
	$out['name']   = (string) ( $layer['name'] ?? $out['name'] );
	$advice        = array( 'kind' => 'arcgis', 'url' => $base . '/' . $lid, 'count' => $n, 'per' => $per );

	// Bij een MapServer-laag met tegels in de dienst: die tegels zijn beter.
	if ( 'mapserver' === $parts['type'] && aklokaal_atlas_tiles_ok( $svc ) ) {
		$out['legend'] = aklokaal_atlas_service_legend( $base );
		$out['advice'] = array( 'kind' => 'tegels', 'url' => $base, 'fit' => 'goed', 'reason' => __( 'Deze dienst heeft ook tegels: sneller en in de kleuren van de maker.', 'aklokaal' ) );
		return $out;
	}
	if ( ! $geojson ) {
		$advice += array( 'fit' => 'te-groot', 'reason' => __( 'Deze dienst kan geen GeoJSON leveren (te oude ArcGIS-versie).', 'aklokaal' ) );
	} elseif ( $n < 0 ) {
		$advice += array( 'fit' => 'onbekend', 'reason' => __( 'Het aantal vormen kon niet worden opgevraagd.', 'aklokaal' ) );
	} elseif ( $n > $max ) {
		/* translators: 1: aantal vormen, 2: maximum */
		$advice += array( 'fit' => 'te-groot', 'reason' => sprintf( __( '%1$s vormen: te veel om in de browser te tekenen (de atlas kan er ongeveer %2$s aan). Zoek een tegelversie van dezelfde kaart.', 'aklokaal' ), number_format_i18n( $n ), number_format_i18n( $max ) ) );
	} elseif ( $n > $per ) {
		/* translators: 1: aantal vormen, 2: per keer */
		$advice += array( 'fit' => 'traag', 'reason' => sprintf( __( '%1$s vormen; de dienst levert er %2$s per keer. De atlas haalt ze in delen op, dat duurt even.', 'aklokaal' ), number_format_i18n( $n ), number_format_i18n( $per ) ) );
	} else {
		/* translators: %s: aantal vormen */
		$advice += array( 'fit' => 'goed', 'reason' => sprintf( _n( '%s vorm.', '%s vormen.', $n, 'aklokaal' ), number_format_i18n( $n ) ) );
	}
	if ( ! $out['legend'] && 'te-groot' !== $advice['fit'] ) {
		$advice['reason'] .= ' ' . __( 'Geen eigen kleuren: kies bij “Kleur op veld” een veld om de kaart in te kleuren.', 'aklokaal' );
	}
	$out['advice'] = $advice;
	return $out;
}

function aklokaal_rest_atlas_inspect( WP_REST_Request $r ) {
	$res = aklokaal_atlas_analyse( (string) $r->get_param( 'url' ) );
	return is_wp_error( $res ) ? $res : rest_ensure_response( $res );
}

/**
 * Zoeken in ArcGIS Online, met Nederlandse termen vertaald, en elk resultaat vooraf getest.
 */
function aklokaal_rest_atlas_search( WP_REST_Request $r ) {
	$q      = trim( sanitize_text_field( (string) $r->get_param( 'q' ) ) );
	$wereld = rest_sanitize_boolean( $r->get_param( 'wereld' ) ?? true );
	if ( mb_strlen( $q ) < 2 ) {
		return rest_ensure_response( array( 'results' => array(), 'terms' => array() ) );
	}
	$cache = 'aklokaal_atlas_zoek_' . md5( mb_strtolower( $q ) . ( $wereld ? '|w' : '' ) );
	$hit   = get_transient( $cache );
	if ( is_array( $hit ) ) {
		return rest_ensure_response( $hit );
	}
	$terms = aklokaal_atlas_expand_query( $q );
	$parts = array_map(
		function ( $t ) {
			return '"' . str_replace( '"', '', $t ) . '"';
		},
		array_merge( array( $q ), $terms )
	);
	$query = '(' . implode( ' OR ', $parts ) . ') AND (type:"Feature Service" OR type:"Map Service" OR type:"Image Service" OR type:"GeoJson") AND access:public';
	$data  = aklokaal_atlas_remote_json(
		add_query_arg(
			array(
				'f'   => 'json',
				'num' => 100,
				'q'   => rawurlencode( $query ),
			),
			'https://www.arcgis.com/sharing/rest/search'
		)
	);
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	$needles = array_map( 'mb_strtolower', array_merge( array( $q ), $terms ) );
	foreach ( preg_split( '/\s+/u', mb_strtolower( $q ) ) as $w ) {
		if ( mb_strlen( $w ) >= 4 ) {
			$needles[] = $w;
		}
	}
	$items = array();
	foreach ( (array) ( $data['results'] ?? array() ) as $rank => $it ) {
		$type = (string) ( $it['type'] ?? '' );
		$id   = preg_replace( '/[^a-f0-9]/i', '', (string) ( $it['id'] ?? '' ) );
		$url  = 'GeoJson' === $type ? 'https://www.arcgis.com/sharing/rest/content/items/' . $id . '/data' : (string) ( $it['url'] ?? '' );
		if ( ! $id || ! $url || ! wp_http_validate_url( $url ) ) {
			continue;
		}
		// Alleen resultaten waarin een zoekterm echt voorkomt (titel, beschrijving of trefwoorden).
		$hay = mb_strtolower( ( $it['title'] ?? '' ) . ' ' . ( $it['snippet'] ?? '' ) . ' ' . implode( ' ', (array) ( $it['tags'] ?? array() ) ) );
		$hit = false;
		foreach ( $needles as $n ) {
			if ( false !== mb_strpos( $hay, $n ) ) {
				$hit = true;
				break;
			}
		}
		if ( ! $hit ) {
			continue;
		}
		// Alleen kaarten die (bijna) de hele wereld beslaan, als daarom gevraagd is.
		$ext   = (array) ( $it['extent'] ?? array() );
		$breed = isset( $ext[0][0], $ext[1][0] ) ? abs( (float) $ext[1][0] - (float) $ext[0][0] ) : 0;
		$hoog  = isset( $ext[0][1], $ext[1][1] ) ? abs( (float) $ext[1][1] - (float) $ext[0][1] ) : 0;
		if ( $wereld && ( $breed < 100 || $hoog < 50 ) ) {
			continue;
		}
		$credits  = trim( wp_strip_all_tags( (string) ( $it['accessInformation'] ?? '' ) ) );
		$modified = ! empty( $it['modified'] ) ? (int) floor( $it['modified'] / 1000 ) : 0;
		$keywords = (array) ( $it['typeKeywords'] ?? array() );
		$items[]  = array(
			'id'      => $id,
			'title'   => (string) ( $it['title'] ?? '' ),
			'snippet' => wp_strip_all_tags( (string) ( $it['snippet'] ?? '' ) ),
			'source'  => $credits ? mb_substr( $credits, 0, 160 ) : (string) ( $it['owner'] ?? '' ),
			'owner'   => (string) ( $it['owner'] ?? '' ),
			'year'    => $modified ? gmdate( 'Y', $modified ) : '',
			'type'    => $type,
			'url'     => esc_url_raw( $url ),
			'thumb'   => ! empty( $it['thumbnail'] ) ? 'https://www.arcgis.com/sharing/rest/content/items/' . $id . '/info/' . rawurlencode( basename( (string) $it['thumbnail'] ) ) : '',
			'item'    => 'https://www.arcgis.com/home/item.html?id=' . $id,
			'views'   => (int) ( $it['numViews'] ?? 0 ),
			'trusted' => aklokaal_atlas_official( (string) ( $it['owner'] ?? '' ) ),
			'credited' => aklokaal_atlas_credited( $credits ),
			'tiled'   => in_array( 'Tiled', $keywords, true ),
			'rank'    => $rank,
		);
	}
	// De 16 beste kandidaten vooraf testen (tegelijk, met korte wachttijd).
	usort(
		$items,
		function ( $a, $b ) {
			$sa = ( $a['trusted'] ? 15 : 0 ) + ( $a['credited'] ? 2 : 0 ) + ( $a['tiled'] ? 10 : 0 ) - $a['rank'] + log( 1 + $a['views'] );
			$sb = ( $b['trusted'] ? 15 : 0 ) + ( $b['credited'] ? 2 : 0 ) + ( $b['tiled'] ? 10 : 0 ) - $b['rank'] + log( 1 + $b['views'] );
			return $sb <=> $sa;
		}
	);
	$items = array_slice( $items, 0, 16 );
	$items = aklokaal_atlas_check_many( $items );
	$order = array(
		'goed'     => 0,
		'traag'    => 1,
		'onbekend' => 2,
		'te-groot' => 3,
	);
	usort(
		$items,
		function ( $a, $b ) use ( $order ) {
			return array( $order[ $a['check']['fit'] ] ?? 2, $b['trusted'], $a['rank'] ) <=> array( $order[ $b['check']['fit'] ] ?? 2, $a['trusted'], $b['rank'] );
		}
	);
	$result = array(
		'results' => $items,
		'terms'   => $terms,
		'total'   => (int) ( $data['total'] ?? 0 ),
	);
	set_transient( $cache, $result, 6 * HOUR_IN_SECONDS );
	return rest_ensure_response( $result );
}

/**
 * Meerdere diensten tegelijk testen. Eerst de dienstbeschrijving (tegels?), daarna voor
 * vectorlagen het aantal vormen. Zo duurt een zoekopdracht een paar seconden, niet een minuut.
 */
function aklokaal_atlas_check_many( $items ) {
	if ( ! class_exists( '\WpOrg\Requests\Requests' ) ) {
		foreach ( $items as &$it ) {
			$it['check'] = array( 'fit' => 'onbekend', 'reason' => '', 'kind' => 'arcgis', 'url' => $it['url'] );
		}
		return $items;
	}
	$opts = array(
		'timeout'   => 8,
		'useragent' => 'Aardrijkskundelokaal/' . AKLOKAAL_VERSION,
		'verify'    => ABSPATH . WPINC . '/certificates/ca-bundle.crt',
	);
	$opts = apply_filters( 'aklokaal_atlas_requests_options', $opts );
	$fetch = function ( $urls ) use ( $opts ) {
		$req = array();
		foreach ( $urls as $k => $u ) {
			$req[ $k ] = array(
				'url'  => $u,
				'type' => 'GET',
			);
		}
		$out = array();
		// Per ronde een nieuw hooks-object: Requests hangt er bij elke aanroep een verwerker aan.
		// En de certificatenlijst van WordPress meegeven: bij parallelle verzoeken zet Requests die
		// niet zelf, waardoor diensten met een minder gangbaar rootcertificaat anders falen.
		$cafile = is_string( $opts['verify'] ) ? $opts['verify'] : '';
		$hooks  = new \WpOrg\Requests\Hooks();
		if ( $cafile ) {
			$hooks->register(
				'curl.before_multi_add',
				function ( &$handle ) use ( $cafile ) {
					curl_setopt( $handle, CURLOPT_CAINFO, $cafile );
				}
			);
		}
		do_action_ref_array( 'aklokaal_atlas_requests_hooks', array( &$hooks ) );
		$opts['hooks'] = $hooks;
		try {
			$res = \WpOrg\Requests\Requests::request_multiple( $req, $opts );
		} catch ( \Exception $e ) {
			return $out;
		}
		foreach ( $res as $k => $r ) {
			if ( $r instanceof \WpOrg\Requests\Response && $r->success ) {
				$d = json_decode( $r->body, true );
				if ( is_array( $d ) && empty( $d['error'] ) ) {
					$out[ $k ] = $d;
				}
			}
		}
		return $out;
	};

	$svc_urls = array();
	foreach ( $items as $i => $it ) {
		$it['check'] = null;
		if ( 'GeoJson' === $it['type'] ) {
			$items[ $i ]['check'] = array( 'fit' => 'onbekend', 'reason' => __( 'GeoJSON-bestand: grootte onbekend.', 'aklokaal' ), 'kind' => 'geojson', 'url' => $it['url'] );
			continue;
		}
		$p = aklokaal_atlas_split_url( $it['url'] );
		if ( ! $p['type'] ) {
			$items[ $i ]['check'] = array( 'fit' => 'onbekend', 'reason' => '', 'kind' => 'arcgis', 'url' => $it['url'] );
			continue;
		}
		$items[ $i ]['_p'] = $p;
		$svc_urls[ $i ]    = add_query_arg( 'f', 'json', $p['base'] );
	}
	$svcs = $fetch( $svc_urls );

	$count_urls = array();
	foreach ( $items as $i => $it ) {
		if ( ! empty( $it['check'] ) || empty( $it['_p'] ) ) {
			continue;
		}
		$p   = $it['_p'];
		$svc = $svcs[ $i ] ?? null;
		if ( ! $svc ) {
			$items[ $i ]['check'] = array( 'fit' => 'onbekend', 'reason' => __( 'De dienst gaf geen antwoord.', 'aklokaal' ), 'kind' => 'arcgis', 'url' => $it['url'] );
			continue;
		}
		if ( 'featureserver' !== $p['type'] && aklokaal_atlas_tiles_ok( $svc ) ) {
			$items[ $i ]['check'] = array( 'fit' => 'goed', 'reason' => __( 'Tegelkaart, in de kleuren van de maker.', 'aklokaal' ), 'kind' => 'tegels', 'url' => $p['base'] );
			continue;
		}
		if ( 'featureserver' !== $p['type'] && null === $p['layer'] ) {
			$items[ $i ]['check'] = array( 'fit' => 'goed', 'reason' => __( 'Kaartbeeld, in de kleuren van de maker.', 'aklokaal' ), 'kind' => 'kaartbeeld', 'url' => $p['base'] );
			continue;
		}
		$lid = $p['layer'];
		if ( null === $lid ) {
			foreach ( (array) ( $svc['layers'] ?? array() ) as $l ) {
				if ( ! empty( $l['geometryType'] ) || ! isset( $l['geometryType'] ) ) {
					$lid = (int) $l['id'];
					break;
				}
			}
		}
		if ( null === $lid ) {
			$items[ $i ]['check'] = array( 'fit' => 'te-groot', 'reason' => __( 'Geen kaartlaag gevonden.', 'aklokaal' ), 'kind' => 'arcgis', 'url' => $it['url'] );
			continue;
		}
		$items[ $i ]['_lid'] = $lid;
		$items[ $i ]['_per'] = (int) ( $svc['maxRecordCount'] ?? 1000 );
		$count_urls[ $i ]    = add_query_arg(
			array(
				'where'           => '1%3D1',
				'returnCountOnly' => 'true',
				'f'               => 'json',
			),
			$p['base'] . '/' . $lid . '/query'
		);
	}
	$counts = $fetch( $count_urls );
	foreach ( $items as $i => $it ) {
		if ( empty( $it['check'] ) && isset( $it['_lid'] ) ) {
			$n   = isset( $counts[ $i ]['count'] ) ? (int) $counts[ $i ]['count'] : -1;
			$url = $it['_p']['base'] . '/' . $it['_lid'];
			if ( $n < 0 ) {
				$items[ $i ]['check'] = array( 'fit' => 'onbekend', 'reason' => __( 'Aantal vormen onbekend.', 'aklokaal' ), 'kind' => 'arcgis', 'url' => $url );
			} elseif ( $n > AKLOKAAL_ATLAS_MAX_VORMEN ) {
				/* translators: %s: aantal */
				$items[ $i ]['check'] = array( 'fit' => 'te-groot', 'reason' => sprintf( __( '%s vormen: te groot voor de atlas.', 'aklokaal' ), number_format_i18n( $n ) ), 'kind' => 'arcgis', 'url' => $url, 'count' => $n );
			} elseif ( $n > $it['_per'] ) {
				/* translators: %s: aantal */
				$items[ $i ]['check'] = array( 'fit' => 'traag', 'reason' => sprintf( __( '%s vormen: laadt in delen.', 'aklokaal' ), number_format_i18n( $n ) ), 'kind' => 'arcgis', 'url' => $url, 'count' => $n );
			} else {
				/* translators: %s: aantal */
				$items[ $i ]['check'] = array( 'fit' => 'goed', 'reason' => sprintf( _n( '%s vorm.', '%s vormen.', $n, 'aklokaal' ), number_format_i18n( $n ) ), 'kind' => 'arcgis', 'url' => $url, 'count' => $n );
			}
		}
		if ( empty( $items[ $i ]['check'] ) ) {
			$items[ $i ]['check'] = array( 'fit' => 'onbekend', 'reason' => '', 'kind' => 'arcgis', 'url' => $it['url'] );
		}
		unset( $items[ $i ]['_p'], $items[ $i ]['_lid'], $items[ $i ]['_per'] );
	}
	return $items;
}
