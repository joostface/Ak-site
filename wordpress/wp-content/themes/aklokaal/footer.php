<?php
/**
 * Voet van elke pagina, plus het zoekvenster en de vergroting.
 */
defined( 'ABSPATH' ) || exit;
$aktheme_years = aktheme_years_with_chapters();
$aktheme_nav   = aktheme_nav_items();
?>
<footer class="site-footer">
	<div class="footer-cols">
		<div>
			<h2><?php esc_html_e( 'Lesmateriaal', 'aklokaal' ); ?></h2>
			<ul>
				<?php foreach ( array_slice( $aktheme_years, 0, 8 ) as $y ) : ?>
					<li><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_hoofdstuk' ) . '#leerjaar-' . $y['term']->slug ); ?>"><?php echo esc_html( $y['term']->name ); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</div>
		<div>
			<h2><?php esc_html_e( 'Ontdekken', 'aklokaal' ); ?></h2>
			<ul>
				<?php foreach ( array( 'nieuws', 'kaarten', 'interactief' ) as $k ) : ?>
					<?php if ( $aktheme_nav[ $k ][1] ) : ?><li><a href="<?php echo esc_url( $aktheme_nav[ $k ][1] ); ?>"><?php echo esc_html( $aktheme_nav[ $k ][0] ); ?></a></li><?php endif; ?>
				<?php endforeach; ?>
				<?php if ( get_post_type_archive_link( 'ak_collectie' ) ) : ?><li><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_collectie' ) ); ?>"><?php esc_html_e( 'Nieuwsbundels', 'aklokaal' ); ?></a></li><?php endif; ?>
			</ul>
		</div>
		<div>
			<h2><?php esc_html_e( 'Over', 'aklokaal' ); ?></h2>
			<ul>
				<li><a href="<?php echo esc_url( $aktheme_nav['over'][1] ); ?>"><?php esc_html_e( 'Over deze website', 'aklokaal' ); ?></a></li>
				<li><a href="<?php echo esc_url( $aktheme_nav['over'][1] . '#bronnen' ); ?>"><?php esc_html_e( 'Bronnen en auteursrecht', 'aklokaal' ); ?></a></li>
				<li><a href="<?php echo esc_url( $aktheme_nav['over'][1] . '#privacy' ); ?>"><?php esc_html_e( 'Privacy', 'aklokaal' ); ?></a></li>
			</ul>
		</div>
		<div>
			<h2><?php esc_html_e( 'Zoeken', 'aklokaal' ); ?></h2>
			<ul>
				<li><a href="<?php echo esc_url( home_url( '/?s=' ) ); ?>"><?php esc_html_e( 'Alles doorzoeken', 'aklokaal' ); ?></a></li>
				<?php if ( is_user_logged_in() ) : ?><li><a href="<?php echo esc_url( admin_url( 'admin.php?page=aklokaal' ) ); ?>"><?php esc_html_e( 'Beheer', 'aklokaal' ); ?></a></li><?php endif; ?>
			</ul>
		</div>
	</div>
	<div class="footer-word">
		<svg class="word-wide" viewBox="0 0 1000 118" role="img" aria-label="Aardrijkskundelokaal"><text x="0" y="100" font-size="128" textLength="1000" lengthAdjust="spacingAndGlyphs">Aardrijkskundelokaal</text></svg>
		<svg class="word-mobile" viewBox="0 0 1000 300" role="img" aria-label="Aardrijkskundelokaal"><text x="0" y="128" font-size="150" textLength="1000" lengthAdjust="spacingAndGlyphs">Aardrijkskunde</text><text x="0" y="286" font-size="150" textLength="560" lengthAdjust="spacingAndGlyphs">lokaal</text></svg>
		<p class="footer-legal"><span><?php echo esc_html( aktheme_mod( 'ak_footer_note', __( 'Lesmateriaal mag vrij gebruikt worden in de les. Nieuwsartikelen blijven van hun oorspronkelijke uitgever.', 'aklokaal' ) ) ); ?></span><span>© <?php echo esc_html( gmdate( 'Y' ) ); ?></span></p>
	</div>
</footer>

<dialog class="search-dialog" data-search-dialog aria-label="<?php esc_attr_e( 'Zoeken', 'aklokaal' ); ?>">
	<form role="search" action="<?php echo esc_url( home_url( '/' ) ); ?>" data-search-form>
		<label class="visually-hidden" for="search-dialog-input"><?php esc_html_e( 'Zoek in het lokaal', 'aklokaal' ); ?></label>
		<input id="search-dialog-input" name="s" type="search" placeholder="<?php esc_attr_e( 'Zoek een hoofdstuk, kaart of artikel', 'aklokaal' ); ?>" autocomplete="off" data-search-input>
		<button class="icon-button" type="button" data-search-close aria-label="<?php esc_attr_e( 'Sluiten', 'aklokaal' ); ?>">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
		</button>
	</form>
	<div class="search-live" data-search-results aria-live="polite"></div>
</dialog>

<dialog class="lightbox" data-lightbox aria-label="<?php esc_attr_e( 'Vergrote afbeelding', 'aklokaal' ); ?>">
	<div class="lightbox__inner">
		<div class="lightbox__bar">
			<button class="icon-button" type="button" data-lightbox-zoom aria-label="<?php esc_attr_e( 'In- of uitzoomen', 'aklokaal' ); ?>">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/></svg>
			</button>
			<button class="icon-button" type="button" data-lightbox-close aria-label="<?php esc_attr_e( 'Sluiten', 'aklokaal' ); ?>">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
			</button>
		</div>
		<div class="lightbox__stage" data-lightbox-stage><img alt="" data-lightbox-img></div>
		<p class="lightbox__caption" data-lightbox-caption></p>
	</div>
</dialog>
<?php wp_footer(); ?>
</body>
</html>
