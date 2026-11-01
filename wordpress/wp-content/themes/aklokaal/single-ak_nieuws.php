<?php
/**
 * Eén nieuwsartikel: de kaart, de eigen samenvatting en waar het in de lessen terugkomt.
 * Het artikel zelf staat bij de uitgever.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Nieuws', 'aklokaal' ), 'lead' => '' ) ); ?>
	<div class="about">
		<div class="about__aside"></div>
		<div class="prose" style="grid-column: 5 / 12">
			<?php echo aktheme_news_card( get_post(), 'h2' ); // phpcs:ignore ?>
			<?php if ( trim( get_the_content() ) ) : ?><h2><?php esc_html_e( 'Samenvatting', 'aklokaal' ); ?></h2><?php the_content(); ?><?php endif; ?>
			<?php echo aktheme_placed_in( get_the_ID(), __( 'Hoort bij', 'aklokaal' ) ); // phpcs:ignore -- ge-escaped in de functie ?>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
