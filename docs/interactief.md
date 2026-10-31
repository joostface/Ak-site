# Interactieve toepassingen en kaarten

## Waarom apart?

Eigen HTML en JavaScript draait **niet** binnen WordPress. Een fout of onveilig script kan dan nooit bij de
beheeromgeving of bij ingelogde sessies. Toepassingen staan in `apps/` en worden geserveerd door de dienst
`apps` op een eigen subdomein (`apps.jouwdomein.nl`). Op de website verschijnen ze in een
`<iframe sandbox>`; de toepassingsserver staat insluiten alleen toe vanaf je eigen site.

## Nieuwe toepassing

1. Maak `apps/<naam>/index.html` (kopieer `apps/fossiel-of-hernieuwbaar/` als voorbeeld).
2. `git pull` op de server (of kopieer de map). Direct online op `https://apps.jouwdomein.nl/<naam>/`.
3. WordPress: *Lesmateriaal → Interactief → Nieuw*: titel, korte omschrijving (samenvatting), adres, hoogte,
   uitgelichte afbeelding, thema's. Publiceren.
4. In een paragraaf plaatsen: *Lesmateriaal → Structuur* → paragraaf openen → *Bestaand materiaal zoeken*.

Regels voor toepassingen: alles in de eigen map, geen persoonsgegevens vragen of opslaan, werkt met muis,
vinger en toetsenbord, en ondersteunt `?theme=light`.

## De bestaande digitale kaart integreren

Eerst vaststellen wat het is:

| Vorm | Aanpak |
| --- | --- |
| HTML/JavaScript (bijv. Leaflet, MapLibre, OpenLayers) | Map naar `apps/<kaart>/`, als *Kaart → Interactief* met dat adres. Gebruikt de kaart externe tegels (OpenStreetMap, PDOK), dan werkt dat gewoon in het venster. |
| GeoJSON / shapefile / GeoPackage | Omzetten naar GeoJSON (QGIS, gratis), dan een kleine MapLibre-toepassing in `apps/` die het bestand laadt, met lagen en legenda. Codex kan die maken (zie codex.md). |
| Een afbeelding (PNG/JPG/PDF) | *Kaart → Afbeelding*: zoomen, verschuiven en schermvullend werken al. |
| Een externe dienst/API (ArcGIS, Google My Maps) | Als *Interactief* met het insluitadres van die dienst; check of insluiten mag. |

Elke kaart kan daarna in de bibliotheek staan, in meerdere paragrafen, en heeft een eigen deelbare link.
