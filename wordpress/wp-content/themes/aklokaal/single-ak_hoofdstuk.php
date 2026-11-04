<?php
/**
 * De hoofdstukpagina: één doorlopende pagina met alle paragrafen.
 * Links een vast paragrafenmenu dat meeloopt; op telefoons een uitklapmenu.
 * Elke paragraaf heeft een deelbaar anker: #paragraaf-2-3.
 */
defined( 'ABSPATH' ) || exit;
get_header();

while ( have_posts() ) :
	the_post();
	$chapter    = get_post();
	$num        = aklokaal_chapter_number( $chapter );
	$jaar       = aklokaal_first_term( $chapter->ID, 'ak_leerjaar' );
	$can        = aklokaal_can_manage();
	$paragraphs = aklokaal_get_paragraphs( $chapter->ID, $can ? array( 'publish', 'draft' ) : array( 'publish' ) );
	$list       = array();
	$total      = 0;
	foreach ( $paragraphs as $i => $p ) {
		$n      = aklokaal_paragraph_number( $p );
		$items  = aklokaal_get_placed( $p->ID, $can );
		$total += count( $items );
		$list[] = array(
			'post'   => $p,
			'number' => $n,
			'anchor' => aklokaal_paragraph_anchor( $n, $p ),
			'prefix' => aklokaal_paragraph_prefix( $n ),
			'items'  => $items,
		);
	}
	$chapter_items = aklokaal_get_placed( $chapter->ID, $can );
	$total        += count( $chapter_items );

	// Volgende hoofdstuk in hetzelfde leerjaar
	$siblings = $jaar ? wp_list_pluck( aklokaal_get_chapters( array( 'leerjaar' => $jaar->term_id ) ), 'ID' ) : array();
	$pos      = array_search( $chapter->ID, $siblings, true );
	$next     = ( false !== $pos && isset( $siblings[ $pos + 1 ] ) ) ? get_post( $siblings[ $pos + 1 ] ) : null;
	?>
<main id="main">
	<header class="page-title">
		<div class="page-title__inner">
			<h1 class="lines"><span class="line"><span data-line style="--i:0"><?php the_title(); ?></span></span></h1>
			<?php if ( has_excerpt() ) : ?>
				<p class="after-lines"><?php echo esc_html( sprintf( /* translators: 1: nummer, 2: leerjaar */ __( 'Hoofdstuk %1$s voor %2$s.', 'aklokaal' ), $num, $jaar ? $jaar->name : '' ) ); ?> <?php echo esc_html( get_the_excerpt() ); ?></p>
			<?php endif; ?>
			<ol class="breadcrumb" aria-label="<?php esc_attr_e( 'Kruimelpad', 'aklokaal' ); ?>">
				<li><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_hoofdstuk' ) ); ?>"><?php esc_html_e( 'Lesmateriaal', 'aklokaal' ); ?></a></li>
				<?php if ( $jaar ) : ?><li><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_hoofdstuk' ) . '#leerjaar-' . $jaar->slug ); ?>"><?php echo esc_html( $jaar->name ); ?></a></li><?php endif; ?>
				<li aria-current="page"><?php echo esc_html( sprintf( __( 'Hoofdstuk %s', 'aklokaal' ), $num ) ); ?></li>
			</ol>
		</div>
	</header>

	<?php if ( has_post_thumbnail() ) : ?>
		<div class="masthead" style="margin-top: clamp(40px, 5vw, 72px)"><?php the_post_thumbnail( 'ak-hero', array( 'alt' => '' ) ); ?></div>
	<?php endif; ?>

	<div class="chapter">
		<nav class="toc" aria-label="<?php esc_attr_e( 'Paragrafen van dit hoofdstuk', 'aklokaal' ); ?>">
			<p class="toc__title">H<?php echo esc_html( $num ); ?> <?php the_title(); ?><span><?php echo esc_html( sprintf( _n( '%d paragraaf', '%d paragrafen', count( $list ), 'aklokaal' ), count( $list ) ) . ' · ' . sprintf( _n( '%d materiaal', '%d materialen', $total, 'aklokaal' ), $total ) ); ?></span></p>
			<ol>
				<?php foreach ( $list as $p ) : ?>
					<li><a href="#<?php echo esc_attr( $p['anchor'] ); ?>" data-toc-link><span><?php echo $p['number'] ? esc_html( '§' . $p['number'] ) : '&middot;'; ?></span><?php echo esc_html( get_the_title( $p['post'] ) ); ?></a></li>
				<?php endforeach; ?>
			</ol>
			<div class="toc__progress" aria-hidden="true"><i data-toc-progress></i></div>
			<div class="toc__extra">
				<?php if ( $jaar ) : ?><a href="<?php echo esc_url( get_post_type_archive_link( 'ak_hoofdstuk' ) . '#leerjaar-' . $jaar->slug ); ?>"><?php echo esc_html( sprintf( __( 'Andere hoofdstukken van %s', 'aklokaal' ), $jaar->name ) ); ?></a><?php endif; ?>
				<?php if ( $can ) : ?><a href="<?php echo esc_url( admin_url( 'admin.php?page=aklokaal' ) ); ?>"><?php esc_html_e( 'Paragrafen en volgorde beheren', 'aklokaal' ); ?></a><?php endif; ?>
			</div>
		</nav>

		<div class="chapter__content" data-chapter-content>
			<div class="toc-mobile">
				<button class="toc-mobile__button" type="button" data-toc-toggle aria-expanded="false" aria-controls="toc-mobile-list">
					<span><?php esc_html_e( 'Paragraaf:', 'aklokaal' ); ?> <strong data-toc-current><?php echo $list ? esc_html( $list[0]['prefix'] . get_the_title( $list[0]['post'] ) ) : ''; ?></strong></span>
					<?php echo aktheme_icon( 'chevron' ); // phpcs:ignore ?>
				</button>
				<ol class="toc-mobile__list" id="toc-mobile-list" hidden data-toc-list>
					<?php foreach ( $list as $p ) : ?>
						<li><a href="#<?php echo esc_attr( $p['anchor'] ); ?>" data-toc-link><?php echo esc_html( $p['prefix'] . get_the_title( $p['post'] ) ); ?></a></li>
					<?php endforeach; ?>
				</ol>
			</div>

			<?php if ( trim( $chapter->post_content ) || $chapter_items ) : ?>
				<div class="blocks" style="margin-top:0">
					<?php if ( trim( $chapter->post_content ) ) : ?><div class="block block--text"><div class="prose"><?php the_content(); ?></div></div><?php endif; ?>
					<?php aktheme_render_items( $chapter_items, $chapter->ID, $can ); ?>
				</div>
			<?php endif; ?>

			<?php foreach ( $list as $p ) : ?>
				<section class="paragraph" id="<?php echo esc_attr( $p['anchor'] ); ?>" data-paragraph="<?php echo esc_attr( $p['prefix'] . get_the_title( $p['post'] ) ); ?>" data-ak-paragraph-id="<?php echo (int) $p['post']->ID; ?>" aria-labelledby="t-<?php echo esc_attr( $p['anchor'] ); ?>">
					<div class="paragraph__head">
						<h2 id="t-<?php echo esc_attr( $p['anchor'] ); ?>"><?php if ( $p['number'] ) : ?><span class="num">§<?php echo esc_html( $p['number'] ); ?></span><?php endif; ?><?php echo esc_html( get_the_title( $p['post'] ) ); ?><?php echo 'draft' === $p['post']->post_status ? ' <small class="muted">(' . esc_html__( 'concept', 'aklokaal' ) . ')</small>' : ''; ?></h2>
						<button class="anchor-copy" type="button" data-copy-anchor="<?php echo esc_attr( $p['anchor'] ); ?>"><?php echo aktheme_icon( 'link' ); // phpcs:ignore ?><span><?php esc_html_e( 'Deel link', 'aklokaal' ); ?></span></button>
					</div>
					<?php if ( trim( $p['post']->post_content ) ) : ?>
						<div class="paragraph__intro"><?php echo wp_kses_post( wpautop( $p['post']->post_content ) ); ?></div>
					<?php endif; ?>
					<div class="blocks">
						<?php
						aktheme_render_items( $p['items'], $p['post']->ID, $can );
						if ( ! $p['items'] && $can ) {
							echo '<p class="muted">' . esc_html__( 'Nog leeg. Sleep een bestand op deze pagina of klik op + Toevoegen.', 'aklokaal' ) . '</p>';
						} elseif ( ! $p['items'] && ! trim( $p['post']->post_content ) ) {
							echo '<p class="paragraph__empty muted">' . esc_html__( 'Het materiaal voor deze paragraaf volgt nog.', 'aklokaal' ) . '</p>';
						}
						?>
					</div>
				</section>
			<?php endforeach; ?>

			<?php if ( $next ) : ?>
				<div class="next-chapter">
					<a href="<?php echo esc_url( get_permalink( $next ) ); ?>"><strong>H<?php echo esc_html( aklokaal_chapter_number( $next ) . ' ' . get_the_title( $next ) ); ?></strong><span><?php echo esc_html( sprintf( __( 'Volgend hoofdstuk van %s', 'aklokaal' ), $jaar ? $jaar->name : '' ) ); ?></span></a>
				</div>
			<?php endif; ?>
		</div>
	</div>
</main>
	<?php
endwhile;
get_footer();
