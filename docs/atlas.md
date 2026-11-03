# Wereldatlas

De atlas staat op `/atlas/` (pagina "Wereldatlas", automatisch aangemaakt) en is ook bereikbaar via de knop
bovenaan **Kaarten**. Hij is gebouwd op het oorspronkelijke bestand `wereldatlas-lagen.html` (Leaflet).

## Beheren: Lesmateriaal → Wereldatlas

- **Laag toevoegen**
  - *Zoeken in de kaartcatalogus*: zoekt in de openbare catalogus van ArcGIS Online (NOAA, USGS, NASA, VN, Esri …).
    Elk resultaat toont de bron en het jaar van de laatste update. Engelse zoekwoorden werken het best.
  - *Link plakken*: een GeoJSON-adres, een ArcGIS-dienst (`…/FeatureServer/0`, `…/MapServer`) of een tegelkaart (`…/{z}/{x}/{y}.png`).
  - *Bestand uploaden*: een GeoJSON-bestand (max. 25 MB); het komt in de mediabibliotheek.
- Daarna controleer je **titel, categorie, bron en jaartal** (verplicht: titel, categorie, bron) en klik je op *Toevoegen aan de atlas*.
- **Categorieën**: aanmaken via *+ Nieuwe categorie* of in het formulier; hernoemen, icoon kiezen en volgorde wijzigen in de lijst.
- **Volgorde** van lagen en categorieën met ↑ en ↓.
- **Verbergen** haalt een laag uit de atlas maar bewaart hem. **Verwijderen** zet hem in *Verwijderde lagen*;
  daar kun je hem terugzetten of definitief verwijderen.

## Ingebouwde lagen

De vijftien lagen uit het oorspronkelijke bestand, plus **Aardbevingen afgelopen 24 uur** (live van USGS, elke
vijf minuten ververst). Vulkanen zijn gekleurd per type (stratovulkaan, schildvulkaan, caldera …). De data van
de ingebouwde lagen staat in `wp-content/plugins/aklokaal-core/assets/atlas/data/`; titel, bron, jaartal,
categorie en weergave pas je in het beheer aan.

## Externe diensten

De atlas haalt live data op bij: USGS (aardbevingen), NOAA/ArcGIS (vulkanen, plaatgrenzen), Esri (ondergrond,
reliëf) en NASA POWER (klimaatgrafiek). Valt een dienst uit, dan meldt de atlas dat en werken de andere lagen gewoon.
Leaflet, topojson-client en de landgrenzen zitten in de plugin zelf.
