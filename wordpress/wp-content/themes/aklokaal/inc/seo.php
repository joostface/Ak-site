<?php
/**
 * Wat zoekmachines en deelknoppen te zien krijgen:
 * - een beschrijving per pagina (meta description), zodat Google niet zelf een stukje kiest;
 * - Open Graph en Twitter-kaartjes, zodat een gedeelde link in WhatsApp, Teams of Magister
 *   een titel, tekst en afbeelding toont;
 * - een canonical-link ook op de homepage en de overzichtspagina's;
 * - gestructureerde data (schema.org): de site met zoekfunctie, kruimelpaden bij hoofdstukken
 *   en eigen nieuwsberichten als artikel.
 * Wil je ooit een SEO-plugin (zoals Yoast) gebruiken, dan schakelt dit zichzelf uit.
 */

defined( 'ABSPATH' ) || exit;

/** Staat er al een SEO-plugin aan? Dan doet die het en blijft dit stil. */
function aktheme_seo_plugin_active() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || class_exists( 'The_SEO_Framework\Load' );
}

/** Titel als platte tekst (zonder &#8211; en &amp;), voor beschrijvingen en gestructureerde data. */
function aktheme_seo_title( $post ) {
	return html_entity_decode( wp_strip_all_tags( get_the_title( $post ) ), ENT_QUOTES, 'UTF-8' );
}

/** Tekst inkorten tot een nette beschrijving van hooguit ~155 tekens. */
function aktheme_seo_trim( $text, $max = 155 ) {
	$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( strip_shortcodes( html_entity_decode( (string) $text, ENT_QUOTES, 'UTF-8' ) ) ) ) );
	if ( mb_strlen( $text ) <= $max ) {
		return $text;
	}
	$cut = mb_substr( $text, 0, $max );
	$cut = preg_replace( '/\s+\S*$/u', '', $cut );
	return rtrim( $cut, ' ,;:–-' ) . '…';
}

/** Vaste beschrijvingen van de overzichtspagina's (gelijk aan de inleiding op die pagina's). */
function aktheme_seo_archive_texts() {
	return array(
		'ak_hoofdstuk'  => __( 'Al het lesmateriaal aardrijkskunde per leerjaar, hoofdstuk en paragraaf: presentaties, opdrachten, video’s en kaarten.', 'aklokaal' ),
		'ak_nieuws'     => __( 'Actueel nieuws dat laat zien dat aardrijkskunde nu gebeurt, met een link naar de oorspronkelijke bron. Plus eigen berichten van het lokaal.', 'aklokaal' ),
		'ak_kaart'      => __( 'Kaarten om in de les te bekijken en thuis zelf te verkennen, en een interactieve wereldatlas met lagen om te combineren.', 'aklokaal' ),
		'ak_toepassing' => __( 'Oefeningen, spellen en simulaties voor aardrijkskunde: topografie, landen van de wereld en meer.', 'aklokaal' ),
		'ak_collectie'  => __( 'Nieuwsartikelen over één onderwerp bij elkaar, met een inleiding en onderzoeksvragen.', 'aklokaal' ),
	);
}

/** De beschrijving van de huidige pagina. */
function aktheme_seo_description() {
	if ( is_front_page() ) {
		// Zelfde tekst als onder de kop op de homepage (aan te passen via Weergave → Customizer).
		return aktheme_seo_trim( aktheme_mod( 'ak_hero_text', 'Lesmateriaal, kaarten en actueel nieuws voor elk leerjaar. Kies je klas en je staat meteen bij de goede paragraaf.' ) );
	}
	if ( is_post_type_archive() ) {
		$type  = get_query_var( 'post_type' );
		$type  = is_array( $type ) ? reset( $type ) : $type;
		$texts = aktheme_seo_archive_texts();
		return isset( $texts[ $type ] ) ? $texts[ $type ] : '';
	}
	if ( is_tax() || is_category() || is_tag() ) {
		return aktheme_seo_trim( term_description() );
	}
	if ( is_search() ) {
		return '';
	}
	if ( is_singular() ) {
		$post = get_queried_object();
		if ( 'ak_hoofdstuk' === $post->post_type && function_exists( 'aklokaal_get_paragraphs' ) ) {
			$jaar  = get_the_terms( $post, 'ak_leerjaar' );
			$paras = wp_list_pluck( aklokaal_get_paragraphs( $post->ID ), 'post_title' );
			$intro = has_excerpt( $post ) ? get_the_excerpt( $post ) . ' ' : '';
			$voor  = $jaar && ! is_wp_error( $jaar ) ? sprintf( /* translators: 1: hoofdstuk, 2: leerjaar */ __( 'Aardrijkskunde %2$s, hoofdstuk %1$s.', 'aklokaal' ), aktheme_seo_title( $post ), $jaar[0]->name ) : aktheme_seo_title( $post ) . '.';
			return aktheme_seo_trim( $voor . ' ' . $intro . ( $paras ? __( 'Met', 'aklokaal' ) . ' ' . implode( ', ', $paras ) : '' ) );
		}
		if ( 'ak_nieuws' === $post->post_type ) {
			$pub  = get_post_meta( $post->ID, 'ak_publisher', true );
			$text = has_excerpt( $post ) ? get_the_excerpt( $post ) : $post->post_content;
			return aktheme_seo_trim( ( $pub && get_post_meta( $post->ID, 'ak_url', true ) ? $pub . ': ' : '' ) . $text );
		}
		if ( has_excerpt( $post ) ) {
			return aktheme_seo_trim( get_the_excerpt( $post ) );
		}
		if ( trim( $post->post_content ) ) {
			return aktheme_seo_trim( excerpt_remove_blocks( $post->post_content ) );
		}
		if ( 'ak_materiaal' === $post->post_type && function_exists( 'aklokaal_material_types' ) ) {
			$types = aklokaal_material_types();
			$type  = get_post_meta( $post->ID, 'ak_type', true );
			return aktheme_seo_trim( sprintf( /* translators: 1: soort, 2: titel */ __( '%1$s voor aardrijkskunde: %2$s.', 'aklokaal' ), isset( $types[ $type ] ) ? $types[ $type ] : __( 'Lesmateriaal', 'aklokaal' ), aktheme_seo_title( $post ) ) );
		}
	}
	return aktheme_seo_trim( get_bloginfo( 'description' ) );
}

/** Canonical-adres van de huidige pagina (zonder zoek- of volgparameters). */
function aktheme_seo_canonical() {
	if ( is_singular() ) {
		return wp_get_canonical_url();
	}
	$paged = max( 1, (int) get_query_var( 'paged' ) );
	$url   = '';
	if ( is_front_page() ) {
		$url = home_url( '/' );
	} elseif ( is_post_type_archive() ) {
		$type = get_query_var( 'post_type' );
		$url  = get_post_type_archive_link( is_array( $type ) ? reset( $type ) : $type );
		if ( is_post_type_archive( 'ak_nieuws' ) && function_exists( 'aktheme_news_month_param' ) && aktheme_news_month_param() ) {
			$url = add_query_arg( 'maand', aktheme_news_month_param(), $url );
		}
	} elseif ( is_tax() || is_category() || is_tag() ) {
		$url = get_term_link( get_queried_object() );
	}
	if ( ! $url || is_wp_error( $url ) ) {
		return '';
	}
	if ( $paged > 1 ) {
		// Zelf opbouwen: get_pagenum_link() neemt de hele querystring mee (ook ?utm_source=…).
		$query = (string) wp_parse_url( $url, PHP_URL_QUERY );
		$base  = trailingslashit( strtok( $url, '?' ) ) . user_trailingslashit( 'page/' . $paged, 'paged' );
		return $query ? $base . '?' . $query : $base;
	}
	return $url;
}

/** Afbeelding voor het deelkaartje: de uitgelichte afbeelding, anders de vaste afbeelding van de site. */
function aktheme_seo_image() {
	if ( is_singular() && has_post_thumbnail() ) {
		$src = wp_get_attachment_image_src( get_post_thumbnail_id(), 'ak-wide' );
		if ( $src ) {
			return array( $src[0], (int) $src[1], (int) $src[2] );
		}
	}
	return array( get_template_directory_uri() . '/assets/img/deelafbeelding.jpg', 1200, 630 );
}

add_action(
	'wp_head',
	function () {
		if ( aktheme_seo_plugin_active() || is_admin() ) {
			return;
		}
		$desc      = aktheme_seo_description();
		$canonical = aktheme_seo_canonical();
		if ( is_front_page() ) {
			$title = get_bloginfo( 'name' );
		} elseif ( is_singular() ) {
			$title = single_post_title( '', false );
		} else {
			$title = wp_get_document_title();
		}
		$title = html_entity_decode( wp_strip_all_tags( (string) $title ), ENT_QUOTES, 'UTF-8' );
		list( $img, $w, $h ) = aktheme_seo_image();
		$type = is_singular( 'ak_nieuws' ) || is_singular( 'post' ) ? 'article' : 'website';

		echo "\n<!-- Aardrijkskundelokaal: beschrijving en deelgegevens -->\n";
		if ( $desc ) {
			printf( '<meta name="description" content="%s">' . "\n", esc_attr( $desc ) );
		}
		if ( $canonical && ! is_singular() ) {
			// Op losse berichten zet WordPress zelf al een canonical-link.
			printf( '<link rel="canonical" href="%s">' . "\n", esc_url( $canonical ) );
		}
		$og = array(
			'og:locale'      => 'nl_NL',
			'og:site_name'   => get_bloginfo( 'name' ),
			'og:type'        => $type,
			'og:title'       => $title,
			'og:description' => $desc,
			'og:url'         => $canonical,
			'og:image'       => $img,
			'og:image:width' => $w ? (string) $w : '',
			'og:image:height' => $h ? (string) $h : '',
		);
		foreach ( $og as $k => $v ) {
			if ( '' !== (string) $v ) {
				printf( '<meta property="%s" content="%s">' . "\n", esc_attr( $k ), 'og:url' === $k || 'og:image' === $k ? esc_url( $v ) : esc_attr( $v ) );
			}
		}
		echo '<meta name="twitter:card" content="summary_large_image">' . "\n";

		// Gestructureerde data.
		$graph = array();
		if ( is_front_page() ) {
			$graph[] = array(
				'@type'           => 'WebSite',
				'@id'             => home_url( '/#website' ),
				'url'             => home_url( '/' ),
				'name'            => get_bloginfo( 'name' ),
				'description'     => $desc,
				'inLanguage'      => 'nl-NL',
				'potentialAction' => array(
					'@type'       => 'SearchAction',
					'target'      => array(
						'@type'       => 'EntryPoint',
						'urlTemplate' => home_url( '/?s={search_term_string}' ),
					),
					'query-input' => 'required name=search_term_string',
				),
			);
		}
		if ( is_singular( 'ak_hoofdstuk' ) ) {
			$post  = get_queried_object();
			$jaar  = get_the_terms( $post, 'ak_leerjaar' );
			$items = array(
				array( __( 'Lesmateriaal', 'aklokaal' ), get_post_type_archive_link( 'ak_hoofdstuk' ) ),
			);
			if ( $jaar && ! is_wp_error( $jaar ) ) {
				$items[] = array( $jaar[0]->name, get_post_type_archive_link( 'ak_hoofdstuk' ) . '#leerjaar-' . $jaar[0]->slug );
			}
			$items[] = array( aktheme_seo_title( $post ), get_permalink( $post ) );
			$graph[] = array(
				'@type'           => 'BreadcrumbList',
				'itemListElement' => array_map(
					function ( $it, $i ) {
						return array(
							'@type'    => 'ListItem',
							'position' => $i + 1,
							'name'     => $it[0],
							'item'     => $it[1],
						);
					},
					$items,
					array_keys( $items )
				),
			);
			$graph[] = array(
				'@type'            => 'LearningResource',
				'name'             => aktheme_seo_title( $post ),
				'url'              => get_permalink( $post ),
				'description'      => $desc,
				'inLanguage'       => 'nl-NL',
				'learningResourceType' => 'hoofdstuk',
				'educationalLevel' => $jaar && ! is_wp_error( $jaar ) ? $jaar[0]->name : '',
				'about'            => 'Aardrijkskunde',
				'isAccessibleForFree' => true,
			);
		}
		if ( is_singular( 'ak_nieuws' ) && function_exists( 'aktheme_news_is_own' ) && aktheme_news_is_own( get_queried_object() ) ) {
			$post    = get_queried_object();
			$graph[] = array(
				'@type'         => 'Article',
				'headline'      => aktheme_seo_title( $post ),
				'datePublished' => get_the_date( 'c', $post ),
				'dateModified'  => get_the_modified_date( 'c', $post ),
				'image'         => $img,
				'author'        => array(
					'@type' => 'Organization',
					'name'  => get_bloginfo( 'name' ),
					'url'   => home_url( '/' ),
				),
				'publisher'     => array(
					'@type' => 'Organization',
					'name'  => get_bloginfo( 'name' ),
				),
				'mainEntityOfPage' => get_permalink( $post ),
			);
		}
		if ( $graph ) {
			echo '<script type="application/ld+json">' . wp_json_encode(
				array(
					'@context' => 'https://schema.org',
					'@graph'   => $graph,
				),
				JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP
			) . "</script>\n";
		}
	},
	2
);

/** Paginatitel van het overzicht /lesmateriaal/ is "Lesmateriaal" (niet de technische naam "Hoofdstukken"). */
add_filter(
	'document_title_parts',
	function ( $parts ) {
		if ( is_post_type_archive( 'ak_hoofdstuk' ) ) {
			$parts['title'] = __( 'Lesmateriaal', 'aklokaal' );
		}
		return $parts;
	}
);

/** Onnodige extra's uit de kop: emoji-script (moderne browsers kunnen dat zelf) en het versienummer van WordPress. */
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );
