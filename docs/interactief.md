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

## De bestaande kaarten van kaarten.thejoast.org

In de demo-inhoud staat **Kaarten → Digitale kaarten** als interactieve kaart met het adres
`https://kaarten.thejoast.org/` (deze blijft staan als je de demo opruimt). Controleer in je browser of de site
in het venster verschijnt. Lukt dat niet, dan staat de server van die site insluiten niet toe
(`X-Frame-Options` of `Content-Security-Policy: frame-ancestors`). Twee oplossingen:

1. Sta insluiten toe vanaf je eigen website, bijvoorbeeld met de header
   `Content-Security-Policy: frame-ancestors 'self' https://aardrijkskunde.jouwdomein.nl`.
2. Of zet de bestanden in `apps/` (bijvoorbeeld `apps/kaarten/`), dan serveert de `apps`-dienst ze.

Heeft de site meerdere losse kaarten met eigen adressen, maak dan per kaart een item in de kaartenbibliotheek,
zodat elke kaart een eigen pagina krijgt en in paragrafen geplaatst kan worden.

*Let op: tijdens het bouwen was kaarten.thejoast.org vanuit de bouwomgeving niet bereikbaar, dus de inhoud
ervan is nog niet bekeken of getest.*

## Andere kaarten integreren

Eerst vaststellen wat het is:

| Vorm | Aanpak |
| --- | --- |
| HTML/JavaScript (bijv. Leaflet, MapLibre, OpenLayers) | Map naar `apps/<kaart>/`, als *Kaart → Interactief* met dat adres. Gebruikt de kaart externe tegels (OpenStreetMap, PDOK), dan werkt dat gewoon in het venster. |
| GeoJSON / shapefile / GeoPackage | Omzetten naar GeoJSON (QGIS, gratis), dan een kleine MapLibre-toepassing in `apps/` die het bestand laadt, met lagen en legenda. Codex kan die maken (zie codex.md). |
| Een afbeelding (PNG/JPG/PDF) | *Kaart → Afbeelding*: zoomen, verschuiven en schermvullend werken al. |
| Een externe dienst/API (ArcGIS, Google My Maps) | Als *Interactief* met het insluitadres van die dienst; check of insluiten mag. |

Elke kaart kan daarna in de bibliotheek staan, in meerdere paragrafen, en heeft een eigen deelbare link.

## Meegeleverd in de plugin

Sommige toepassingen zitten in de plugin zelf (`wp-content/plugins/aklokaal-core/assets/apps/`), zodat ze
zonder apart subdomein werken. Na een update maakt de plugin ze bij het openen van het beheer één keer aan
onder **Interactief**. Daarna kun je titel, tekst en plaats aanpassen of het item verwijderen.

- **Platentektoniek in lagen** (`assets/apps/platentektoniek/`): doorsnede van de aarde en 3D-simulatie van
  acht plaatgrenzen. three.js r128 staat erbij (MIT-licentie), dus er wordt niets van een CDN geladen.
