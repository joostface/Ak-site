<?php
/**
 * Eén interactieve toepassing in een afgeschermd venster (sandbox).
 * De toepassing zelf staat bij voorkeur op een apart subdomein, zie docs/interactief.md.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$url    = get_post_meta( get_the_ID(), 'ak_app_url', true );
	$height = (int) get_post_meta( get_the_ID(), 'ak_height', true );
	// Meegeleverde toepassing met een ingebouwde versie: direct in de pagina, in de stijl van de site.
	$ingebouwd = function_exists( 'aklokaal_app_integrated' ) ? aklokaal_app_integrated( get_the_ID() ) : '';
	if ( $ingebouwd ) :
		?>
<main id="main" class="app-page">
		<?php echo $ingebouwd; // phpcs:ignore WordPress.Security.EscapeOutput -- eigen sjabloon uit de plugin, ge-escaped waar nodig ?>
		<?php if ( trim( get_the_content() ) || aktheme_placed_in( get_the_ID(), '' ) ) : ?>
			<div class="wrap app-page__meta"><div class="prose"><?php echo aktheme_placed_in( get_the_ID(), __( 'Gebruikt in de lessen', 'aklokaal' ) ); // phpcs:ignore ?></div></div>
		<?php endif; ?>
</main>
		<?php
		continue;
	endif;
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => get_the_title(), 'lead' => get_the_excerpt() ) ); ?>
	<div class="wrap" style="margin-top: clamp(40px, 5vw, 72px)">
		<?php if ( $url ) : ?>
			<div class="map-viewer map-viewer--app" data-map-viewer>
				<div class="map-viewer__bar">
					<a class="button button--quiet button--small" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open in nieuw venster', 'aklokaal' ); ?></a>
					<button class="button button--small" type="button" data-map-full><?php echo aktheme_icon( 'expand' ); // phpcs:ignore ?><?php esc_html_e( 'Schermvullend', 'aklokaal' ); ?></button>
				</div>
				<iframe class="map-viewer__app" title="<?php the_title_attribute(); ?>" src="<?php echo esc_url( $url ); ?>" sandbox="<?php echo esc_attr( aktheme_sandbox( $url ) ); ?>" allow="fullscreen" referrerpolicy="no-referrer" style="height:<?php echo (int) ( $height ? $height : 640 ); ?>px"></iframe>
			</div>
		<?php endif; ?>
		<div class="map-info"><div class="prose"><?php the_content(); ?><?php echo aktheme_placed_in( get_the_ID(), __( 'Gebruikt in de lessen', 'aklokaal' ) ); // phpcs:ignore ?></div></div>
	</div>
</main>
	<?php
endwhile;
wp_enqueue_script( 'aklokaal-map', get_template_directory_uri() . '/assets/js/map-viewer.js', array(), AKTHEME_VERSION, true );
get_footer();
