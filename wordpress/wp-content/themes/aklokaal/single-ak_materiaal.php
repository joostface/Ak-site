<?php
/**
 * Eén materiaalitem, met een eigen deelbare link en de plekken waar het staat.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => get_the_title(), 'lead' => '' ) ); ?>
	<div class="chapter">
		<div class="toc"></div>
		<div class="chapter__content">
			<div class="blocks"><?php aktheme_render_item( get_post() ); ?></div>
			<div class="prose" style="margin-top:48px"><?php echo aktheme_placed_in( get_the_ID(), __( 'Staat in', 'aklokaal' ) ); // phpcs:ignore ?></div>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
