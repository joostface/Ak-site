<?php
/**
 * Nieuws & actualiteit: alle artikelen in dezelfde kaart, met bronvermelding.
 */
defined( 'ABSPATH' ) || exit;
get_header();
global $wp_query;
$bundels = get_posts( array( 'post_type' => 'ak_collectie', 'posts_per_page' => 6 ) );
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Nieuws', 'aklokaal' ), 'lead' => __( 'Artikelen uit kranten en tijdschriften die laten zien dat aardrijkskunde nu gebeurt. Elk artikel linkt naar de oorspronkelijke bron.', 'aklokaal' ) ) ); ?>
	<div data-filter-group=".card-grid .news-card">
		<?php get_template_part( 'template-parts/theme-filter', null, array( 'posts' => $wp_query->posts ) ); ?>
		<div class="card-grid" data-reveal>
			<?php
			foreach ( $wp_query->posts as $p ) {
				echo aktheme_news_card( $p, 'h2' ); // phpcs:ignore
			}
			?>
		</div>
	</div>
	<?php if ( $wp_query->max_num_pages > 1 ) : ?>
		<nav class="wrap section" aria-label="<?php esc_attr_e( 'Meer artikelen', 'aklokaal' ); ?>" style="margin-top:48px"><div class="block__actions"><?php echo wp_kses_post( get_previous_posts_link( __( 'Nieuwere artikelen', 'aklokaal' ) ) . ' ' . get_next_posts_link( __( 'Oudere artikelen', 'aklokaal' ) ) ); ?></div></nav>
	<?php endif; ?>

	<?php if ( $bundels ) : ?>
		<section class="section wrap" aria-labelledby="coll-title">
			<div class="years__head"><h2 id="coll-title"><span><?php esc_html_e( 'Nieuwsbundels', 'aklokaal' ); ?></span><?php esc_html_e( 'per thema', 'aklokaal' ); ?></h2></div>
			<ol class="bands">
				<?php foreach ( $bundels as $b ) : $n = count( aklokaal_get_items( $b->ID ) ); ?>
					<li><a class="band" href="<?php echo esc_url( get_permalink( $b ) ); ?>"><span class="band__num"><?php echo (int) $n; ?></span><span class="band__title"><?php echo esc_html( get_the_title( $b ) ); ?><span class="band__note"><?php echo esc_html( $b->post_excerpt ); ?></span></span><span class="band__meta"><?php echo esc_html( _n( 'artikel', 'artikelen', $n, 'aklokaal' ) ); ?></span></a></li>
				<?php endforeach; ?>
			</ol>
		</section>
	<?php endif; ?>
</main>
<?php
get_footer();
