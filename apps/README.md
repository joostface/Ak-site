# Interactieve toepassingen

Elke map hier is één zelfstandige toepassing (HTML, CSS, JavaScript; eventueel GeoJSON of MapLibre).
Ze draaien op een **eigen subdomein** (bijvoorbeeld `https://apps.jouwdomein.nl/`) via de dienst `apps`
in `wordpress/docker-compose.yml`, los van WordPress. Op de website verschijnen ze in een
afgeschermd venster (`<iframe sandbox>`).

## Een nieuwe toepassing toevoegen

1. Maak een map, bijvoorbeeld `apps/raad-de-stad/`, met daarin `index.html`.
   Kopieer gerust `fossiel-of-hernieuwbaar/` als startpunt.
2. Houd alles in die map: geen bestanden van andere sites laden als het niet nodig is,
   geen persoonsgegevens vragen of opslaan.
3. Ondersteun `?theme=light` als je de lichte modus wilt volgen (zie het voorbeeld).
4. Zet de map op de server (git pull). De `apps`-dienst serveert hem direct.
5. In WordPress: **Lesmateriaal → Interactief → Nieuw**. Vul titel, korte omschrijving,
   uitgelichte afbeelding en het adres in (`https://apps.jouwdomein.nl/raad-de-stad/`).
6. Plaats de toepassing in een paragraaf via **Lesmateriaal → Structuur**, of laat hem alleen
   op de pagina Interactief staan.

Een prompt voor Codex staat in `docs/codex.md`.

## Wat er nu staat

| Map | Wat |
| --- | --- |
| `fossiel-of-hernieuwbaar/` | Oefening: energiebronnen indelen. |
| `topografie-nederland/` | Provinciehoofdsteden en grote steden aanwijzen; fouten komen terug; leermodus met namen. |
| `landen-van-de-wereld/` | Landen aanwijzen per werelddeel of voor de hele wereld. |
| `wereldkaart/` | Wereldkaart met lagen (landen, EU, graadnet, keerkringen), zoomen, schermvullend. |
| `_gedeeld/` | Gedeelde kaartbibliotheek `geo.js` (projectie, tekenen, zoomen/verschuiven), `kaart.css`, Nederlandse landnamen (`landen.js`) en kaartdata. |

**Kaartdata**: `_gedeeld/data/` komt uit Natural Earth (publiek domein) via het npm-pakket `world-atlas`
(ISC-licentie, zie `LICENSE-world-atlas.txt`). Opnieuw maken: `npm pack world-atlas@2 && tar -xzf world-atlas-*.tgz &&
node apps/_gedeeld/tools/maak-data.mjs ./package`.

**Een eigen kaart met lagen maken**: kopieer `wereldkaart/`. Een laag is een lijst GeoJSON-features
(`kaart.laag('naam', features, { klasse, klik, titel })`); punten met `kaart.punten(...)`;
aan/uit met `kaart.toon('naam', true|false)`. GeoJSON uit QGIS kun je direct laden met `AKGeo.laad('data.geojson')`.
