<?php
/**
 * Pagina "Wereldatlas" (adres /atlas/): de atlas over de volle breedte, direct onder de kop.
 * De atlas zelf komt uit de plugin via de shortcode [wereldatlas] in de pagina-inhoud.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
<main id="main" class="atlas-page">
	<h1 class="visually-hidden"><?php the_title(); ?></h1>
	<div class="ak-atlas"><?php the_content(); ?></div>
</main>
	<?php
endwhile;
get_footer();
