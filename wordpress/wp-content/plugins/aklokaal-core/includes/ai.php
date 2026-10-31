<?php
/**
 * Aansluitpunt voor optionele AI-hulp. Standaard staat er niets aan en is er
 * geen betaalde dienst nodig.
 *
 * Een latere uitbreiding (bijvoorbeeld een lokaal model via Ollama op de
 * thuisserver, of een betaalde API) haakt in op dit filter:
 *
 *   add_filter( 'aklokaal_ai_news_suggestions', function ( $suggestions, $metadata ) {
 *       return array(
 *           'summary'  => '...',            // korte samenvatting
 *           'themes'   => array( 'Water' ), // voorgestelde thema's
 *           'chapters' => array( 123 ),     // voorgestelde hoofdstuk-id's
 *           'question' => '...',            // geografische vraag
 *           'keywords' => array( '...' ),
 *           'notes'    => 'Datum niet gevonden in de metadata.', // onzekerheden
 *       );
 *   }, 10, 2 );
 *
 * Regels die het uploadvenster afdwingt:
 *   - AI-tekst wordt alleen als voorstel getoond en als concept bewaard
 *     (meta ak_ai_draft), nooit automatisch gepubliceerd.
 *   - Onzekerheden (notes) worden zichtbaar gemaakt naast de velden.
 */

defined( 'ABSPATH' ) || exit;

/** Voorbeeld: niets voorstellen. Laat het filter bestaan zodat de vorm vastligt. */
add_filter(
	'aklokaal_ai_news_suggestions',
	function ( $suggestions ) {
		return $suggestions;
	},
	1
);
