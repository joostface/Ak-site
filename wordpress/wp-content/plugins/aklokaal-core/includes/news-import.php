<?php
/**
 * Nieuwsimport: plak een link, wij halen de openbare metadata op.
 *
 * Bronnen, in volgorde van betrouwbaarheid:
 *   1. JSON-LD (NewsArticle / Article / ReportageNewsArticle, ook binnen @graph)
 *   2. Open Graph (og:title, og:site_name, article:published_time ...)
 *   3. Twitter-cards en gewone meta-tags (description, author)
 *   4. <title>
 *
 * We nemen nooit de tekst van het artikel over. Alleen titel, uitgever, auteur,
 * datum, korte beschrijving, afbeelding-URL en de link. Wat ontbreekt, melden we
 * expliciet, zodat het handmatig aangevuld kan worden.
 */

defined( 'ABSPATH' ) || exit;

/**
 * @return array|WP_Error
 */
function aklokaal_fetch_article_metadata( $url ) {
	$url = esc_url_raw( trim( (string) $url ), array( 'http', 'https' ) );
	if ( ! $url || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
		return new WP_Error( 'aklokaal_url', __( 'Dit is geen geldig webadres. Plak de volledige link, beginnend met https://', 'aklokaal' ) );
	}

	// wp_safe_remote_get weigert interne adressen (bescherming tegen SSRF).
	$res = wp_safe_remote_get(
		$url,
		array(
			'timeout'             => 12,
			'redirection'         => 5,
			'limit_response_size' => 3 * MB_IN_BYTES,
			'user-agent'          => 'Mozilla/5.0 (compatible; Aardrijkskundelokaal/' . AKLOKAAL_VERSION . '; +' . home_url( '/' ) . ')',
			'headers'             => array( 'Accept' => 'text/html,application/xhtml+xml' ),
		)
	);

	$base = array(
		'url'         => $url,
		'canonical'   => '',
		'title'       => '',
		'publisher'   => '',
		'author'      => '',
		'published'   => '',
		'description' => '',
		'image_url'   => '',
		'missing'     => array(),
		'sources'     => array(),
		'warning'     => '',
	);

	if ( is_wp_error( $res ) ) {
		$base['warning'] = __( 'De pagina kon niet worden opgehaald. Vul de gegevens zelf in.', 'aklokaal' );
		return aklokaal_finish_metadata( $base );
	}
	$code = wp_remote_retrieve_response_code( $res );
	$html = (string) wp_remote_retrieve_body( $res );
	if ( $code >= 400 || '' === $html ) {
		/* translators: %d: HTTP-statuscode */
		$base['warning'] = sprintf( __( 'De website gaf geen pagina terug (code %d). Mogelijk zit het artikel achter een betaalmuur of blokkeert de site automatische verzoeken. Vul de gegevens zelf in.', 'aklokaal' ), (int) $code );
		return aklokaal_finish_metadata( $base );
	}

	return aklokaal_finish_metadata( array_merge( $base, aklokaal_parse_article_html( $html, $url ) ) );
}

/**
 * Lees metadata uit HTML. Los te testen zonder netwerk.
 */
function aklokaal_parse_article_html( $html, $url = '' ) {
	$out = array(
		'canonical'   => '',
		'title'       => '',
		'publisher'   => '',
		'author'      => '',
		'published'   => '',
		'description' => '',
		'image_url'   => '',
		'sources'     => array(),
	);

	$prev = libxml_use_internal_errors( true );
	$doc  = new DOMDocument();
	$doc->loadHTML( '<?xml encoding="utf-8" ?>' . $html, LIBXML_NONET | LIBXML_NOWARNING | LIBXML_NOERROR );
	libxml_clear_errors();
	libxml_use_internal_errors( $prev );
	$xp = new DOMXPath( $doc );

	$meta = array();
	foreach ( $xp->query( '//meta' ) as $m ) {
		$key = strtolower( $m->getAttribute( 'property' ) ? $m->getAttribute( 'property' ) : $m->getAttribute( 'name' ) );
		if ( $key && ! isset( $meta[ $key ] ) ) {
			$meta[ $key ] = trim( $m->getAttribute( 'content' ) );
		}
	}
	$canon = $xp->query( '//link[@rel="canonical"]/@href' );
	if ( $canon->length ) {
		$out['canonical'] = trim( $canon->item( 0 )->nodeValue );
	}

	// 1. JSON-LD
	$ld = array();
	foreach ( $xp->query( '//script[@type="application/ld+json"]' ) as $s ) {
		$data = json_decode( trim( $s->textContent ), true );
		if ( ! is_array( $data ) ) {
			continue;
		}
		$nodes = isset( $data['@graph'] ) ? $data['@graph'] : ( isset( $data[0] ) ? $data : array( $data ) );
		foreach ( $nodes as $node ) {
			$type = isset( $node['@type'] ) ? (array) $node['@type'] : array();
			if ( array_intersect( $type, array( 'NewsArticle', 'Article', 'ReportageNewsArticle', 'AnalysisNewsArticle', 'BlogPosting', 'ScholarlyArticle', 'OpinionNewsArticle' ) ) ) {
				$ld = $node;
				break 2;
			}
		}
	}
	if ( $ld ) {
		$out['sources'][] = 'JSON-LD';
		$out['title']     = aklokaal_ld_text( $ld, 'headline' );
		$out['published'] = aklokaal_ld_text( $ld, 'datePublished' );
		$out['description'] = aklokaal_ld_text( $ld, 'description' );
		$out['author']    = aklokaal_ld_names( isset( $ld['author'] ) ? $ld['author'] : null );
		$out['publisher'] = aklokaal_ld_names( isset( $ld['publisher'] ) ? $ld['publisher'] : null );
		if ( isset( $ld['image'] ) ) {
			$img              = $ld['image'];
			$img              = isset( $img['url'] ) ? $img['url'] : ( is_array( $img ) ? ( isset( $img[0]['url'] ) ? $img[0]['url'] : ( isset( $img[0] ) && is_string( $img[0] ) ? $img[0] : '' ) ) : $img );
			$out['image_url'] = is_string( $img ) ? $img : '';
		}
	}

	// 2 en 3. Open Graph, Twitter, meta
	$fill = array(
		'title'       => array( 'og:title', 'twitter:title' ),
		'publisher'   => array( 'og:site_name', 'application-name', 'twitter:site' ),
		'author'      => array( 'article:author', 'author', 'parsely-author', 'dc.creator', 'sailthru.author' ),
		'published'   => array( 'article:published_time', 'og:article:published_time', 'date', 'dc.date', 'parsely-pub-date', 'pubdate', 'publish-date' ),
		'description' => array( 'og:description', 'twitter:description', 'description' ),
		'image_url'   => array( 'og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src' ),
	);
	$used_og = false;
	foreach ( $fill as $field => $keys ) {
		if ( '' !== $out[ $field ] ) {
			continue;
		}
		foreach ( $keys as $k ) {
			if ( ! empty( $meta[ $k ] ) ) {
				$out[ $field ] = $meta[ $k ];
				$used_og       = true;
				break;
			}
		}
	}
	if ( $used_og ) {
		$out['sources'][] = 'meta-tags';
	}

	// 4. <title>
	if ( '' === $out['title'] ) {
		$t = $xp->query( '//title' );
		if ( $t->length ) {
			$out['title']     = trim( $t->item( 0 )->textContent );
			$out['sources'][] = 'paginatitel';
		}
	}

	// Opschonen
	foreach ( $out as $k => $v ) {
		if ( is_string( $v ) ) {
			$out[ $k ] = trim( html_entity_decode( wp_strip_all_tags( $v ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
		}
	}
	if ( 0 === strpos( $out['author'], 'http' ) ) {
		$out['author'] = ''; // article:author is soms een profiel-URL
	}
	if ( 0 === strpos( $out['publisher'], '@' ) ) {
		$out['publisher'] = ltrim( $out['publisher'], '@' );
	}
	// " - NOS" of " | de Volkskrant" achter de titel weghalen als het de uitgever is
	if ( $out['publisher'] && preg_match( '/^(.*\S)\s*[|\-–—]\s*' . preg_quote( $out['publisher'], '/' ) . '\s*$/iu', $out['title'], $m ) ) {
		$out['title'] = $m[1];
	}
	if ( $out['image_url'] && $url ) {
		$out['image_url'] = WP_Http::make_absolute_url( $out['image_url'], $url );
	}
	if ( $out['published'] ) {
		$ts               = strtotime( $out['published'] );
		$out['published'] = $ts ? gmdate( 'Y-m-d', $ts ) : '';
	}
	$out['description'] = wp_trim_words( $out['description'], 60, '…' );
	return $out;
}

function aklokaal_ld_text( $node, $key ) {
	return isset( $node[ $key ] ) && is_string( $node[ $key ] ) ? $node[ $key ] : '';
}

function aklokaal_ld_names( $val ) {
	if ( ! $val ) {
		return '';
	}
	if ( is_string( $val ) ) {
		return $val;
	}
	if ( isset( $val['name'] ) ) {
		return is_string( $val['name'] ) ? $val['name'] : '';
	}
	$names = array();
	foreach ( (array) $val as $v ) {
		if ( is_array( $v ) && ! empty( $v['name'] ) && is_string( $v['name'] ) ) {
			$names[] = $v['name'];
		} elseif ( is_string( $v ) ) {
			$names[] = $v;
		}
	}
	return implode( ', ', array_unique( $names ) );
}

/** Uitgever afleiden uit het domein als niets anders bekend is, en ontbrekende velden markeren. */
function aklokaal_finish_metadata( $data ) {
	if ( '' === $data['publisher'] ) {
		$host = (string) wp_parse_url( $data['canonical'] ? $data['canonical'] : $data['url'], PHP_URL_HOST );
		if ( $host ) {
			$data['publisher']        = preg_replace( '/^www\./', '', $host );
			$data['publisher_guess'] = true;
		}
	}
	$labels = array(
		'title'       => __( 'titel', 'aklokaal' ),
		'publisher'   => __( 'uitgever', 'aklokaal' ),
		'author'      => __( 'auteur', 'aklokaal' ),
		'published'   => __( 'publicatiedatum', 'aklokaal' ),
		'description' => __( 'beschrijving', 'aklokaal' ),
		'image_url'   => __( 'afbeelding', 'aklokaal' ),
	);
	$data['missing'] = array();
	foreach ( $labels as $k => $label ) {
		if ( empty( $data[ $k ] ) ) {
			$data['missing'][] = $label;
		}
	}
	if ( ! empty( $data['publisher_guess'] ) ) {
		$data['missing'][] = __( 'uitgever (afgeleid van het domein, controleer dit)', 'aklokaal' );
	}
	$data['duplicate'] = aklokaal_find_news_by_url( $data['canonical'] ? $data['canonical'] : $data['url'] );
	if ( ! $data['duplicate'] && $data['canonical'] ) {
		$data['duplicate'] = aklokaal_find_news_by_url( $data['url'] );
	}
	return $data;
}

/** Bestaat dit artikel al? Geeft id en titel terug, of null. */
function aklokaal_find_news_by_url( $url ) {
	$key = aklokaal_normalize_url( $url );
	if ( ! $key ) {
		return null;
	}
	$found = get_posts(
		array(
			'post_type'      => 'ak_nieuws',
			'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'ak_archief' ),
			'meta_key'       => 'ak_url_key', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	if ( ! $found ) {
		return null;
	}
	return array(
		'id'     => $found[0],
		'title'  => get_the_title( $found[0] ),
		'status' => get_post_status( $found[0] ),
		'edit'   => get_edit_post_link( $found[0], 'raw' ),
	);
}

/**
 * Sla een (gecontroleerd) nieuwsartikel op.
 *
 * @return int|WP_Error
 */
function aklokaal_save_news( $data ) {
	$url = esc_url_raw( isset( $data['url'] ) ? $data['url'] : '', array( 'http', 'https' ) );
	if ( ! $url ) {
		return new WP_Error( 'aklokaal_url', __( 'De link ontbreekt.', 'aklokaal' ) );
	}
	if ( empty( $data['title'] ) ) {
		return new WP_Error( 'aklokaal_title', __( 'Geef het artikel een titel.', 'aklokaal' ) );
	}
	$canonical = ! empty( $data['canonical'] ) ? esc_url_raw( $data['canonical'], array( 'http', 'https' ) ) : '';
	$dup       = aklokaal_find_news_by_url( $canonical ? $canonical : $url );
	if ( $dup && ( empty( $data['id'] ) || (int) $data['id'] !== (int) $dup['id'] ) ) {
		return new WP_Error( 'aklokaal_duplicate', __( 'Dit artikel staat al in het nieuwsarchief.', 'aklokaal' ), array( 'duplicate' => $dup ) );
	}
	$status  = isset( $data['status'] ) && 'publish' === $data['status'] ? 'publish' : 'draft';
	$postarr = array(
		'post_type'    => 'ak_nieuws',
		'post_title'   => sanitize_text_field( $data['title'] ),
		'post_excerpt' => sanitize_textarea_field( isset( $data['description'] ) ? $data['description'] : '' ),
		'post_content' => wp_kses_post( isset( $data['summary'] ) ? $data['summary'] : '' ),
		'post_status'  => $status,
	);
	if ( ! empty( $data['published'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $data['published'] ) ) {
		// De WordPress-datum = publicatiedatum van het artikel, zodat sorteren klopt.
		$postarr['post_date']     = $data['published'] . ' 12:00:00';
		$postarr['post_date_gmt'] = get_gmt_from_date( $postarr['post_date'] );
	}
	if ( ! empty( $data['id'] ) ) {
		$postarr['ID'] = (int) $data['id'];
		$id            = wp_update_post( $postarr, true );
	} else {
		$id = wp_insert_post( $postarr, true );
	}
	if ( is_wp_error( $id ) ) {
		return $id;
	}
	$main = $canonical ? $canonical : $url;
	update_post_meta( $id, 'ak_url', $url );
	update_post_meta( $id, 'ak_url_key', aklokaal_normalize_url( $main ) );
	update_post_meta( $id, 'ak_publisher', sanitize_text_field( isset( $data['publisher'] ) ? $data['publisher'] : '' ) );
	update_post_meta( $id, 'ak_author', sanitize_text_field( isset( $data['author'] ) ? $data['author'] : '' ) );
	update_post_meta( $id, 'ak_published', isset( $postarr['post_date'] ) ? substr( $postarr['post_date'], 0, 10 ) : '' );
	update_post_meta( $id, 'ak_image_url', esc_url_raw( isset( $data['image_url'] ) ? $data['image_url'] : '', array( 'https', 'http' ) ) );
	update_post_meta( $id, 'ak_show_image', ! empty( $data['show_image'] ) );
	update_post_meta( $id, 'ak_question', sanitize_text_field( isset( $data['question'] ) ? $data['question'] : '' ) );
	if ( isset( $data['themes'] ) ) {
		$themes = is_array( $data['themes'] ) ? $data['themes'] : explode( ',', (string) $data['themes'] );
		wp_set_post_terms( $id, array_filter( array_map( 'sanitize_text_field', array_map( 'trim', $themes ) ) ), 'ak_thema' );
	}
	return $id;
}
