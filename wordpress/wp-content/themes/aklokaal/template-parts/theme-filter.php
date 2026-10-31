<?php
/**
 * Filterknoppen op thema. Werkt zonder herladen (app.js, data-filter-group).
 *
 * @var array $args posts (WP_Post[])
 */
defined( 'ABSPATH' ) || exit;
$aktheme_names = array();
foreach ( $args['posts'] as $p ) {
	$t = get_the_terms( $p, 'ak_thema' );
	if ( $t && ! is_wp_error( $t ) ) {
		foreach ( $t as $term ) {
			$aktheme_names[ $term->name ] = true;
		}
	}
}
ksort( $aktheme_names );
if ( count( $aktheme_names ) < 2 ) {
	return;
}
?>
<div class="filters" role="group" aria-label="<?php esc_attr_e( 'Filter op thema', 'aklokaal' ); ?>">
	<button class="chip" type="button" data-filter="alles" aria-pressed="true"><?php esc_html_e( 'Alles', 'aklokaal' ); ?></button>
	<?php foreach ( array_keys( $aktheme_names ) as $n ) : ?>
		<button class="chip" type="button" data-filter="<?php echo esc_attr( $n ); ?>" aria-pressed="false"><?php echo esc_html( $n ); ?></button>
	<?php endforeach; ?>
</div>
