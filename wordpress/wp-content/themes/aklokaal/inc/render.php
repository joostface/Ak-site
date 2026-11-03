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
	// Herkomst = schema + host + poort. Alleen een andere herkomst mag zijn eigen opslag en data gebruiken.
	$origin = function ( $u ) {
		$p = wp_parse_url( $u );
		return strtolower( ( $p['scheme'] ?? '' ) . '://' . ( $p['host'] ?? '' ) . ':' . ( $p['port'] ?? '' ) );
	};
	if ( wp_parse_url( $url, PHP_URL_HOST ) && $origin( $url ) !== $origin( home_url() ) ) {
		$sandbox[] = 'allow-same-origin';
	}
	return implode( ' ', $sandbox );
}

/* ---------------------------------------------------------------- Office-viewer */

/**
 * Adres om een PowerPoint of Word-bestand in de browser te tonen met de gratis viewer van Microsoft
 * (Office Online). Werkt alleen als het bestand openbaar op internet staat, dus niet op een lokale
 * testsite. Uit te zetten in Weergave → Customizer → Aardrijkskundelokaal.
 */
function aktheme_office_viewer_url( $file_url ) {
	if ( ! $file_url || ! get_theme_mod( 'ak_office_viewer', true ) ) {
		return '';
	}
	$host = strtolower( (string) wp_parse_url( $file_url, PHP_URL_HOST ) );
	if ( ! $host || 'localhost' === $host || preg_match( '/^(127\.|10\.|192\.168\.)|\.local$|\.test$/', $host ) ) {
		return '';
	}
	$ext = strtolower( pathinfo( (string) wp_parse_url( $file_url, PHP_URL_PATH ), PATHINFO_EXTENSION ) );
	if ( ! in_array( $ext, array( 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls' ), true ) ) {
		return '';
	}
	return 'https://view.officeapps.live.com/op/embed.aspx?src=' . rawurlencode( $file_url );
}

/* ---------------------------------------------------------------- nieuwskaart */

/** Een eigen bericht is een nieuwsitem zonder link naar een externe bron. */
function aktheme_news_is_own( $post ) {
	$post = get_post( $post );
	return $post && ! get_post_meta( $post->ID, 'ak_url', true );
}

function aktheme_news_card( $post, $heading = 'h3', $extra_class = '' ) {
	$post      = get_post( $post );
	$url       = get_post_meta( $post->ID, 'ak_url', true );
	$publisher = get_post_meta( $post->ID, 'ak_publisher', true );
	$author    = get_post_meta( $post->ID, 'ak_author', true );
	$date      = get_post_meta( $post->ID, 'ak_published', true );
	$own       = aktheme_news_is_own( $post );
	if ( $own ) {
		// Eigen bericht: de site is de bron, de datum is de publicatiedatum van het bericht.
		$publisher = $publisher ? $publisher : get_bloginfo( 'name' );
		$date      = $date ? $date : get_the_date( 'Y-m-d', $post );
	}
	$img       = has_post_thumbnail( $post ) ? get_the_post_thumbnail( $post, 'ak-card', array( 'loading' => 'lazy', 'alt' => '' ) ) : '';
	if ( ! $img && get_post_meta( $post->ID, 'ak_show_image', true ) && get_post_meta( $post->ID, 'ak_image_url', true ) ) {
		// Afbeelding van de uitgever, niet gekopieerd maar bij de bron geladen.
		$img = sprintf( '<img src="%s" alt="" loading="lazy" referrerpolicy="no-referrer">', esc_url( get_post_meta( $post->ID, 'ak_image_url', true ) ) );
	}
	$themes = get_the_terms( $post, 'ak_thema' );
	$desc   = $post->post_excerpt ? $post->post_excerpt : wp_trim_words( wp_strip_all_tags( preg_replace( '#</(p|h[1-6]|li|div|figcaption)>#i', ' ', $post->post_content ) ), 30 );
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
				<span class="news-card__go"><?php echo esc_html( $own ? __( 'Lees verder', 'aklokaal' ) : __( 'Lees bij de bron', 'aklokaal' ) ); ?> <?php echo aktheme_icon( 'arrow' ); // phpcs:ignore ?></span>
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

/**
 * Item tonen; voor beheerders in een omhulsel met gegevens voor de beheerbalk
 * (verplaatsen, ook plaatsen, weghalen, bewerken). Die balk tekent de plugin (quick-add.js).
 */
function aktheme_render_item_beheer( $it, $container_id, $can ) {
	if ( ! $can ) {
		aktheme_render_item( $it['post'], $it['note'] );
		return;
	}
	printf(
		'<div class="ak-beheer-item" data-ak-item="%1$d" data-ak-container="%2$d" data-ak-title="%3$s" data-ak-edit="%4$s" data-ak-status="%5$s">',
		(int) $it['post']->ID,
		(int) $container_id,
		esc_attr( get_the_title( $it['post'] ) ),
		esc_url( (string) get_edit_post_link( $it['post']->ID, 'raw' ) ),
		esc_attr( $it['post']->post_status )
	);
	aktheme_render_item( $it['post'], $it['note'] );
	echo '</div>';
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
	$viewer                   = $preview ? wp_get_attachment_url( $preview ) : aktheme_office_viewer_url( $url );
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
				<?php if ( $viewer ) : ?>
					<button class="button button--small" type="button" data-toggle="<?php echo esc_attr( $pid ); ?>" data-label-open="<?php esc_attr_e( 'Verberg presentatie', 'aklokaal' ); ?>" data-label-closed="<?php esc_attr_e( 'Bekijk presentatie', 'aklokaal' ); ?>"><span><?php esc_html_e( 'Bekijk presentatie', 'aklokaal' ); ?></span></button>
				<?php endif; ?>
				<?php if ( $url ) : ?>
					<a class="button <?php echo $viewer ? 'button--quiet' : ''; ?> button--small" href="<?php echo esc_url( $url ); ?>" download><?php echo aktheme_icon( 'download' ); // phpcs:ignore ?><?php esc_html_e( 'Download PowerPoint', 'aklokaal' ); ?></a>
				<?php endif; ?>
			</div>
			<?php if ( $viewer ) : ?>
				<div class="pdf-viewer" id="<?php echo esc_attr( $pid ); ?>" hidden>
					<iframe title="<?php echo esc_attr( get_the_title( $post ) ); ?>" data-src="<?php echo esc_url( $viewer ); ?>" class="office-frame" allowfullscreen loading="lazy"></iframe>
					<?php if ( ! $preview ) : ?><p class="block__note"><?php esc_html_e( 'Getoond met de viewer van Microsoft Office. Werkt het niet? Download de presentatie.', 'aklokaal' ); ?></p><?php endif; ?>
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

/** Knop + venster om een Office-bestand in de browser te bekijken (alleen online). */
function aktheme_office_toggle( $post, $url ) {
	$viewer = aktheme_office_viewer_url( $url );
	if ( ! $viewer ) {
		return;
	}
	$pid = 'office-' . $post->ID;
	printf( '<button class="button button--small" type="button" data-toggle="%1$s" data-label-open="%2$s" data-label-closed="%3$s"><span>%3$s</span></button>', esc_attr( $pid ), esc_attr__( 'Verberg', 'aklokaal' ), esc_attr__( 'Bekijk hier', 'aklokaal' ) );
	printf( '<div class="pdf-viewer" id="%1$s" hidden style="flex-basis:100%%"><iframe title="%2$s" data-src="%3$s" class="office-frame" allowfullscreen loading="lazy"></iframe></div>', esc_attr( $pid ), esc_attr( get_the_title( $post ) ), esc_url( $viewer ) );
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
					<?php aktheme_office_toggle( $post, $url ); ?>
					<a class="button <?php echo aktheme_office_viewer_url( $url ) ? 'button--quiet' : ''; ?> button--small" href="<?php echo esc_url( $url ); ?>" download><?php echo aktheme_icon( 'download' ); // phpcs:ignore ?><?php echo esc_html( sprintf( /* translators: %s: extensie */ __( 'Download %s', 'aklokaal' ), $ext ) ); ?></a>
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
			<div class="video-consent video-frame">
				<iframe src="<?php echo esc_url( $embed ); ?>" title="<?php echo esc_attr( get_the_title( $post ) ); ?>" loading="lazy" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
			</div>
		<?php endif; ?>
		<div class="block__body">
			<?php aktheme_kind_line( __( 'Video', 'aklokaal' ), array( preg_replace( '/^www\./', '', $host ) ) ); ?>
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
		$concept = 'publish' !== $c->post_status;
		printf(
			'<li><a class="band%6$s" href="%1$s"><span class="band__num">H%2$s</span><span class="band__title">%3$s<span class="band__note">%4$s</span></span><span class="band__meta">%5$s</span></a></li>',
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
				) . ( $concept ? ' · ' . __( 'concept, alleen jij ziet dit', 'aklokaal' ) : '' )
			),
			$concept ? ' band--draft' : ''
		);
	}
	echo '</ol>';
}

/** Welke hoofdstukken mag de huidige bezoeker zien? Beheerders zien ook concepten. */
function aktheme_visible_statuses() {
	return ( function_exists( 'aklokaal_can_manage' ) && aklokaal_can_manage() ) ? array( 'publish', 'draft', 'private' ) : array( 'publish' );
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
				'status'   => aktheme_visible_statuses(),
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

/* ---------------------------------------------------------------- hoort bij */

/**
 * Waar in de lessen komt dit item terug? Lijst met links naar paragrafen (met anker)
 * en hoofdstukken. Alleen gepubliceerde plekken.
 */
function aktheme_placed_in( $post_id, $heading = '' ) {
	if ( ! function_exists( 'aklokaal_item_placements' ) ) {
		return '';
	}
	$items = array();
	foreach ( aklokaal_item_placements( $post_id ) as $cid ) {
		$c = get_post( $cid );
		if ( ! $c || 'publish' !== $c->post_status ) {
			continue;
		}
		if ( 'ak_paragraaf' === $c->post_type ) {
			$ch = get_post( $c->post_parent );
			if ( ! $ch || 'publish' !== $ch->post_status ) {
				continue;
			}
			$n    = aklokaal_paragraph_number( $c );
			$jaar = aklokaal_first_term( $ch->ID, 'ak_leerjaar' );
			$items[] = sprintf( '<li><a href="%1$s">%2$s%3$s</a> <span class="muted">%4$s</span></li>', esc_url( get_permalink( $ch ) . '#' . aklokaal_paragraph_anchor( $n, $c ) ), esc_html( aklokaal_paragraph_prefix( $n ) ), esc_html( get_the_title( $c ) ), esc_html( ( $jaar ? $jaar->name . ', ' : '' ) . 'H' . aklokaal_chapter_number( $ch ) . ' ' . get_the_title( $ch ) ) );
		} else {
			$items[] = sprintf( '<li><a href="%1$s">%2$s</a></li>', esc_url( get_permalink( $c ) ), esc_html( get_the_title( $c ) ) );
		}
	}
	if ( ! $items ) {
		return '';
	}
	return ( $heading ? '<h2>' . esc_html( $heading ) . '</h2>' : '' ) . '<ul class="placed-in">' . implode( '', $items ) . '</ul>';
}

/* ---------------------------------------------------------------- kaarten */

/** Adres van een interactieve kaart, of '' bij een afbeeldingskaart. */
function aktheme_map_app_url( $post ) {
	$post = get_post( $post );
	$app  = (string) get_post_meta( $post->ID, 'ak_app_url', true );
	if ( ! $app ) {
		return '';
	}
	$kind = get_post_meta( $post->ID, 'ak_kind', true );
	return ( 'interactief' === $kind || ! get_post_meta( $post->ID, 'ak_attachment_id', true ) ) ? $app : '';
}

/**
 * Kleine voorvertoning: de uitgelichte afbeelding, anders de kaartafbeelding,
 * anders de interactieve kaart zelf, verkleind en niet bedienbaar.
 */
function aktheme_map_preview( $post, $size = 'ak-wide' ) {
	$post = get_post( $post );
	if ( has_post_thumbnail( $post ) ) {
		return get_the_post_thumbnail( $post, $size, array( 'loading' => 'lazy', 'alt' => '' ) );
	}
	$att = (int) get_post_meta( $post->ID, 'ak_attachment_id', true );
	if ( $att ) {
		return wp_get_attachment_image( $att, $size, false, array( 'loading' => 'lazy', 'alt' => '' ) );
	}
	$app = aktheme_map_app_url( $post );
	if ( $app ) {
		return sprintf(
			'<iframe class="map-live" src="%s" title="" aria-hidden="true" tabindex="-1" loading="lazy" sandbox="%s" referrerpolicy="no-referrer" scrolling="no"></iframe>',
			esc_url( $app ),
			esc_attr( aktheme_sandbox( $app ) )
		);
	}
	return '<span class="map-blank" aria-hidden="true"></span>';
}

/** Alle gepubliceerde kaarten in de volgorde van de bibliotheek. */
function aktheme_all_maps() {
	return get_posts(
		array(
			'post_type'      => 'ak_kaart',
			'post_status'    => 'publish',
			'posts_per_page' => 100,
			'orderby'        => array(
				'menu_order' => 'ASC',
				'title'      => 'ASC',
			),
		)
	);
}

/** Strook bovenaan een kaartpagina: snel naar een andere kaart. */
function aktheme_map_switcher( $current_id ) {
	$maps = aktheme_all_maps();
	if ( count( $maps ) < 2 ) {
		return '';
	}
	$index = 0;
	foreach ( $maps as $i => $m ) {
		if ( (int) $m->ID === (int) $current_id ) {
			$index = $i;
		}
	}
	$prev = $maps[ ( $index - 1 + count( $maps ) ) % count( $maps ) ];
	$next = $maps[ ( $index + 1 ) % count( $maps ) ];
	ob_start();
	?>
	<nav class="map-switch" aria-label="<?php esc_attr_e( 'Andere kaarten', 'aklokaal' ); ?>" data-map-switch>
		<a class="icon-button map-switch__step" href="<?php echo esc_url( get_permalink( $prev ) ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Vorige kaart: %s', 'aklokaal' ), get_the_title( $prev ) ) ); ?>" data-map-prev><span aria-hidden="true">←</span></a>
		<ol class="map-switch__list">
			<?php foreach ( $maps as $m ) : ?>
				<?php $thumb = has_post_thumbnail( $m ) ? get_the_post_thumbnail( $m, 'thumbnail', array( 'loading' => 'lazy', 'alt' => '' ) ) : ( get_post_meta( $m->ID, 'ak_attachment_id', true ) ? wp_get_attachment_image( (int) get_post_meta( $m->ID, 'ak_attachment_id', true ), 'thumbnail', false, array( 'loading' => 'lazy', 'alt' => '' ) ) : '' ); ?>
				<li><a class="map-switch__item" href="<?php echo esc_url( get_permalink( $m ) ); ?>"<?php echo (int) $m->ID === (int) $current_id ? ' aria-current="page"' : ''; ?>>
					<?php if ( $thumb ) : ?><span class="map-switch__thumb"><?php echo $thumb; // phpcs:ignore ?></span><?php endif; ?>
					<span><?php echo esc_html( get_the_title( $m ) ); ?></span>
				</a></li>
			<?php endforeach; ?>
		</ol>
		<a class="icon-button map-switch__step" href="<?php echo esc_url( get_permalink( $next ) ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Volgende kaart: %s', 'aklokaal' ), get_the_title( $next ) ) ); ?>" data-map-next><span aria-hidden="true">→</span></a>
	</nav>
	<?php
	return ob_get_clean();
}
