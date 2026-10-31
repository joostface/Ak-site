<?php
/**
 * Optioneel: automatische PDF-voorvertoning van PowerPoint- en Word-bestanden.
 *
 * Werkt alleen als er een conversiedienst draait. Wij gebruiken Gotenberg
 * (open source, LibreOffice in een container; zie docker-compose.yml, profiel
 * "conversie"). Zet in wp-config.php of als omgevingsvariabele:
 *
 *   AKLOKAAL_CONVERTER_URL=http://converter:3000
 *
 * Zonder die instelling gebeurt er niets en werkt de website gewoon:
 * bezoekers kunnen het originele bestand dan alleen downloaden.
 */

defined( 'ABSPATH' ) || exit;

function aklokaal_converter_url() {
	$url = defined( 'AKLOKAAL_CONVERTER_URL' ) ? AKLOKAAL_CONVERTER_URL : getenv( 'AKLOKAAL_CONVERTER_URL' );
	return $url ? untrailingslashit( $url ) : '';
}

/** Na het aanmaken of vervangen: conversie inplannen (op de achtergrond). */
add_action(
	'aklokaal_material_created',
	function ( $material_id ) {
		aklokaal_maybe_schedule_conversion( $material_id );
	}
);
add_action(
	'aklokaal_attachment_replaced',
	function ( $attachment_id ) {
		$material = (int) wp_get_post_parent_id( $attachment_id );
		if ( $material ) {
			aklokaal_maybe_schedule_conversion( $material );
		}
	}
);

function aklokaal_maybe_schedule_conversion( $material_id ) {
	if ( ! aklokaal_converter_url() ) {
		return;
	}
	$type = get_post_meta( $material_id, 'ak_type', true );
	if ( in_array( $type, array( 'presentatie', 'document' ), true ) && get_post_meta( $material_id, 'ak_attachment_id', true ) ) {
		wp_schedule_single_event( time() + 5, 'aklokaal_convert_to_pdf', array( (int) $material_id ) );
	}
}

add_action( 'aklokaal_convert_to_pdf', 'aklokaal_convert_to_pdf' );

/**
 * Stuur het bestand naar de conversiedienst en bewaar de PDF als aparte bijlage.
 */
function aklokaal_convert_to_pdf( $material_id ) {
	$base = aklokaal_converter_url();
	$att  = (int) get_post_meta( $material_id, 'ak_attachment_id', true );
	$path = $att ? get_attached_file( $att ) : '';
	if ( ! $base || ! $path || ! is_readable( $path ) ) {
		return;
	}
	$boundary = wp_generate_password( 24, false );
	$body     = '--' . $boundary . "\r\n"
		. 'Content-Disposition: form-data; name="files"; filename="' . basename( $path ) . "\"\r\n"
		. "Content-Type: application/octet-stream\r\n\r\n"
		. file_get_contents( $path ) . "\r\n" // phpcs:ignore WordPress.WP.AlternativeFunctions
		. '--' . $boundary . "--\r\n";

	$res = wp_remote_post(
		$base . '/forms/libreoffice/convert',
		array(
			'timeout' => 120,
			'headers' => array( 'Content-Type' => 'multipart/form-data; boundary=' . $boundary ),
			'body'    => $body,
		)
	);
	if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
		update_post_meta( $material_id, 'ak_conversion_error', is_wp_error( $res ) ? $res->get_error_message() : wp_remote_retrieve_response_code( $res ) );
		return;
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$tmp = wp_tempnam( 'aklokaal-preview' );
	file_put_contents( $tmp, wp_remote_retrieve_body( $res ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions

	$old_preview = (int) get_post_meta( $material_id, 'ak_preview_id', true );
	$pdf_id      = media_handle_sideload(
		array(
			'name'     => pathinfo( $path, PATHINFO_FILENAME ) . '-voorvertoning.pdf',
			'tmp_name' => $tmp,
		),
		$material_id,
		get_the_title( $material_id ) . ' (voorvertoning)'
	);
	if ( is_wp_error( $pdf_id ) ) {
		update_post_meta( $material_id, 'ak_conversion_error', $pdf_id->get_error_message() );
		return;
	}
	update_post_meta( $material_id, 'ak_preview_id', $pdf_id );
	delete_post_meta( $material_id, 'ak_conversion_error' );
	if ( $old_preview && $old_preview !== $pdf_id ) {
		wp_delete_attachment( $old_preview, true );
	}
}
