<?php
/**
 * Demo-inhoud: zet de structuur en het voorbeeldmateriaal uit het prototype in WordPress.
 * Handig om de website te bekijken voordat je eigen materiaal toevoegt, en om te testen.
 *
 * Gebruik (in de map wordpress/):
 *   docker compose cp tools wordpress:/tmp/aklokaal-tools
 *   docker compose cp ../prototype/assets/img wordpress:/tmp/aklokaal-tools/img
 *   docker compose exec -u www-data wordpress php /tmp/aklokaal-tools/demo-content.php
 *
 * Zonder opdrachtregel: upload dist/aklokaal-demo-plugin.zip als plugin; die zet deze inhoud
 * met één knop neer (Lesmateriaal → Demo-inhoud) en ruimt hem ook weer op.
 *
 * Het script is veilig om opnieuw te draaien: het slaat over wat al bestaat.
 * Alles wat het maakt, krijgt de metawaarde ak_demo=1, zodat je het later
 * in één keer kunt opruimen met:  ... demo-content.php opruimen
 */

if ( ! defined( 'ABSPATH' ) ) {
	// Losse aanroep via de opdrachtregel (Docker).
	if ( PHP_SAPI !== 'cli' ) {
		exit( 'Alleen via de opdrachtregel of de demo-plugin.' );
	}
	$_SERVER['HTTP_HOST']   = $_SERVER['HTTP_HOST'] ?? 'localhost';
	$_SERVER['REQUEST_URI'] = '/';
	require getenv( 'WP_LOAD' ) ? getenv( 'WP_LOAD' ) : '/var/www/html/wp-load.php';
}
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/misc.php';

if ( ! is_user_logged_in() ) {
	$admins = get_users( array( 'role' => 'administrator', 'number' => 1 ) );
	wp_set_current_user( $admins ? $admins[0]->ID : 1 );
}

$GLOBALS['aklokaal_demo_dir'] = __DIR__;
$aklokaal_demo_actie          = isset( $aklokaal_demo_actie ) ? $aklokaal_demo_actie : ( isset( $argv[1] ) ? $argv[1] : 'plaatsen' );

/* ---------- opruimen ---------- */
if ( 'opruimen' === $aklokaal_demo_actie ) {
	$posts = get_posts( array( 'post_type' => 'any', 'post_status' => 'any', 'posts_per_page' => -1, 'meta_key' => 'ak_demo', 'meta_value' => '1', 'fields' => 'ids' ) );
	$att   = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'any', 'posts_per_page' => -1, 'meta_key' => 'ak_demo', 'meta_value' => '1', 'fields' => 'ids' ) );
	foreach ( $posts as $id ) {
		wp_delete_post( $id, true );
	}
	foreach ( $att as $id ) {
		wp_delete_attachment( $id, true );
	}
	echo 'Opgeruimd: ' . count( $posts ) . ' items, ' . count( $att ) . " bestanden.\n";
	return;
}

/* ---------- basis ---------- */
if ( ! is_plugin_active( 'aklokaal-core/aklokaal-core.php' ) ) {
	activate_plugin( 'aklokaal-core/aklokaal-core.php' );
	echo "Plugin geactiveerd.\n";
}
if ( 'aklokaal' !== get_stylesheet() ) {
	switch_theme( 'aklokaal' );
	echo "Thema geactiveerd.\n";
}
global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );
update_option( 'timezone_string', 'Europe/Amsterdam' );
update_option( 'date_format', 'j F Y' );
aklokaal_register_content_model();
// Via de opdrachtregel weet WordPress niet dat Apache mod_rewrite heeft; .htaccess wel schrijven.
add_filter( 'got_rewrite', '__return_true' );
flush_rewrite_rules( true );

function demo_mark( $id ) {
	update_post_meta( $id, 'ak_demo', '1' );
	return $id;
}

function demo_image( $file, $title, $alt ) {
	$dir      = $GLOBALS['aklokaal_demo_dir'];
	$existing = get_posts( array( 'post_type' => 'attachment', 'title' => $title, 'posts_per_page' => 1, 'fields' => 'ids', 'post_status' => 'any' ) );
	if ( $existing ) {
		return $existing[0];
	}
	$src = $dir . '/img/' . $file;
	if ( ! file_exists( $src ) ) {
		return 0;
	}
	$tmp = wp_tempnam( $file );
	copy( $src, $tmp );
	$id = media_handle_sideload( array( 'name' => $file, 'tmp_name' => $tmp ), 0, $title );
	if ( is_wp_error( $id ) ) {
		echo 'Afbeelding mislukt: ' . $id->get_error_message() . "\n";
		return 0;
	}
	update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	update_post_meta( $id, 'ak_demo', '1' );
	return $id;
}

/** Een eenvoudige, geldige PDF van één pagina met tekstregels. */
function demo_pdf( $name, $title, $lines ) {
	$existing = get_posts( array( 'post_type' => 'attachment', 'title' => $title, 'posts_per_page' => 1, 'fields' => 'ids', 'post_status' => 'any' ) );
	if ( $existing ) {
		return $existing[0];
	}
	$esc    = function ( $s ) {
		return str_replace( array( '\\', '(', ')' ), array( '\\\\', '\\(', '\\)' ), iconv( 'UTF-8', 'Windows-1252//TRANSLIT', $s ) );
	};
	$stream = "BT /F1 20 Tf 60 780 Td (" . $esc( $title ) . ") Tj ET\n";
	$y      = 740;
	foreach ( $lines as $l ) {
		$stream .= "BT /F1 12 Tf 60 $y Td (" . $esc( $l ) . ") Tj ET\n";
		$y      -= 22;
	}
	$objs   = array(
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
		'<< /Length ' . strlen( $stream ) . " >>\nstream\n" . $stream . "endstream",
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
	);
	$pdf    = "%PDF-1.4\n";
	$offs   = array();
	foreach ( $objs as $i => $o ) {
		$offs[] = strlen( $pdf );
		$pdf   .= ( $i + 1 ) . " 0 obj\n" . $o . "\nendobj\n";
	}
	$xref = strlen( $pdf );
	$pdf .= "xref\n0 " . ( count( $objs ) + 1 ) . "\n0000000000 65535 f \n";
	foreach ( $offs as $o ) {
		$pdf .= sprintf( "%010d 00000 n \n", $o );
	}
	$pdf .= "trailer\n<< /Size " . ( count( $objs ) + 1 ) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
	$tmp  = wp_tempnam( $name );
	file_put_contents( $tmp, $pdf );
	$id = media_handle_sideload( array( 'name' => $name, 'tmp_name' => $tmp ), 0, $title );
	if ( is_wp_error( $id ) ) {
		echo 'PDF mislukt: ' . $id->get_error_message() . "\n";
		return 0;
	}
	update_post_meta( $id, 'ak_demo', '1' );
	return $id;
}

function demo_post( $type, $title, $args = array(), $meta = array() ) {
	$existing = get_posts(
		array(
			'post_type'      => $type,
			'title'          => $title,
			'post_status'    => 'any',
			'posts_per_page' => 1,
			'post_parent'    => $args['post_parent'] ?? '',
			'fields'         => 'ids',
		)
	);
	if ( $existing ) {
		return $existing[0];
	}
	$id = wp_insert_post( array_merge( array( 'post_type' => $type, 'post_title' => $title, 'post_status' => 'publish' ), $args ), true );
	if ( is_wp_error( $id ) ) {
		echo "Mislukt: $title — " . $id->get_error_message() . "\n";
		return 0;
	}
	foreach ( $meta as $k => $v ) {
		update_post_meta( $id, $k, $v );
	}
	return demo_mark( $id );
}

/* ---------- afbeeldingen ---------- */
$img = array(
	'relief'    => demo_image( 'reliefkaart.jpg', 'Reliëfkaart heuvelland', 'Reliëfkaart met heuvelruggen, dalen en meren' ),
	'berg'      => demo_image( 'reliefkaart-berg.jpg', 'Reliëfkaart middelgebergte', 'Reliëfkaart van een berggebied met hoogtelijnen' ),
	'diepte'    => demo_image( 'dieptekaart.jpg', 'Dieptekaart kustzee', 'Dieptekaart van een kustzee in blauwtinten' ),
	'delta'     => demo_image( 'delta.jpg', 'Kaart rivierdelta', 'Kaart van een vlakke rivierdelta met geulen' ),
	'bevolking' => demo_image( 'bevolking.jpg', 'Kaart bevolkingsdichtheid', 'Lichte stippen tegen een donker land: bevolkingsdichtheid' ),
	'klimaat'   => demo_image( 'klimaat.jpg', 'Kaart klimaatzones', 'Kaart met klimaatzones van koel groen tot warm oranje' ),
	'energie'   => demo_image( 'energie.jpg', 'Kaart duurzame energie', 'Zeshoekenkaart met opgewekte duurzame energie per gebied' ),
	'rivier'    => demo_image( 'rivier.jpg', 'Reliëfkaart rivierdal', 'Reliëfkaart van een rivierdal' ),
);

/* ---------- structuur ---------- */
$vak = get_term_by( 'slug', 'aardrijkskunde', 'ak_vak' );

$years = array(
	'1-havo-vwo' => array(
		array( 1, 'De aarde in kaart', array( 'Kaarten lezen', 'Schaal en afstand', 'Coördinaten', 'De atlas gebruiken' ) ),
		array( 2, 'Weer en klimaat', array( 'Weer en weerkaarten', 'Temperatuur en neerslag', 'Klimaatdiagrammen', 'Klimaten van de wereld' ) ),
		array( 3, 'Wonen in Nederland', array( 'Dorp en stad', 'Wonen in de Randstad', 'Krimpregio’s' ) ),
	),
	'2-havo-vwo' => array(
		array( 1, 'Bevolking en ruimte', array( 'Bevolkingsgroei', 'Bevolkingspiramides', 'Spreiding en dichtheid' ) ),
		array( 2, 'Water', array( 'De waterkringloop', 'Rivieren', 'Leven onder zeeniveau', 'Water te veel, water te weinig' ) ),
	),
	'3-vwo'      => array(
		array( 1, 'Arm en rijk', array( 'Ontwikkeling meten', 'Ongelijkheid in de wereld', 'Ontwikkelingskansen' ) ),
		array( 2, 'Energie', array( 'Energiebronnen', 'De koolstofkringloop', 'De energietransitie', 'Wind en zon in Nederland', 'Duurzame keuzes' ) ),
		array( 3, 'Grenzen en conflicten', array( 'Wat is een grens?', 'Conflicten om grondstoffen' ), 'draft' ),
		array( 4, 'Aarde in beweging', array( 'Platentektoniek', 'Gebergtevorming', 'Het landschap van Nederland' ) ),
	),
	'5-vwo'      => array(
		array( 1, 'Wereld: arm en rijk', array( 'Mondiale ongelijkheid', 'Grondstoffen en macht', 'Mondiale netwerken' ) ),
		array( 3, 'Leefomgeving: de stad', array( 'Stedelijke vernieuwing', 'Gentrificatie', 'Klimaatbestendige stad' ) ),
	),
);
$paragraph_ids = array();
foreach ( $years as $slug => $chapters ) {
	$jaar = get_term_by( 'slug', $slug, 'ak_leerjaar' );
	foreach ( $chapters as $order => $c ) {
		$existing = aklokaal_get_chapters( array( 'leerjaar' => $jaar->term_id, 'status' => 'any' ) );
		$found    = array_filter( $existing, function ( $p ) use ( $c ) { return $p->post_title === $c[1]; } );
		if ( $found ) {
			$cid = reset( $found )->ID;
		} else {
			$cid = wp_insert_post(
				array(
					'post_type'    => 'ak_hoofdstuk',
					'post_title'   => $c[1],
					'post_status'  => $c[3] ?? 'publish',
					'menu_order'   => $order + 1,
					'post_excerpt' => 'Energie' === $c[1] ? 'Waar komt onze energie vandaan, waarom moet dat anders, en wat betekent de overstap op wind en zon voor het landschap van Nederland?' : '',
				)
			);
			wp_set_object_terms( $cid, array( $vak->term_id ), 'ak_vak' );
			wp_set_object_terms( $cid, array( $jaar->term_id ), 'ak_leerjaar' );
			update_post_meta( $cid, 'ak_nummer', (string) $c[0] );
			demo_mark( $cid );
			if ( 'Energie' === $c[1] ) {
				set_post_thumbnail( $cid, $img['energie'] );
			}
		}
		foreach ( $c[2] as $i => $pt ) {
			$pid = demo_post( 'ak_paragraaf', $pt, array( 'post_parent' => $cid, 'menu_order' => $i + 1 ) );
			$paragraph_ids[ $slug . '/' . $c[0] . '/' . ( $i + 1 ) ] = $pid;
		}
	}
}
echo "Structuur klaar.\n";

/* ---------- materiaal voor 3 vwo H2 Energie ---------- */
$p = function ( $n ) use ( $paragraph_ids ) {
	return $paragraph_ids[ '3-vwo/2/' . $n ];
};
wp_update_post( array( 'ID' => $p( 1 ), 'post_content' => 'Olie, gas, steenkool, wind, zon, water en uranium. Je leert welke bronnen opraken en welke niet, en waarom dat onderscheid niet het hele verhaal is.' ) );
wp_update_post( array( 'ID' => $p( 2 ), 'post_content' => 'Koolstof gaat rond tussen lucht, planten, oceaan en gesteente. Door fossiele brandstoffen te verbranden versnellen we één deel van die kringloop enorm.' ) );
wp_update_post( array( 'ID' => $p( 3 ), 'post_content' => 'De overstap van fossiel naar hernieuwbaar heet de energietransitie. Het is een technische opgave, maar vooral een ruimtelijke: waar laat je alle molens, panelen en kabels?' ) );

$werkblad = demo_pdf( 'werkblad-energiebronnen.pdf', 'Werkblad energiebronnen', array( 'Sorteer de twaalf energiebronnen in het schema:', 'fossiel, hernieuwbaar of kernenergie.', '', 'Geef bij elke bron een voordeel en een nadeel.', '', '1. Aardgas', '2. Wind', '3. Steenkool', '4. Zonlicht', '5. Uranium', '6. Biomassa' ) );

$m = array();
$m['uitleg']   = demo_post( 'ak_materiaal', 'Uitleg energiebronnen', array( 'post_content' => "Een <strong>energiebron</strong> is alles waaruit we bruikbare energie kunnen halen. <strong>Fossiele brandstoffen</strong> zijn in miljoenen jaren ontstaan uit resten van planten en dieren. Ze raken op, en bij verbranding komt CO₂ vrij. <strong>Hernieuwbare bronnen</strong> vullen zichzelf steeds aan: de zon schijnt elke dag, de wind blijft waaien.\n\nKernenergie past in geen van beide groepen. Uranium raakt wel op, maar een kerncentrale stoot nauwelijks CO₂ uit." ), array( 'ak_type' => 'tekst' ) );
$m['werkblad'] = demo_post( 'ak_materiaal', 'Werkblad: sorteer de energiebronnen', array( 'post_content' => 'Zet twaalf bronnen in het schema en geef bij elke bron één voordeel en één nadeel.' ), array( 'ak_type' => 'pdf', 'ak_attachment_id' => $werkblad ) );
$m['dia']      = demo_post( 'ak_materiaal', 'Energiebronnen: fossiel, hernieuwbaar, kern', array( 'post_content' => 'De presentatie uit de les, met de grafiek van het Nederlandse energieverbruik sinds 1950.' ), array( 'ak_type' => 'presentatie', 'ak_preview_id' => $werkblad ) );
set_post_thumbnail( $m['dia'], $img['berg'] );
$m['oceaan']   = demo_post( 'ak_materiaal', 'De oceaan als opslag', array( 'post_content' => 'Ongeveer een kwart van de uitgestoten CO₂ wordt opgenomen door zeewater. Hoe dieper en kouder, hoe meer.' ), array( 'ak_type' => 'afbeelding', 'ak_attachment_id' => $img['diepte'] ) );
set_post_thumbnail( $m['oceaan'], $img['diepte'] );
$m['link']     = demo_post( 'ak_materiaal', 'De koolstofkringloop in vijf stappen', array(), array( 'ak_type' => 'weblink', 'ak_url' => 'https://example.org/koolstofkringloop' ) );
$m['opdracht'] = demo_post( 'ak_materiaal', 'Teken de kringloop', array( 'post_content' => "<ol><li>Teken de vier opslagplaatsen van koolstof: lucht, planten, oceaan en gesteente.</li><li>Zet pijlen tussen de opslagplaatsen en schrijf erbij hoe de koolstof zich verplaatst.</li><li>Kleur de pijl die door de mens het meest versneld wordt. Leg in twee zinnen uit waarom.</li></ol>" ), array( 'ak_type' => 'opdracht' ) );
$m['video']    = demo_post( 'ak_materiaal', 'Wat is de energietransitie?', array( 'post_content' => 'Een korte uitleg met animaties. Let op de drie redenen die genoemd worden.' ), array( 'ak_type' => 'video', 'ak_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' ) );
set_post_thumbnail( $m['video'], $img['delta'] );
$m['delta']    = demo_post( 'ak_materiaal', 'Vlak land, veel wind', array( 'post_content' => 'In een delta staat weinig in de weg van de wind.' ), array( 'ak_type' => 'afbeelding', 'ak_attachment_id' => $img['delta'] ) );
$m['eind']     = demo_post( 'ak_materiaal', 'Adviseer de gemeente', array( 'post_content' => "<ol><li>Kies een gemeente in jouw buurt en zoek op hoeveel energie de inwoners gebruiken.</li><li>Stel een plan op met wind, zon of een andere bron. Teken op de kaart waar alles komt.</li><li>Beoordeel je plan met de drie P’s en presenteer het in vijf minuten.</li></ol>" ), array( 'ak_type' => 'opdracht' ) );

/* ---------- nieuws (voorbeeldbronnen; vervang door echte artikelen) ---------- */
$news = array(
	array( 'Kustonderhoud: meer zand nodig dan gedacht', 'De Dagkrant', '', '2026-10-28', 'De zeespiegel stijgt sneller dan in eerdere berekeningen. Daardoor moet er jaarlijks meer zand voor de kust worden gespoten.', array( 'Klimaat', 'Water' ), 'delta' ),
	array( 'Windpark op zee levert eerste stroom', 'Geo Weekblad', '', '2026-10-24', 'Het nieuwe park ligt verder uit de kust dan het vorige. Wat betekent dat voor de aanleg van kabels en voor de visserij?', array( 'Energie' ), 'energie' ),
	array( 'Middelgrote steden groeien sneller dan de Randstad', 'Stadsjournaal', 'M. de Vries', '2026-10-19', 'Steden als Zwolle en Amersfoort trekken jonge gezinnen die in de grote steden geen huis vinden.', array( 'Verstedelijking' ), '' ),
	array( 'Droogte op de Rijn raakt binnenvaart opnieuw', 'De Dagkrant', '', '2026-10-14', 'Schepen varen half beladen door de lage waterstand bij Lobith. Hoe hangt dat samen met smeltwater uit de Alpen?', array( 'Water', 'Economie' ), 'rivier' ),
	array( 'Nieuwe kaart toont bodemdaling per straat', 'Wetenschapsbericht', '', '2026-10-09', 'Met satellietmetingen is per straat te zien hoeveel de grond daalt. In veengebieden gaat het om centimeters per jaar.', array( 'Fysische geografie' ), 'relief' ),
	array( 'Arbeidsmigratie verschuift naar Oost-Europa', 'Geo Weekblad', 'A. Jansen', '2026-09-24', 'Steeds meer arbeidsmigranten komen uit landen verder naar het oosten. Wat zijn de push- en pullfactoren?', array( 'Migratie' ), '' ),
);
$news_ids = array();
foreach ( $news as $i => $n ) {
	$existing = get_posts( array( 'post_type' => 'ak_nieuws', 'title' => $n[0], 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 1 ) );
	if ( $existing ) {
		$news_ids[] = $existing[0];
		continue;
	}
	$id = aklokaal_save_news(
		array(
			'url'         => 'https://example.org/nieuws/' . sanitize_title( $n[0] ),
			'title'       => $n[0],
			'publisher'   => $n[1],
			'author'      => $n[2],
			'published'   => $n[3],
			'description' => $n[4],
			'themes'      => $n[5],
			'status'      => 'publish',
		)
	);
	if ( ! is_wp_error( $id ) ) {
		demo_mark( $id );
		if ( $n[6] ) {
			set_post_thumbnail( $id, $img[ $n[6] ] );
		}
		$news_ids[] = $id;
	}
}
$bundel = demo_post( 'ak_collectie', 'Water: te veel en te weinig', array( 'post_excerpt' => 'Kustonderhoud, droogte op de Rijn en bodemdaling.', 'post_content' => 'Nederland heeft tegelijk te veel en te weinig water. Lees de drie artikelen en zoek de verbanden.' ), array( 'ak_questions' => "Waarom is droogte een probleem voor de binnenvaart?\nWat heeft bodemdaling met waterbeheer te maken?\nWelke maatregel uit de artikelen vind jij het belangrijkst, en waarom?" ) );
aklokaal_set_items( $bundel, array( $news_ids[0], $news_ids[3], $news_ids[4] ) );

/* ---------- kaarten ---------- */
$maps = array(
	array( 'Reliëf van een middelgebergte', 'Hoogtelijnen en schaduw laten zien hoe steil het terrein is.', 'berg', array( 'Fysische geografie', 'Topografie' ), "Wit = hoogste toppen\nBruin = hellingen\nGroen = dalen" ),
	array( 'Zeediepte en kustlijn', 'Van ondiepe kustwateren naar een diepe trog.', 'diepte', array( 'Fysische geografie' ), "Lichtblauw = ondiep\nDonkerblauw = diep" ),
	array( 'Klimaatzones', 'Van koel naar warm, met de invloed van zee en reliëf.', 'klimaat', array( 'Klimaat' ), "Groen = gematigd\nOranje = warm en droog" ),
	array( 'Duurzame energie per gebied', 'Opgewekte energie per zeshoek van tien bij tien kilometer.', 'energie', array( 'Economie', 'Energie' ), "Donkergroen = weinig\nGeel = veel" ),
	array( 'Bevolkingsdichtheid', 'Elke stip staat voor een woonkern.', 'bevolking', array( 'Bevolking' ), '' ),
	array( 'Een rivierdelta', 'Geulen, zandbanken en het vlakke land erachter.', 'delta', array( 'Fysische geografie' ), '' ),
);
$map_ids = array();
foreach ( $maps as $mp ) {
	$id = demo_post( 'ak_kaart', $mp[0], array( 'post_excerpt' => $mp[1] ), array( 'ak_kind' => 'afbeelding', 'ak_attachment_id' => $img[ $mp[2] ], 'ak_legend' => $mp[4], 'ak_source' => 'Getekende voorbeeldkaart' ) );
	set_post_thumbnail( $id, $img[ $mp[2] ] );
	wp_set_post_terms( $id, $mp[3], 'ak_thema' );
	$map_ids[] = $id;
}

/* ---------- interactief ---------- */
$apps_base = getenv( 'AKLOKAAL_APPS_URL' ) ? getenv( 'AKLOKAAL_APPS_URL' ) : ( defined( 'AKLOKAAL_APPS_URL' ) ? AKLOKAAL_APPS_URL : 'https://apps.aardrijkskundelokaal.nl' );
$app       = demo_post( 'ak_toepassing', 'Fossiel of hernieuwbaar?', array( 'post_excerpt' => 'Kies bij acht energiebronnen of ze fossiel of hernieuwbaar zijn. Je ziet meteen of het klopt.' ), array( 'ak_app_url' => trailingslashit( $apps_base ) . 'fossiel-of-hernieuwbaar/', 'ak_height' => 460 ) );
set_post_thumbnail( $app, $img['energie'] );
wp_set_post_terms( $app, array( 'Energie' ), 'ak_thema' );
$app2 = demo_post( 'ak_toepassing', 'Topografie Nederland', array( 'post_excerpt' => 'Provinciehoofdsteden en grote steden aanwijzen op de kaart. Wat je fout hebt, komt later terug.' ), array( 'ak_app_url' => trailingslashit( $apps_base ) . 'topografie-nederland/', 'ak_height' => 720 ) );
update_post_meta( $app2, 'ak_app_url', trailingslashit( $apps_base ) . 'topografie-nederland/' );
set_post_thumbnail( $app2, $img['delta'] );
wp_set_post_terms( $app2, array( 'Topografie', 'Nederland' ), 'ak_thema' );
$app3 = demo_post( 'ak_toepassing', 'Landen van de wereld', array( 'post_excerpt' => 'Klik op het land dat gevraagd wordt, per werelddeel of voor de hele wereld.' ), array( 'ak_app_url' => trailingslashit( $apps_base ) . 'landen-van-de-wereld/', 'ak_height' => 720 ) );
set_post_thumbnail( $app3, $img['bevolking'] );
wp_set_post_terms( $app3, array( 'Topografie', 'Wereld' ), 'ak_thema' );

/* Interactieve kaarten (toepassingen in apps/, en de bestaande kaartensite) */
$wereldkaart = demo_post( 'ak_kaart', 'Wereldkaart met lagen', array( 'post_excerpt' => 'Landen, de Europese Unie, het graadnet en de evenaar, keerkringen en poolcirkels. Lagen aan en uit, klik op een land.' ), array( 'ak_kind' => 'interactief', 'ak_app_url' => trailingslashit( $apps_base ) . 'wereldkaart/', 'ak_source' => 'Natural Earth (publiek domein)' ) );
set_post_thumbnail( $wereldkaart, $img['klimaat'] );
wp_set_post_terms( $wereldkaart, array( 'Wereld', 'Topografie' ), 'ak_thema' );
// De bestaande digitale kaarten van de docent. Niet gemarkeerd als demo: blijft staan bij opruimen.
$eigen = get_posts( array( 'post_type' => 'ak_kaart', 'title' => 'Digitale kaarten', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 1 ) );
if ( ! $eigen ) {
	$eigen_id = wp_insert_post( array( 'post_type' => 'ak_kaart', 'post_title' => 'Digitale kaarten', 'post_status' => 'publish', 'post_excerpt' => 'De verzameling interactieve kaarten van kaarten.thejoast.org.' ) );
	update_post_meta( $eigen_id, 'ak_kind', 'interactief' );
	update_post_meta( $eigen_id, 'ak_app_url', 'https://kaarten.thejoast.org/' );
	update_post_meta( $eigen_id, 'ak_source', 'kaarten.thejoast.org' );
	set_post_thumbnail( $eigen_id, $img['relief'] );
	wp_set_post_terms( $eigen_id, array( 'Wereld' ), 'ak_thema' );
}

/* ---------- plaatsingen ---------- */
if ( ! aklokaal_get_items( $p( 1 ) ) ) {
	aklokaal_set_items( $p( 1 ), array( $m['dia'], $m['uitleg'], $m['werkblad'], $app ) );
	aklokaal_set_items( $p( 2 ), array( $m['oceaan'], array( 'id' => $m['link'], 'note' => 'Bekijk deze animatie vóór de les.' ), $m['opdracht'] ) );
	aklokaal_set_items( $p( 3 ), array( $m['video'], $news_ids[1], $bundel ) );
	aklokaal_set_items( $p( 4 ), array( $map_ids[2], $m['delta'] ) );
	aklokaal_set_items( $p( 5 ), array( $m['eind'] ) );
	// Hergebruik: hetzelfde werkblad ook in 3 havo? Hier: dezelfde kaart ook bij 2 havo/vwo Water.
	aklokaal_set_items( $paragraph_ids['2-havo-vwo/2/3'], array( $map_ids[1], $news_ids[0] ) );
}
if ( ! aklokaal_get_items( $paragraph_ids['1-havo-vwo/1/4'] ) ) {
	aklokaal_set_items( $paragraph_ids['1-havo-vwo/1/4'], array( $app2, $app3, $wereldkaart ) );
	aklokaal_set_items( $paragraph_ids['5-vwo/1/1'], array( $wereldkaart, $bundel ) );
}

/* ---------- pagina Over ---------- */
if ( ! get_page_by_path( 'over' ) ) {
	$over = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_name'    => 'over',
			'post_title'   => 'Over dit lokaal',
			'post_status'  => 'publish',
			'post_excerpt' => 'Een openbare bibliotheek met al het materiaal uit de aardrijkskundeles. Gemaakt door een docent, voor leerlingen en collega’s.',
			'post_content' => "<h2>Waarom</h2>\n<p>Lesmateriaal raakt verspreid: een presentatie in de ene map, een werkblad in een mail, een nieuwsbericht in een chat. Hier staat alles op één plek, geordend zoals in de les: per leerjaar, hoofdstuk en paragraaf.</p>\n<h2 id=\"bronnen\">Bronnen en auteursrecht</h2>\n<p>Nieuwsartikelen worden niet overgenomen. Je ziet de titel, een korte beschrijving en de naam van de uitgever, met een link naar het origineel. Kaarten en afbeeldingen van anderen staan altijd met hun bron vermeld.</p>\n<h2 id=\"privacy\">Privacy</h2>\n<p>Je hebt geen account nodig. Er staan geen gegevens van leerlingen op deze website. De site onthoudt alleen of je de lichte of donkere weergave gekozen hebt, op je eigen apparaat. Video’s van YouTube laden pas als je op afspelen klikt.</p>",
		)
	);
	set_post_thumbnail( $over, $img['berg'] );
	demo_mark( $over );
}

echo "Demo-inhoud klaar. Bekijk " . home_url( '/' ) . "\n";
