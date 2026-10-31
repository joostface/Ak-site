<?php
/** Kaartenbibliotheek met filters op thema. */
defined( 'ABSPATH' ) || exit;
get_header();
global $wp_query;
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Kaarten', 'aklokaal' ), 'lead' => __( 'Kaarten om in de les te bekijken en thuis zelf te verkennen. Open een kaart om in te zoomen, lagen aan te zetten of hem schermvullend te tonen op het digibord.', 'aklokaal' ) ) ); ?>
	<div data-filter-group=".map-list .map-item">
		<?php get_template_part( 'template-parts/theme-filter', null, array( 'posts' => $wp_query->posts ) ); ?>
		<div class="map-list" data-reveal>
			<?php foreach ( $wp_query->posts as $m ) : $t = get_the_terms( $m, 'ak_thema' ); ?>
				<a class="map-item" href="<?php echo esc_url( get_permalink( $m ) ); ?>" data-tags="<?php echo esc_attr( $t && ! is_wp_error( $t ) ? implode( ',', wp_list_pluck( $t, 'name' ) ) : '' ); ?>">
					<div class="map-item__media"><?php echo get_the_post_thumbnail( $m, 'ak-wide', array( 'loading' => 'lazy', 'alt' => '' ) ); ?></div>
					<div class="map-item__body"><h2><?php echo esc_html( get_the_title( $m ) ); ?></h2><?php if ( $m->post_excerpt ) : ?><p><?php echo esc_html( $m->post_excerpt ); ?></p><?php endif; ?></div>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</main>
<?php
get_footer();
