<?php
/**
 * Weergave van items: materiaal, nieuws, kaarten, toepassingen.
 *
 * Elk item dat in een paragraaf staat, gaat door aktheme_render_item().
 * Eigen weergave voor een materiaaltype? Maak
 *   template-parts/material/{type}.php
 * en die wordt automatisch gebruikt (je krijgt $args['post'] en $args['note']).
 */

defined( 'ABSPATH' ) || exit;

function aktheme_icon( $name ) {
	$paths = array(
		'arrow'    => '<path d="M7 17 17 7M8 7h9v9"/>',
		'link'     => '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
		'expand'   => '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
		'chevron'  => '<path d="m6 9 6 6 6-6"/>',
		'plus'     => '<path d="M12 5v14M5 12h14"/>',
		'minus'    => '<path d="M5 12h14"/>',
		'download' => '<path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/>',
	);
	return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ( isset( $paths[ $name ] ) ? $paths[ $name ] : '' ) . '</svg>';
}

/** Mag de plugin-functie gebruikt worden? Thema blijft werken zonder plugin. */
function aktheme_has_core() {
	return function_exists( 'aklokaal_get_chapters' );
}

/** Nederlandse datum: 24 oktober 2026. */
function aktheme_date( $ymd ) {
	$ts = $ymd ? strtotime( $ymd ) : false;
	return $ts ? date_i18n( 'j F Y', $ts ) : '';
}

/**
 * Sandbox voor ingesloten toepassingen. Draait de toepassing op een ander
 * domein (aanbevolen: een apart subdomein), dan mag hij zijn eigen opslag
 * gebruiken. Op hetzelfde domein als WordPress nooit allow-same-origin,
 * want dan zou de toepassing de sandbox kunnen opheffen.
 */
function aktheme_sandbox( $url ) {
	$sandbox = array( 'allow-scripts', 'allow-forms', 'allow-popups', 'allow-modals', 'allow-pointer-lock' );
	$host    = wp_parse_url( $url, PHP_URL_HOST );
	if ( $host && strtolower( $host ) !== strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) ) ) {
		$sandbox[] = 'allow-same-origin';
	}
	return implode( ' ', $sandbox );
}

/* ---------------------------------------------------------------- nieuwskaart */

function aktheme_news_card( $post, $heading = 'h3', $extra_class = '' ) {
	$post      = get_post( $post );
	$url       = get_post_meta( $post->ID, 'ak_url', true );
	$publisher = get_post_meta( $post->ID, 'ak_publisher', true );
	$author    = get_post_meta( $post->ID, 'ak_author', true );
	$date      = get_post_meta( $post->ID, 'ak_published', true );
	$img       = has_post_thumbnail( $post ) ? get_the_post_thumbnail( $post, 'ak-card', array( 'loading' => 'lazy', 'alt' => '' ) ) : '';
	if ( ! $img && get_post_meta( $post->ID, 'ak_show_image', true ) && get_post_meta( $post->ID, 'ak_image_url', true ) ) {
		// Afbeelding van de uitgever, niet gekopieerd maar bij de bron geladen.
		$img = sprintf( '<img src="%s" alt="" loading="lazy" referrerpolicy="no-referrer">', esc_url( get_post_meta( $post->ID, 'ak_image_url', true ) ) );
	}
	$themes = get_the_terms( $post, 'ak_thema' );
	$desc   = $post->post_excerpt ? $post->post_excerpt : wp_trim_words( wp_strip_all_tags( $post->post_content ), 30 );
	$tag    = in_array( $heading, array( 'h2', 'h3', 'h4' ), true ) ? $heading : 'h3';
	ob_start();
	?>
	<article class="news-card <?php echo esc_attr( $extra_class ); ?>" data-tags="<?php echo esc_attr( $themes && ! is_wp_error( $themes ) ? implode( ',', wp_list_pluck( $themes, 'name' ) ) : '' ); ?>">
		<?php if ( $img ) : ?>
			<div class="news-card__media"><?php echo $img; // phpcs:ignore WordPress.Security.EscapeOutput -- gebouwd met esc_url / WordPress-functie ?></div>
		<?php endif; ?>
		<div class="news-card__body">
			<p class="news-card__source">
				<strong><?php echo esc_html( $publisher ? $publisher : __( 'Onbekende bron', 'aklokaal' ) ); ?></strong>
				<?php if ( $author ) : ?><span><?php echo esc_html( $author ); ?></span><?php endif; ?>
				<?php if ( $date ) : ?><span><?php echo esc_html( aktheme_date( $date ) ); ?></span><?php endif; ?>
			</p>
			<<?php echo esc_html( $tag ); ?>><a href="<?php echo esc_url( $url ? $url : get_permalink( $post ) ); ?>" rel="noopener"<?php echo $url ? ' target="_blank"' : ''; ?>><?php echo esc_html( get_the_title( $post ) ); ?></a></<?php echo esc_html( $tag ); ?>>
			<?php if ( $desc ) : ?><p><?php echo esc_html( $desc ); ?></p><?php endif; ?>
			<?php if ( get_post_meta( $post->ID, 'ak_question', true ) ) : ?>
				<p class="muted"><em><?php echo esc_html( get_post_meta( $post->ID, 'ak_question', true ) ); ?></em></p>
			<?php endif; ?>
			<div class="news-card__foot">
				<?php if ( $themes && ! is_wp_error( $themes ) ) : ?>
					<ul class="tags"><?php foreach ( $themes as $t ) : ?><li class="tag"><?php echo esc_html( $t->name ); ?></li><?php endforeach; ?></ul>
				<?php endif; ?>
				<span class="news-card__go"><?php esc_html_e( 'Lees bij de bron', 'aklokaal' ); ?> <?php echo aktheme_icon( 'arrow' ); // phpcs:ignore ?></span>
			</div>
		</div>
	</article>
	<?php
	return ob_get_clean();
}

/* ---------------------------------------------------------------- items */

function aktheme_render_item( $post, $note = '' ) {
	$post = get_post( $post );
	if ( ! $post ) {
		return;
	}
	$type = 'ak_materiaal' === $post->post_type ? get_post_meta( $post->ID, 'ak_type', true ) : $post->post_type;
	$type = $type ? sanitize_key( $type ) : 'bestand';
	$args = array(
		'post' => $post,
		'note' => $note,
		'type' => $type,
	);
	if ( locate_template( 'template-parts/material/' . $type . '.php' ) ) {
		get_template_part( 'template-parts/material/' . $type, null, $args );
		return;
	}
	$fn = 'aktheme_item_' . str_replace( '-', '_', $type );
	if ( function_exists( $fn ) ) {
		$fn( $post, $note );
	} else {
		aktheme_item_bestand( $post, $note );
	}
}

function aktheme_kind_line( $label, $parts = array() ) {
	echo '<p class="block__kind"><strong>' . esc_html( $label ) . '</strong>';
	foreach ( array_filter( $parts ) as $p ) {
		echo '<span>' . esc_html( $p ) . '</span>';
	}
	echo '</p>';
}

function aktheme_note( $note ) {
	if ( $note ) {
		echo '<p class="block__note">' . esc_html( $note ) . '</p>';
	}
}

/** Beschrijving van een materiaalitem (veilige HTML). */
function aktheme_description( $post ) {
	$c = trim( $post->post_content );
	if ( '' === $c ) {
		return;
	}
	echo '<div class="prose">' . wp_kses_post( wpautop( $c ) ) . '</div>';
}

function aktheme_file_info( $post ) {
	$att = (int) get_post_meta( $post->ID, 'ak_attachment_id', true );
	if ( ! $att ) {
		return array( '', '', '' );
	}
	$path = get_attached_file( $att );
	$ext  = strtoupper( pathinfo( (string) $path, PATHINFO_EXTENSION ) );
	$size = ( $path && file_exists( $path ) && function_exists( 'aklokaal_filesize' ) ) ? aklokaal_filesize( filesize( $path ) ) : '';
	return array( wp_get_attachment_url( $att ), $ext, $size );
}

function aktheme_item_presentatie( $post, $note ) {
	list( $url, $ext, $size ) = aktheme_file_info( $post );
	$preview                  = (int) get_post_meta( $post->ID, 'ak_preview_id', true );
	$pid                      = 'preview-' . $post->ID;
	?>
	<article class="block block--slides" data-reveal>
		<div class="slides" aria-hidden="true">
			<div class="slide slide--main slide--dark">
				<?php
				if ( has_post_thumbnail( $post ) ) {
					echo get_the_post_thumbnail( $post, 'ak-card', array( 'alt' => '' ) );
				}
				?>
				<div class="slide__inner"><b><?php echo esc_html( get_the_title( $post ) ); ?></b><small><?php echo esc_html( $ext ); ?></small></div>
			</div>
		</div>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'Presentatie', 'aklokaal' ), array( trim( $ext . ', ' . $size, ', ' ) ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php aktheme_description( $post ); ?>
			<?php aktheme_note( $note ); ?>
			<div class="block__actions">
				<?php if ( $preview ) : ?>
					<button class="button button--small" type="button" data-toggle="<?php echo esc_attr( $pid ); ?>" data-label-open="<?php esc_attr_e( 'Verberg presentatie', 'aklokaal' ); ?>" data-label-closed="<?php esc_attr_e( 'Bekijk presentatie', 'aklokaal' ); ?>"><span><?php esc_html_e( 'Bekijk presentatie', 'aklokaal' ); ?></span></button>
				<?php endif; ?>
				<?php if ( $url ) : ?>
					<a class="button <?php echo $preview ? 'button--quiet' : ''; ?> button--small" href="<?php echo esc_url( $url ); ?>" download><?php echo aktheme_icon( 'download' ); // phpcs:ignore ?><?php esc_html_e( 'Download PowerPoint', 'aklokaal' ); ?></a>
				<?php endif; ?>
			</div>
			<?php if ( $preview ) : ?>
				<div class="pdf-viewer" id="<?php echo esc_attr( $pid ); ?>" hidden>
					<iframe title="<?php echo esc_attr( get_the_title( $post ) ); ?>" data-src="<?php echo esc_url( wp_get_attachment_url( $preview ) ); ?>" style="width:100%;height:70svh;border:0" loading="lazy"></iframe>
				</div>
			<?php endif; ?>
		</div>
	</article>
	<?php
}

function aktheme_item_pdf( $post, $note ) {
	list( $url, $ext, $size ) = aktheme_file_info( $post );
	if ( ! $url ) {
		$url = get_post_meta( $post->ID, 'ak_url', true );
	}
	$pid = 'pdf-' . $post->ID;
	?>
	<article class="block block--pdf" data-reveal>
		<div class="pdf-page" aria-hidden="true"><b><?php echo esc_html( get_the_title( $post ) ); ?></b><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'PDF', 'aklokaal' ), array( $size ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php aktheme_description( $post ); ?>
			<?php aktheme_note( $note ); ?>
			<div class="block__actions">
				<button class="button button--small" type="button" data-toggle="<?php echo esc_attr( $pid ); ?>" data-label-open="<?php esc_attr_e( 'Verberg PDF', 'aklokaal' ); ?>" data-label-closed="<?php esc_attr_e( 'Lees hier', 'aklokaal' ); ?>"><span><?php esc_html_e( 'Lees hier', 'aklokaal' ); ?></span></button>
				<a class="button button--quiet button--small" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open in nieuw venster', 'aklokaal' ); ?></a>
				<a class="button button--quiet button--small" href="<?php echo esc_url( $url ); ?>" download><?php echo aktheme_icon( 'download' ); // phpcs:ignore ?><?php esc_html_e( 'Download', 'aklokaal' ); ?></a>
			</div>
			<div class="pdf-viewer" id="<?php echo esc_attr( $pid ); ?>" hidden>
				<iframe title="<?php echo esc_attr( get_the_title( $post ) ); ?>" data-src="<?php echo esc_url( $url ); ?>" style="width:100%;height:80svh;border:0" loading="lazy"></iframe>
			</div>
		</div>
	</article>
	<?php
}

function aktheme_item_document( $post, $note ) {
	aktheme_item_bestand( $post, $note, __( 'Document', 'aklokaal' ) );
}

function aktheme_item_bestand( $post, $note, $label = '' ) {
	list( $url, $ext, $size ) = aktheme_file_info( $post );
	$label                    = $label ? $label : __( 'Bestand', 'aklokaal' );
	if ( ! $url && 'ak_materiaal' !== $post->post_type ) {
		$url = get_permalink( $post );
	}
	?>
	<article class="block block--pdf" data-reveal>
		<div class="pdf-page" aria-hidden="true"><b><?php echo esc_html( $ext ? $ext : get_the_title( $post ) ); ?></b><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
		<div class="block__body">
			<?php aktheme_kind_line( $label, array( trim( $ext . ', ' . $size, ', ' ) ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php aktheme_description( $post ); ?>
			<?php aktheme_note( $note ); ?>
			<?php if ( $url ) : ?>
				<div class="block__actions">
					<a class="button button--small" href="<?php echo esc_url( $url ); ?>" download><?php echo aktheme_icon( 'download' ); // phpcs:ignore ?><?php echo esc_html( sprintf( /* translators: %s: extensie */ __( 'Download %s', 'aklokaal' ), $ext ) ); ?></a>
				</div>
			<?php endif; ?>
		</div>
	</article>
	<?php
}

function aktheme_item_afbeelding( $post, $note ) {
	$att = (int) get_post_meta( $post->ID, 'ak_attachment_id', true );
	if ( ! $att ) {
		$att = (int) get_post_thumbnail_id( $post );
	}
	if ( ! $att ) {
		return;
	}
	$alt  = get_post_meta( $att, '_wp_attachment_image_alt', true );
	$full = wp_get_attachment_image_url( $att, 'full' );
	$cap  = trim( $post->post_content ) ? wp_strip_all_tags( $post->post_content ) : '';
	?>
	<div class="block block--image" data-reveal>
		<figure>
			<button class="zoomable" type="button" data-zoom="<?php echo esc_url( $full ); ?>" data-caption="<?php echo esc_attr( get_the_title( $post ) . ( $cap ? '. ' . $cap : '' ) ); ?>">
				<?php echo wp_get_attachment_image( $att, 'ak-wide', false, array( 'loading' => 'lazy', 'alt' => $alt ? $alt : get_the_title( $post ) ) ); ?>
				<span class="zoomable__hint"><?php echo aktheme_icon( 'expand' ); // phpcs:ignore ?><?php esc_html_e( 'Vergroot', 'aklokaal' ); ?></span>
			</button>
			<figcaption><strong><?php echo esc_html( get_the_title( $post ) ); ?>.</strong> <?php echo esc_html( $cap ); ?>
				<?php if ( get_post_meta( $post->ID, 'ak_source', true ) ) : ?><span class="muted"><?php echo esc_html( sprintf( /* translators: %s: bron */ __( 'Bron: %s', 'aklokaal' ), get_post_meta( $post->ID, 'ak_source', true ) ) ); ?></span><?php endif; ?>
			</figcaption>
			<?php aktheme_note( $note ); ?>
		</figure>
	</div>
	<?php
}

function aktheme_item_video( $post, $note ) {
	$url   = get_post_meta( $post->ID, 'ak_url', true );
	$embed = function_exists( 'aklokaal_video_embed_url' ) ? aklokaal_video_embed_url( $url ) : '';
	$host  = (string) wp_parse_url( $url, PHP_URL_HOST );
	?>
	<article class="block" data-reveal>
		<?php if ( $embed ) : ?>
			<div class="video-consent" data-video="<?php echo esc_url( $embed ); ?>" data-title="<?php echo esc_attr( get_the_title( $post ) ); ?>">
				<?php
				if ( has_post_thumbnail( $post ) ) {
					echo get_the_post_thumbnail( $post, 'ak-wide', array( 'alt' => '' ) );
				}
				?>
				<button class="button" type="button"><?php esc_html_e( 'Video afspelen', 'aklokaal' ); ?></button>
			</div>
		<?php endif; ?>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'Video', 'aklokaal' ), array( preg_replace( '/^www\./', '', $host ), $embed ? __( 'laadt pas na klikken', 'aklokaal' ) : '' ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php aktheme_description( $post ); ?>
			<?php aktheme_note( $note ); ?>
			<?php if ( ! $embed && $url ) : ?>
				<div class="block__actions"><a class="button button--small" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Bekijk de video', 'aklokaal' ); ?></a></div>
			<?php endif; ?>
		</div>
	</article>
	<?php
}

function aktheme_item_weblink( $post, $note ) {
	$url  = get_post_meta( $post->ID, 'ak_url', true );
	$host = preg_replace( '/^www\./', '', (string) wp_parse_url( $url, PHP_URL_HOST ) );
	?>
	<article class="block block--link" data-reveal>
		<a class="block__link" href="<?php echo esc_url( $url ); ?>" target="_blank" rel="noopener">
			<span>
				<?php aktheme_kind_line( __( 'Website', 'aklokaal' ), array( $host ) ); ?>
				<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
				<?php if ( $note ) : ?><span class="block__note"><?php echo esc_html( $note ); ?></span><?php endif; ?>
			</span>
			<?php echo aktheme_icon( 'arrow' ); // phpcs:ignore ?>
		</a>
	</article>
	<?php
}

function aktheme_item_tekst( $post, $note ) {
	?>
	<div class="block block--text">
		<div class="prose">
			<?php if ( get_the_title( $post ) && ! preg_match( '/^(uitleg|tekst)$/i', get_the_title( $post ) ) ) : ?>
				<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php endif; ?>
			<?php echo wp_kses_post( wpautop( $post->post_content ) ); ?>
		</div>
	</div>
	<?php
}

function aktheme_item_opdracht( $post, $note ) {
	list( $url ) = aktheme_file_info( $post );
	?>
	<article class="block block--task" data-reveal>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'Opdracht', 'aklokaal' ), array( $note ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<div class="prose"><?php echo wp_kses_post( wpautop( $post->post_content ) ); ?></div>
			<?php if ( $url ) : ?>
				<div class="block__actions"><a class="button button--quiet button--small" href="<?php echo esc_url( $url ); ?>" download><?php esc_html_e( 'Download opdracht', 'aklokaal' ); ?></a></div>
			<?php endif; ?>
		</div>
	</article>
	<?php
}

function aktheme_item_ak_nieuws( $post, $note ) {
	echo '<article class="block block--news" data-reveal>' . aktheme_news_card( $post ) . '</article>'; // phpcs:ignore
	aktheme_note( $note );
}

function aktheme_item_ak_kaart( $post, $note ) {
	$themes = get_the_terms( $post, 'ak_thema' );
	?>
	<article class="block block--map" data-reveal>
		<div class="block__media"><?php echo get_the_post_thumbnail( $post, 'ak-card', array( 'loading' => 'lazy', 'alt' => '' ) ); ?></div>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'Kaart', 'aklokaal' ), array( 'interactief' === get_post_meta( $post->ID, 'ak_kind', true ) ? __( 'interactief', 'aklokaal' ) : __( 'in te zoomen', 'aklokaal' ), $themes && ! is_wp_error( $themes ) ? $themes[0]->name : '' ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php if ( $post->post_excerpt ) : ?><p><?php echo esc_html( $post->post_excerpt ); ?></p><?php endif; ?>
			<?php aktheme_note( $note ); ?>
			<div class="block__actions"><a class="button button--small" href="<?php echo esc_url( get_permalink( $post ) ); ?>"><?php esc_html_e( 'Open de kaart', 'aklokaal' ); ?></a></div>
		</div>
	</article>
	<?php
}

function aktheme_item_ak_toepassing( $post, $note ) {
	$url    = get_post_meta( $post->ID, 'ak_app_url', true );
	$height = (int) get_post_meta( $post->ID, 'ak_height', true );
	?>
	<article class="block block--app" data-reveal>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'Interactief', 'aklokaal' ) ); ?>
			<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
			<?php if ( $post->post_excerpt ) : ?><p><?php echo esc_html( $post->post_excerpt ); ?></p><?php endif; ?>
			<?php aktheme_note( $note ); ?>
			<div class="block__actions"><a class="button button--quiet button--small" href="<?php echo esc_url( get_permalink( $post ) ); ?>"><?php esc_html_e( 'Groot openen', 'aklokaal' ); ?></a></div>
		</div>
		<?php if ( $url ) : ?>
			<div class="app-frame">
				<iframe title="<?php echo esc_attr( get_the_title( $post ) ); ?>" src="<?php echo esc_url( $url ); ?>" sandbox="<?php echo esc_attr( aktheme_sandbox( $url ) ); ?>" loading="lazy" referrerpolicy="no-referrer" style="height:<?php echo (int) ( $height ? min( $height, 900 ) : 480 ); ?>px"></iframe>
			</div>
		<?php endif; ?>
	</article>
	<?php
}

function aktheme_item_ak_collectie( $post, $note ) {
	$count = function_exists( 'aklokaal_get_items' ) ? count( aklokaal_get_items( $post->ID ) ) : 0;
	?>
	<article class="block block--link" data-reveal>
		<a class="block__link" href="<?php echo esc_url( get_permalink( $post ) ); ?>">
			<span>
				<?php aktheme_kind_line( __( 'Nieuwsbundel', 'aklokaal' ), array( sprintf( /* translators: %d: aantal */ _n( '%d artikel', '%d artikelen', $count, 'aklokaal' ), $count ) ) ); ?>
				<h3><?php echo esc_html( get_the_title( $post ) ); ?></h3>
				<?php if ( $note ) : ?><span class="block__note"><?php echo esc_html( $note ); ?></span><?php endif; ?>
			</span>
			<?php echo aktheme_icon( 'arrow' ); // phpcs:ignore ?>
		</a>
	</article>
	<?php
}

/* ---------------------------------------------------------------- hoofdstukbanden */

/** Lijst hoofdstukken als banden (home + lesmateriaal). */
function aktheme_chapter_bands( $chapters ) {
	echo '<ol class="bands">';
	foreach ( $chapters as $c ) {
		$paras = aktheme_has_core() ? aklokaal_get_paragraphs( $c->ID ) : array();
		$items = 0;
		foreach ( $paras as $p ) {
			$items += count( aklokaal_get_items( $p->ID ) );
		}
		$titles = wp_list_pluck( array_slice( $paras, 0, 3 ), 'post_title' );
		printf(
			'<li><a class="band" href="%1$s"><span class="band__num">H%2$s</span><span class="band__title">%3$s<span class="band__note">%4$s</span></span><span class="band__meta">%5$s</span></a></li>',
			esc_url( get_permalink( $c ) ),
			esc_html( aklokaal_chapter_number( $c ) ),
			esc_html( get_the_title( $c ) ),
			esc_html( implode( ' · ', $titles ) . ( count( $paras ) > 3 ? ' …' : '' ) ),
			esc_html(
				sprintf(
					/* translators: 1: aantal paragrafen, 2: aantal materialen */
					__( '%1$s · %2$s', 'aklokaal' ),
					sprintf( _n( '%d paragraaf', '%d paragrafen', count( $paras ), 'aklokaal' ), count( $paras ) ),
					sprintf( _n( '%d materiaal', '%d materialen', $items, 'aklokaal' ), $items )
				)
			)
		);
	}
	echo '</ol>';
}

/** Hoofdstukken per leerjaar voor één vak (alleen leerjaren met inhoud). */
function aktheme_years_with_chapters( $vak = '' ) {
	if ( ! aktheme_has_core() ) {
		return array();
	}
	$out = array();
	foreach ( aklokaal_sorted_terms( 'ak_leerjaar' ) as $jaar ) {
		$chapters = aklokaal_get_chapters(
			array(
				'vak'      => $vak,
				'leerjaar' => $jaar->term_id,
			)
		);
		if ( $chapters ) {
			$out[] = array(
				'term'     => $jaar,
				'chapters' => $chapters,
			);
		}
	}
	return $out;
}
