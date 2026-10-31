<?php
/**
 * Eén nieuwsbundel: inleiding, onderzoeksvragen en de artikelen in de gekozen volgorde.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$items     = aklokaal_get_placed( get_the_ID() );
	$questions = array_filter( array_map( 'trim', explode( "\n", (string) get_post_meta( get_the_ID(), 'ak_questions', true ) ) ) );
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => get_the_title(), 'lead' => get_the_excerpt() ) ); ?>
	<div class="about">
		<aside class="about__aside"><?php if ( has_post_thumbnail() ) { the_post_thumbnail( 'ak-card', array( 'alt' => '' ) ); } ?></aside>
		<div class="prose" data-reveal>
			<?php the_content(); ?>
			<?php if ( $questions ) : ?>
				<h2><?php esc_html_e( 'Onderzoeksvragen', 'aklokaal' ); ?></h2>
				<ol><?php foreach ( $questions as $q ) : ?><li><?php echo esc_html( $q ); ?></li><?php endforeach; ?></ol>
			<?php endif; ?>
		</div>
	</div>
	<div data-filter-group=".card-grid .news-card">
		<?php get_template_part( 'template-parts/theme-filter', null, array( 'posts' => wp_list_pluck( $items, 'post' ) ) ); ?>
		<div class="card-grid" data-reveal>
			<?php
			foreach ( $items as $it ) {
				echo 'ak_nieuws' === $it['post']->post_type ? aktheme_news_card( $it['post'], 'h2' ) : ''; // phpcs:ignore
			}
			?>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
