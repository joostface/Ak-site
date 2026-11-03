<?php
/**
 * Eén kaart, groot. Afbeeldingskaarten: inzoomen, verschuiven, schermvullend.
 * Interactieve kaarten (eigen HTML/JS, bijvoorbeeld MapLibre) draaien in een
 * afgeschermd venster, bij voorkeur vanaf een apart subdomein.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$kind   = get_post_meta( get_the_ID(), 'ak_kind', true );
	$att    = (int) get_post_meta( get_the_ID(), 'ak_attachment_id', true );
	$att    = $att ? $att : (int) get_post_thumbnail_id();
	$app    = aktheme_map_app_url( get_the_ID() );
	$kind   = $app ? 'interactief' : 'afbeelding';
	$legend = array_filter( array_map( 'trim', explode( "\n", (string) get_post_meta( get_the_ID(), 'ak_legend', true ) ) ) );
	$source = get_post_meta( get_the_ID(), 'ak_source', true );
	?>
<main id="main">
	<div class="wrap map-page">
		<?php echo aktheme_map_switcher( get_the_ID() ); // phpcs:ignore -- ge-escaped in de functie ?>
		<header class="map-head">
			<p class="map-head__crumb"><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_kaart' ) ); ?>"><?php esc_html_e( 'Kaarten', 'aklokaal' ); ?></a></p>
			<h1><?php the_title(); ?></h1>
			<?php if ( has_excerpt() ) : ?><p class="map-head__lead"><?php echo esc_html( get_the_excerpt() ); ?></p><?php endif; ?>
		</header>
		<div class="map-viewer<?php echo $app ? ' map-viewer--app' : ''; ?>" data-map-viewer>
			<div class="map-viewer__bar">
				<?php if ( 'interactief' !== $kind ) : ?>
					<button class="icon-button" type="button" data-map-zoom="in" aria-label="<?php esc_attr_e( 'Inzoomen', 'aklokaal' ); ?>"><?php echo aktheme_icon( 'plus' ); // phpcs:ignore ?></button>
					<button class="icon-button" type="button" data-map-zoom="out" aria-label="<?php esc_attr_e( 'Uitzoomen', 'aklokaal' ); ?>"><?php echo aktheme_icon( 'minus' ); // phpcs:ignore ?></button>
					<button class="button button--quiet button--small" type="button" data-map-zoom="reset"><?php esc_html_e( 'Passend', 'aklokaal' ); ?></button>
				<?php endif; ?>
				<?php if ( $app ) : ?>
					<a class="button button--quiet button--small" href="<?php echo esc_url( $app ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open in nieuw tabblad', 'aklokaal' ); ?></a>
				<?php endif; ?>
				<button class="button button--small" type="button" data-map-full><?php echo aktheme_icon( 'expand' ); // phpcs:ignore ?><?php esc_html_e( 'Schermvullend', 'aklokaal' ); ?></button>
			</div>
			<?php if ( 'interactief' === $kind && $app ) : ?>
				<iframe class="map-viewer__app" title="<?php the_title_attribute(); ?>" src="<?php echo esc_url( $app ); ?>" sandbox="<?php echo esc_attr( aktheme_sandbox( $app ) ); ?>" allow="fullscreen" referrerpolicy="no-referrer"></iframe>
			<?php elseif ( $att ) : ?>
				<div class="map-viewer__stage" data-map-stage tabindex="0" aria-label="<?php esc_attr_e( 'Kaart. Gebruik plus en min om te zoomen en de pijltjestoetsen om te verschuiven.', 'aklokaal' ); ?>">
					<?php echo wp_get_attachment_image( $att, 'full', false, array( 'data-map-img' => '', 'alt' => get_post_meta( $att, '_wp_attachment_image_alt', true ) ? get_post_meta( $att, '_wp_attachment_image_alt', true ) : get_the_title(), 'draggable' => 'false' ) ); ?>
				</div>
			<?php endif; ?>
		</div>
		<div class="map-info">
			<?php if ( $legend ) : ?>
				<div class="map-info__legend">
					<h2><?php esc_html_e( 'Legenda', 'aklokaal' ); ?></h2>
					<ul class="map-legend"><?php foreach ( $legend as $l ) : ?><li><?php echo esc_html( $l ); ?></li><?php endforeach; ?></ul>
				</div>
			<?php endif; ?>
			<div class="prose">
				<?php the_content(); ?>
				<?php echo aktheme_placed_in( get_the_ID(), __( 'Gebruikt in de lessen', 'aklokaal' ) ); // phpcs:ignore ?>
				<?php if ( $source ) : ?><p class="muted"><?php echo esc_html( sprintf( __( 'Bron: %s', 'aklokaal' ), $source ) ); ?></p><?php endif; ?>
			</div>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
