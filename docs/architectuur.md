# Architectuur en technische keuzes

## Drie lagen

1. **Plugin `aklokaal-core`**: alle inhoud en structuur. Post types, taxonomieën, metavelden, plaatsingen,
   uploads, nieuwsimport, REST API en beheerschermen. Wissel je van thema, dan blijft alles bestaan.
2. **Thema `aklokaal`**: alleen weergave. Leest via functies van de plugin (met `function_exists`-controle).
3. **Mediabibliotheek**: opslag van bestanden. Materiaal verwijst naar een bijlage-id, nooit naar een bestands-URL;
   daarom kan een bestand vervangen worden zonder dat iets breekt.

Extern van WordPress: `apps/` (toepassingen op eigen subdomein) en optioneel Gotenberg (PDF-conversie).
Externe afhankelijkheden in de code: geen. Geen npm-build, geen frameworks, geen betaalde plugins.

## Datamodel

| Brief | WordPress |
| --- | --- |
| Vak | taxonomie `ak_vak` (term meta `ak_order` voor volgorde) |
| Leerjaar/niveau | taxonomie `ak_leerjaar` (term meta `ak_order`) |
| Hoofdstuk | post type `ak_hoofdstuk`: titel, samenvatting (intro), nummer `ak_nummer`, volgorde `menu_order`, status, uitgelichte afbeelding |
| Paragraaf | post type `ak_paragraaf`, `post_parent` = hoofdstuk, volgorde `menu_order`, optioneel eigen `ak_nummer` |
| Materiaalitem | post type `ak_materiaal`: `ak_type`, `ak_attachment_id`, `ak_url`, `ak_preview_id` (PDF), `ak_source`, thema's, status incl. `ak_archief` |
| Materiaalplaatsing | meta `ak_items` op paragraaf/hoofdstuk = geordende lijst `{id, note}`; omgekeerde index `ak_placed_in` op het item |
| Nieuwsartikel | `ak_nieuws`: `ak_url`, `ak_url_key` (genormaliseerd, voor dubbelen), uitgever, auteur, datum, afbeelding-URL, `ak_show_image`, vraag, `ak_ai_draft` |
| Nieuwscollectie | `ak_collectie`: inleiding, `ak_items` (geordende artikelen), `ak_questions` |
| Kaart | `ak_kaart`: `ak_kind` (afbeelding/interactief), bijlage of `ak_app_url`, legenda, bron, thema's |
| Interactieve toepassing | `ak_toepassing`: `ak_app_url`, `ak_height`, bron, thema's |
| Thema's/tags | taxonomie `ak_thema`, gedeeld door alle typen |

**Waarom plaatsingen in meta en niet in een eigen tabel?** Eén paragraaf heeft een korte, geordende lijst;
dat past natuurlijk in één metaveld. Het blijft exporteerbaar met de standaard WordPress-export, overleeft
een verhuizing naar andere hosting zonder migraties, en er is geen eigen databaseschema te onderhouden.
De omgekeerde index maakt "waar staat dit materiaal?" snel.

## URL's

- `/lesmateriaal/` — alle hoofdstukken; `/lesmateriaal/aardrijkskunde/3-vwo/` — één leerjaar
- `/lesmateriaal/aardrijkskunde/3-vwo/energie/#paragraaf-2-3` — hoofdstuk met anker per paragraaf.
  Twee hoofdstukken "Energie" in verschillende leerjaren mogen dezelfde naam hebben.
- `/nieuws/`, `/bundels/<naam>/`, `/kaarten/<naam>/`, `/interactief/<naam>/`, `/materiaal/<naam>/`, `/thema/<naam>/`
- Een paragraaf-URL (als die ooit gedeeld wordt) verwijst door naar het anker in het hoofdstuk.

## REST API

Openbaar lezen: `GET /wp-json/aklokaal/v1/structure`, `GET /wp-json/aklokaal/v1/search?q=`.
Alle overige routes (zie de kop van `includes/rest.php`) vereisen login + recht `aklokaal_manage` + nonce.
De standaard `/wp-json/wp/v2/ak_*`-routes werken ook (lezen openbaar, schrijven met rechten).

## Rechten

Recht `aklokaal_manage` plus `*_ak_items` (capability type van alle eigen post types) gaan bij activering naar
*Beheerder* en *Redacteur*. Wil je een collega toevoegen die alleen materiaal beheert: geef die de rol *Redacteur*.

## Frontend

- `prototype/assets/css/tokens.css`: kleuren (donker en licht), lettertypen, vijf typestappen, marges. Alleen variabelen.
- `prototype/assets/css/site.css`: componenten, met klassenamen als `.band`, `.news-card`, `.block--pdf`, `.toc`.
- `prototype/assets/js/app.js`: kleine, losse functies (thema, menu, zoeken, tabbladen, actieve paragraaf,
  vergroting, filters, verschijnen bij scrollen). Alles werkt ook zonder JavaScript leesbaar.
- `tools/sync-theme-assets.sh` kopieert deze naar het thema. **Pas eerst het prototype aan, bekijk het, sync dan.**
- Lettertypen (Young Serif, Source Serif 4, SIL Open Font License) staan lokaal: geen verzoeken naar Google (privacy).

### Designsysteem (Taste Skill)

Richting *The printed annual* (seed 156888523): een redactionele as op kolom 5 van 12; koppen in Young Serif,
tekst in Source Serif 4; het schoolbordpalet uit de brief behouden (achtergrond #171E1B, oppervlak #26352D,
tekst #F5F7F2, tweede tekst #B7CDBD, accent #A4C7AB) met een koelere papierkleur voor de lichte modus.
Eén afronding (6px), geen schaduwen op rustende elementen, geen verlopen (behalve een neutrale schaduw onder
tekst op kaarten), geen kleine labels boven koppen. Het accent staat op de actie.
Het hoofdstukmenu, de leerjaar-tabbladen en de nieuwskaarten zijn de vaste bouwstenen.

**Beelden in het prototype en de demo** zijn getekende voorbeeldkaarten (`prototype/tools/make-images.mjs`):
de open beeldcollecties waren vanuit de bouwomgeving niet bereikbaar. Vervang ze door eigen kaartmateriaal.
De nieuwsbronnen in de demo ("De Dagkrant", "Geo Weekblad" …) zijn verzonnen voorbeelden.

## Uitbreiden zonder het thema te breken

- **Nieuw materiaaltype**: voeg toe in `aklokaal_material_types()` (of via het filter `aklokaal_material_types`)
  en maak `themes/aklokaal/template-parts/material/<type>.php`. Zonder sjabloon gebruikt het thema de bestandsweergave.
- **Nieuw bestandstype**: filter `aklokaal_allowed_files`.
- **AI-hulp later**: filter `aklokaal_ai_news_suggestions` (zie `includes/ai.php`); voorstellen worden alleen als concept getoond.
- **Andere hosting**: geen serverafhankelijkheden buiten standaard WordPress + PHP 8.1. Verhuizen = database + uploads + deze repository.
