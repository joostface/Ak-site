<?php
/** Interactieve toepassingen: eigen spellen, quizzen en simulaties. */
defined( 'ABSPATH' ) || exit;
get_header();
global $wp_query;
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Interactief', 'aklokaal' ), 'lead' => __( 'Oefeningen, spellen en simulaties die we zelf gemaakt hebben. Ze draaien in een afgeschermd venster en werken op telefoon, laptop en digibord.', 'aklokaal' ) ) ); ?>
	<section class="tools" aria-label="<?php esc_attr_e( 'Toepassingen', 'aklokaal' ); ?>" style="margin-top: clamp(64px, 8vw, 120px)">
		<div class="on-axis">
			<?php foreach ( $wp_query->posts as $a ) : $t = get_the_terms( $a, 'ak_thema' ); ?>
				<article class="tool-row" data-reveal>
					<div>
						<h2 class="h3"><a href="<?php echo esc_url( get_permalink( $a ) ); ?>"><?php echo esc_html( get_the_title( $a ) ); ?></a></h2>
						<?php if ( $a->post_excerpt ) : ?><p><?php echo esc_html( $a->post_excerpt ); ?></p><?php endif; ?>
						<a class="button button--small" href="<?php echo esc_url( get_permalink( $a ) ); ?>"><?php esc_html_e( 'Start', 'aklokaal' ); ?></a>
					</div>
					<?php if ( has_post_thumbnail( $a ) ) : ?><div class="tool-row__media"><?php echo get_the_post_thumbnail( $a, 'ak-card', array( 'loading' => 'lazy', 'alt' => '' ) ); ?></div><?php endif; ?>
				</article>
			<?php endforeach; ?>
			<?php if ( ! $wp_query->posts ) : ?><p><?php esc_html_e( 'Er staan nog geen toepassingen online.', 'aklokaal' ); ?></p><?php endif; ?>
		</div>
	</section>
</main>
<?php
get_footer();
