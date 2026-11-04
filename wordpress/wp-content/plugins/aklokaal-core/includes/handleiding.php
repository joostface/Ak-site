<?php
/**
 * Volgorde van vakken en leerjaren instellen, en een korte handleiding in wp-admin.
 */

defined( 'ABSPATH' ) || exit;

/* ---------------------------------------------------------------- volgorde van termen */

foreach ( array( 'ak_vak', 'ak_leerjaar' ) as $aklokaal_tax ) {
	add_action(
		$aklokaal_tax . '_add_form_fields',
		function () {
			wp_nonce_field( 'aklokaal_term', 'aklokaal_term_nonce' );
			echo '<div class="form-field"><label for="ak_order">' . esc_html__( 'Volgorde', 'aklokaal' ) . '</label><input type="number" name="ak_order" id="ak_order" value="10" min="0" step="1"><p>' . esc_html__( 'Lager getal = eerder in de lijst. Bijvoorbeeld 1 havo/vwo = 1, 2 havo/vwo = 2.', 'aklokaal' ) . '</p></div>';
		}
	);
	add_action(
		$aklokaal_tax . '_edit_form_fields',
		function ( $term ) {
			wp_nonce_field( 'aklokaal_term', 'aklokaal_term_nonce' );
			printf(
				'<tr class="form-field"><th scope="row"><label for="ak_order">%1$s</label></th><td><input type="number" name="ak_order" id="ak_order" value="%2$d" min="0" step="1"><p class="description">%3$s</p></td></tr>',
				esc_html__( 'Volgorde', 'aklokaal' ),
				(int) get_term_meta( $term->term_id, 'ak_order', true ),
				esc_html__( 'Lager getal = eerder in de lijst.', 'aklokaal' )
			);
		}
	);
	$aklokaal_save = function ( $term_id ) {
		if ( isset( $_POST['ak_order'], $_POST['aklokaal_term_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['aklokaal_term_nonce'] ), 'aklokaal_term' ) && aklokaal_can_manage() ) {
			update_term_meta( $term_id, 'ak_order', absint( $_POST['ak_order'] ) );
		}
	};
	add_action( 'created_' . $aklokaal_tax, $aklokaal_save );
	add_action( 'edited_' . $aklokaal_tax, $aklokaal_save );
	add_filter(
		'manage_edit-' . $aklokaal_tax . '_columns',
		function ( $cols ) {
			$cols['ak_order'] = __( 'Volgorde', 'aklokaal' );
			return $cols;
		}
	);
	add_filter(
		'manage_' . $aklokaal_tax . '_custom_column',
		function ( $out, $col, $term_id ) {
			return 'ak_order' === $col ? (string) (int) get_term_meta( $term_id, 'ak_order', true ) : $out;
		},
		10,
		3
	);
}

/* ---------------------------------------------------------------- handleiding */

add_action(
	'admin_menu',
	function () {
		add_submenu_page( 'aklokaal', __( 'Handleiding', 'aklokaal' ), __( 'Handleiding', 'aklokaal' ), AKLOKAAL_CAP, 'aklokaal-handleiding', 'aklokaal_render_handleiding', 99 );
	},
	20
);

function aklokaal_render_handleiding() {
	$link = function ( $path, $text ) {
		return '<a href="' . esc_url( admin_url( $path ) ) . '">' . esc_html( $text ) . '</a>';
	};
	$rows = array(
		array( 'Een hoofdstuk maken', 'Typ onder het leerjaar een nummer en titel en klik op <em>Hoofdstuk maken</em>. Het begint als <em>Concept</em>; klik daarop om het te publiceren.', $link( 'admin.php?page=aklokaal', 'Lesmateriaal → Structuur' ) ),
		array( 'Paragrafen toevoegen, hernoemen, ordenen', 'Open het hoofdstuk. Typ onderaan een nieuwe paragraaf. Klik op een titel om te hernoemen. Sleep aan ⋮⋮ of gebruik de pijltjes; de nummers passen zich aan.', $link( 'admin.php?page=aklokaal', 'Lesmateriaal → Structuur' ) ),
		array( 'Materiaal toevoegen', 'Open het hoofdstuk op de website, scroll naar de paragraaf en sleep een bestand op de pagina, of klik op <em>+ Toevoegen</em>. Hoofdstuk en paragraaf zijn dan al ingevuld.', $link( 'admin.php?page=aklokaal-toevoegen', '+ Toevoegen' ) ),
		array( 'Materiaal verplaatsen, hergebruiken, archiveren', 'Open een paragraaf in de structuur. Vink items aan en kies <em>Geselecteerde verplaatsen naar…</em> of <em>Archiveren</em>. Met <em>Bestaand materiaal zoeken</em> zet je hetzelfde bestand op een tweede plek.', $link( 'admin.php?page=aklokaal', 'Lesmateriaal → Structuur' ) ),
		array( 'Een hele paragraaf naar een ander hoofdstuk', 'Open de paragraaf in de structuur en kies onderaan <em>Hele paragraaf verplaatsen naar hoofdstuk…</em>. Al het materiaal gaat mee.', $link( 'admin.php?page=aklokaal', 'Lesmateriaal → Structuur' ) ),
		array( 'Hetzelfde materiaal op twee plekken', 'Vink het materiaal aan en kies <em>Ook plaatsen in…</em>. Het bestand wordt niet gekopieerd: een wijziging geldt op beide plekken.', $link( 'admin.php?page=aklokaal', 'Lesmateriaal → Structuur' ) ),
		array( 'Hoofdstukken en paragrafen in één keer neerzetten', 'Plak een inhoudsopgave of kies een kant-en-klare indeling, bekijk het voorbeeld en importeer.', $link( 'admin.php?page=aklokaal-import', 'Lesmateriaal → Importeren' ) ),
		array( 'Groot of compact tonen', 'Presentaties en video’s staan standaard groot; opdrachten, documenten, PDF’s en links compact. Compacte items na elkaar komen naast elkaar in een rij die opzij scrolt. Per item: op de hoofdstukpagina Beheer → Weergave. De standaard per soort: Weergave → Customizer → Weergave van materiaal.', $link( 'customize.php?autofocus[section]=aklokaal_weergave', 'Customizer' ) ),
		array( 'Een grote PowerPoint (meer dan 10 MB)', 'De viewer van Microsoft toont bestanden tot 10 MB. Maak de presentatie kleiner (Bestand → Afbeeldingen comprimeren; video’s als YouTube-link), of upload een PDF-versie met dezelfde naam tegelijk met de PowerPoint: dan toont de site de PDF en blijft de PowerPoint te downloaden. Bij een bestaand item: Bewerken → PDF-voorvertoning.', $link( 'edit.php?post_type=ak_materiaal', 'Lesmateriaal → Materiaal' ) ),
		array( 'Een bestand vervangen', 'Open het materiaal en kies bij <em>Bestand</em> een nieuw bestand. Alle plekken waar het staat, blijven werken.', $link( 'edit.php?post_type=ak_materiaal', 'Lesmateriaal → Materiaal' ) ),
		array( 'Een nieuwsartikel toevoegen', 'Plak de link, controleer de gegevens, schrijf eventueel een eigen korte beschrijving en publiceer.', $link( 'admin.php?page=aklokaal-nieuws', 'Lesmateriaal → Nieuws importeren' ) ),
		array( 'Een eigen nieuwsbericht schrijven', 'Titel, tekst en eventueel een uitgelichte afbeelding en thema’s. Laat “Link naar het artikel” leeg. Het bericht komt in hetzelfde nieuwsoverzicht en opent een eigen pagina. Het korte stukje op de kaart is het “Samenvatting”-veld, of anders het begin van je tekst.', $link( 'post-new.php?post_type=ak_nieuws', 'Lesmateriaal → Eigen nieuwsbericht' ) ),
		array( 'Een nieuwsbundel maken', 'Nieuw → titel, inleiding, onderzoeksvragen, en vink artikelen aan. Ordenen met de pijltjes.', $link( 'post-new.php?post_type=ak_collectie', 'Lesmateriaal → Nieuwsbundels' ) ),
		array( 'Interactieve kaarten toevoegen', 'Plak de link van een kaart, of een hele lijst (één per regel, eventueel “Titel | https://…”). Titel, beschrijving en voorbeeld komen van de kaartpagina zelf. Zonder voorbeeldafbeelding toont het overzicht een verkleinde versie van de kaart; een eigen uitgelichte afbeelding kan altijd. Volgorde: veld “Volgorde” in het bewerkscherm. Eén kaart bij een les: + Toevoegen → Link plakken → Kaart.', $link( 'admin.php?page=aklokaal-kaarten', 'Lesmateriaal → Kaarten toevoegen' ) ),
		array( 'Een laag aan de wereldatlas toevoegen', 'Zoek in de kaartcatalogus (Engelse zoekwoorden werken het best), plak een link of upload een GeoJSON-bestand. Controleer titel, bron en jaartal, kies een categorie en klik op Toevoegen. Verwijderen kan altijd; verwijderde lagen staan onderaan en zijn terug te zetten. Met Verbergen blijft een laag bewaard maar staat hij niet in de atlas.', $link( 'admin.php?page=aklokaal-atlas', 'Lesmateriaal → Wereldatlas' ) ),
		array( 'Een kaartafbeelding of toepassing toevoegen', 'Nieuw → titel, korte samenvatting, de afbeelding of het adres, en een uitgelichte afbeelding.', $link( 'post-new.php?post_type=ak_kaart', 'Kaarten' ) . ' · ' . $link( 'post-new.php?post_type=ak_toepassing', 'Interactief' ) ),
		array( 'Een leerjaar of vak toevoegen of de volgorde wijzigen', 'Vul naam en <em>Volgorde</em> in (lager = eerder). Bestaande aanpassen: klik op de naam.', $link( 'edit-tags.php?taxonomy=ak_leerjaar&post_type=ak_hoofdstuk', 'Leerjaren' ) . ' · ' . $link( 'edit-tags.php?taxonomy=ak_vak&post_type=ak_hoofdstuk', 'Vakken' ) ),
		array( 'Teksten en grote afbeelding op de homepage', 'Onder <em>Aardrijkskundelokaal</em> staan de teksten en de standaardweergave (donker/licht). De grote kaart is de <em>Headerafbeelding</em>.', $link( 'customize.php', 'Weergave → Customizer' ) ),
		array( 'Het hoofdmenu aanpassen', 'Zonder eigen menu toont de site de vaste indeling. Wil je het anders: maak een menu, voeg pagina’s of eigen links toe, en vink onderaan <em>Hoofdmenu</em> aan. Leeg dat menu weer om terug te gaan naar de vaste indeling.', $link( 'nav-menus.php', 'Weergave → Menu’s' ) ),
		array( 'Een gewone pagina maken', 'Bijvoorbeeld "Over deze website" (geef die de slug <code>over</code>, dan linkt het menu er vanzelf naar).', $link( 'post-new.php?post_type=page', 'Pagina’s → Nieuw' ) ),
	);
	?>
	<div class="wrap aklokaal-admin">
		<h1><?php esc_html_e( 'Handleiding', 'aklokaal' ); ?></h1>
		<p class="aklokaal-lead"><?php esc_html_e( 'Alles wat met inhoud te maken heeft, doe je hier zelf. Alleen voor nieuwe functies of een ander ontwerp is een programmeur (of Claude/Codex) nodig.', 'aklokaal' ); ?></p>
		<table class="widefat striped" style="max-width:1100px">
			<thead><tr><th style="width:26%"><?php esc_html_e( 'Ik wil…', 'aklokaal' ); ?></th><th><?php esc_html_e( 'Zo doe je het', 'aklokaal' ); ?></th><th style="width:22%"><?php esc_html_e( 'Waar', 'aklokaal' ); ?></th></tr></thead>
			<tbody>
			<?php foreach ( $rows as $r ) : ?>
				<tr><td><strong><?php echo esc_html( $r[0] ); ?></strong></td><td><?php echo wp_kses_post( $r[1] ); ?></td><td><?php echo wp_kses_post( $r[2] ); ?></td></tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<h2 style="margin-top:32px"><?php esc_html_e( 'Er komt een nieuwe versie van het boek', 'aklokaal' ); ?></h2>
		<ol style="max-width:75ch">
			<li><?php echo wp_kses_post( __( 'Maak een leerjaar voor de nieuwe versie, bijvoorbeeld <em>2 havo/vwo (2027)</em>, onder <em>Leerjaren</em>. Of gebruik hetzelfde leerjaar als de hoofdstukken een andere naam krijgen.', 'aklokaal' ) ); ?></li>
			<li><?php echo wp_kses_post( __( 'Plak de nieuwe inhoudsopgave bij <em>Importeren</em>. De nieuwe hoofdstukken komen als concept binnen, dus leerlingen zien ze nog niet.', 'aklokaal' ) ); ?></li>
			<li><?php echo wp_kses_post( __( 'Open in de <em>Structuur</em> de oude paragrafen. Vink materiaal aan en kies <em>Geselecteerde verplaatsen naar…</em>, of <em>Ook plaatsen in…</em> als het oude hoofdstuk nog even moet blijven. Past een oude paragraaf in zijn geheel: <em>Hele paragraaf verplaatsen naar hoofdstuk…</em>.', 'aklokaal' ) ); ?></li>
			<li><?php echo wp_kses_post( __( 'Klaar? Publiceer de nieuwe hoofdstukken en zet de oude op <em>Concept</em>. Niets wordt weggegooid.', 'aklokaal' ) ); ?></li>
			<li><?php echo wp_kses_post( __( 'Verwijder je een paragraaf waar nog materiaal in stond, dan verschijnt dat materiaal bovenaan de structuur onder <em>Materiaal zonder plek</em>. Daar zet je het met één keuze op de goede plek.', 'aklokaal' ) ); ?></li>
		</ol>
		<?php if ( function_exists( 'aklokaal_render_site_box' ) ) { aklokaal_render_site_box(); } ?>
		<h2 style="margin-top:32px"><?php esc_html_e( 'Wanneer heb je hulp nodig?', 'aklokaal' ); ?></h2>
		<p style="max-width:70ch"><?php esc_html_e( 'Voor een nieuw soort materiaal, een andere opmaak van pagina’s, een nieuwe interactieve toepassing of een nieuwe functie. Vraag het aan Claude of Codex; je krijgt dan nieuwe zipbestanden die je via Plugins of Weergave → Thema’s uploadt (kies “Vervangen”). Je inhoud blijft staan.', 'aklokaal' ); ?></p>
	</div>
	<?php
}
