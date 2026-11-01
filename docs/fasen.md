# Fasen en status

| Fase | Status | Waar |
| --- | --- | --- |
| 1. Ontwerp en prototype | Klaar | `prototype/` — homepage, lesmateriaal, doorlopende hoofdstukpagina, nieuws, kaarten, interactief, over, zoeken. Donker + licht, mobiel. |
| 2. WordPress en CMS | Klaar | Docker-stack, thema, plugin met vakken, leerjaren, hoofdstukken, paragrafen, materiaal, plaatsingen, statussen. Structuurbeheer met slepen. |
| 3. Uploadworkflow | Klaar (ook: meerdere items tegelijk verplaatsen of archiveren, eigen voorbeeldafbeelding en thema’s bij het toevoegen) | `+ Toevoegen` op de website en in wp-admin: slepen, meerdere bestanden, titelvoorstel, bestemming vooraf ingevuld vanaf de hoofdstukpagina, laatste bestemming onthouden, concept/publiceren, bestand vervangen met behoud van verwijzing, hergebruik van bestaand materiaal, verplaatsen tussen paragrafen. |
| 4. Nieuwsimport | Klaar | Link plakken → metadata uit JSON-LD/Open Graph/meta-tags, dubbele links herkend, handmatige aanvulling, uniforme nieuwskaart met bronregel. |
| 5. Nieuwsbundels | Klaar | Bundel maken, artikelen kiezen en ordenen, inleiding, onderzoeksvragen, deelbare pagina, plaatsen in paragrafen; de bundelpagina toont bij welke lessen hij hoort. |
| 6. Kaartenbibliotheek | Klaar, op één punt na | Overzicht met themafilters, kaartpagina met zoomen/verschuiven/schermvullend en legenda, interactieve kaarten via afgeschermd venster, plaatsen in paragrafen. Eigen kaartbibliotheek `apps/_gedeeld/geo.js` en een wereldkaart met lagen. kaarten.thejoast.org staat als interactieve kaart in de bibliotheek, maar kon vanuit de bouwomgeving niet geopend en dus niet gecontroleerd worden (zie interactief.md). |
| 7. Interactieve toepassingen | Klaar | Aparte `apps`-dienst op subdomein, sandbox-insluiting, overzicht en detailpagina. Toepassingen: Topografie Nederland, Landen van de wereld, Fossiel of hernieuwbaar, Wereldkaart met lagen. |
| 8. Publicatie en controle | Voorbereid | Checklist in docs/installatie.md. Domein, Cloudflare Access en externe back-up moeten op de echte server worden ingesteld. |

## Getest

- `tools/smoke-test.mjs` in een echte browser tegen een verse installatie met demo-inhoud: 49 controles
  (paragrafenmenu, actieve paragraaf, ankers, mobiel menu, licht/donker onthouden, upload vanaf
  hoofdstukpagina, weigeren van PHP-bestanden, nieuwsimport en dubbele links, structuurbeheer met
  hernummering, meerdere items verplaatsen, archiveren, eigen voorbeeldafbeelding, zoekfilters op soort en leerjaar, nieuws per maand, toepassingen in sandbox, geen schrijfrechten zonder login, concepten verborgen, geen JS-fouten).
- `wordpress/tools/test-news-parser.php`: metadata-uitlezing (JSON-LD in @graph, Open Graph, relatieve afbeeldingen, URL-normalisatie).
- Prototype: gecontroleerd met de Taste Skill-inspector op 1440, 768 en 390 pixels.

## Bewust nog niet gebouwd (zie projectbrief §19)

Leerlingaccounts, cijfers, inleverportaal, betaalde AI, statistiekdashboard, eigen videoplatform.
