<?php
/** Alle nieuwsbundels. */
defined( 'ABSPATH' ) || exit;
get_header();
global $wp_query;
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Nieuwsbundels', 'aklokaal' ), 'lead' => __( 'Artikelen over één onderwerp bij elkaar, met een inleiding en onderzoeksvragen.', 'aklokaal' ) ) ); ?>
	<div class="section wrap" style="margin-top:64px">
		<ol class="bands">
			<?php foreach ( $wp_query->posts as $b ) : $n = count( aklokaal_get_items( $b->ID ) ); ?>
				<li><a class="band" href="<?php echo esc_url( get_permalink( $b ) ); ?>"><span class="band__num"><?php echo (int) $n; ?></span><span class="band__title"><?php echo esc_html( get_the_title( $b ) ); ?><span class="band__note"><?php echo esc_html( $b->post_excerpt ); ?></span></span><span class="band__meta"><?php echo esc_html( _n( 'artikel', 'artikelen', $n, 'aklokaal' ) ); ?></span></a></li>
			<?php endforeach; ?>
		</ol>
	</div>
</main>
<?php
get_footer();
