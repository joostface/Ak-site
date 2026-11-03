<?php
/**
 * Beheer in wp-admin: één menu "Lesmateriaal" met
 *   Structuur          vakken, leerjaren, hoofdstukken, paragrafen en hun materiaal (slepen om te ordenen)
 *   + Toevoegen        hetzelfde uploadvenster als op de website
 *   Nieuws importeren  link plakken, controleren, publiceren
 * plus eenvoudige invoervelden (meta boxes) op de bewerkschermen.
 */

defined( 'ABSPATH' ) || exit;

/* ---------------------------------------------------------------- menu */

add_action(
	'admin_menu',
	function () {
		add_menu_page( __( 'Lesmateriaal', 'aklokaal' ), __( 'Lesmateriaal', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal', 'aklokaal_render_structure_page', 'dashicons-welcome-learn-more', 3 );
		add_submenu_page( 'aklokaal', __( 'Structuur', 'aklokaal' ), __( 'Structuur', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal', 'aklokaal_render_structure_page', 0 );
		add_submenu_page( 'aklokaal', __( 'Toevoegen', 'aklokaal' ), __( '+ Toevoegen', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal-toevoegen', 'aklokaal_render_add_page', 1 );
		add_submenu_page( 'aklokaal', __( 'Nieuws importeren', 'aklokaal' ), __( 'Nieuws importeren', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal-nieuws', 'aklokaal_render_news_page', 2 );
		add_submenu_page( 'aklokaal', __( 'Eigen nieuwsbericht', 'aklokaal' ), __( 'Eigen nieuwsbericht', 'aklokaal' ), AKLOKAAL_CAP, 'post-new.php?post_type=ak_nieuws', '', 2 );
		add_submenu_page( 'aklokaal', __( 'Vakken', 'aklokaal' ), __( 'Vakken', 'aklokaal' ), AKLOKAAL_CAP, 'edit-tags.php?taxonomy=ak_vak&post_type=ak_hoofdstuk', '', 50 );
		add_submenu_page( 'aklokaal', __( 'Leerjaren', 'aklokaal' ), __( 'Leerjaren', 'aklokaal' ), AKLOKAAL_CAP, 'edit-tags.php?taxonomy=ak_leerjaar&post_type=ak_hoofdstuk', '', 51 );
		add_submenu_page( 'aklokaal', __( 'Thema’s', 'aklokaal' ), __( 'Thema’s', 'aklokaal' ), AKLOKAAL_CAP, 'edit-tags.php?taxonomy=ak_thema&post_type=ak_materiaal', '', 52 );
	}
);

/** Rechten bijwerken na een plugin-update zonder heractivatie. */
add_action(
	'admin_init',
	function () {
		if ( get_option( 'aklokaal_version' ) !== AKLOKAAL_VERSION ) {
			aklokaal_activate();
			update_option( 'aklokaal_version', AKLOKAAL_VERSION );
		}
	}
);

/** Eenvoudig invoerscherm (klassieke editor) voor de eigen inhoudstypen. */
add_filter(
	'use_block_editor_for_post_type',
	function ( $use, $post_type ) {
		return 0 === strpos( $post_type, 'ak_' ) ? false : $use;
	},
	10,
	2
);

function aklokaal_admin_config() {
	return array(
		'rest'    => esc_url_raw( rest_url( 'aklokaal/v1/' ) ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'types'   => aklokaal_material_types(),
		'maxSize' => aklokaal_max_upload_bytes(),
		'accept'  => '.' . implode( ',.', array_keys( aklokaal_allowed_files() ) ),
		'admin'   => admin_url(),
	);
}

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( false === strpos( $hook, 'aklokaal' ) ) {
			return;
		}
		wp_enqueue_style( 'aklokaal-admin', AKLOKAAL_URL . 'assets/admin.css', array(), AKLOKAAL_VERSION );
		wp_enqueue_style( 'aklokaal-quick-add', AKLOKAAL_URL . 'assets/quick-add.css', array(), AKLOKAAL_VERSION );
		wp_enqueue_script( 'aklokaal-quick-add', AKLOKAAL_URL . 'assets/quick-add.js', array(), AKLOKAAL_VERSION, true );
		wp_localize_script( 'aklokaal-quick-add', 'AKLOKAAL', aklokaal_admin_config() );
		if ( 'toplevel_page_aklokaal' === $hook ) {
			wp_enqueue_script( 'aklokaal-structure', AKLOKAAL_URL . 'assets/structure.js', array( 'aklokaal-quick-add' ), AKLOKAAL_VERSION, true );
		}
		if ( false !== strpos( $hook, 'aklokaal-nieuws' ) ) {
			wp_enqueue_script( 'aklokaal-news', AKLOKAAL_URL . 'assets/news-import.js', array( 'aklokaal-quick-add' ), AKLOKAAL_VERSION, true );
		}
	}
);

function aklokaal_render_structure_page() {
	?>
	<div class="wrap aklokaal-admin">
		<h1><?php esc_html_e( 'Lesmateriaal: structuur', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Sleep hoofdstukken, paragrafen en materiaal om de volgorde te veranderen. Klik op een titel om hem te hernoemen. Wijzigingen worden direct opgeslagen.', 'aklokaal' ); ?></p>
		<div id="aklokaal-structure" class="aklokaal-structure" aria-live="polite"><p><?php esc_html_e( 'Laden…', 'aklokaal' ); ?></p></div>
		<noscript><p><?php esc_html_e( 'Voor dit scherm is JavaScript nodig.', 'aklokaal' ); ?></p></noscript>
	</div>
	<?php
}

function aklokaal_render_add_page() {
	?>
	<div class="wrap aklokaal-admin">
		<h1><?php esc_html_e( 'Materiaal toevoegen', 'aklokaal' ); ?></h1>
		<div class="aklokaal-inline-add" data-aklokaal-inline></div>
	</div>
	<?php
}

function aklokaal_render_news_page() {
	?>
	<div class="wrap aklokaal-admin">
		<h1><?php esc_html_e( 'Nieuws importeren', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Plak de link van een nieuwsartikel. We halen titel, uitgever, datum, beschrijving en afbeelding op. Controleer alles en publiceer.', 'aklokaal' ); ?></p>
		<p><?php esc_html_e( 'Zelf iets schrijven, zonder link naar een krant?', 'aklokaal' ); ?> <a class="button" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=ak_nieuws' ) ); ?>"><?php esc_html_e( 'Eigen nieuwsbericht schrijven', 'aklokaal' ); ?></a></p>
		<div id="aklokaal-news-import"></div>
		<?php aklokaal_render_bookmarklet(); ?>
	</div>
	<?php
}

/**
 * Bladwijzerknop: leest in je eigen browser de gegevens van het artikel dat je open hebt
 * (titel, bron, auteur, datum, beschrijving, afbeelding) en opent het importformulier, al ingevuld.
 * Handig bij sites die automatische bezoekers een cookiescherm tonen (zoals NU.nl, AD, de Volkskrant).
 * Er wordt niets van het artikel zelf overgenomen, alleen de openbare metadata.
 */
function aklokaal_render_bookmarklet() {
	$target = admin_url( 'admin.php?page=aklokaal-nieuws' );
	$js     = "(()=>{const m=n=>{const e=document.querySelector('meta[property=\"'+n+'\"],meta[name=\"'+n+'\"]');return e?e.content:''};"
		. "let ld={};for(const s of document.querySelectorAll('script[type=\"application/ld+json\"]')){try{let d=JSON.parse(s.textContent);d=d['@graph']||[].concat(d);for(const x of d){if([].concat(x['@type']||[]).some(y=>/Article/.test(y))){ld=x;break}}}catch(e){}}"
		. "const nm=v=>!v?'':typeof v=='string'?v:Array.isArray(v)?v.map(nm).filter(Boolean).join(', '):(v.name||'');"
		. "const im=v=>!v?'':typeof v=='string'?v:Array.isArray(v)?im(v[0]):(v.url||'');"
		. "const c=document.querySelector('link[rel=canonical]');"
		. "const d={url:c?c.href:location.href,title:ld.headline||m('og:title')||document.title,publisher:nm(ld.publisher)||m('og:site_name'),author:nm(ld.author)||m('author'),published:String(ld.datePublished||m('article:published_time')||'').slice(0,10),description:String(ld.description||m('og:description')||m('description')).slice(0,600),image_url:im(ld.image)||m('og:image')};"
		. "window.open(" . wp_json_encode( $target ) . "+'#ak='+encodeURIComponent(JSON.stringify(d)))})()";
	?>
	<div class="aklokaal-bookmarklet">
		<h2><?php esc_html_e( 'Werkt het ophalen niet? Gebruik de bladwijzerknop', 'aklokaal' ); ?></h2>
		<p><?php esc_html_e( 'Sommige nieuwssites (zoals NU.nl, AD en de Volkskrant) tonen automatische bezoekers eerst een cookiescherm. Jouw eigen browser kan het artikel wel lezen. Sleep deze knop één keer naar je bladwijzerbalk:', 'aklokaal' ); ?></p>
		<p><a class="button button-primary aklokaal-bookmarklet__knop" href="javascript:<?php echo esc_attr( $js ); ?>" onclick="alert('<?php echo esc_js( __( 'Sleep deze knop naar je bladwijzerbalk. Klik er later op terwijl je een nieuwsartikel open hebt.', 'aklokaal' ) ); ?>');return false;">＋ <?php esc_html_e( 'Naar Aardrijkskundelokaal', 'aklokaal' ); ?></a></p>
		<p class="description"><?php esc_html_e( 'Daarna: open een artikel, accepteer eventueel de cookies, en klik op de bladwijzer. Dit formulier opent dan in een nieuw tabblad, al ingevuld. Zie je je bladwijzerbalk niet? Druk op Ctrl+Shift+B (Mac: Cmd+Shift+B).', 'aklokaal' ); ?></p>
	</div>
	<?php
}

/* ---------------------------------------------------------------- invoervelden */

/** Velden per type. Een veld: [label, soort, uitleg]. */
function aklokaal_meta_fields() {
	$types = aklokaal_material_types();
	return array(
		'ak_hoofdstuk'  => array(
			'ak_nummer' => array( __( 'Hoofdstuknummer', 'aklokaal' ), 'text', __( 'Bijvoorbeeld 2. Paragrafen worden dan 2.1, 2.2 ...', 'aklokaal' ) ),
		),
		'ak_paragraaf'  => array(
			'ak_nummer' => array( __( 'Eigen nummer (optioneel)', 'aklokaal' ), 'text', __( 'Leeg laten voor automatische nummering.', 'aklokaal' ) ),
		),
		'ak_materiaal'  => array(
			'ak_type'          => array( __( 'Soort materiaal', 'aklokaal' ), $types, '' ),
			'ak_attachment_id' => array( __( 'Bestand', 'aklokaal' ), 'media', __( 'Vervang je het bestand, dan blijven alle plaatsingen en links werken.', 'aklokaal' ) ),
			'ak_preview_id'    => array( __( 'PDF-voorvertoning (optioneel)', 'aklokaal' ), 'media', __( 'Wordt automatisch gemaakt als de conversiedienst draait.', 'aklokaal' ) ),
			'ak_url'           => array( __( 'Link', 'aklokaal' ), 'url', __( 'Voor video’s en websites.', 'aklokaal' ) ),
			'ak_source'        => array( __( 'Bron', 'aklokaal' ), 'text', __( 'Bij materiaal van anderen: maker en licentie.', 'aklokaal' ) ),
		),
		'ak_nieuws'     => array(
			'ak_url'        => array( __( 'Link naar het artikel', 'aklokaal' ), 'url', __( 'Leeg laten voor een eigen bericht: dan opent de kaart je eigen tekst op deze site.', 'aklokaal' ) ),
			'ak_publisher'  => array( __( 'Uitgever', 'aklokaal' ), 'text', __( 'Bij een eigen bericht leeg laten: dan staat de naam van de site erbij.', 'aklokaal' ) ),
			'ak_author'     => array( __( 'Auteur', 'aklokaal' ), 'text', '' ),
			'ak_published'  => array( __( 'Publicatiedatum', 'aklokaal' ), 'date', '' ),
			'ak_image_url'  => array( __( 'Afbeelding (URL bij de bron)', 'aklokaal' ), 'url', '' ),
			'ak_show_image' => array( __( 'Afbeelding van de bron tonen', 'aklokaal' ), 'checkbox', __( 'Uitzetten als je niet zeker weet of het mag. Je kunt ook een eigen uitgelichte afbeelding kiezen.', 'aklokaal' ) ),
			'ak_question'   => array( __( 'Geografische vraag bij dit artikel', 'aklokaal' ), 'text', '' ),
		),
		'ak_collectie'  => array(
			'ak_questions' => array( __( 'Onderzoeksvragen', 'aklokaal' ), 'textarea', __( 'Eén vraag per regel.', 'aklokaal' ) ),
		),
		'ak_kaart'      => array(
			'ak_kind'          => array(
				__( 'Soort kaart', 'aklokaal' ),
				array(
					'afbeelding'  => __( 'Afbeelding (inzoomen en verschuiven)', 'aklokaal' ),
					'interactief' => __( 'Interactieve kaart (eigen HTML/JS, afgeschermd)', 'aklokaal' ),
				),
				'',
			),
			'ak_attachment_id' => array( __( 'Kaartafbeelding', 'aklokaal' ), 'media', '' ),
			'ak_app_url'       => array( __( 'Adres van de interactieve kaart', 'aklokaal' ), 'url', __( 'Bij voorkeur op een apart subdomein, bijvoorbeeld https://apps.jouwdomein.nl/kaart/', 'aklokaal' ) ),
			'ak_legend'        => array( __( 'Legenda', 'aklokaal' ), 'textarea', __( 'Eén regel per onderdeel, bijvoorbeeld: Donkergroen = laagland', 'aklokaal' ) ),
			'ak_source'        => array( __( 'Bron', 'aklokaal' ), 'text', '' ),
		),
		'ak_toepassing' => array(
			'ak_app_url' => array( __( 'Adres van de toepassing', 'aklokaal' ), 'url', __( 'Bij voorkeur op een apart subdomein. De toepassing draait in een afgeschermd venster.', 'aklokaal' ) ),
			'ak_height'  => array( __( 'Hoogte in pixels', 'aklokaal' ), 'number', __( 'Standaard 640.', 'aklokaal' ) ),
			'ak_source'  => array( __( 'Bron of maker', 'aklokaal' ), 'text', '' ),
		),
	);
}

add_action(
	'add_meta_boxes',
	function ( $post_type ) {
		$fields = aklokaal_meta_fields();
		if ( isset( $fields[ $post_type ] ) ) {
			add_meta_box( 'aklokaal-fields', __( 'Gegevens', 'aklokaal' ), 'aklokaal_render_meta_box', $post_type, 'normal', 'high' );
		}
		if ( in_array( $post_type, aklokaal_placeable_types(), true ) ) {
			add_meta_box( 'aklokaal-used', __( 'Staat in', 'aklokaal' ), 'aklokaal_render_used_box', $post_type, 'side' );
		}
		if ( 'ak_paragraaf' === $post_type ) {
			add_meta_box( 'aklokaal-parent', __( 'Hoofdstuk', 'aklokaal' ), 'aklokaal_render_parent_box', $post_type, 'side', 'high' );
		}
		if ( 'ak_collectie' === $post_type ) {
			add_meta_box( 'aklokaal-collection', __( 'Artikelen in deze bundel', 'aklokaal' ), 'aklokaal_render_collection_box', $post_type, 'normal', 'high' );
		}
	}
);

function aklokaal_render_meta_box( $post ) {
	wp_nonce_field( 'aklokaal_meta', 'aklokaal_meta_nonce' );
	wp_enqueue_media();
	$fields = aklokaal_meta_fields()[ $post->post_type ];
	echo '<div class="aklokaal-fields">';
	foreach ( $fields as $key => $f ) {
		list( $label, $kind, $help ) = $f;
		$val                         = get_post_meta( $post->ID, $key, true );
		$id                          = 'aklokaal-' . $key;
		echo '<p class="aklokaal-field">';
		if ( 'checkbox' === $kind ) {
			printf( '<label><input type="checkbox" name="%1$s" value="1" %2$s> %3$s</label>', esc_attr( $key ), checked( (bool) $val, true, false ), esc_html( $label ) );
		} else {
			printf( '<label for="%1$s"><strong>%2$s</strong></label><br>', esc_attr( $id ), esc_html( $label ) );
			if ( is_array( $kind ) ) {
				printf( '<select id="%1$s" name="%2$s">', esc_attr( $id ), esc_attr( $key ) );
				foreach ( $kind as $v => $l ) {
					printf( '<option value="%1$s" %2$s>%3$s</option>', esc_attr( $v ), selected( $val, $v, false ), esc_html( $l ) );
				}
				echo '</select>';
			} elseif ( 'textarea' === $kind ) {
				printf( '<textarea id="%1$s" name="%2$s" rows="4" class="large-text">%3$s</textarea>', esc_attr( $id ), esc_attr( $key ), esc_textarea( $val ) );
			} elseif ( 'media' === $kind ) {
				$url = $val ? wp_get_attachment_url( (int) $val ) : '';
				printf(
					'<input type="hidden" id="%1$s" name="%2$s" value="%3$s"> <span class="aklokaal-media-name">%4$s</span> <button type="button" class="button" data-aklokaal-media="%1$s">%5$s</button> <button type="button" class="button-link" data-aklokaal-media-clear="%1$s">%6$s</button>',
					esc_attr( $id ),
					esc_attr( $key ),
					esc_attr( $val ),
					$url ? '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . esc_html( basename( $url ) ) . '</a>' : esc_html__( 'Geen bestand', 'aklokaal' ),
					esc_html__( 'Kies of upload', 'aklokaal' ),
					esc_html__( 'Leegmaken', 'aklokaal' )
				);
			} else {
				$type = in_array( $kind, array( 'url', 'number', 'date' ), true ) ? $kind : 'text';
				printf( '<input type="%1$s" id="%2$s" name="%3$s" value="%4$s" class="regular-text">', esc_attr( $type ), esc_attr( $id ), esc_attr( $key ), esc_attr( $val ) );
			}
		}
		if ( $help ) {
			echo '<br><span class="description">' . esc_html( $help ) . '</span>';
		}
		echo '</p>';
	}
	echo '</div>';
	?>
	<script>
	document.querySelectorAll('[data-aklokaal-media]').forEach(function (b) {
		b.addEventListener('click', function () {
			var input = document.getElementById(b.dataset.aklokaalMedia);
			var frame = wp.media({ multiple: false });
			frame.on('select', function () {
				var a = frame.state().get('selection').first().toJSON();
				input.value = a.id;
				b.parentNode.querySelector('.aklokaal-media-name').textContent = a.filename;
			});
			frame.open();
		});
	});
	document.querySelectorAll('[data-aklokaal-media-clear]').forEach(function (b) {
		b.addEventListener('click', function () {
			document.getElementById(b.dataset.aklokaalMediaClear).value = '';
			b.parentNode.querySelector('.aklokaal-media-name').textContent = '—';
		});
	});
	</script>
	<?php
}

function aklokaal_render_used_box( $post ) {
	$places = aklokaal_item_placements( $post->ID );
	if ( ! $places ) {
		echo '<p>' . esc_html__( 'Nog nergens geplaatst. Plaats het via Lesmateriaal → Structuur.', 'aklokaal' ) . '</p>';
		return;
	}
	echo '<ul>';
	foreach ( $places as $cid ) {
		$c = get_post( $cid );
		if ( ! $c ) {
			continue;
		}
		if ( 'ak_paragraaf' === $c->post_type ) {
			$ch    = get_post( $c->post_parent );
			$label = aklokaal_paragraph_label( $c ) . ( $ch ? ' (' . get_the_title( $ch ) . ')' : '' );
			$link  = $ch ? get_permalink( $ch ) . '#' . aklokaal_paragraph_anchor_for( $c ) : '';
		} else {
			$label = get_the_title( $c );
			$link  = get_permalink( $c );
		}
		printf( '<li><a href="%1$s" target="_blank" rel="noopener">%2$s</a></li>', esc_url( $link ), esc_html( $label ) );
	}
	echo '</ul>';
}

function aklokaal_render_parent_box( $post ) {
	$chapters = aklokaal_get_chapters( array( 'status' => array( 'publish', 'draft', 'private' ) ) );
	echo '<select name="aklokaal_parent" style="width:100%">';
	echo '<option value="0">' . esc_html__( '— Kies een hoofdstuk —', 'aklokaal' ) . '</option>';
	foreach ( $chapters as $c ) {
		$jaar = aklokaal_first_term( $c->ID, 'ak_leerjaar' );
		printf( '<option value="%1$d" %2$s>%3$s</option>', (int) $c->ID, selected( $post->post_parent, $c->ID, false ), esc_html( ( $jaar ? $jaar->name . ' · ' : '' ) . 'H' . aklokaal_chapter_number( $c ) . ' ' . get_the_title( $c ) ) );
	}
	echo '</select>';
}

function aklokaal_render_collection_box( $post ) {
	$items = aklokaal_get_items( $post->ID );
	$ids   = implode( ',', wp_list_pluck( $items, 'id' ) );
	$news  = get_posts(
		array(
			'post_type'      => 'ak_nieuws',
			'post_status'    => array( 'publish', 'draft' ),
			'posts_per_page' => 200,
		)
	);
	echo '<p class="description">' . esc_html__( 'Vink artikelen aan en zet ze in volgorde met de pijltjes. Een artikel kan in meerdere bundels staan.', 'aklokaal' ) . '</p>';
	echo '<input type="hidden" name="aklokaal_collection" id="aklokaal-collection" value="' . esc_attr( $ids ) . '">';
	echo '<ol class="aklokaal-collection" id="aklokaal-collection-list">';
	$by_id = array();
	foreach ( $news as $n ) {
		$by_id[ $n->ID ] = $n;
	}
	$order = array_merge( wp_list_pluck( $items, 'id' ), array_diff( array_keys( $by_id ), wp_list_pluck( $items, 'id' ) ) );
	foreach ( $order as $nid ) {
		if ( empty( $by_id[ $nid ] ) ) {
			continue;
		}
		$on = in_array( $nid, wp_list_pluck( $items, 'id' ), true );
		printf(
			'<li data-id="%1$d"><label><input type="checkbox" %2$s> %3$s <span class="description">%4$s</span></label> <button type="button" class="button-link" data-up aria-label="%5$s">↑</button> <button type="button" class="button-link" data-down aria-label="%6$s">↓</button></li>',
			(int) $nid,
			checked( $on, true, false ),
			esc_html( get_the_title( $nid ) ),
			esc_html( get_post_meta( $nid, 'ak_publisher', true ) ),
			esc_attr__( 'Omhoog', 'aklokaal' ),
			esc_attr__( 'Omlaag', 'aklokaal' )
		);
	}
	echo '</ol>';
	?>
	<script>
	(function () {
		var list = document.getElementById('aklokaal-collection-list'), out = document.getElementById('aklokaal-collection');
		function sync() { out.value = [].slice.call(list.children).filter(function (li) { return li.querySelector('input').checked; }).map(function (li) { return li.dataset.id; }).join(','); }
		list.addEventListener('change', sync);
		list.addEventListener('click', function (e) {
			var li = e.target.closest('li'); if (!li) return;
			if (e.target.hasAttribute('data-up') && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
			if (e.target.hasAttribute('data-down') && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
			sync();
		});
	})();
	</script>
	<?php
}

add_action(
	'save_post',
	function ( $post_id, $post ) {
		if ( ! isset( $_POST['aklokaal_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['aklokaal_meta_nonce'] ), 'aklokaal_meta' ) ) {
			return;
		}
		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! aklokaal_can_manage() ) {
			return;
		}
		$fields = aklokaal_meta_fields();
		if ( empty( $fields[ $post->post_type ] ) ) {
			return;
		}
		// phpcs:disable WordPress.Security.ValidatedSanitizedInput
		foreach ( $fields[ $post->post_type ] as $key => $f ) {
			$kind = $f[1];
			$raw  = isset( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : '';
			if ( 'checkbox' === $kind ) {
				update_post_meta( $post_id, $key, ! empty( $raw ) );
			} elseif ( 'media' === $kind || 'number' === $kind ) {
				update_post_meta( $post_id, $key, absint( $raw ) );
			} elseif ( 'url' === $kind ) {
				update_post_meta( $post_id, $key, esc_url_raw( $raw, array( 'http', 'https' ) ) );
			} elseif ( 'textarea' === $kind ) {
				update_post_meta( $post_id, $key, sanitize_textarea_field( $raw ) );
			} elseif ( is_array( $kind ) ) {
				update_post_meta( $post_id, $key, isset( $kind[ $raw ] ) ? $raw : key( $kind ) );
			} else {
				update_post_meta( $post_id, $key, sanitize_text_field( $raw ) );
			}
		}
		if ( 'ak_nieuws' === $post->post_type ) {
			update_post_meta( $post_id, 'ak_url_key', aklokaal_normalize_url( get_post_meta( $post_id, 'ak_url', true ) ) );
		}
		if ( 'ak_collectie' === $post->post_type && isset( $_POST['aklokaal_collection'] ) ) {
			$ids = array_filter( array_map( 'absint', explode( ',', wp_unslash( $_POST['aklokaal_collection'] ) ) ) );
			aklokaal_set_items( $post_id, $ids );
		}
		// phpcs:enable
	},
	10,
	2
);

/** Paragraaf: hoofdstuk kiezen in het bewerkscherm. */
add_filter(
	'wp_insert_post_data',
	function ( $data, $postarr ) {
		if ( 'ak_paragraaf' === $data['post_type'] && isset( $_POST['aklokaal_parent'], $_POST['aklokaal_meta_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['aklokaal_meta_nonce'] ), 'aklokaal_meta' ) ) {
			$parent = absint( $_POST['aklokaal_parent'] );
			if ( 'ak_hoofdstuk' === get_post_type( $parent ) ) {
				$data['post_parent'] = $parent;
			}
		}
		return $data;
	},
	10,
	2
);

/* ---------------------------------------------------------------- lijsten */

add_filter(
	'manage_ak_materiaal_posts_columns',
	function ( $cols ) {
		$cols['ak_type'] = __( 'Soort', 'aklokaal' );
		$cols['ak_used'] = __( 'Geplaatst', 'aklokaal' );
		return $cols;
	}
);
add_action(
	'manage_ak_materiaal_posts_custom_column',
	function ( $col, $id ) {
		if ( 'ak_type' === $col ) {
			$t = aklokaal_material_types();
			$k = get_post_meta( $id, 'ak_type', true );
			echo esc_html( isset( $t[ $k ] ) ? $t[ $k ] : $k );
		}
		if ( 'ak_used' === $col ) {
			echo (int) count( aklokaal_item_placements( $id ) ) . '×';
		}
	},
	10,
	2
);

/* ---------------------------------------------------------------- beveiliging beheer */

/** Geen gebruikersnamen prijsgeven via de REST API of ?author=1. */
add_filter(
	'rest_endpoints',
	function ( $endpoints ) {
		if ( ! is_user_logged_in() ) {
			unset( $endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
		}
		return $endpoints;
	}
);
add_action(
	'template_redirect',
	function () {
		if ( is_author() ) {
			wp_safe_redirect( home_url( '/' ), 301 );
			exit;
		}
	}
);
add_filter( 'xmlrpc_enabled', '__return_false' );
