<?php
/** Niet gevonden. */
defined( 'ABSPATH' ) || exit;
get_header();
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Niet gevonden', 'aklokaal' ), 'lead' => __( 'Deze pagina bestaat niet (meer). Misschien is het hoofdstuk verplaatst. Zoek het op, of begin bij het lesmateriaal.', 'aklokaal' ) ) ); ?>
	<div class="wrap" style="margin-top:40px"><div class="on-axis block__actions">
		<a class="button" href="<?php echo esc_url( get_post_type_archive_link( 'ak_hoofdstuk' ) ); ?>"><?php esc_html_e( 'Naar het lesmateriaal', 'aklokaal' ); ?></a>
		<button class="button button--quiet" type="button" data-search-open><?php esc_html_e( 'Zoeken', 'aklokaal' ); ?></button>
	</div></div>
</main>
<?php
get_footer();
