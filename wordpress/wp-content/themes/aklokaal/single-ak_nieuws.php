<?php
/**
 * Eén nieuwsartikel op de eigen site: bronregel, eigen samenvatting, eventueel een kort citaat
 * (citaatrecht: kort, met bronvermelding), de geografische vraag, waar het in de lessen terugkomt,
 * en een duidelijke link naar het volledige artikel bij de uitgever.
 * Het volledige artikel wordt bewust niet overgenomen (auteursrecht).
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$id        = get_the_ID();
	$url       = get_post_meta( $id, 'ak_url', true );
	$publisher = get_post_meta( $id, 'ak_publisher', true );
	$author    = get_post_meta( $id, 'ak_author', true );
	$date      = get_post_meta( $id, 'ak_published', true );
	$quote     = get_post_meta( $id, 'ak_quote', true );
	$question  = get_post_meta( $id, 'ak_question', true );
	$themes    = get_the_terms( $id, 'ak_thema' );
	$img       = has_post_thumbnail() ? get_the_post_thumbnail( null, 'ak-hero', array( 'alt' => '' ) ) : '';
	if ( ! $img && get_post_meta( $id, 'ak_show_image', true ) && get_post_meta( $id, 'ak_image_url', true ) ) {
		$img = sprintf( '<img src="%s" alt="" referrerpolicy="no-referrer">', esc_url( get_post_meta( $id, 'ak_image_url', true ) ) );
	}
	$bron = $publisher ? $publisher : __( 'de bron', 'aklokaal' );
	?>
<main id="main" class="nieuws-artikel">
	<header class="page-title">
		<div class="page-title__inner">
			<p class="nieuws-artikel__bron">
				<strong><?php echo esc_html( $bron ); ?></strong>
				<?php if ( $author ) : ?><span><?php echo esc_html( $author ); ?></span><?php endif; ?>
				<?php if ( $date ) : ?><span><?php echo esc_html( aktheme_date( $date ) ); ?></span><?php endif; ?>
			</p>
			<h1 class="nieuws-artikel__titel"><?php the_title(); ?></h1>
			<?php if ( has_excerpt() ) : ?><p><?php echo esc_html( get_the_excerpt() ); ?></p><?php endif; ?>
			<ol class="breadcrumb" aria-label="<?php esc_attr_e( 'Kruimelpad', 'aklokaal' ); ?>">
				<li><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_nieuws' ) ); ?>"><?php esc_html_e( 'Nieuws', 'aklokaal' ); ?></a></li>
				<?php if ( $themes && ! is_wp_error( $themes ) ) : ?><li><?php echo esc_html( implode( ', ', wp_list_pluck( $themes, 'name' ) ) ); ?></li><?php endif; ?>
			</ol>
		</div>
	</header>

	<?php if ( $img ) : ?>
		<div class="masthead" style="margin-top: clamp(40px, 5vw, 72px)"><?php echo $img; // phpcs:ignore WordPress.Security.EscapeOutput -- gebouwd met esc_url of WordPress-functie ?></div>
	<?php endif; ?>

	<div class="about">
		<aside class="about__aside">
			<?php if ( $url ) : ?>
				<a class="button" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php echo esc_html( sprintf( /* translators: %s: uitgever */ __( 'Lees het artikel bij %s', 'aklokaal' ), $bron ) ); ?> <?php echo aktheme_icon( 'arrow' ); // phpcs:ignore ?></a>
			<?php endif; ?>
		</aside>
		<div class="prose" data-reveal>
			<?php if ( trim( get_the_content() ) ) : ?>
				<h2><?php esc_html_e( 'Waar gaat het over?', 'aklokaal' ); ?></h2>
				<?php the_content(); ?>
			<?php endif; ?>
			<?php if ( $quote ) : ?>
				<blockquote class="nieuws-artikel__citaat">
					<p><?php echo esc_html( $quote ); ?></p>
					<footer><?php echo esc_html( sprintf( /* translators: %s: uitgever */ __( 'Citaat uit het artikel van %s', 'aklokaal' ), $bron ) ); ?></footer>
				</blockquote>
			<?php endif; ?>
			<?php if ( $question ) : ?>
				<div class="nieuws-artikel__vraag">
					<h2><?php esc_html_e( 'Denkvraag', 'aklokaal' ); ?></h2>
					<p><?php echo esc_html( $question ); ?></p>
				</div>
			<?php endif; ?>
			<?php echo aktheme_placed_in( $id, __( 'Hoort bij de lessen', 'aklokaal' ) ); // phpcs:ignore -- ge-escaped in de functie ?>
			<?php if ( $url ) : ?>
				<p class="nieuws-artikel__bronregel">
					<?php echo esc_html( sprintf( /* translators: 1: uitgever */ __( 'Bron: %1$s.', 'aklokaal' ), $bron ) ); ?>
					<?php if ( $author ) : ?><?php echo esc_html( sprintf( /* translators: %s: auteur */ __( 'Auteur: %s.', 'aklokaal' ), $author ) ); ?><?php endif; ?>
					<?php if ( $date ) : ?><?php echo esc_html( sprintf( /* translators: %s: datum */ __( 'Gepubliceerd op %s.', 'aklokaal' ), aktheme_date( $date ) ) ); ?><?php endif; ?>
					<a href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Volledig artikel', 'aklokaal' ); ?></a>
				</p>
				<p><a class="button" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php echo esc_html( sprintf( /* translators: %s: uitgever */ __( 'Lees het volledige artikel bij %s', 'aklokaal' ), $bron ) ); ?> <?php echo aktheme_icon( 'arrow' ); // phpcs:ignore ?></a></p>
			<?php endif; ?>
		</div>
	</div>

	<?php
	$meer = get_posts(
		array(
			'post_type'      => 'ak_nieuws',
			'posts_per_page' => 3,
			'post__not_in'   => array( $id ),
			'tax_query'      => $themes && ! is_wp_error( $themes ) ? array( array( 'taxonomy' => 'ak_thema', 'field' => 'term_id', 'terms' => wp_list_pluck( $themes, 'term_id' ) ) ) : array(), // phpcs:ignore WordPress.DB.SlowDBQuery
		)
	);
	if ( $meer ) :
		?>
		<section class="section" aria-labelledby="meer-nieuws">
			<div class="news-row__head"><h2 id="meer-nieuws"><?php esc_html_e( 'Meer nieuws', 'aklokaal' ); ?></h2><a class="button button--quiet" href="<?php echo esc_url( get_post_type_archive_link( 'ak_nieuws' ) ); ?>"><?php esc_html_e( 'Alle artikelen', 'aklokaal' ); ?></a></div>
			<div class="card-grid" style="padding-top:0"><?php foreach ( $meer as $m ) { echo aktheme_news_card( $m ); } // phpcs:ignore ?></div>
		</section>
	<?php endif; ?>
</main>
	<?php
endwhile;
get_footer();
