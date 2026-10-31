<?php
/**
 * Veilige uploads: alleen toegestane bestandstypen, server-side gecontroleerd,
 * opgeslagen in de gewone WordPress-mediabibliotheek.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Toegestane extensies met MIME-type en het materiaaltype dat erbij hoort.
 * SVG staat er bewust niet in: SVG kan scripts bevatten. Wil je SVG toestaan,
 * gebruik dan een sanitizer en voeg het via het filter toe.
 */
function aklokaal_allowed_files() {
	return apply_filters(
		'aklokaal_allowed_files',
		array(
			'pptx' => array( 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'presentatie' ),
			'ppt'  => array( 'application/vnd.ms-powerpoint', 'presentatie' ),
			'odp'  => array( 'application/vnd.oasis.opendocument.presentation', 'presentatie' ),
			'pdf'  => array( 'application/pdf', 'pdf' ),
			'docx' => array( 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document' ),
			'doc'  => array( 'application/msword', 'document' ),
			'odt'  => array( 'application/vnd.oasis.opendocument.text', 'document' ),
			'xlsx' => array( 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'bestand' ),
			'jpg'  => array( 'image/jpeg', 'afbeelding' ),
			'jpeg' => array( 'image/jpeg', 'afbeelding' ),
			'png'  => array( 'image/png', 'afbeelding' ),
			'webp' => array( 'image/webp', 'afbeelding' ),
			'gif'  => array( 'image/gif', 'afbeelding' ),
			'zip'  => array( 'application/zip', 'bestand' ),
		)
	);
}

/** Maximale grootte per bestand (standaard 200 MB, en nooit meer dan de server toestaat). */
function aklokaal_max_upload_bytes() {
	return (int) min( apply_filters( 'aklokaal_max_upload_bytes', 200 * MB_IN_BYTES ), wp_max_upload_size() );
}

/** Office-bestanden worden door WordPress soms niet herkend; deze typen toestaan voor beheerders. */
add_filter(
	'upload_mimes',
	function ( $mimes ) {
		if ( ! aklokaal_can_manage() ) {
			return $mimes;
		}
		foreach ( aklokaal_allowed_files() as $ext => $info ) {
			$mimes[ $ext ] = $info[0];
		}
		return $mimes;
	}
);

/** Materiaaltype bij een bestandsnaam. */
function aklokaal_type_for_filename( $filename ) {
	$ext     = strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );
	$allowed = aklokaal_allowed_files();
	return isset( $allowed[ $ext ] ) ? $allowed[ $ext ][1] : 'bestand';
}

/** Titelvoorstel uit een bestandsnaam: "H2_energie-bronnen v3.pptx" → "H2 energie bronnen v3". */
function aklokaal_title_from_filename( $filename ) {
	$t = pathinfo( $filename, PATHINFO_FILENAME );
	$t = preg_replace( '/[_\-.]+/', ' ', $t );
	$t = trim( preg_replace( '/\s+/', ' ', $t ) );
	return $t ? mb_strtoupper( mb_substr( $t, 0, 1 ) ) . mb_substr( $t, 1 ) : __( 'Naamloos bestand', 'aklokaal' );
}

/**
 * Controleer een bestand uit $_FILES voordat het verwerkt wordt.
 *
 * @return true|WP_Error
 */
function aklokaal_validate_upload( $file ) {
	if ( empty( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Er is geen bestand ontvangen.', 'aklokaal' ) );
	}
	if ( ! empty( $file['error'] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Het uploaden is mislukt. Probeer het opnieuw.', 'aklokaal' ) );
	}
	if ( (int) $file['size'] > aklokaal_max_upload_bytes() ) {
		/* translators: %s: maximale grootte */
		return new WP_Error( 'aklokaal_upload', sprintf( __( 'Dit bestand is te groot. De grens is %s.', 'aklokaal' ), aklokaal_filesize( aklokaal_max_upload_bytes() ) ) );
	}
	$ext     = strtolower( pathinfo( $file['name'], PATHINFO_EXTENSION ) );
	$allowed = aklokaal_allowed_files();
	if ( ! isset( $allowed[ $ext ] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Dit bestandstype is niet toegestaan.', 'aklokaal' ) );
	}
	// Controleer de echte inhoud, niet alleen de extensie.
	$check = wp_check_filetype_and_ext( $file['tmp_name'], $file['name'], array( $ext => $allowed[ $ext ][0] ) );
	if ( empty( $check['ext'] ) || empty( $check['type'] ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'De inhoud van dit bestand past niet bij de extensie.', 'aklokaal' ) );
	}
	return true;
}

/**
 * Zet een geüpload bestand in de mediabibliotheek.
 *
 * @return int|WP_Error attachment-id
 */
function aklokaal_store_upload( $file, $title = '' ) {
	$valid = aklokaal_validate_upload( $file );
	if ( is_wp_error( $valid ) ) {
		return $valid;
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$id = media_handle_sideload(
		array(
			'name'     => sanitize_file_name( $file['name'] ),
			'tmp_name' => $file['tmp_name'],
			'size'     => $file['size'],
			'error'    => 0,
		),
		0,
		$title ? $title : aklokaal_title_from_filename( $file['name'] ),
		array( 'test_form' => false )
	);
	return $id;
}

/**
 * Vervang het bestand achter een bijlage, met behoud van het bijlage-id.
 * Alle plaatsingen verwijzen naar het id, dus niets op de website breekt.
 *
 * @return int|WP_Error
 */
function aklokaal_replace_attachment_file( $attachment_id, $file ) {
	$attachment_id = (int) $attachment_id;
	if ( 'attachment' !== get_post_type( $attachment_id ) ) {
		return new WP_Error( 'aklokaal_upload', __( 'Onbekende bijlage.', 'aklokaal' ) );
	}
	$valid = aklokaal_validate_upload( $file );
	if ( is_wp_error( $valid ) ) {
		return $valid;
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$moved = wp_handle_upload(
		$file,
		array(
			'test_form' => false,
			'mimes'     => array_combine( array_keys( aklokaal_allowed_files() ), array_column( aklokaal_allowed_files(), 0 ) ),
		)
	);
	if ( isset( $moved['error'] ) ) {
		return new WP_Error( 'aklokaal_upload', $moved['error'] );
	}
	$old = get_attached_file( $attachment_id );
	update_attached_file( $attachment_id, $moved['file'] );
	wp_update_post(
		array(
			'ID'             => $attachment_id,
			'post_mime_type' => $moved['type'],
		)
	);
	wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $moved['file'] ) );
	if ( $old && $old !== $moved['file'] && file_exists( $old ) ) {
		wp_delete_file( $old );
	}
	do_action( 'aklokaal_attachment_replaced', $attachment_id );
	return $attachment_id;
}

/**
 * Maak een materiaalitem rond een bijlage of een URL.
 *
 * @param array $args title, type, attachment_id, url, description, status, themes (array).
 * @return int|WP_Error
 */
function aklokaal_create_material( $args ) {
	$args  = wp_parse_args(
		$args,
		array(
			'title'         => '',
			'type'          => 'bestand',
			'attachment_id' => 0,
			'url'           => '',
			'description'   => '',
			'status'        => 'publish',
			'themes'        => array(),
		)
	);
	$types = aklokaal_material_types();
	$type  = isset( $types[ $args['type'] ] ) ? $args['type'] : 'bestand';

	$id = wp_insert_post(
		array(
			'post_type'    => 'ak_materiaal',
			'post_title'   => sanitize_text_field( $args['title'] ),
			'post_content' => wp_kses_post( $args['description'] ),
			'post_status'  => in_array( $args['status'], array( 'publish', 'draft' ), true ) ? $args['status'] : 'draft',
		),
		true
	);
	if ( is_wp_error( $id ) ) {
		return $id;
	}
	update_post_meta( $id, 'ak_type', $type );
	if ( $args['attachment_id'] ) {
		update_post_meta( $id, 'ak_attachment_id', (int) $args['attachment_id'] );
		wp_update_post(
			array(
				'ID'          => (int) $args['attachment_id'],
				'post_parent' => $id,
			)
		);
		if ( 'afbeelding' === $type ) {
			set_post_thumbnail( $id, (int) $args['attachment_id'] );
		}
	}
	if ( $args['url'] ) {
		update_post_meta( $id, 'ak_url', esc_url_raw( $args['url'] ) );
	}
	if ( $args['themes'] ) {
		wp_set_post_terms( $id, array_map( 'sanitize_text_field', (array) $args['themes'] ), 'ak_thema' );
	}
	do_action( 'aklokaal_material_created', $id, $args );
	return $id;
}

/** Herken het type van een geplakte link. */
function aklokaal_type_for_url( $url ) {
	$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );
	if ( preg_match( '/(youtube\.com|youtu\.be|vimeo\.com|schooltv\.nl|npostart\.nl|ntr\.nl)$/', $host ) ) {
		return 'video';
	}
	if ( preg_match( '/\.pdf($|\?)/i', $url ) ) {
		return 'pdf';
	}
	return 'weblink';
}

/**
 * Video-URL omzetten naar een privacyvriendelijke insluit-URL (alleen bekende diensten).
 */
function aklokaal_video_embed_url( $url ) {
	if ( preg_match( '~(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{6,})~', $url, $m ) ) {
		return 'https://www.youtube-nocookie.com/embed/' . $m[1];
	}
	if ( preg_match( '~vimeo\.com/(?:video/)?(\d+)~', $url, $m ) ) {
		return 'https://player.vimeo.com/video/' . $m[1] . '?dnt=1';
	}
	return '';
}
