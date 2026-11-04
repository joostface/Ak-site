<?php
/**
 * Materiaalplaatsingen.
 *
 * Een plaatsing koppelt één item (materiaal, nieuws, kaart, toepassing of bundel)
 * aan een paragraaf of hoofdstuk, met een eigen positie en een eigen toelichting.
 * Het bestand zelf staat één keer in de mediabibliotheek; een item kan op veel
 * plekken geplaatst worden.
 *
 * Opslag (bewust zonder eigen databasetabel, zodat export/import en verhuizen
 * met standaard WordPress-gereedschap werkt):
 *   paragraaf/hoofdstuk  meta ak_items     = [ { id: 12, note: "Lees vóór de les" }, ... ]  (de volgorde)
 *   item                 meta ak_placed_in = paragraaf-id (meerdere waarden; omgekeerde index)
 */

defined( 'ABSPATH' ) || exit;

/** Containers waarin geplaatst kan worden. */
function aklokaal_container_types() {
	return array( 'ak_paragraaf', 'ak_hoofdstuk', 'ak_collectie' );
}

/**
 * Ruwe, opgeschoonde lijst plaatsingen van een container.
 *
 * @return array<int, array{id:int, note:string}>
 */
function aklokaal_get_items( $container_id ) {
	$raw = get_post_meta( (int) $container_id, 'ak_items', true );
	return aklokaal_sanitize_items( is_array( $raw ) ? $raw : array() );
}

function aklokaal_sanitize_items( $items ) {
	$clean = array();
	$seen  = array();
	foreach ( (array) $items as $item ) {
		if ( is_numeric( $item ) ) {
			$item = array( 'id' => (int) $item );
		}
		$id = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
		if ( ! $id || isset( $seen[ $id ] ) ) {
			continue;
		}
		$seen[ $id ] = true;
		$clean[]     = array(
			'id'   => $id,
			'note' => isset( $item['note'] ) ? sanitize_textarea_field( $item['note'] ) : '',
			// Weergave op deze plek: '' = automatisch (per soort), 'groot' of 'compact'.
			'view' => isset( $item['view'] ) && in_array( $item['view'], array( 'groot', 'compact' ), true ) ? $item['view'] : '',
		);
	}
	return $clean;
}

/**
 * Zet de volledige lijst van een container en werkt de omgekeerde index bij.
 */
function aklokaal_set_items( $container_id, $items ) {
	$container_id = (int) $container_id;
	$old          = wp_list_pluck( aklokaal_get_items( $container_id ), 'id' );
	$items        = aklokaal_sanitize_items( $items );
	$items        = array_values(
		array_filter(
			$items,
			function ( $it ) {
				$p = get_post( $it['id'] );
				return $p && in_array( $p->post_type, aklokaal_placeable_types(), true );
			}
		)
	);
	update_post_meta( $container_id, 'ak_items', $items );

	$new = wp_list_pluck( $items, 'id' );
	foreach ( array_diff( $old, $new ) as $removed ) {
		delete_post_meta( $removed, 'ak_placed_in', $container_id );
	}
	foreach ( array_diff( $new, $old ) as $added ) {
		add_post_meta( $added, 'ak_placed_in', $container_id );
	}
	do_action( 'aklokaal_items_changed', $container_id, $items );
	return $items;
}

/** Voeg één item toe op een positie (null = achteraan). */
function aklokaal_place_item( $item_id, $container_id, $position = null, $note = '' ) {
	$items = aklokaal_get_items( $container_id );
	foreach ( $items as $it ) {
		if ( (int) $it['id'] === (int) $item_id ) {
			return $items; // staat er al
		}
	}
	$entry = array(
		'id'   => (int) $item_id,
		'note' => $note,
	);
	if ( null === $position || $position >= count( $items ) ) {
		$items[] = $entry;
	} else {
		array_splice( $items, max( 0, (int) $position ), 0, array( $entry ) );
	}
	return aklokaal_set_items( $container_id, $items );
}

function aklokaal_unplace_item( $item_id, $container_id ) {
	$items = array_filter(
		aklokaal_get_items( $container_id ),
		function ( $it ) use ( $item_id ) {
			return (int) $it['id'] !== (int) $item_id;
		}
	);
	return aklokaal_set_items( $container_id, array_values( $items ) );
}

/** Verplaats items van de ene paragraaf naar de andere (toelichting gaat mee). */
function aklokaal_move_items( $item_ids, $from_id, $to_id ) {
	$item_ids = array_map( 'intval', (array) $item_ids );
	$from     = aklokaal_get_items( $from_id );
	$moving   = array_values(
		array_filter(
			$from,
			function ( $it ) use ( $item_ids ) {
				return in_array( (int) $it['id'], $item_ids, true );
			}
		)
	);
	aklokaal_set_items(
		$from_id,
		array_values(
			array_filter(
				$from,
				function ( $it ) use ( $item_ids ) {
					return ! in_array( (int) $it['id'], $item_ids, true );
				}
			)
		)
	);
	$to = aklokaal_get_items( $to_id );
	return aklokaal_set_items( $to_id, array_merge( $to, $moving ) );
}

/** Waar staat dit item? Geeft container-id's terug. */
function aklokaal_item_placements( $item_id ) {
	return array_map( 'intval', get_post_meta( (int) $item_id, 'ak_placed_in', false ) );
}

/**
 * Items van een container als posts, met hun toelichting.
 * Publiek: alleen gepubliceerde items.
 *
 * @return array<int, array{post:WP_Post, note:string}>
 */
function aklokaal_get_placed( $container_id, $include_drafts = false ) {
	$out = array();
	foreach ( aklokaal_get_items( $container_id ) as $it ) {
		$post = get_post( $it['id'] );
		if ( ! $post ) {
			continue;
		}
		if ( 'publish' !== $post->post_status && ! ( $include_drafts && 'draft' === $post->post_status ) ) {
			continue;
		}
		$out[] = array(
			'post' => $post,
			'note' => $it['note'],
			'view' => $it['view'] ?? '',
		);
	}
	return $out;
}

/** Verwijderd item: uit alle plaatsingen halen, zodat er geen gaten ontstaan. */
add_action(
	'before_delete_post',
	function ( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return;
		}
		if ( in_array( $post->post_type, aklokaal_placeable_types(), true ) ) {
			foreach ( aklokaal_item_placements( $post_id ) as $container ) {
				aklokaal_unplace_item( $post_id, $container );
			}
		}
		if ( in_array( $post->post_type, aklokaal_container_types(), true ) ) {
			foreach ( aklokaal_get_items( $post_id ) as $it ) {
				delete_post_meta( $it['id'], 'ak_placed_in', $post_id );
			}
		}
	},
	5
);
