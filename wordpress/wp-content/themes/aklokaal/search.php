<?php
/** Zoekresultaten, gegroepeerd per soort. */
defined( 'ABSPATH' ) || exit;
get_header();
global $wp_query;
$labels = array(
	'ak_hoofdstuk'  => __( 'Hoofdstukken', 'aklokaal' ),
	'ak_materiaal'  => __( 'Materiaal', 'aklokaal' ),
	'ak_nieuws'     => __( 'Nieuws', 'aklokaal' ),
	'ak_collectie'  => __( 'Nieuwsbundels', 'aklokaal' ),
	'ak_kaart'      => __( 'Kaarten', 'aklokaal' ),
	'ak_toepassing' => __( 'Interactief', 'aklokaal' ),
	'page'          => __( 'Pagina’s', 'aklokaal' ),
);
$groups        = array();
// phpcs:disable WordPress.Security.NonceVerification
$aktheme_soort = isset( $_GET['soort'] ) ? sanitize_key( wp_unslash( $_GET['soort'] ) ) : '';
$aktheme_jaar  = isset( $_GET['leerjaar'] ) ? sanitize_title( wp_unslash( $_GET['leerjaar'] ) ) : '';
// phpcs:enable
foreach ( $wp_query->posts as $p ) {
	$groups[ $p->post_type ][] = $p;
}
?>
<main id="main">
	<?php get_template_part( 'template-parts/page-title', null, array( 'title' => __( 'Zoeken', 'aklokaal' ), 'lead' => get_search_query() ? sprintf( /* translators: %s: zoekterm */ __( 'Resultaten voor “%s”.', 'aklokaal' ), get_search_query() ) : '' ) ); ?>
	<div class="wrap" style="margin-top:48px">
		<form class="on-axis search-filters" role="search" action="<?php echo esc_url( home_url( '/' ) ); ?>" style="max-width:44rem" data-live-search="#page-results">
			<div class="searchbox">
				<label class="visually-hidden" for="page-search"><?php esc_html_e( 'Zoekterm', 'aklokaal' ); ?></label>
				<input id="page-search" name="s" type="search" value="<?php echo esc_attr( get_search_query() ); ?>" style="background:var(--surface)">
				<button class="button" type="submit"><?php esc_html_e( 'Zoek', 'aklokaal' ); ?></button>
			</div>
			<div class="search-filters__row">
				<label><?php esc_html_e( 'Soort', 'aklokaal' ); ?>
					<select name="soort">
						<option value=""><?php esc_html_e( 'Alles', 'aklokaal' ); ?></option>
						<?php foreach ( aktheme_search_types() as $k => $l ) : ?><option value="<?php echo esc_attr( $k ); ?>" <?php selected( $aktheme_soort, $k ); ?>><?php echo esc_html( $l ); ?></option><?php endforeach; ?>
					</select>
				</label>
				<label><?php esc_html_e( 'Leerjaar', 'aklokaal' ); ?>
					<select name="leerjaar">
						<option value=""><?php esc_html_e( 'Alle leerjaren', 'aklokaal' ); ?></option>
						<?php foreach ( aktheme_years_with_chapters() as $y ) : ?><option value="<?php echo esc_attr( $y['term']->slug ); ?>" <?php selected( $aktheme_jaar, $y['term']->slug ); ?>><?php echo esc_html( $y['term']->name ); ?></option><?php endforeach; ?>
					</select>
				</label>
			</div>
		</form>
		<div class="on-axis search-live" id="page-results" aria-live="polite" style="max-width:44rem;margin-top:12px"></div>
	</div>
	<?php if ( ( get_search_query() || $aktheme_soort || $aktheme_jaar ) && ! $groups ) : ?>
		<p class="wrap on-axis" style="margin-top:32px"><?php esc_html_e( 'Niets gevonden. Probeer een ander woord, zoals energie of klimaat.', 'aklokaal' ); ?></p>
	<?php endif; ?>
	<?php foreach ( $labels as $type => $label ) : if ( empty( $groups[ $type ] ) ) { continue; } ?>
		<section class="year-block" aria-labelledby="res-<?php echo esc_attr( $type ); ?>">
			<div class="year-block__head"><div><h2 id="res-<?php echo esc_attr( $type ); ?>"><?php echo esc_html( $label ); ?></h2></div></div>
			<ol class="bands">
				<?php foreach ( $groups[ $type ] as $p ) : ?>
					<li><a class="band" href="<?php echo esc_url( 'ak_nieuws' === $type && get_post_meta( $p->ID, 'ak_url', true ) ? get_post_meta( $p->ID, 'ak_url', true ) : get_permalink( $p ) ); ?>"><span class="band__num"><?php echo 'ak_hoofdstuk' === $type ? 'H' . esc_html( aklokaal_chapter_number( $p ) ) : ''; ?></span><span class="band__title"><?php echo esc_html( get_the_title( $p ) ); ?><span class="band__note"><?php echo esc_html( wp_trim_words( $p->post_excerpt ? $p->post_excerpt : wp_strip_all_tags( $p->post_content ), 18 ) ); ?></span></span><span class="band__meta"><?php echo 'ak_nieuws' === $type ? esc_html( get_post_meta( $p->ID, 'ak_publisher', true ) ) : ''; ?></span></a></li>
				<?php endforeach; ?>
			</ol>
		</section>
	<?php endforeach; ?>
</main>
<?php
get_footer();
