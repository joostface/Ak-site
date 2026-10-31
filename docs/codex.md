# Verder bouwen met Codex (of een andere AI-codeerassistent)

## Werkwijze

1. Werk op een **nieuwe Git-branch** per wijziging; nooit direct op `main`.
2. Laat de assistent eerst lezen: `README.md`, `docs/architectuur.md` en de bestanden die het raakt.
3. Visuele wijziging? Eerst in `prototype/` (open de html in de browser), daarna `tools/sync-theme-assets.sh`.
4. Lokaal testen: `wordpress/tools/install-local.sh` en `node tools/smoke-test.mjs` (moet groen blijven).
5. Pas dan samenvoegen en op de server `git pull`.

## Vaste afspraken om mee te geven

> Dit is een WordPress-site met een eigen plugin (`wordpress/wp-content/plugins/aklokaal-core`, alle inhoud
> en logica) en een eigen thema (`wordpress/wp-content/themes/aklokaal`, alleen weergave). Bestaande inhoud,
> URL's en ankers (#paragraaf-2-3) mogen niet breken. Geen nieuwe externe afhankelijkheden of betaalde
> plugins. Gebruik de bestaande CSS-variabelen uit `tokens.css` en de componentklassen uit `site.css`;
> geen schaduwen op rustende elementen, geen verlopen, geen kleine labels boven koppen, één afronding (6px).
> Escape alle uitvoer, controleer rechten met `aklokaal_can_manage()` en gebruik nonces. Schrijf
> Nederlandse teksten en commentaar. Draai na afloop `php -l` op gewijzigde PHP en `tools/smoke-test.mjs`.

## Voorbeeldopdrachten

**Nieuw materiaaltype "Begrippenlijst"**
> Voeg materiaaltype `begrippen` toe: een lijst begrip + uitleg. Opslaan als inhoud van het materiaal
> (één begrip per regel, "begrip: uitleg"). Voeg het toe aan `aklokaal_material_types()` en maak
> `template-parts/material/begrippen.php` in de stijl van `.block`. Voeg het toe aan de keuzes in `+ Toevoegen`.

**Nieuwe toepassing**
> Maak in `apps/raad-de-stad/` een zelfstandige toepassing (HTML/CSS/JS, geen build): leerlingen zien een
> luchtfoto-achtige kaart zonder namen en kiezen uit vier steden. Ondersteun `?theme=light`, toetsenbord en
> touch, geen externe bestanden. Volg de stijl van `apps/fossiel-of-hernieuwbaar/`.

**MapLibre-kaart uit GeoJSON**
> Maak `apps/<naam>/` met MapLibre GL JS (zelf meegeleverd in de map, niet van een CDN), die `data.geojson`
> toont met lagen aan/uit, een legenda en een pop-up met eigenschappen. Achtergrond: OpenStreetMap-rastertegels
> met bronvermelding.

**AI-samenvatting voor nieuws (later, optioneel)**
> Implementeer het filter `aklokaal_ai_news_suggestions` in een aparte kleine plugin die een lokaal model
> (Ollama op de thuisserver) aanroept. Toon voorstellen alleen als concept in het nieuwsformulier, met de
> onzekerheden zichtbaar. Geen betaalde API vereist.
