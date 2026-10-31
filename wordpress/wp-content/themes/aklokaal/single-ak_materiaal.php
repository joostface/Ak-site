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
			<?php
			$places = aklokaal_item_placements( get_the_ID() );
			if ( $places ) :
				?>
				<div class="prose" style="margin-top:48px">
					<h2><?php esc_html_e( 'Staat in', 'aklokaal' ); ?></h2>
					<ul>
						<?php
						foreach ( $places as $cid ) {
							$c  = get_post( $cid );
							$ch = $c && 'ak_paragraaf' === $c->post_type ? get_post( $c->post_parent ) : $c;
							if ( ! $c || ! $ch || 'publish' !== $ch->post_status ) {
								continue;
							}
							$label = 'ak_paragraaf' === $c->post_type ? '§' . aklokaal_paragraph_number( $c ) . ' ' . get_the_title( $c ) . ' — ' . get_the_title( $ch ) : get_the_title( $c );
							$href  = 'ak_paragraaf' === $c->post_type ? get_permalink( $ch ) . '#' . aklokaal_paragraph_anchor( aklokaal_paragraph_number( $c ) ) : get_permalink( $c );
							printf( '<li><a href="%1$s">%2$s</a></li>', esc_url( $href ), esc_html( $label ) );
						}
						?>
					</ul>
				</div>
			<?php endif; ?>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
