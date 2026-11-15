# Snelheid, beveiliging en cache

Dit regelt de plugin zelf (`includes/site.php`); je hoeft er niets voor in te stellen.

## Regels in .htaccess

Bij het eerste bezoek aan het beheer na een update zet de plugin één blok in `.htaccess`
(tussen `# BEGIN Aardrijkskundelokaal cache` en `# END`). Daarin staat:

- **Browsercache**: afbeeldingen, lettertypen, stijlen en scripts blijven in de browser bewaard.
- **Beveiligingsheaders** (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`, en bij https `Strict-Transport-Security`). Ze staan ook in de plugin zelf, maar een
  cache-plugin (zoals WP Super Cache) levert pagina's af buiten WordPress om; dan komen alleen de regels uit
  `.htaccess` mee.
- **Afgeschermd**: `readme.html`, `license.txt` en `wp-config-sample.php` (die verraden de WordPress-versie).

Na het schrijven test de plugin of de site nog laadt. Geeft de server een fout, dan worden de regels meteen
weer verwijderd. Uitzetten kan onder **Handleiding → Snelheid en zoekmachines**; dan blijven ze uit.

## Paginacache legen

Draait er een cache-plugin (WP Super Cache, W3 Total Cache, WP Rocket, WP Fastest Cache, LiteSpeed), dan
leegt de plugin die cache zodra er inhoud verandert: materiaal toevoegen of verplaatsen, een paragraaf
hernoemen, een kaartlaag of nieuwsbericht, het menu of de Customizer. Zo zien bezoekers de wijziging direct.

## Nette adressen

Titels met tekens als `§` gaven adressen als `/materiaal/%c2%a73-1-water/`. Nieuwe items krijgen nu
`/materiaal/3-1-water/`; bestaande adressen zijn één keer omgezet en het oude adres verwijst door.
