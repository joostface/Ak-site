<?php
/**
 * Kant-en-klare indelingen voor de import (alleen titels; geen inhoud van de methode).
 * Toevoegen: een nieuw element in de lijst, met een naam en de tekst zoals je hem zou plakken.
 */

defined( 'ABSPATH' ) || exit;

function aklokaal_import_presets() {
	return apply_filters(
		'aklokaal_import_presets',
		array(
			'boek-1' => array(
				'naam'  => 'Boek klas 1 (vwo en havo/vwo)',
				'tekst' => "1 Aarde in beweging\n  1.1 De aardkorst verschuift\n  1.2 Aardbevingen\n  1.3 Vulkanisme\n  1.4 Tsunami's\n  EU IJsland en Italië\n  1.5 Nederland op reis\n  1.6 Tektoniek in Nederland\n"
					. "2 Bevolking en cultuur\n  2.1 Waar wonen de meeste mensen?\n  2.2 Steeds meer mensen\n  2.3 Cultuur\n  2.4 Cultuurverandering\n  EU Verenigd Koninkrijk en Spanje\n  2.5 De Nederlandse bevolking\n  2.6 Cultuur in Nederland\n  2.7 Caribisch Nederland\n"
					. "3 Klimaat\n  3.1 Klimaten wereldwijd\n  3.2 Temperatuursverschillen op aarde\n  3.3 Hoe de aardas ons klimaat beïnvloedt\n  3.4 Waterkringloop\n  EU Duitsland en Griekenland\n  3.5 Nederland, een gematigd zeeklimaat\n  3.6 Weer en klimaat in Nederland\n  3.7 Depressies\n"
					. "4 Ongelijkheid\n  4.1 Welvaart\n  4.2 Welzijn\n  4.3 Ongelijkheid binnen landen\n  4.4 Globalisering verbindt de wereld\n  EU Zweden en Bulgarije\n  4.5 Nederland is rijk!\n  4.6 Ongelijkheid in Nederland\n  4.7 Ongelijkheid in Nederlandse steden\n",
			),
			'boek-2' => array(
				'naam'  => 'Boek klas 2 (vwo en havo)',
				'tekst' => "1 Landschappen\n  1.1 Bergen groeien, bergen verdwijnen\n  1.2 Gesteente valt uit elkaar\n  1.3 Gesteente wordt verplaatst\n  1.4 Gesteente wordt sediment\n  België en Nepal\n  1.5 Nederland boven de zeespiegel\n  1.6 Nederland onder de zeespiegel\n  1.7 Het landschap van Zuid-Limburg\n"
					. "2 Steden\n  2.1 Steden worden steeds belangrijker\n  2.2 De spreiding van steden in een land\n  2.3 De opbouw van steden\n  2.4 Stadsplanning: nieuwe en groeiende steden\n  Frankrijk en India\n  2.5 Urbanisatie in Nederland\n  2.6 Nederland klaar voor de toekomst?\n  2.7 Stadsplanning in Nederland\n"
					. "3 Water\n  3.1 Water in beweging\n  3.2 Water in balans\n  3.3 Soms te veel\n  3.4 Vaak te weinig\n  Bangladesh en Roemenië\n  3.5 De zee klopt op de voordeur\n  3.6 De rivieren kloppen op de achterdeur\n  3.7 Anders omgaan met water\n"
					. "4 Duurzaamheid\n  4.1 Wat kan de aarde aan?\n  4.2 Onze voetafdruk\n  4.3 Wereldwijde productie\n  4.4 Energie en transport\n  China en Zwitserland\n  4.5 Duurzaam consumeren\n  4.6 Duurzame landbouw\n  4.7 Duurzaam op vakantie\n",
			),
			'boek-3' => array(
				'naam'  => 'Boek klas 3 (havo en vwo)',
				'tekst' => "1 Wereldhandel in beweging\n  1.1 Kantelt het economisch wereldbeeld?\n  1.2 Wereldhandel: van kolonialisme tot nu\n  1.3 Verschillen in ontwikkeling\n  1.4 Rol van Europa in de wereldhandel\n  1.5 Rol van Nederland in de wereldhandel\n"
					. "2 Schatkast aarde?\n  2.1 Het ontstaan van de aarde en het leven\n  2.2 Het dagboek van de aarde\n  2.3 Delfstoffen\n  2.4 Delfstoffen in Europa\n  2.5 Delfstoffen in Nederland\n"
					. "3 Migratie\n  3.1 Migratie en de wereld\n  3.2 Gevolgen voor de herkomstgebieden\n  3.3 Gevolgen voor de bestemmingsgebieden\n  3.4 Migratie in de Europese Unie\n  3.5 Migratie en Nederland\n"
					. "4 Energietransitie\n  4.1 De aarde warmt op!\n  4.2 Op weg naar duurzame energiebronnen\n  4.3 Het tegengaan van klimaatverandering\n  4.4 Klimaatverandering in Europa\n  4.5 Naar minder CO2-uitstoot in Nederland\n"
					. "5 Gewapende conflicten\n  5.1 Wapengeweld wereldwijd\n  5.2 Oorzaken van gewapende conflicten\n  5.3 Gevolgen van gewapende conflicten\n  5.4 Hoe rustig is Europa?\n  5.5 Nederland: oorlog en vrede\n",
			),
		)
	);
}
