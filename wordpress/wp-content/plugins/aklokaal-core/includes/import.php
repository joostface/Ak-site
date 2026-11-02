<?php
/**
 * Structuur importeren: plak een lijst met hoofdstukken en paragrafen.
 *
 * Herkent onder andere:
 *   * 1 Landschappen
 *      * 1.1 Bergen groeien, bergen verdwijnen
 *      * België en Nepal                 ← paragraaf zonder nummer
 *   Hoofdstuk 2: Steden
 *   2.1 Steden worden steeds belangrijker
 * Links in Markdown-vorm [tekst](url) worden genegeerd; alleen de tekst telt.
 * Bestaande hoofdstukken (zelfde titel, vak en leerjaar) worden aangevuld, niet verdubbeld.
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/import-presets.php';

add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'aklokaal', __( 'Structuur importeren', 'aklokaal' ), __( 'Importeren', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal-import', 'aklokaal_render_import', 3 );
	},
	20
);

/**
 * Lees een geplakte lijst.
 *
 * @return array<int, array{number:string, title:string, paragraphs: array<int, array{number:string, title:string}>}>
 */
function aklokaal_parse_structure( $text ) {
	$lines = array();
	foreach ( preg_split( '/\R/u', (string) $text ) as $raw ) {
		if ( '' === trim( $raw ) ) {
			continue;
		}
		preg_match( '/^[ \t]*/', str_replace( "\t", '    ', $raw ), $m );
		$indent = strlen( $m[0] );
		$t      = trim( $raw );
		$t      = preg_replace( '/^([*\-•+]|\d+[.)](?=\s))\s+/u', '', $t ); // opsommingsteken
		$t      = preg_replace( '/\[([^\]]+)\]\([^)]*\)/u', '$1', $t );     // [tekst](link)
		$t      = preg_replace( '#https?://\S+#u', '', $t );                  // losse links
		$t      = trim( preg_replace( '/\s+/u', ' ', $t ), " \t-–:" );
		if ( '' !== $t ) {
			$lines[] = array(
				'indent' => $indent,
				'text'   => $t,
			);
		}
	}
	if ( ! $lines ) {
		return array();
	}
	$min      = min( wp_list_pluck( $lines, 'indent' ) );
	$indented = count( array_unique( wp_list_pluck( $lines, 'indent' ) ) ) > 1;
	$out      = array();
	foreach ( $lines as $l ) {
		$t       = $l['text'];
		$is_para = preg_match( '/^§?\s*(\d+\.\d+[a-z]?)\s+(.+)$/u', $t, $pm );
		$is_ch   = preg_match( '/^(?:H(?:oofdstuk)?\s*)?(\d+)(?![\d.])[\s:.)]+(.+)$/iu', $t, $cm );
		$chapter = $indented ? ( $l['indent'] === $min && ! $is_para ) : ( $is_ch && ! $is_para );
		if ( $chapter ) {
			$out[] = array(
				'number'     => $is_ch ? $cm[1] : '',
				'title'      => $is_ch ? trim( $cm[2] ) : $t,
				'paragraphs' => array(),
			);
		} elseif ( $out ) {
			$out[ count( $out ) - 1 ]['paragraphs'][] = $is_para
				? array(
					'number' => $pm[1],
					'title'  => trim( $pm[2] ),
				)
				: array(
					'number' => '-',
					'title'  => $t,
				);
		}
	}
	return $out;
}

/**
 * Zet een gelezen structuur in WordPress.
 *
 * @return array{chapters:int, paragraphs:int, skipped:int}
 */
function aklokaal_import_structure( $tree, $vak_id, $jaar_id, $publish ) {
	$stats = array(
		'chapters'   => 0,
		'paragraphs' => 0,
		'skipped'    => 0,
	);
	$existing = aklokaal_get_chapters(
		array(
			'vak'      => $vak_id,
			'leerjaar' => $jaar_id,
			'status'   => array( 'publish', 'draft', 'private' ),
		)
	);
	$order    = count( $existing );
	foreach ( $tree as $ch ) {
		$found = null;
		foreach ( $existing as $e ) {
			if ( 0 === strcasecmp( trim( $e->post_title ), $ch['title'] ) ) {
				$found = $e;
				break;
			}
		}
		if ( $found ) {
			$cid = $found->ID;
		} else {
			$cid = wp_insert_post(
				array(
					'post_type'   => 'ak_hoofdstuk',
					'post_title'  => sanitize_text_field( $ch['title'] ),
					'post_status' => $publish ? 'publish' : 'draft',
					'menu_order'  => ++$order,
				)
			);
			if ( ! $cid || is_wp_error( $cid ) ) {
				continue;
			}
			wp_set_object_terms( $cid, array( (int) $vak_id ), 'ak_vak' );
			wp_set_object_terms( $cid, array( (int) $jaar_id ), 'ak_leerjaar' );
			if ( '' !== $ch['number'] ) {
				update_post_meta( $cid, 'ak_nummer', sanitize_text_field( $ch['number'] ) );
			}
			++$stats['chapters'];
		}
		$paras  = aklokaal_get_paragraphs( $cid, array( 'publish', 'draft', 'private' ) );
		$titles = array_map( 'strtolower', wp_list_pluck( $paras, 'post_title' ) );
		$pos    = count( $paras );
		$auto   = 0;
		foreach ( $paras as $p ) {
			if ( '-' !== get_post_meta( $p->ID, 'ak_nummer', true ) ) {
				++$auto;
			}
		}
		foreach ( $ch['paragraphs'] as $p ) {
			if ( in_array( strtolower( $p['title'] ), $titles, true ) ) {
				++$stats['skipped'];
				continue;
			}
			$pid = wp_insert_post(
				array(
					'post_type'   => 'ak_paragraaf',
					'post_title'  => sanitize_text_field( $p['title'] ),
					'post_parent' => $cid,
					'post_status' => 'publish',
					'menu_order'  => ++$pos,
				)
			);
			if ( ! $pid || is_wp_error( $pid ) ) {
				continue;
			}
			if ( '-' === $p['number'] ) {
				update_post_meta( $pid, 'ak_nummer', '-' );
			} else {
				++$auto;
				// Alleen een eigen nummer opslaan als het afwijkt van de automatische nummering.
				$expected = ( '' !== aklokaal_chapter_number( $cid ) ? aklokaal_chapter_number( $cid ) . '.' : '' ) . $auto;
				if ( $p['number'] !== $expected ) {
					update_post_meta( $pid, 'ak_nummer', sanitize_text_field( $p['number'] ) );
				}
			}
			++$stats['paragraphs'];
		}
	}
	return $stats;
}

function aklokaal_render_import() {
	$text    = '';
	$tree    = array();
	$message = '';
	$vak     = 0;
	$jaar    = 0;
	$publish = false;
	if ( isset( $_POST['aklokaal_import_text'] ) && check_admin_referer( 'aklokaal_import' ) && aklokaal_can_manage() ) {
		$text    = sanitize_textarea_field( wp_unslash( $_POST['aklokaal_import_text'] ) );
		$presets = aklokaal_import_presets();
		$keuze   = isset( $_POST['preset'] ) ? sanitize_key( wp_unslash( $_POST['preset'] ) ) : '';
		if ( isset( $_POST['laden'] ) && isset( $presets[ $keuze ] ) ) {
			$text = $presets[ $keuze ]['tekst'];
		}
		$vak     = isset( $_POST['vak'] ) ? absint( $_POST['vak'] ) : 0;
		$jaar    = isset( $_POST['leerjaar'] ) ? absint( $_POST['leerjaar'] ) : 0;
		$publish = ! empty( $_POST['publish'] );
		$tree    = aklokaal_parse_structure( $text );
		if ( isset( $_POST['doen'] ) && $tree && $vak && $jaar ) {
			$s       = aklokaal_import_structure( $tree, $vak, $jaar, $publish );
			$message = sprintf(
				/* translators: 1: hoofdstukken, 2: paragrafen, 3: overgeslagen */
				__( 'Klaar: %1$d hoofdstukken en %2$d paragrafen aangemaakt. %3$d paragrafen bestonden al en zijn overgeslagen.', 'aklokaal' ),
				$s['chapters'],
				$s['paragraphs'],
				$s['skipped']
			);
			$tree    = array();
			$text    = '';
		}
	}
	$vakken = aklokaal_sorted_terms( 'ak_vak' );
	$jaren  = aklokaal_sorted_terms( 'ak_leerjaar' );
	?>
	<div class="wrap aklokaal-admin">
		<h1><?php esc_html_e( 'Structuur importeren', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Plak een lijst met hoofdstukken en paragrafen, bijvoorbeeld uit de inhoudsopgave van je methode. Links worden genegeerd. Paragrafen zonder nummer (zoals een casus) krijgen geen nummer en verschuiven de nummering niet.', 'aklokaal' ); ?></p>
		<?php if ( $message ) : ?>
			<div class="notice notice-success"><p><?php echo esc_html( $message ); ?> <a href="<?php echo esc_url( admin_url( 'admin.php?page=aklokaal' ) ); ?>"><?php esc_html_e( 'Naar de structuur', 'aklokaal' ); ?></a></p></div>
		<?php endif; ?>
		<form method="post" style="max-width:900px">
			<?php wp_nonce_field( 'aklokaal_import' ); ?>
			<p style="display:flex;gap:16px;flex-wrap:wrap">
				<label><?php esc_html_e( 'Vak', 'aklokaal' ); ?><br>
					<select name="vak"><?php foreach ( $vakken as $v ) : ?><option value="<?php echo (int) $v->term_id; ?>" <?php selected( $vak, $v->term_id ); ?>><?php echo esc_html( $v->name ); ?></option><?php endforeach; ?></select>
				</label>
				<label><?php esc_html_e( 'Leerjaar', 'aklokaal' ); ?><br>
					<select name="leerjaar"><?php foreach ( $jaren as $j ) : ?><option value="<?php echo (int) $j->term_id; ?>" <?php selected( $jaar, $j->term_id ); ?>><?php echo esc_html( $j->name ); ?></option><?php endforeach; ?></select>
				</label>
				<label style="align-self:end"><input type="checkbox" name="publish" value="1" <?php checked( $publish ); ?>> <?php esc_html_e( 'Hoofdstukken direct publiceren (anders als concept)', 'aklokaal' ); ?></label>
			</p>
			<p>
				<label><?php esc_html_e( 'Kant-en-klare indeling', 'aklokaal' ); ?><br>
					<select name="preset"><option value=""><?php esc_html_e( '— zelf plakken —', 'aklokaal' ); ?></option><?php foreach ( aklokaal_import_presets() as $k => $pr ) : ?><option value="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $pr['naam'] ); ?></option><?php endforeach; ?></select>
				</label>
				<button class="button" name="laden" value="1"><?php esc_html_e( 'Laden', 'aklokaal' ); ?></button>
			</p>
			<p><textarea name="aklokaal_import_text" rows="16" class="large-text code" placeholder="* 1 Landschappen&#10;   * 1.1 Bergen groeien, bergen verdwijnen&#10;   * België en Nepal"><?php echo esc_textarea( $text ); ?></textarea></p>
			<p>
				<button class="button" name="bekijken" value="1"><?php esc_html_e( 'Voorbeeld bekijken', 'aklokaal' ); ?></button>
				<?php if ( $tree ) : ?><button class="button button-primary" name="doen" value="1"><?php esc_html_e( 'Importeren', 'aklokaal' ); ?></button><?php endif; ?>
			</p>
		</form>
		<?php if ( $tree ) : ?>
			<h2><?php esc_html_e( 'Voorbeeld', 'aklokaal' ); ?></h2>
			<p class="description"><?php esc_html_e( 'Klopt dit? Klik dan op Importeren. Zo niet: pas de tekst aan en bekijk opnieuw.', 'aklokaal' ); ?></p>
			<ol style="list-style:none;padding:0">
				<?php foreach ( $tree as $ch ) : ?>
					<li style="margin:12px 0"><strong><?php echo esc_html( ( '' !== $ch['number'] ? 'H' . $ch['number'] . ' ' : '' ) . $ch['title'] ); ?></strong>
						<ul style="margin:6px 0 0 24px">
							<?php foreach ( $ch['paragraphs'] as $p ) : ?>
								<li><?php echo esc_html( ( '-' !== $p['number'] ? '§' . $p['number'] . ' ' : '— ' ) . $p['title'] ); ?></li>
							<?php endforeach; ?>
						</ul>
					</li>
				<?php endforeach; ?>
			</ol>
		<?php endif; ?>
	</div>
	<?php
}
