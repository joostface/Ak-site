<?php
/**
 * Eén nieuwsartikel: de kaart, de eigen samenvatting en waar het in de lessen terugkomt.
 * Het artikel zelf staat bij de uitgever.
 */
defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	$places = aklokaal_item_placements( get_the_ID() );
	?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Nieuws', 'aklokaal' ), 'lead' => '' ) ); ?>
	<div class="about">
		<div class="about__aside"></div>
		<div class="prose" style="grid-column: 5 / 12">
			<?php echo aktheme_news_card( get_post(), 'h2' ); // phpcs:ignore ?>
			<?php if ( trim( get_the_content() ) ) : ?><h2><?php esc_html_e( 'Samenvatting', 'aklokaal' ); ?></h2><?php the_content(); ?><?php endif; ?>
			<?php if ( $places ) : ?>
				<h2><?php esc_html_e( 'Hoort bij', 'aklokaal' ); ?></h2>
				<ul>
					<?php
					foreach ( $places as $cid ) {
						$c = get_post( $cid );
						if ( ! $c || 'publish' !== $c->post_status ) {
							continue;
						}
						if ( 'ak_paragraaf' === $c->post_type ) {
							$ch = get_post( $c->post_parent );
							if ( $ch && 'publish' === $ch->post_status ) {
								$n = aklokaal_paragraph_number( $c );
								printf( '<li><a href="%1$s">§%2$s %3$s</a> <span class="muted">(%4$s)</span></li>', esc_url( get_permalink( $ch ) . '#' . aklokaal_paragraph_anchor( $n ) ), esc_html( $n ), esc_html( get_the_title( $c ) ), esc_html( get_the_title( $ch ) ) );
							}
						} else {
							printf( '<li><a href="%1$s">%2$s</a></li>', esc_url( get_permalink( $c ) ), esc_html( get_the_title( $c ) ) );
						}
					}
					?>
				</ul>
			<?php endif; ?>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
