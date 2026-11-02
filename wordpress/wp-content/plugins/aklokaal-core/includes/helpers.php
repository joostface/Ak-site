<?php
/**
 * Kleine hulpfuncties die door plugin én thema gebruikt worden.
 * Het thema roept deze aan via function_exists(), zodat het niet breekt
 * als de plugin (tijdelijk) uit staat.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Alle materiaaltypen met hun weergavenaam.
 * Nieuwe typen toevoegen? Voeg ze hier toe en maak in het thema
 * template-parts/material/{type}.php aan. Zonder eigen template valt het
 * thema terug op template-parts/material/bestand.php.
 */
function aklokaal_material_types() {
	return apply_filters(
		'aklokaal_material_types',
		array(
			'presentatie' => __( 'Presentatie', 'aklokaal' ),
			'pdf'         => __( 'PDF', 'aklokaal' ),
			'document'    => __( 'Document', 'aklokaal' ),
			'afbeelding'  => __( 'Afbeelding', 'aklokaal' ),
			'video'       => __( 'Video', 'aklokaal' ),
			'weblink'     => __( 'Website', 'aklokaal' ),
			'tekst'       => __( 'Uitleg', 'aklokaal' ),
			'opdracht'    => __( 'Opdracht', 'aklokaal' ),
			'bestand'     => __( 'Bestand', 'aklokaal' ),
		)
	);
}

/** De post types die in een paragraaf geplaatst kunnen worden. */
function aklokaal_placeable_types() {
	return apply_filters( 'aklokaal_placeable_types', array( 'ak_materiaal', 'ak_nieuws', 'ak_kaart', 'ak_toepassing', 'ak_collectie' ) );
}

/** Termen gesorteerd op de eigen volgorde (term meta ak_order), daarna op naam. */
function aklokaal_sorted_terms( $taxonomy, $args = array() ) {
	$terms = get_terms(
		array_merge(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
			),
			$args
		)
	);
	if ( is_wp_error( $terms ) ) {
		return array();
	}
	usort(
		$terms,
		function ( $a, $b ) {
			$oa = (int) get_term_meta( $a->term_id, 'ak_order', true );
			$ob = (int) get_term_meta( $b->term_id, 'ak_order', true );
			return $oa === $ob ? strnatcasecmp( $a->name, $b->name ) : $oa <=> $ob;
		}
	);
	return $terms;
}

/** Eerste term van een post in een taxonomie, of null. */
function aklokaal_first_term( $post_id, $taxonomy ) {
	$terms = get_the_terms( $post_id, $taxonomy );
	return ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : null;
}

/**
 * Hoofdstukken, eventueel gefilterd op vak en leerjaar.
 *
 * @param array $args vak (slug), leerjaar (slug), status (array).
 * @return WP_Post[]
 */
function aklokaal_get_chapters( $args = array() ) {
	$args      = wp_parse_args(
		$args,
		array(
			'vak'      => '',
			'leerjaar' => '',
			'status'   => array( 'publish' ),
		)
	);
	$tax_query = array();
	foreach ( array( 'vak' => 'ak_vak', 'leerjaar' => 'ak_leerjaar' ) as $key => $tax ) {
		if ( $args[ $key ] ) {
			$tax_query[] = array(
				'taxonomy' => $tax,
				'field'    => is_numeric( $args[ $key ] ) ? 'term_id' : 'slug',
				'terms'    => $args[ $key ],
			);
		}
	}
	$q = array(
		'post_type'      => 'ak_hoofdstuk',
		'post_status'    => $args['status'],
		'posts_per_page' => -1,
		'orderby'        => array(
			'menu_order' => 'ASC',
			'title'      => 'ASC',
		),
		'no_found_rows'  => true,
	);
	if ( $tax_query ) {
		$q['tax_query'] = $tax_query; // phpcs:ignore WordPress.DB.SlowDBQuery
	}
	return get_posts( $q );
}

/**
 * Paragrafen van een hoofdstuk, in volgorde.
 *
 * @return WP_Post[]
 */
function aklokaal_get_paragraphs( $chapter_id, $status = array( 'publish' ) ) {
	return get_posts(
		array(
			'post_type'      => 'ak_paragraaf',
			'post_parent'    => (int) $chapter_id,
			'post_status'    => $status,
			'posts_per_page' => -1,
			'orderby'        => array(
				'menu_order' => 'ASC',
				'ID'         => 'ASC',
			),
			'no_found_rows'  => true,
		)
	);
}

/** Hoofdstuknummer, bijvoorbeeld 2. */
function aklokaal_chapter_number( $chapter ) {
	$chapter = get_post( $chapter );
	$n       = $chapter ? get_post_meta( $chapter->ID, 'ak_nummer', true ) : '';
	return '' !== $n ? (string) $n : '';
}

/**
 * Paragraafnummer, bijvoorbeeld 2.3.
 * - Een eigen nummer (meta ak_nummer) wint.
 * - "-" betekent: geen nummer (bijvoorbeeld een casus als "België en Nepal"); dan geeft dit ''.
 * - Anders: hoofdstuknummer + positie, waarbij paragrafen zonder nummer niet meetellen.
 */
function aklokaal_paragraph_number( $paragraph, $unused = null ) {
	$paragraph = get_post( $paragraph );
	if ( ! $paragraph ) {
		return '';
	}
	$manual = trim( (string) get_post_meta( $paragraph->ID, 'ak_nummer', true ) );
	if ( '-' === $manual || '–' === $manual ) {
		return '';
	}
	if ( '' !== $manual ) {
		return $manual;
	}
	$position = 0;
	foreach ( aklokaal_get_paragraphs( $paragraph->post_parent, array( 'publish', 'draft', 'private' ) ) as $sib ) {
		$m = trim( (string) get_post_meta( $sib->ID, 'ak_nummer', true ) );
		if ( '-' === $m || '–' === $m ) {
			continue;
		}
		++$position;
		if ( $sib->ID === $paragraph->ID ) {
			break;
		}
	}
	$c = aklokaal_chapter_number( $paragraph->post_parent );
	return '' !== $c ? $c . '.' . $position : (string) $position;
}

/** "§2.3 " of '' (voor paragrafen zonder nummer). */
function aklokaal_paragraph_prefix( $number ) {
	return '' !== (string) $number ? '§' . $number . ' ' : '';
}

/** Volledige naam: "§2.3 De energietransitie" of "België en Nepal". */
function aklokaal_paragraph_label( $paragraph ) {
	$paragraph = get_post( $paragraph );
	return $paragraph ? aklokaal_paragraph_prefix( aklokaal_paragraph_number( $paragraph ) ) . get_the_title( $paragraph ) : '';
}

/** Anker-id: paragraaf-2-3, of paragraaf-belgie-en-nepal voor een paragraaf zonder nummer. */
function aklokaal_paragraph_anchor( $number, $paragraph = null ) {
	if ( '' === (string) $number && $paragraph ) {
		return 'paragraaf-' . sanitize_title( get_the_title( $paragraph ) );
	}
	return 'paragraaf-' . sanitize_title( str_replace( '.', '-', (string) $number ) );
}

/** Anker van een paragraaf-post. */
function aklokaal_paragraph_anchor_for( $paragraph ) {
	return aklokaal_paragraph_anchor( aklokaal_paragraph_number( $paragraph ), $paragraph );
}

/** Leesbare bestandsgrootte in het Nederlands. */
function aklokaal_filesize( $bytes ) {
	$bytes = (int) $bytes;
	if ( $bytes <= 0 ) {
		return '';
	}
	if ( $bytes < 1024 * 1024 ) {
		return number_format_i18n( max( 1, round( $bytes / 1024 ) ) ) . ' kB';
	}
	return number_format_i18n( $bytes / 1024 / 1024, 1 ) . ' MB';
}

/** Normaliseert een URL voor het herkennen van dubbele nieuwsartikelen. */
function aklokaal_normalize_url( $url ) {
	$url   = trim( (string) $url );
	$parts = wp_parse_url( $url );
	if ( empty( $parts['host'] ) ) {
		return '';
	}
	$host = strtolower( preg_replace( '/^(www\.|m\.)/i', '', $parts['host'] ) );
	$path = isset( $parts['path'] ) ? rtrim( $parts['path'], '/' ) : '';
	$keep = array();
	if ( ! empty( $parts['query'] ) ) {
		parse_str( $parts['query'], $query );
		foreach ( $query as $k => $v ) {
			if ( ! preg_match( '/^(utm_|fbclid|gclid|mc_|ref$|xtor|at_|cmpid|ns_)/i', $k ) ) {
				$keep[ $k ] = $v;
			}
		}
		ksort( $keep );
	}
	return $host . $path . ( $keep ? '?' . http_build_query( $keep ) : '' );
}

/** Mag de huidige gebruiker beheren? */
function aklokaal_can_manage() {
	return current_user_can( AKLOKAAL_CAP );
}
