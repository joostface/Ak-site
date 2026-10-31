<?php
/** Terugvaloptie voor alles zonder eigen sjabloon (berichten, thema-archieven). */
defined( 'ABSPATH' ) || exit;
get_header();
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => wp_strip_all_tags( get_the_archive_title() ? get_the_archive_title() : get_bloginfo( 'name' ) ), 'lead' => wp_strip_all_tags( (string) get_the_archive_description() ) ) ); ?>
	<div class="card-grid" data-reveal>
		<?php
		while ( have_posts() ) :
			the_post();
			if ( 'ak_nieuws' === get_post_type() ) {
				echo aktheme_news_card( get_post(), 'h2' ); // phpcs:ignore
				continue;
			}
			?>
			<article class="news-card">
				<?php if ( has_post_thumbnail() ) : ?><div class="news-card__media"><?php the_post_thumbnail( 'ak-card', array( 'alt' => '' ) ); ?></div><?php endif; ?>
				<div class="news-card__body">
					<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
					<p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 30 ) ); ?></p>
				</div>
			</article>
		<?php endwhile; ?>
	</div>
</main>
<?php
get_footer();
