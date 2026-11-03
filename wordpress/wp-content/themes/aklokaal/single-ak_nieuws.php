<?php
/**
 * Eén nieuwsitem.
 * - Geïmporteerd artikel: de kaart met bronvermelding en de eigen samenvatting; het artikel staat bij de uitgever.
 * - Eigen bericht (geen bronlink): het volledige bericht in de stijl van de site.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$aktheme_own = aktheme_news_is_own( get_post() );
	?>
<main id="main">
	<?php if ( $aktheme_own ) : ?>
		<?php
		get_template_part( 'template-parts/page-title', null, array( 'title' => get_the_title(), 'lead' => has_excerpt() ? get_the_excerpt() : '' ) );
		$aktheme_pub    = get_post_meta( get_the_ID(), 'ak_publisher', true );
		$aktheme_author = get_post_meta( get_the_ID(), 'ak_author', true );
		$aktheme_date   = get_post_meta( get_the_ID(), 'ak_published', true );
		$aktheme_themes = get_the_terms( get_the_ID(), 'ak_thema' );
		?>
		<article class="about news-own">
			<div class="about__aside">
				<p class="news-card__source">
					<strong><?php echo esc_html( $aktheme_pub ? $aktheme_pub : get_bloginfo( 'name' ) ); ?></strong>
					<?php if ( $aktheme_author ) : ?><span><?php echo esc_html( $aktheme_author ); ?></span><?php endif; ?>
					<span><?php echo esc_html( aktheme_date( $aktheme_date ? $aktheme_date : get_the_date( 'Y-m-d' ) ) ); ?></span>
				</p>
				<?php if ( $aktheme_themes && ! is_wp_error( $aktheme_themes ) ) : ?>
					<ul class="tags"><?php foreach ( $aktheme_themes as $t ) : ?><li class="tag"><?php echo esc_html( $t->name ); ?></li><?php endforeach; ?></ul>
				<?php endif; ?>
				<p><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_nieuws' ) ); ?>"><?php esc_html_e( 'Al het nieuws', 'aklokaal' ); ?></a></p>
			</div>
			<div class="prose">
				<?php if ( has_post_thumbnail() ) : ?>
					<figure class="news-own__image"><?php the_post_thumbnail( 'large', array( 'alt' => '' ) ); ?><?php if ( get_the_post_thumbnail_caption() ) : ?><figcaption><?php the_post_thumbnail_caption(); ?></figcaption><?php endif; ?></figure>
				<?php endif; ?>
				<?php the_content(); ?>
				<?php if ( get_post_meta( get_the_ID(), 'ak_question', true ) ) : ?>
					<p class="muted"><em><?php echo esc_html( get_post_meta( get_the_ID(), 'ak_question', true ) ); ?></em></p>
				<?php endif; ?>
				<?php echo aktheme_placed_in( get_the_ID(), __( 'Hoort bij', 'aklokaal' ) ); // phpcs:ignore -- ge-escaped in de functie ?>
			</div>
		</article>
	<?php else : ?>
		<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Nieuws', 'aklokaal' ), 'lead' => '' ) ); ?>
		<div class="about">
			<div class="about__aside"></div>
			<div class="prose" style="grid-column: 5 / 12">
				<?php echo aktheme_news_card( get_post(), 'h2' ); // phpcs:ignore ?>
				<?php if ( trim( get_the_content() ) ) : ?><h2><?php esc_html_e( 'Samenvatting', 'aklokaal' ); ?></h2><?php the_content(); ?><?php endif; ?>
				<?php echo aktheme_placed_in( get_the_ID(), __( 'Hoort bij', 'aklokaal' ) ); // phpcs:ignore -- ge-escaped in de functie ?>
			</div>
		</div>
	<?php endif; ?>
</main>
	<?php
endwhile;
get_footer();
