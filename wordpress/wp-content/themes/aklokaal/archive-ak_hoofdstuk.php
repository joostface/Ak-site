<?php
/**
 * Lesmateriaal: alle hoofdstukken per leerjaar. Ook gebruikt voor
 * /lesmateriaal/{vak}/ en /lesmateriaal/{vak}/{leerjaar}/.
 */
defined( 'ABSPATH' ) || exit;
get_header();

$vak_slug  = sanitize_title( (string) get_query_var( 'ak_vak_q' ) );
$jaar_slug = sanitize_title( (string) get_query_var( 'ak_leerjaar_q' ) );
$vakken    = aktheme_has_core() ? aklokaal_sorted_terms( 'ak_vak' ) : array();
$vak       = $vak_slug ? get_term_by( 'slug', $vak_slug, 'ak_vak' ) : ( $vakken ? $vakken[0] : null );
$years     = aktheme_years_with_chapters( $vak ? $vak->term_id : '' );
if ( $jaar_slug ) {
	$years = array_values( array_filter( $years, function ( $y ) use ( $jaar_slug ) { return $y['term']->slug === $jaar_slug; } ) );
}
$imgs = array();
foreach ( $years as $y ) {
	foreach ( $y['chapters'] as $c ) {
		if ( has_post_thumbnail( $c ) ) {
			$imgs[ $y['term']->term_id ] = get_post_thumbnail_id( $c );
			break;
		}
	}
}
?>
<main id="main">
	<header class="page-title">
		<div class="page-title__inner">
			<h1 class="lines"><span class="line"><span data-line style="--i:0"><?php esc_html_e( 'Lesmateriaal', 'aklokaal' ); ?></span></span></h1>
			<p class="after-lines"><?php echo esc_html( $vak && $vak->description ? $vak->description : __( 'Alle hoofdstukken per leerjaar. Elk hoofdstuk is één pagina met alle paragrafen onder elkaar: presentaties, werkbladen, kaarten en nieuws.', 'aklokaal' ) ); ?></p>
		</div>
	</header>

	<?php if ( count( $vakken ) > 1 ) : ?>
		<nav class="subject-switch" aria-label="<?php esc_attr_e( 'Vakken', 'aklokaal' ); ?>">
			<?php foreach ( $vakken as $v ) : ?>
				<a class="chip" href="<?php echo esc_url( home_url( '/lesmateriaal/' . $v->slug . '/' ) ); ?>" <?php echo $vak && $v->term_id === $vak->term_id ? 'aria-current="page"' : ''; ?>><?php echo esc_html( $v->name ); ?></a>
			<?php endforeach; ?>
		</nav>
	<?php endif; ?>

	<?php if ( ! $years ) : ?>
		<div class="wrap section"><p class="on-axis years__leeg"><?php echo esc_html( function_exists( 'aklokaal_can_manage' ) && aklokaal_can_manage() ? __( 'Er zijn nog geen hoofdstukken. Zet ze neer via Lesmateriaal → Importeren (Startinrichting) of Lesmateriaal → Structuur.', 'aklokaal' ) : __( 'Het lesmateriaal wordt op dit moment klaargezet. Kom binnenkort terug.', 'aklokaal' ) ); ?></p></div>
	<?php endif; ?>

	<?php foreach ( $years as $y ) : ?>
		<section class="year-block" id="leerjaar-<?php echo esc_attr( $y['term']->slug ); ?>" aria-labelledby="h-<?php echo esc_attr( $y['term']->slug ); ?>">
			<div class="year-block__head" data-reveal><div>
				<h2 id="h-<?php echo esc_attr( $y['term']->slug ); ?>"><?php echo esc_html( $y['term']->name ); ?></h2>
				<p><?php echo esc_html( ( $y['term']->description ? $y['term']->description . '. ' : '' ) . sprintf( _n( '%d hoofdstuk', '%d hoofdstukken', count( $y['chapters'] ), 'aklokaal' ), count( $y['chapters'] ) ) ); ?></p>
				<?php
				if ( ! empty( $imgs[ $y['term']->term_id ] ) ) {
					echo wp_get_attachment_image( $imgs[ $y['term']->term_id ], 'ak-card', false, array( 'class' => 'year-block__img', 'alt' => '', 'loading' => 'lazy' ) );
				}
				?>
			</div></div>
			<?php aktheme_chapter_bands( $y['chapters'] ); ?>
		</section>
	<?php endforeach; ?>
</main>
<?php
get_footer();
