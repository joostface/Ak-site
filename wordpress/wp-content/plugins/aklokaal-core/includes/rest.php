<?php
/**
 * REST API: /wp-json/aklokaal/v1/...
 *
 * Lezen is openbaar (alleen gepubliceerde inhoud). Alles wat iets verandert,
 * vereist de capability aklokaal_manage én een geldige nonce (X-WP-Nonce),
 * zodat CSRF niet mogelijk is.
 *
 *   GET    structure                    vakken → leerjaren → hoofdstukken → paragrafen
 *   POST   structure/order              volgorde van hoofdstukken of paragrafen opslaan
 *   POST   chapters                     hoofdstuk maken
 *   POST   chapters/{id}                hoofdstuk wijzigen (titel, nummer, status, intro)
 *   POST   paragraphs                   paragraaf maken
 *   POST   paragraphs/{id}              paragraaf wijzigen
 *   DELETE paragraphs/{id}              paragraaf naar de prullenbak
 *   GET    items/{container}            geplaatste items (beheer)
 *   POST   items/{container}            volgorde + toelichtingen opslaan
 *   POST   items/move                   items naar een andere paragraaf verplaatsen
 *   POST   items/{container}/add        bestaand item plaatsen (hergebruik)
 *   POST   materials                    bestand(en) uploaden of link toevoegen, direct plaatsen
 *   POST   materials/{id}               materiaal wijzigen
 *   POST   materials/{id}/file          bestand vervangen, verwijzing blijft gelijk
 *   GET    library                      bestaand materiaal zoeken om te hergebruiken
 *   POST   news/lookup                  metadata ophalen bij een URL
 *   POST   news                         nieuwsartikel opslaan
 *   GET    search                       openbare zoekfunctie
 */

defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', 'aklokaal_register_rest' );

function aklokaal_register_rest() {
	$ns     = 'aklokaal/v1';
	$manage = 'aklokaal_can_manage';
	$id_arg = array(
		'id' => array(
			'validate_callback' => function ( $v ) {
				return is_numeric( $v );
			},
		),
	);

	register_rest_route(
		$ns,
		'/structure',
		array(
			'methods'             => 'GET',
			'callback'            => 'aklokaal_rest_structure',
			'permission_callback' => '__return_true',
		)
	);
	register_rest_route(
		$ns,
		'/structure/order',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_order',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/chapters',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_chapter_save',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/chapters/(?P<id>\d+)',
		array(
			array(
				'methods'             => 'POST',
				'callback'            => 'aklokaal_rest_chapter_save',
				'permission_callback' => $manage,
				'args'                => $id_arg,
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => 'aklokaal_rest_trash',
				'permission_callback' => $manage,
				'args'                => $id_arg,
			),
		)
	);
	register_rest_route(
		$ns,
		'/paragraphs',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_paragraph_save',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/paragraphs/(?P<id>\d+)',
		array(
			array(
				'methods'             => 'POST',
				'callback'            => 'aklokaal_rest_paragraph_save',
				'permission_callback' => $manage,
				'args'                => $id_arg,
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => 'aklokaal_rest_trash',
				'permission_callback' => $manage,
				'args'                => $id_arg,
			),
		)
	);
	register_rest_route(
		$ns,
		'/items/move',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_items_move',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/items/status',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_items_status',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/items/(?P<id>\d+)',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => 'aklokaal_rest_items_get',
				'permission_callback' => $manage,
				'args'                => $id_arg,
			),
			array(
				'methods'             => 'POST',
				'callback'            => 'aklokaal_rest_items_set',
				'permission_callback' => $manage,
				'args'                => $id_arg,
			),
		)
	);
	register_rest_route(
		$ns,
		'/items/(?P<id>\d+)/add',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_items_add',
			'permission_callback' => $manage,
			'args'                => $id_arg,
		)
	);
	register_rest_route(
		$ns,
		'/items/(?P<id>\d+)/thumbnail',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_item_thumbnail',
			'permission_callback' => $manage,
			'args'                => $id_arg,
		)
	);
	register_rest_route(
		$ns,
		'/materials',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_material_create',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/materials/(?P<id>\d+)',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_material_update',
			'permission_callback' => $manage,
			'args'                => $id_arg,
		)
	);
	register_rest_route(
		$ns,
		'/materials/(?P<id>\d+)/file',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_material_file',
			'permission_callback' => $manage,
			'args'                => $id_arg,
		)
	);
	register_rest_route(
		$ns,
		'/library',
		array(
			'methods'             => 'GET',
			'callback'            => 'aklokaal_rest_library',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/news/lookup',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_news_lookup',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/news',
		array(
			'methods'             => 'POST',
			'callback'            => 'aklokaal_rest_news_save',
			'permission_callback' => $manage,
		)
	);
	register_rest_route(
		$ns,
		'/search',
		array(
			'methods'             => 'GET',
			'callback'            => 'aklokaal_rest_search',
			'permission_callback' => '__return_true',
			'args'                => array(
				'q' => array(
					'required'          => true,
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		)
	);
}

/* ---------------------------------------------------------------- structuur */

function aklokaal_rest_structure( WP_REST_Request $r ) {
	$all    = $r->get_param( 'all' ) && aklokaal_can_manage();
	$status = $all ? array( 'publish', 'draft', 'private' ) : array( 'publish' );
	$out    = array();
	foreach ( aklokaal_sorted_terms( 'ak_vak' ) as $vak ) {
		$v = array(
			'id'    => $vak->term_id,
			'name'  => $vak->name,
			'slug'  => $vak->slug,
			'years' => array(),
		);
		foreach ( aklokaal_sorted_terms( 'ak_leerjaar' ) as $jaar ) {
			$chapters = aklokaal_get_chapters(
				array(
					'vak'      => $vak->term_id,
					'leerjaar' => $jaar->term_id,
					'status'   => $status,
				)
			);
			if ( ! $chapters && ! $all ) {
				continue;
			}
			$v['years'][] = array(
				'id'       => $jaar->term_id,
				'name'     => $jaar->name,
				'slug'     => $jaar->slug,
				'chapters' => array_map(
					function ( $c ) use ( $status ) {
						return aklokaal_chapter_json( $c, $status );
					},
					$chapters
				),
			);
		}
		$out[] = $v;
	}
	return rest_ensure_response( $out );
}

function aklokaal_chapter_json( $c, $status = array( 'publish' ) ) {
	$paras = aklokaal_get_paragraphs( $c->ID, $status );
	return array(
		'id'         => $c->ID,
		'title'      => get_the_title( $c ),
		'number'     => aklokaal_chapter_number( $c ),
		'status'     => $c->post_status,
		'url'        => get_permalink( $c ),
		'excerpt'    => $c->post_excerpt,
		'paragraphs' => array_values(
			array_map(
				function ( $p, $i ) {
					$num = aklokaal_paragraph_number( $p, $i + 1 );
					return array(
						'id'     => $p->ID,
						'title'  => get_the_title( $p ),
						'number' => $num,
						'anchor' => aklokaal_paragraph_anchor( $num ),
						'status' => $p->post_status,
						'count'  => count( aklokaal_get_items( $p->ID ) ),
					);
				},
				$paras,
				array_keys( $paras )
			)
		),
	);
}

function aklokaal_rest_order( WP_REST_Request $r ) {
	$ids = array_map( 'absint', (array) $r->get_param( 'ids' ) );
	$i   = 0;
	foreach ( $ids as $id ) {
		$type = get_post_type( $id );
		if ( in_array( $type, array( 'ak_hoofdstuk', 'ak_paragraaf' ), true ) ) {
			wp_update_post(
				array(
					'ID'         => $id,
					'menu_order' => ++$i,
				)
			);
		}
	}
	return rest_ensure_response( array( 'ok' => true ) );
}

function aklokaal_rest_chapter_save( WP_REST_Request $r ) {
	$id = (int) $r->get_param( 'id' );
	if ( $id && 'ak_hoofdstuk' !== get_post_type( $id ) ) {
		return new WP_Error( 'aklokaal_not_found', __( 'Hoofdstuk niet gevonden.', 'aklokaal' ), array( 'status' => 404 ) );
	}
	$post = array( 'post_type' => 'ak_hoofdstuk' );
	if ( null !== $r->get_param( 'title' ) ) {
		$post['post_title'] = sanitize_text_field( $r->get_param( 'title' ) );
	}
	if ( null !== $r->get_param( 'excerpt' ) ) {
		$post['post_excerpt'] = sanitize_textarea_field( $r->get_param( 'excerpt' ) );
	}
	if ( null !== $r->get_param( 'status' ) ) {
		$post['post_status'] = 'publish' === $r->get_param( 'status' ) ? 'publish' : 'draft';
	}
	if ( $id ) {
		$post['ID'] = $id;
		$res        = wp_update_post( $post, true );
	} else {
		if ( empty( $post['post_title'] ) ) {
			return new WP_Error( 'aklokaal_title', __( 'Geef het hoofdstuk een titel.', 'aklokaal' ), array( 'status' => 400 ) );
		}
		$post['post_status'] = isset( $post['post_status'] ) ? $post['post_status'] : 'draft';
		$post['menu_order']  = 999;
		$res                 = wp_insert_post( $post, true );
	}
	if ( is_wp_error( $res ) ) {
		return $res;
	}
	if ( $r->get_param( 'vak' ) ) {
		wp_set_object_terms( $res, array( (int) $r->get_param( 'vak' ) ), 'ak_vak' );
	}
	if ( $r->get_param( 'leerjaar' ) ) {
		wp_set_object_terms( $res, array( (int) $r->get_param( 'leerjaar' ) ), 'ak_leerjaar' );
	}
	if ( null !== $r->get_param( 'number' ) ) {
		update_post_meta( $res, 'ak_nummer', sanitize_text_field( $r->get_param( 'number' ) ) );
	}
	// Nieuw hoofdstuk: meteen een eerste paragraaf, zodat er iets te vullen is.
	if ( ! $id && $r->get_param( 'first_paragraph' ) ) {
		wp_insert_post(
			array(
				'post_type'   => 'ak_paragraaf',
				'post_title'  => sanitize_text_field( $r->get_param( 'first_paragraph' ) ),
				'post_parent' => $res,
				'post_status' => 'publish',
				'menu_order'  => 1,
			)
		);
	}
	return rest_ensure_response( aklokaal_chapter_json( get_post( $res ), array( 'publish', 'draft', 'private' ) ) );
}

function aklokaal_rest_paragraph_save( WP_REST_Request $r ) {
	$id = (int) $r->get_param( 'id' );
	if ( $id && 'ak_paragraaf' !== get_post_type( $id ) ) {
		return new WP_Error( 'aklokaal_not_found', __( 'Paragraaf niet gevonden.', 'aklokaal' ), array( 'status' => 404 ) );
	}
	$post = array( 'post_type' => 'ak_paragraaf' );
	if ( null !== $r->get_param( 'title' ) ) {
		$post['post_title'] = sanitize_text_field( $r->get_param( 'title' ) );
	}
	if ( null !== $r->get_param( 'content' ) ) {
		$post['post_content'] = wp_kses_post( $r->get_param( 'content' ) );
	}
	if ( null !== $r->get_param( 'status' ) ) {
		$post['post_status'] = 'publish' === $r->get_param( 'status' ) ? 'publish' : 'draft';
	}
	if ( $id ) {
		$post['ID'] = $id;
		$res        = wp_update_post( $post, true );
	} else {
		$chapter = (int) $r->get_param( 'chapter' );
		if ( 'ak_hoofdstuk' !== get_post_type( $chapter ) ) {
			return new WP_Error( 'aklokaal_chapter', __( 'Kies een hoofdstuk.', 'aklokaal' ), array( 'status' => 400 ) );
		}
		$post['post_parent'] = $chapter;
		$post['post_status'] = isset( $post['post_status'] ) ? $post['post_status'] : 'publish';
		$post['post_title']  = ! empty( $post['post_title'] ) ? $post['post_title'] : __( 'Nieuwe paragraaf', 'aklokaal' );
		$post['menu_order']  = count( aklokaal_get_paragraphs( $chapter, 'any' ) ) + 1;
		$res                 = wp_insert_post( $post, true );
	}
	if ( is_wp_error( $res ) ) {
		return $res;
	}
	if ( null !== $r->get_param( 'number' ) ) {
		update_post_meta( $res, 'ak_nummer', sanitize_text_field( $r->get_param( 'number' ) ) );
	}
	$p = get_post( $res );
	return rest_ensure_response(
		array(
			'id'     => $p->ID,
			'title'  => get_the_title( $p ),
			'number' => aklokaal_paragraph_number( $p ),
			'status' => $p->post_status,
		)
	);
}

function aklokaal_rest_trash( WP_REST_Request $r ) {
	$id = (int) $r['id'];
	if ( ! in_array( get_post_type( $id ), array( 'ak_hoofdstuk', 'ak_paragraaf' ), true ) ) {
		return new WP_Error( 'aklokaal_not_found', __( 'Niet gevonden.', 'aklokaal' ), array( 'status' => 404 ) );
	}
	if ( get_post_type( $id ) === 'ak_paragraaf' && aklokaal_get_items( $id ) && ! $r->get_param( 'force' ) ) {
		return new WP_Error( 'aklokaal_not_empty', __( 'Deze paragraaf bevat nog materiaal. Verplaats het eerst, of bevestig dat je hem toch wilt verwijderen.', 'aklokaal' ), array( 'status' => 409 ) );
	}
	wp_trash_post( $id );
	return rest_ensure_response( array( 'ok' => true ) );
}

/* ---------------------------------------------------------------- plaatsingen */

function aklokaal_item_json( $post, $note = '' ) {
	$type  = $post->post_type;
	$kind  = 'ak_materiaal' === $type ? get_post_meta( $post->ID, 'ak_type', true ) : $type;
	$names = array_merge(
		aklokaal_material_types(),
		array(
			'ak_nieuws'     => __( 'Nieuws', 'aklokaal' ),
			'ak_kaart'      => __( 'Kaart', 'aklokaal' ),
			'ak_toepassing' => __( 'Interactief', 'aklokaal' ),
			'ak_collectie'  => __( 'Nieuwsbundel', 'aklokaal' ),
		)
	);
	return array(
		'id'     => $post->ID,
		'title'  => get_the_title( $post ),
		'kind'   => $kind,
		'label'  => isset( $names[ $kind ] ) ? $names[ $kind ] : $kind,
		'status' => $post->post_status,
		'note'   => $note,
		'edit'   => get_edit_post_link( $post->ID, 'raw' ),
		'thumb'  => get_the_post_thumbnail_url( $post, 'thumbnail' ),
		'used'   => count( aklokaal_item_placements( $post->ID ) ),
	);
}

function aklokaal_rest_items_get( WP_REST_Request $r ) {
	$out = array();
	foreach ( aklokaal_get_items( (int) $r['id'] ) as $it ) {
		$p = get_post( $it['id'] );
		if ( $p ) {
			$out[] = aklokaal_item_json( $p, $it['note'] );
		}
	}
	return rest_ensure_response( $out );
}

function aklokaal_check_container( $id ) {
	return in_array( get_post_type( $id ), aklokaal_container_types(), true );
}

function aklokaal_rest_items_set( WP_REST_Request $r ) {
	$id = (int) $r['id'];
	if ( ! aklokaal_check_container( $id ) ) {
		return new WP_Error( 'aklokaal_container', __( 'Hier kan geen materiaal geplaatst worden.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	aklokaal_set_items( $id, (array) $r->get_param( 'items' ) );
	return aklokaal_rest_items_get( $r );
}

function aklokaal_rest_items_add( WP_REST_Request $r ) {
	$id   = (int) $r['id'];
	$item = (int) $r->get_param( 'item' );
	if ( ! aklokaal_check_container( $id ) || ! in_array( get_post_type( $item ), aklokaal_placeable_types(), true ) ) {
		return new WP_Error( 'aklokaal_container', __( 'Dit kan hier niet geplaatst worden.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	aklokaal_place_item( $item, $id, null, sanitize_textarea_field( (string) $r->get_param( 'note' ) ) );
	return aklokaal_rest_items_get( $r );
}

function aklokaal_rest_items_move( WP_REST_Request $r ) {
	$from = (int) $r->get_param( 'from' );
	$to   = (int) $r->get_param( 'to' );
	if ( ! aklokaal_check_container( $from ) || ! aklokaal_check_container( $to ) ) {
		return new WP_Error( 'aklokaal_container', __( 'Ongeldige paragraaf.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	aklokaal_move_items( (array) $r->get_param( 'ids' ), $from, $to );
	return rest_ensure_response( array( 'ok' => true ) );
}

/** Eigen voorbeeldafbeelding (uitgelichte afbeelding) bij een item. */
function aklokaal_rest_item_thumbnail( WP_REST_Request $r ) {
	$id    = (int) $r['id'];
	$files = $r->get_file_params();
	if ( ! in_array( get_post_type( $id ), aklokaal_placeable_types(), true ) || empty( $files['file'] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Kies een afbeelding.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	if ( 'afbeelding' !== aklokaal_type_for_filename( $files['file']['name'] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Alleen JPG, PNG, WebP of GIF.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$att = aklokaal_store_upload( $files['file'], get_the_title( $id ) );
	if ( is_wp_error( $att ) || ! wp_attachment_is_image( $att ) ) {
		return new WP_Error( 'aklokaal_upload', is_wp_error( $att ) ? $att->get_error_message() : __( 'Dit is geen afbeelding.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	set_post_thumbnail( $id, $att );
	return rest_ensure_response( aklokaal_item_json( get_post( $id ) ) );
}

/** Status van meerdere items tegelijk: publiceren, concept of archief. */
function aklokaal_rest_items_status( WP_REST_Request $r ) {
	$status = (string) $r->get_param( 'status' );
	if ( ! in_array( $status, array( 'publish', 'draft', 'ak_archief' ), true ) ) {
		return new WP_Error( 'aklokaal_status', __( 'Onbekende status.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$done = 0;
	foreach ( array_map( 'absint', (array) $r->get_param( 'ids' ) ) as $id ) {
		if ( in_array( get_post_type( $id ), aklokaal_placeable_types(), true ) ) {
			wp_update_post(
				array(
					'ID'          => $id,
					'post_status' => $status,
				)
			);
			++$done;
		}
	}
	return rest_ensure_response( array( 'updated' => $done ) );
}

/* ---------------------------------------------------------------- materiaal */

/**
 * Eén of meer bestanden (files[]) of één link (url). Elk bestand wordt een
 * eigen materiaalitem en komt direct in de gekozen paragraaf.
 */
function aklokaal_rest_material_create( WP_REST_Request $r ) {
	$container = (int) $r->get_param( 'container' );
	if ( $container && ! aklokaal_check_container( $container ) ) {
		return new WP_Error( 'aklokaal_container', __( 'Kies een paragraaf.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$status = 'draft' === $r->get_param( 'status' ) ? 'draft' : 'publish';
	$titles = (array) $r->get_param( 'titles' );
	$themes = array_filter( array_map( 'trim', explode( ',', (string) $r->get_param( 'themes' ) ) ) );
	$desc   = (string) $r->get_param( 'description' );
	$files  = $r->get_file_params();
	$made   = array();
	$errors = array();

	if ( ! empty( $files['files'] ) ) {
		$list = aklokaal_normalize_files( $files['files'] );
		foreach ( $list as $i => $file ) {
			$title = ! empty( $titles[ $i ] ) ? sanitize_text_field( $titles[ $i ] ) : aklokaal_title_from_filename( $file['name'] );
			$att   = aklokaal_store_upload( $file, $title );
			if ( is_wp_error( $att ) ) {
				$errors[] = array(
					'file'    => sanitize_file_name( $file['name'] ),
					'message' => $att->get_error_message(),
				);
				continue;
			}
			$mid = aklokaal_create_material(
				array(
					'title'         => $title,
					'type'          => aklokaal_type_for_filename( $file['name'] ),
					'attachment_id' => $att,
					'description'   => $desc,
					'status'        => $status,
					'themes'        => $themes,
				)
			);
			if ( is_wp_error( $mid ) ) {
				$errors[] = array(
					'file'    => sanitize_file_name( $file['name'] ),
					'message' => $mid->get_error_message(),
				);
				continue;
			}
			$made[] = $mid;
		}
	} elseif ( $r->get_param( 'url' ) || $r->get_param( 'type' ) ) {
		$url  = esc_url_raw( (string) $r->get_param( 'url' ), array( 'http', 'https' ) );
		$type = $r->get_param( 'type' ) ? sanitize_key( $r->get_param( 'type' ) ) : aklokaal_type_for_url( $url );
		if ( ! $url && ! in_array( $type, array( 'tekst', 'opdracht' ), true ) ) {
			return new WP_Error( 'aklokaal_url', __( 'Plak een volledige link, beginnend met https://', 'aklokaal' ), array( 'status' => 400 ) );
		}
		$title = ! empty( $titles[0] ) ? sanitize_text_field( $titles[0] ) : (string) wp_parse_url( $url, PHP_URL_HOST );
		$mid   = aklokaal_create_material(
			array(
				'title'       => $title,
				'type'        => $type,
				'url'         => $url,
				'description' => $desc,
				'status'      => $status,
				'themes'      => $themes,
			)
		);
		if ( is_wp_error( $mid ) ) {
			return $mid;
		}
		$made[] = $mid;
	} else {
		return new WP_Error( 'aklokaal_empty', __( 'Kies een bestand of plak een link.', 'aklokaal' ), array( 'status' => 400 ) );
	}

	if ( $container ) {
		foreach ( $made as $mid ) {
			aklokaal_place_item( $mid, $container );
		}
	}
	return rest_ensure_response(
		array(
			'created' => array_map(
				function ( $id ) {
					return aklokaal_item_json( get_post( $id ) );
				},
				$made
			),
			'errors'  => $errors,
		)
	);
}

/** $_FILES['files'] met meerdere bestanden omzetten naar een lijst. */
function aklokaal_normalize_files( $f ) {
	if ( ! is_array( $f['name'] ) ) {
		return array( $f );
	}
	$out = array();
	foreach ( $f['name'] as $i => $name ) {
		$out[] = array(
			'name'     => $name,
			'type'     => $f['type'][ $i ],
			'tmp_name' => $f['tmp_name'][ $i ],
			'error'    => $f['error'][ $i ],
			'size'     => $f['size'][ $i ],
		);
	}
	return $out;
}

function aklokaal_rest_material_update( WP_REST_Request $r ) {
	$id = (int) $r['id'];
	if ( 'ak_materiaal' !== get_post_type( $id ) ) {
		return new WP_Error( 'aklokaal_not_found', __( 'Materiaal niet gevonden.', 'aklokaal' ), array( 'status' => 404 ) );
	}
	$post = array( 'ID' => $id );
	if ( null !== $r->get_param( 'title' ) ) {
		$post['post_title'] = sanitize_text_field( $r->get_param( 'title' ) );
	}
	if ( null !== $r->get_param( 'description' ) ) {
		$post['post_content'] = wp_kses_post( $r->get_param( 'description' ) );
	}
	if ( null !== $r->get_param( 'status' ) ) {
		$s                   = $r->get_param( 'status' );
		$post['post_status'] = in_array( $s, array( 'publish', 'draft', 'ak_archief' ), true ) ? $s : 'draft';
	}
	$res = wp_update_post( $post, true );
	if ( is_wp_error( $res ) ) {
		return $res;
	}
	if ( null !== $r->get_param( 'thumbnail' ) ) {
		$thumb = (int) $r->get_param( 'thumbnail' );
		if ( $thumb && wp_attachment_is_image( $thumb ) ) {
			set_post_thumbnail( $id, $thumb );
		} elseif ( ! $thumb ) {
			delete_post_thumbnail( $id );
		}
	}
	if ( null !== $r->get_param( 'themes' ) ) {
		wp_set_post_terms( $id, array_filter( array_map( 'trim', explode( ',', (string) $r->get_param( 'themes' ) ) ) ), 'ak_thema' );
	}
	return rest_ensure_response( aklokaal_item_json( get_post( $id ) ) );
}

function aklokaal_rest_material_file( WP_REST_Request $r ) {
	$id    = (int) $r['id'];
	$files = $r->get_file_params();
	if ( 'ak_materiaal' !== get_post_type( $id ) || empty( $files['file'] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Kies een bestand.', 'aklokaal' ), array( 'status' => 400 ) );
	}
	$att = (int) get_post_meta( $id, 'ak_attachment_id', true );
	if ( $att ) {
		$res = aklokaal_replace_attachment_file( $att, $files['file'] );
	} else {
		$res = aklokaal_store_upload( $files['file'], get_the_title( $id ) );
		if ( ! is_wp_error( $res ) ) {
			update_post_meta( $id, 'ak_attachment_id', $res );
		}
	}
	if ( is_wp_error( $res ) ) {
		$res->add_data( array( 'status' => 400 ) );
		return $res;
	}
	return rest_ensure_response( aklokaal_item_json( get_post( $id ) ) );
}

function aklokaal_rest_library( WP_REST_Request $r ) {
	$q = new WP_Query(
		array(
			'post_type'      => aklokaal_placeable_types(),
			'post_status'    => array( 'publish', 'draft' ),
			's'              => sanitize_text_field( (string) $r->get_param( 'q' ) ),
			'posts_per_page' => 30,
			'orderby'        => 'modified',
			'no_found_rows'  => true,
		)
	);
	return rest_ensure_response(
		array_map(
			function ( $p ) {
				return aklokaal_item_json( $p );
			},
			$q->posts
		)
	);
}

/* ---------------------------------------------------------------- nieuws */

function aklokaal_rest_news_lookup( WP_REST_Request $r ) {
	$data = aklokaal_fetch_article_metadata( (string) $r->get_param( 'url' ) );
	if ( is_wp_error( $data ) ) {
		$data->add_data( array( 'status' => 400 ) );
		return $data;
	}
	$data['ai'] = apply_filters( 'aklokaal_ai_news_suggestions', null, $data );
	return rest_ensure_response( $data );
}

function aklokaal_rest_news_save( WP_REST_Request $r ) {
	$id = aklokaal_save_news( $r->get_params() );
	if ( is_wp_error( $id ) ) {
		$id->add_data( array_merge( (array) $id->get_error_data(), array( 'status' => 400 ) ) );
		return $id;
	}
	$container = (int) $r->get_param( 'container' );
	if ( $container && aklokaal_check_container( $container ) ) {
		aklokaal_place_item( $id, $container );
	}
	return rest_ensure_response(
		array(
			'id'   => $id,
			'url'  => get_permalink( $id ),
			'edit' => get_edit_post_link( $id, 'raw' ),
		)
	);
}

/* ---------------------------------------------------------------- zoeken */

function aklokaal_rest_search( WP_REST_Request $r ) {
	$q = trim( (string) $r->get_param( 'q' ) );
	if ( mb_strlen( $q ) < 2 ) {
		return rest_ensure_response( array() );
	}
	$query = new WP_Query(
		array(
			'post_type'      => array( 'ak_hoofdstuk', 'ak_paragraaf', 'ak_materiaal', 'ak_nieuws', 'ak_collectie', 'ak_kaart', 'ak_toepassing', 'page' ),
			'post_status'    => 'publish',
			's'              => $q,
			'posts_per_page' => 12,
			'no_found_rows'  => true,
		)
	);
	$labels = array(
		'ak_hoofdstuk'  => __( 'Hoofdstuk', 'aklokaal' ),
		'ak_paragraaf'  => __( 'Paragraaf', 'aklokaal' ),
		'ak_materiaal'  => __( 'Materiaal', 'aklokaal' ),
		'ak_nieuws'     => __( 'Nieuws', 'aklokaal' ),
		'ak_collectie'  => __( 'Nieuwsbundel', 'aklokaal' ),
		'ak_kaart'      => __( 'Kaart', 'aklokaal' ),
		'ak_toepassing' => __( 'Interactief', 'aklokaal' ),
		'page'          => __( 'Pagina', 'aklokaal' ),
	);
	$out    = array();
	foreach ( $query->posts as $p ) {
		$context = $labels[ $p->post_type ];
		$url     = get_permalink( $p );
		$title   = get_the_title( $p );
		if ( 'ak_paragraaf' === $p->post_type ) {
			$chapter = get_post( $p->post_parent );
			if ( ! $chapter || 'publish' !== $chapter->post_status ) {
				continue;
			}
			$num     = aklokaal_paragraph_number( $p );
			$title   = '§' . $num . ' ' . $title;
			$jaar    = aklokaal_first_term( $chapter->ID, 'ak_leerjaar' );
			$context .= ' · ' . ( $jaar ? $jaar->name . ', ' : '' ) . get_the_title( $chapter );
			$url     = get_permalink( $chapter ) . '#' . aklokaal_paragraph_anchor( $num );
		} elseif ( 'ak_hoofdstuk' === $p->post_type ) {
			$jaar     = aklokaal_first_term( $p->ID, 'ak_leerjaar' );
			$context .= $jaar ? ' · ' . $jaar->name : '';
		} elseif ( 'ak_nieuws' === $p->post_type ) {
			$context .= ' · ' . get_post_meta( $p->ID, 'ak_publisher', true );
		}
		$out[] = array(
			't'    => html_entity_decode( $title, ENT_QUOTES, 'UTF-8' ),
			's'    => $context,
			'href' => $url,
		);
	}
	return rest_ensure_response( $out );
}
