<?php
/**
 * Test van de nieuwsimport zonder internet: voorbeeld-HTML zoals nieuwssites die leveren.
 *   docker compose exec -T -u www-data wordpress php /tmp/aklokaal-tools/test-news-parser.php
 */
$_SERVER['HTTP_HOST'] = 'localhost';
require '/var/www/html/wp-load.php';

$fail = 0;
function check( $label, $got, $want ) {
	global $fail;
	$ok = $got === $want;
	echo ( $ok ? 'OK   ' : 'FOUT ' ) . $label . ( $ok ? '' : " — kreeg '" . var_export( $got, true ) . "', verwacht '" . $want . "'" ) . "\n";
	$fail += $ok ? 0 : 1;
}

// 1. JSON-LD in @graph (veel Nederlandse nieuwssites)
$html = <<<'HTML'
<html><head><title>Droogte raakt binnenvaart | De Voorbeeldkrant</title>
<meta property="og:title" content="Droogte raakt binnenvaart opnieuw">
<meta property="og:site_name" content="De Voorbeeldkrant">
<meta property="og:image" content="/img/rijn.jpg">
<link rel="canonical" href="https://www.voorbeeldkrant.nl/nieuws/droogte-rijn">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"x"},{"@type":"NewsArticle","headline":"Droogte op de Rijn raakt binnenvaart opnieuw","datePublished":"2026-10-14T06:12:00+02:00","description":"Schepen varen half beladen.","author":[{"@type":"Person","name":"Anna de Boer"},{"@type":"Person","name":"Piet Klaassen"}],"publisher":{"@type":"Organization","name":"De Voorbeeldkrant"},"image":{"@type":"ImageObject","url":"https://www.voorbeeldkrant.nl/img/rijn-groot.jpg"}}]}</script>
</head><body><p>Artikeltekst die we niet overnemen.</p></body></html>
HTML;
$d = aklokaal_parse_article_html( $html, 'https://www.voorbeeldkrant.nl/nieuws/droogte-rijn?utm_source=x' );
check( 'JSON-LD titel', $d['title'], 'Droogte op de Rijn raakt binnenvaart opnieuw' );
check( 'JSON-LD datum', $d['published'], '2026-10-14' );
check( 'JSON-LD auteurs', $d['author'], 'Anna de Boer, Piet Klaassen' );
check( 'JSON-LD uitgever', $d['publisher'], 'De Voorbeeldkrant' );
check( 'JSON-LD afbeelding', $d['image_url'], 'https://www.voorbeeldkrant.nl/img/rijn-groot.jpg' );
check( 'canonieke link', $d['canonical'], 'https://www.voorbeeldkrant.nl/nieuws/droogte-rijn' );
check( 'geen artikeltekst overgenomen', false !== strpos( wp_json_encode( $d ), 'Artikeltekst' ), false );

// 2. Alleen Open Graph, met uitgever achter de titel en relatieve afbeelding
$html2 = <<<'HTML'
<html><head><title>Windpark levert stroom - Geo Weekblad</title>
<meta property="og:site_name" content="Geo Weekblad">
<meta name="description" content="Het nieuwe park ligt verder uit de kust.">
<meta property="article:published_time" content="2026-10-24T10:00:00Z">
<meta property="og:image" content="/beeld/windpark.jpg">
</head><body></body></html>
HTML;
$d2 = aklokaal_parse_article_html( $html2, 'https://geoweekblad.example/artikel/windpark' );
check( 'OG: uitgever uit titel gehaald', $d2['title'], 'Windpark levert stroom' );
check( 'OG: datum', $d2['published'], '2026-10-24' );
check( 'OG: beschrijving', $d2['description'], 'Het nieuwe park ligt verder uit de kust.' );
check( 'OG: relatieve afbeelding absoluut gemaakt', $d2['image_url'], 'https://geoweekblad.example/beeld/windpark.jpg' );

// 3. Normalisatie voor dubbele links
check( 'utm en www genegeerd', aklokaal_normalize_url( 'https://www.voorbeeldkrant.nl/nieuws/droogte-rijn/?utm_source=x&id=4' ), aklokaal_normalize_url( 'http://voorbeeldkrant.nl/nieuws/droogte-rijn?id=4' ) );

// 4. Cookiescherm (DPG Media Privacy Gate, zoals bij nu.nl)
$gate = '<html><head><title>DPG Media Privacy Gate</title><script src="https://myprivacy.dpgmedia.nl/consent.js"></script></head><body>Voordat je verdergaat</body></html>';
$url  = 'https://www.nu.nl/politiek/6415285/kabinet-na-dag-vol-overleg-eens-over-route-voor-belastingplan-en-box-3.html';
$g    = array_merge( array( 'url' => $url, 'canonical' => '', 'title' => '', 'publisher' => '', 'author' => '', 'published' => '', 'description' => '', 'image_url' => '', 'missing' => array(), 'sources' => array(), 'warning' => '' ), aklokaal_parse_article_html( $gate, $url ) );
check( 'cookiescherm herkend', aklokaal_is_consent_wall( $gate, $g ), true );
$g = aklokaal_finish_metadata( array( 'url' => $url, 'canonical' => '', 'title' => '', 'publisher' => '', 'author' => '', 'published' => '', 'description' => '', 'image_url' => '', 'missing' => array(), 'sources' => array(), 'warning' => '' ) );
check( 'titel uit de link', $g['title'], 'Kabinet na dag vol overleg eens over route voor belastingplan en box 3' );
check( 'uitgever herkend', $g['publisher'], 'NU.nl' );
check( 'gewoon artikel is geen cookiescherm', aklokaal_is_consent_wall( $html, $d ), false );

echo $fail ? "\n$fail fout(en)\n" : "\nAlles in orde\n";
exit( $fail ? 1 : 0 );
