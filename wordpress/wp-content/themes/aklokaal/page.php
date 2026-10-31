<?php
/** Gewone pagina (bijvoorbeeld "Over deze website"). */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => get_the_title(), 'lead' => has_excerpt() ? get_the_excerpt() : '' ) ); ?>
	<div class="about">
		<aside class="about__aside" data-reveal><?php if ( has_post_thumbnail() ) { the_post_thumbnail( 'ak-card', array( 'alt' => '' ) ); } ?></aside>
		<div class="prose" data-reveal><?php the_content(); ?></div>
	</div>
</main>
	<?php
endwhile;
get_footer();
