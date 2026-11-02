<?php
/**
 * Homepage: kop, zoeken, leerjaren, kaarten, nieuws, interactief.
 * Teksten zijn aan te passen onder Weergave → Customizer → Aardrijkskundelokaal.
 */
defined( 'ABSPATH' ) || exit;
get_header();

$years      = aktheme_years_with_chapters();
$para_count = 0;
foreach ( $years as $y ) {
	foreach ( $y['chapters'] as $c ) {
		$para_count += count( aklokaal_get_paragraphs( $c->ID ) );
	}
}
$maps  = get_posts( array( 'post_type' => 'ak_kaart', 'posts_per_page' => 4 ) );
$news  = get_posts( array( 'post_type' => 'ak_nieuws', 'posts_per_page' => 5 ) );
$apps  = get_posts( array( 'post_type' => 'ak_toepassing', 'posts_per_page' => 4 ) );
$img   = get_template_directory_uri() . '/assets/img/';
$total = wp_count_posts( 'ak_nieuws' );
?>
<main id="main">
	<section class="hero" aria-labelledby="hero-title">
		<div class="hero__main">
			<h1 class="hero__title lines" id="hero-title">
				<span class="line"><span data-line style="--i:0"><?php echo esc_html( aktheme_mod( 'ak_hero_line_1', 'Aardrijkskunde' ) ); ?></span></span>
				<span class="line"><span data-line style="--i:1"><?php echo esc_html( aktheme_mod( 'ak_hero_line_2', 'in één lokaal' ) ); ?></span></span>
			</h1>
		</div>
		<div class="hero__talk after-lines">
			<p><?php echo esc_html( aktheme_mod( 'ak_hero_text', 'Lesmateriaal, kaarten en actueel nieuws voor elk leerjaar. Kies je klas en je staat meteen bij de goede paragraaf.' ) ); ?></p>
			<a class="button" href="#leerjaren"><?php esc_html_e( 'Kies je leerjaar', 'aklokaal' ); ?></a>
		</div>
		<div class="hero__main hero__figure-wrap">
			<figure class="hero__figure">
				<?php if ( $para_count ) : ?>
					<div class="hero__stat"><strong class="tabular"><?php echo (int) $para_count; ?></strong><span><?php echo esc_html( sprintf( /* translators: %d: aantal leerjaren */ _n( 'paragrafen in %d leerjaar', 'paragrafen in %d leerjaren', count( $years ), 'aklokaal' ), count( $years ) ) ); ?></span></div>
				<?php endif; ?>
				<?php
				if ( has_header_image() ) {
					the_header_image_tag( array( 'alt' => '' ) );
				} else {
					printf( '<img src="%s" width="2400" height="1350" alt="%s">', esc_url( $img . 'reliefkaart.jpg' ), esc_attr__( 'Reliëfkaart met heuvelruggen, dalen en meren', 'aklokaal' ) );
				}
				?>
			</figure>
		</div>
	</section>

	<section class="tiles" aria-labelledby="tiles-title">
		<div class="tile tile--slogan" data-reveal>
			<h2 id="tiles-title"><?php echo esc_html( aktheme_mod( 'ak_slogan', 'Kijk, vergelijk, verklaar' ) ); ?></h2>
		</div>
		<form class="tile tile--search" role="search" action="<?php echo esc_url( home_url( '/' ) ); ?>" data-live-search="#home-results">
			<label for="home-search"><?php esc_html_e( 'Zoek', 'aklokaal' ); ?></label>
			<div class="searchbox">
				<input id="home-search" name="s" type="search" placeholder="<?php esc_attr_e( 'energie, klimaat, Rijn…', 'aklokaal' ); ?>" autocomplete="off">
				<button class="button" type="submit"><?php esc_html_e( 'Zoek', 'aklokaal' ); ?></button>
			</div>
			<div class="search-live" id="home-results" aria-live="polite"></div>
		</form>
		<div class="tile tile--photo">
			<img src="<?php echo esc_url( $img . 'bevolking.jpg' ); ?>" width="1600" height="1000" loading="lazy" alt="<?php esc_attr_e( 'Kaart van bevolkingsdichtheid', 'aklokaal' ); ?>">
		</div>
		<div class="tile tile--text" data-reveal>
			<p class="tile__aside muted"><?php echo esc_html( aktheme_mod( 'ak_intro_aside', 'Voor leerlingen, collega’s en iedereen die nieuwsgierig is. Geen account nodig.' ) ); ?></p>
			<p><?php echo esc_html( aktheme_mod( 'ak_intro', '' ) ); ?></p>
		</div>
	</section>

	<?php if ( $years ) : ?>
	<section class="section wrap" id="leerjaren" aria-labelledby="years-title">
		<div class="years__head" data-reveal>
			<h2 id="years-title"><span><?php esc_html_e( 'Lesmateriaal', 'aklokaal' ); ?></span><?php esc_html_e( 'per leerjaar', 'aklokaal' ); ?></h2>
			<a class="button button--quiet" href="<?php echo esc_url( get_post_type_archive_link( 'ak_hoofdstuk' ) ); ?>"><?php esc_html_e( 'Alle hoofdstukken', 'aklokaal' ); ?></a>
		</div>
		<div class="years__body" data-tabs data-default="0">
			<div class="years__tabs" role="tablist" aria-label="<?php esc_attr_e( 'Leerjaren', 'aklokaal' ); ?>" aria-orientation="vertical">
				<?php foreach ( $years as $y ) : ?>
					<button class="year-tab" role="tab" type="button" id="tab-<?php echo esc_attr( $y['term']->slug ); ?>" aria-controls="panel-<?php echo esc_attr( $y['term']->slug ); ?>" aria-selected="false" data-year="<?php echo esc_attr( $y['term']->slug ); ?>"><strong><?php echo esc_html( $y['term']->name ); ?></strong><span><?php echo esc_html( $y['term']->description ? preg_replace( '/^Voor\s+/i', '', $y['term']->description ) : sprintf( _n( '%d hoofdstuk', '%d hoofdstukken', count( $y['chapters'] ), 'aklokaal' ), count( $y['chapters'] ) ) ); ?></span></button>
				<?php endforeach; ?>
			</div>
			<div>
				<?php foreach ( $years as $y ) : ?>
					<div class="year-panel" role="tabpanel" id="panel-<?php echo esc_attr( $y['term']->slug ); ?>" aria-labelledby="tab-<?php echo esc_attr( $y['term']->slug ); ?>">
						<h3 class="visually-hidden"><?php echo esc_html( $y['term']->name ); ?></h3>
						<?php aktheme_chapter_bands( $y['chapters'] ); ?>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( count( $maps ) >= 2 ) : ?>
	<section class="section" aria-labelledby="maps-title">
		<div class="maps-strip__head" data-reveal>
			<h2 id="maps-title"><?php esc_html_e( 'Kaarten voor in de les', 'aklokaal' ); ?></h2>
			<a class="button button--quiet" href="<?php echo esc_url( get_post_type_archive_link( 'ak_kaart' ) ); ?>"><?php esc_html_e( 'Kaartenbibliotheek', 'aklokaal' ); ?></a>
		</div>
		<div class="strip">
			<?php foreach ( $maps as $m ) : $t = get_the_terms( $m, 'ak_thema' ); ?>
				<a class="strip__panel" href="<?php echo esc_url( get_permalink( $m ) ); ?>">
					<?php echo get_the_post_thumbnail( $m, 'ak-wide', array( 'loading' => 'lazy', 'alt' => '' ) ); ?>
					<span class="strip__label"><strong><?php echo esc_html( get_the_title( $m ) ); ?></strong><?php if ( $t && ! is_wp_error( $t ) ) : ?><span><?php echo esc_html( $t[0]->name ); ?></span><?php endif; ?></span>
				</a>
			<?php endforeach; ?>
		</div>
		<p class="maps-strip__caption"><?php esc_html_e( 'Elke kaart opent groot, met inzoomen en schermvullende weergave, en staat ook in de hoofdstukken waar hij bij hoort.', 'aklokaal' ); ?></p>
	</section>
	<?php endif; ?>

	<?php if ( $news ) : ?>
	<section class="section" aria-labelledby="news-title">
		<div class="news-row__head" data-reveal>
			<h2 id="news-title"><?php esc_html_e( 'Nieuws & actualiteit', 'aklokaal' ); ?></h2>
			<a class="button button--quiet" href="<?php echo esc_url( get_post_type_archive_link( 'ak_nieuws' ) ); ?>"><?php echo esc_html( sprintf( __( 'Alle %d artikelen', 'aklokaal' ), (int) $total->publish ) ); ?></a>
		</div>
		<div class="news-board">
			<?php
			foreach ( $news as $n ) {
				echo aktheme_news_card( $n ); // phpcs:ignore
			}
			?>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( $apps ) : ?>
	<section class="tools" aria-labelledby="tools-title">
		<div class="on-axis">
			<div class="tools__head" data-reveal><h2 id="tools-title"><?php echo esc_html( aktheme_mod( 'ak_tools_title', 'Oefenen, spelen, onderzoeken' ) ); ?></h2></div>
			<?php foreach ( $apps as $a ) : ?>
				<article class="tool-row" data-reveal>
					<div>
						<h3><a href="<?php echo esc_url( get_permalink( $a ) ); ?>"><?php echo esc_html( get_the_title( $a ) ); ?></a></h3>
						<?php if ( $a->post_excerpt ) : ?><p><?php echo esc_html( $a->post_excerpt ); ?></p><?php endif; ?>
						<a class="button button--quiet button--small" href="<?php echo esc_url( get_permalink( $a ) ); ?>"><?php esc_html_e( 'Start', 'aklokaal' ); ?></a>
					</div>
					<?php if ( has_post_thumbnail( $a ) ) : ?><div class="tool-row__media"><?php echo get_the_post_thumbnail( $a, 'ak-card', array( 'loading' => 'lazy', 'alt' => '' ) ); ?></div><?php endif; ?>
				</article>
			<?php endforeach; ?>
		</div>
	</section>
	<?php endif; ?>
</main>
<?php
get_footer();
