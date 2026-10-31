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
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => get_the_title(), 'lead' => get_the_excerpt() ) ); ?>
	<div class="wrap" style="margin-top: clamp(40px, 5vw, 72px)">
		<?php if ( $url ) : ?>
			<div class="map-viewer" data-map-viewer>
				<div class="map-viewer__bar">
					<a class="button button--quiet button--small" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open in nieuw venster', 'aklokaal' ); ?></a>
					<button class="button button--small" type="button" data-map-full><?php echo aktheme_icon( 'expand' ); // phpcs:ignore ?><?php esc_html_e( 'Schermvullend', 'aklokaal' ); ?></button>
				</div>
				<iframe class="map-viewer__app" title="<?php the_title_attribute(); ?>" src="<?php echo esc_url( $url ); ?>" sandbox="<?php echo esc_attr( aktheme_sandbox( $url ) ); ?>" allow="fullscreen" referrerpolicy="no-referrer" style="height:<?php echo (int) ( $height ? $height : 640 ); ?>px"></iframe>
			</div>
		<?php endif; ?>
		<div class="map-info"><div class="prose"><?php the_content(); ?></div></div>
	</div>
</main>
	<?php
endwhile;
wp_enqueue_script( 'aklokaal-map', get_template_directory_uri() . '/assets/js/map-viewer.js', array(), AKTHEME_VERSION, true );
get_footer();
