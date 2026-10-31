<?php
/**
 * Het inhoudsmodel: post types, taxonomieën, statussen, metavelden en permalinks.
 *
 * Overzicht
 *   ak_vak         taxonomie   Aardrijkskunde, Onderzoek & ontwerpen ...
 *   ak_leerjaar    taxonomie   1 havo/vwo, 3 vwo ...
 *   ak_thema       taxonomie   Klimaat, Water, Migratie ... (gedeeld door alle typen)
 *   ak_hoofdstuk   post type   één doorlopende pagina; vak + leerjaar als termen
 *   ak_paragraaf   post type   kind van een hoofdstuk (post_parent), volgorde = menu_order
 *   ak_materiaal   post type   presentatie, pdf, afbeelding, video, link, tekst, opdracht ...
 *   ak_nieuws      post type   geïmporteerd nieuwsartikel (alleen metadata + link)
 *   ak_collectie   post type   nieuwsbundel met geordende artikelen
 *   ak_kaart       post type   kaart uit de kaartenbibliotheek
 *   ak_toepassing  post type   interactieve toepassing (veilig ingesloten)
 *
 * Plaatsingen (welk materiaal in welke paragraaf, in welke volgorde) staan in
 * includes/placements.php.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'aklokaal_register_content_model', 5 );

function aklokaal_register_content_model() {
	$base = array(
		'show_in_rest'    => true,
		'capability_type' => array( 'ak_item', 'ak_items' ),
		'map_meta_cap'    => true,
		'show_in_menu'    => 'aklokaal',
		'supports'        => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields' ),
		'delete_with_user' => false,
	);

	register_post_type(
		'ak_hoofdstuk',
		array_merge(
			$base,
			array(
				'labels'      => aklokaal_labels( 'Hoofdstuk', 'Hoofdstukken' ),
				'public'      => true,
				'has_archive' => 'lesmateriaal',
				'rewrite'     => false,
				'query_var'   => 'ak_hoofdstuk',
				'supports'    => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'page-attributes', 'custom-fields' ),
				'menu_icon'   => 'dashicons-book-alt',
			)
		)
	);

	register_post_type(
		'ak_paragraaf',
		array_merge(
			$base,
			array(
				'labels'              => aklokaal_labels( 'Paragraaf', 'Paragrafen' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'show_ui'             => true,
				'exclude_from_search' => false,
				'rewrite'             => false,
				'supports'            => array( 'title', 'editor', 'revisions', 'page-attributes', 'custom-fields' ),
			)
		)
	);

	register_post_type(
		'ak_materiaal',
		array_merge(
			$base,
			array(
				'labels'      => aklokaal_labels( 'Materiaal', 'Materiaal' ),
				'public'      => true,
				'has_archive' => false,
				'rewrite'     => array(
					'slug'       => 'materiaal',
					'with_front' => false,
				),
			)
		)
	);

	register_post_type(
		'ak_nieuws',
		array_merge(
			$base,
			array(
				'labels'      => aklokaal_labels( 'Nieuwsartikel', 'Nieuws' ),
				'public'      => true,
				'has_archive' => 'nieuws',
				'rewrite'     => array(
					'slug'       => 'nieuws',
					'with_front' => false,
				),
			)
		)
	);

	register_post_type(
		'ak_collectie',
		array_merge(
			$base,
			array(
				'labels'      => aklokaal_labels( 'Nieuwsbundel', 'Nieuwsbundels' ),
				'public'      => true,
				'has_archive' => 'bundels',
				'rewrite'     => array(
					'slug'       => 'bundels',
					'with_front' => false,
				),
			)
		)
	);

	register_post_type(
		'ak_kaart',
		array_merge(
			$base,
			array(
				'labels'      => aklokaal_labels( 'Kaart', 'Kaarten' ),
				'public'      => true,
				'has_archive' => 'kaarten',
				'rewrite'     => array(
					'slug'       => 'kaarten',
					'with_front' => false,
				),
			)
		)
	);

	register_post_type(
		'ak_toepassing',
		array_merge(
			$base,
			array(
				'labels'      => aklokaal_labels( 'Toepassing', 'Interactief' ),
				'public'      => true,
				'has_archive' => 'interactief',
				'rewrite'     => array(
					'slug'       => 'interactief',
					'with_front' => false,
				),
			)
		)
	);

	$tax_caps = array(
		'manage_terms' => AKLOKAAL_CAP,
		'edit_terms'   => AKLOKAAL_CAP,
		'delete_terms' => AKLOKAAL_CAP,
		'assign_terms' => AKLOKAAL_CAP,
	);

	register_taxonomy(
		'ak_vak',
		array( 'ak_hoofdstuk' ),
		array(
			'labels'            => aklokaal_labels( 'Vak', 'Vakken' ),
			'public'            => false,
			'show_ui'           => true,
			'show_in_menu'      => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'hierarchical'      => true,
			'rewrite'           => false,
			'capabilities'      => $tax_caps,
		)
	);

	register_taxonomy(
		'ak_leerjaar',
		array( 'ak_hoofdstuk' ),
		array(
			'labels'            => aklokaal_labels( 'Leerjaar', 'Leerjaren' ),
			'public'            => false,
			'show_ui'           => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'hierarchical'      => true,
			'rewrite'           => false,
			'capabilities'      => $tax_caps,
		)
	);

	register_taxonomy(
		'ak_thema',
		array( 'ak_materiaal', 'ak_nieuws', 'ak_collectie', 'ak_kaart', 'ak_toepassing' ),
		array(
			'labels'            => aklokaal_labels( 'Thema', 'Thema’s' ),
			'public'            => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'hierarchical'      => false,
			'rewrite'           => array(
				'slug'       => 'thema',
				'with_front' => false,
			),
			'capabilities'      => $tax_caps,
		)
	);

	foreach ( array( 'ak_vak', 'ak_leerjaar' ) as $tax ) {
		register_term_meta(
			$tax,
			'ak_order',
			array(
				'type'              => 'integer',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => 'aklokaal_can_manage',
			)
		);
	}

	register_post_status(
		'ak_archief',
		array(
			'label'                     => _x( 'Archief', 'post status', 'aklokaal' ),
			'public'                    => false,
			'internal'                  => false,
			'protected'                 => true,
			'exclude_from_search'       => true,
			'show_in_admin_all_list'    => false,
			'show_in_admin_status_list' => true,
			/* translators: %s: aantal */
			'label_count'               => _n_noop( 'Archief <span class="count">(%s)</span>', 'Archief <span class="count">(%s)</span>', 'aklokaal' ),
		)
	);

	aklokaal_register_meta();
	aklokaal_register_rewrites();
}

function aklokaal_labels( $singular, $plural ) {
	return array(
		'name'          => $plural,
		'singular_name' => $singular,
		'add_new'       => __( 'Nieuw', 'aklokaal' ),
		/* translators: %s: naam */
		'add_new_item'  => sprintf( __( '%s toevoegen', 'aklokaal' ), $singular ),
		/* translators: %s: naam */
		'edit_item'     => sprintf( __( '%s bewerken', 'aklokaal' ), $singular ),
		'all_items'     => $plural,
		'search_items'  => __( 'Zoeken', 'aklokaal' ),
		'not_found'     => __( 'Niets gevonden', 'aklokaal' ),
		'menu_name'     => $plural,
	);
}

/**
 * Metavelden. Alle velden zijn via de REST API leesbaar en alleen door
 * beheerders te wijzigen.
 */
function aklokaal_register_meta() {
	$fields = array(
		'ak_hoofdstuk'  => array(
			'ak_nummer' => 'string',
			'ak_items'  => 'array',
		),
		'ak_paragraaf'  => array(
			'ak_nummer' => 'string',
			'ak_items'  => 'array',
		),
		'ak_materiaal'  => array(
			'ak_type'          => 'string',
			'ak_attachment_id' => 'integer',
			'ak_preview_id'    => 'integer',
			'ak_url'           => 'string',
			'ak_source'        => 'string',
		),
		'ak_nieuws'     => array(
			'ak_url'        => 'string',
			'ak_url_key'    => 'string',
			'ak_publisher'  => 'string',
			'ak_author'     => 'string',
			'ak_published'  => 'string',
			'ak_image_url'  => 'string',
			'ak_show_image' => 'boolean',
			'ak_question'   => 'string',
			'ak_missing'    => 'array',
			'ak_ai_draft'   => 'object',
		),
		'ak_collectie'  => array(
			'ak_items'     => 'array',
			'ak_questions' => 'string',
		),
		'ak_kaart'      => array(
			'ak_kind'          => 'string',
			'ak_attachment_id' => 'integer',
			'ak_app_url'       => 'string',
			'ak_source'        => 'string',
			'ak_legend'        => 'string',
		),
		'ak_toepassing' => array(
			'ak_app_url' => 'string',
			'ak_height'  => 'integer',
			'ak_source'  => 'string',
		),
	);

	foreach ( $fields as $post_type => $meta ) {
		foreach ( $meta as $key => $type ) {
			$args = array(
				'type'          => $type,
				'single'        => true,
				'auth_callback' => 'aklokaal_can_manage',
				'show_in_rest'  => true,
			);
			if ( 'array' === $type ) {
				$args['default']      = array();
				$args['show_in_rest'] = array(
					'schema' => array(
						'type'  => 'array',
						'items' => array( 'type' => array( 'object', 'string', 'integer' ) ),
					),
				);
			} elseif ( 'object' === $type ) {
				$args['show_in_rest'] = array(
					'schema' => array(
						'type'                 => 'object',
						'additionalProperties' => true,
					),
				);
			} elseif ( 'string' === $type ) {
				$args['sanitize_callback'] = preg_match( '/(^ak_url$|_url$)/', $key ) ? 'esc_url_raw' : 'sanitize_text_field';
			} elseif ( 'integer' === $type ) {
				$args['sanitize_callback'] = 'absint';
			}
			register_post_meta( $post_type, $key, $args );
		}
	}
}

/* ---------------------------------------------------------------------------
 * Permalinks voor hoofdstukken: /lesmateriaal/{vak}/{leerjaar}/{hoofdstuk}/
 * ------------------------------------------------------------------------- */

function aklokaal_register_rewrites() {
	add_rewrite_tag( '%ak_vak_q%', '([^/]+)' );
	add_rewrite_tag( '%ak_leerjaar_q%', '([^/]+)' );
	add_rewrite_rule( '^lesmateriaal/([^/]+)/([^/]+)/([^/]+)/?$', 'index.php?ak_hoofdstuk=$matches[3]&ak_vak_q=$matches[1]&ak_leerjaar_q=$matches[2]', 'top' );
	add_rewrite_rule( '^lesmateriaal/([^/]+)/([^/]+)/?$', 'index.php?post_type=ak_hoofdstuk&ak_vak_q=$matches[1]&ak_leerjaar_q=$matches[2]', 'top' );
	add_rewrite_rule( '^lesmateriaal/([^/]+)/?$', 'index.php?post_type=ak_hoofdstuk&ak_vak_q=$matches[1]', 'top' );
	add_rewrite_rule( '^lesmateriaal/?$', 'index.php?post_type=ak_hoofdstuk', 'top' );
}

/** Archieflink van hoofdstukken: /lesmateriaal/ (het post type heeft eigen permalinks). */
add_filter(
	'post_type_archive_link',
	function ( $link, $post_type ) {
		if ( 'ak_hoofdstuk' === $post_type && get_option( 'permalink_structure' ) ) {
			return home_url( user_trailingslashit( 'lesmateriaal' ) );
		}
		return $link;
	},
	10,
	2
);

add_filter(
	'post_type_link',
	function ( $link, $post ) {
		if ( 'ak_hoofdstuk' !== $post->post_type || ! get_option( 'permalink_structure' ) ) {
			return $link;
		}
		if ( ! in_array( $post->post_status, array( 'publish', 'private', 'ak_archief' ), true ) ) {
			return add_query_arg(
				array(
					'post_type' => 'ak_hoofdstuk',
					'p'         => $post->ID,
				),
				home_url( '/' )
			);
		}
		$vak  = aklokaal_first_term( $post->ID, 'ak_vak' );
		$jaar = aklokaal_first_term( $post->ID, 'ak_leerjaar' );
		return home_url(
			user_trailingslashit(
				sprintf(
					'lesmateriaal/%s/%s/%s',
					$vak ? $vak->slug : 'algemeen',
					$jaar ? $jaar->slug : 'alle',
					$post->post_name
				)
			)
		);
	},
	10,
	2
);

/** Bij een hoofdstuk-URL ook op vak en leerjaar filteren (dubbele slugs mogen). */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( is_admin() || ! $q->is_main_query() ) {
			return;
		}
		$tax_query = array();
		foreach ( array( 'ak_vak_q' => 'ak_vak', 'ak_leerjaar_q' => 'ak_leerjaar' ) as $var => $tax ) {
			$val = $q->get( $var );
			if ( $val && ! in_array( $val, array( 'algemeen', 'alle' ), true ) ) {
				$tax_query[] = array(
					'taxonomy' => $tax,
					'field'    => 'slug',
					'terms'    => sanitize_title( $val ),
				);
			}
		}
		if ( $tax_query ) {
			$q->set( 'tax_query', $tax_query );
		}
		if ( $q->is_post_type_archive( 'ak_hoofdstuk' ) ) {
			$q->set( 'posts_per_page', -1 );
			$q->set(
				'orderby',
				array(
					'menu_order' => 'ASC',
					'title'      => 'ASC',
				)
			);
		}
	}
);

/**
 * Twee hoofdstukken "Energie" in verschillende leerjaren mogen dezelfde slug
 * houden; de URL is uniek door het leerjaar.
 */
add_filter(
	'wp_unique_post_slug',
	function ( $slug, $post_id, $status, $post_type, $parent, $original ) {
		if ( 'ak_hoofdstuk' !== $post_type || $slug === $original || ! $post_id ) {
			return $slug;
		}
		$mine = wp_get_object_terms( $post_id, array( 'ak_vak', 'ak_leerjaar' ), array( 'fields' => 'ids' ) );
		if ( empty( $mine ) || is_wp_error( $mine ) ) {
			return $slug;
		}
		sort( $mine );
		$others = get_posts(
			array(
				'post_type'      => 'ak_hoofdstuk',
				'name'           => $original,
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'post__not_in'   => array( $post_id ),
				'fields'         => 'ids',
			)
		);
		foreach ( $others as $other ) {
			$theirs = wp_get_object_terms( $other, array( 'ak_vak', 'ak_leerjaar' ), array( 'fields' => 'ids' ) );
			sort( $theirs );
			if ( $theirs === $mine ) {
				return $slug;
			}
		}
		return $original;
	},
	10,
	6
);

/** Na het opslaan van termen de slug opnieuw laten bepalen (zie filter hierboven). */
add_action(
	'set_object_terms',
	function ( $object_id, $terms, $tt_ids, $taxonomy ) {
		static $busy = false;
		if ( $busy || ! in_array( $taxonomy, array( 'ak_vak', 'ak_leerjaar' ), true ) ) {
			return;
		}
		$post = get_post( $object_id );
		if ( ! $post || 'ak_hoofdstuk' !== $post->post_type || ! $post->post_name ) {
			return;
		}
		$wanted = sanitize_title( $post->post_title );
		if ( $post->post_name === $wanted ) {
			return;
		}
		if ( preg_match( '/^' . preg_quote( $wanted, '/' ) . '-\d+$/', $post->post_name ) ) {
			$busy = true;
			$new  = wp_unique_post_slug( $wanted, $post->ID, $post->post_status, $post->post_type, $post->post_parent );
			if ( $new !== $post->post_name ) {
				wp_update_post(
					array(
						'ID'        => $post->ID,
						'post_name' => $new,
					)
				);
			}
			$busy = false;
		}
	},
	10,
	4
);

/** Paragrafen erven de status niet automatisch, maar verdwijnen mee bij verwijderen. */
add_action(
	'before_delete_post',
	function ( $post_id ) {
		$post = get_post( $post_id );
		if ( $post && 'ak_hoofdstuk' === $post->post_type ) {
			foreach ( aklokaal_get_paragraphs( $post_id, 'any' ) as $p ) {
				wp_delete_post( $p->ID, true );
			}
		}
	}
);

/** Paragrafen zijn geen eigen pagina: stuur door naar het anker in het hoofdstuk. */
add_action(
	'template_redirect',
	function () {
		if ( is_singular( 'ak_paragraaf' ) ) {
			$p = get_queried_object();
			wp_safe_redirect( get_permalink( $p->post_parent ) . '#' . aklokaal_paragraph_anchor( aklokaal_paragraph_number( $p ) ), 301 );
			exit;
		}
	}
);
