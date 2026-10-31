# Fasen en status

| Fase | Status | Waar |
| --- | --- | --- |
| 1. Ontwerp en prototype | Klaar | `prototype/` — homepage, lesmateriaal, doorlopende hoofdstukpagina, nieuws, kaarten, interactief, over, zoeken. Donker + licht, mobiel. |
| 2. WordPress en CMS | Klaar | Docker-stack, thema, plugin met vakken, leerjaren, hoofdstukken, paragrafen, materiaal, plaatsingen, statussen. Structuurbeheer met slepen. |
| 3. Uploadworkflow | Klaar | `+ Toevoegen` op de website en in wp-admin: slepen, meerdere bestanden, titelvoorstel, bestemming vooraf ingevuld vanaf de hoofdstukpagina, laatste bestemming onthouden, concept/publiceren, bestand vervangen met behoud van verwijzing, hergebruik van bestaand materiaal, verplaatsen tussen paragrafen. |
| 4. Nieuwsimport | Klaar | Link plakken → metadata uit JSON-LD/Open Graph/meta-tags, dubbele links herkend, handmatige aanvulling, uniforme nieuwskaart met bronregel. |
| 5. Nieuwsbundels | Basis klaar | Bundel maken, artikelen kiezen en ordenen, inleiding, onderzoeksvragen, deelbare pagina, plaatsen in een paragraaf. |
| 6. Kaartenbibliotheek | Basis klaar | Overzicht met themafilters, kaartpagina met zoomen/verschuiven/schermvullend en legenda, interactieve kaarten via afgeschermd venster, plaatsen in paragrafen. **Nog te doen:** de bestaande digitale kaart integreren (zie docs/interactief.md). |
| 7. Interactieve toepassingen | Basis klaar | Aparte `apps`-dienst op subdomein, sandbox-insluiting, voorbeeldtoepassing, overzicht en detailpagina. |
| 8. Publicatie en controle | Voorbereid | Checklist in docs/installatie.md. Domein, Cloudflare Access en externe back-up moeten op de echte server worden ingesteld. |

## Getest

- `tools/smoke-test.mjs` in een echte browser tegen een verse installatie met demo-inhoud: 36 controles
  (paragrafenmenu, actieve paragraaf, ankers, mobiel menu, licht/donker onthouden, upload vanaf
  hoofdstukpagina, weigeren van PHP-bestanden, nieuwsimport en dubbele links, structuurbeheer met
  hernummering, geen schrijfrechten zonder login, concepten verborgen, geen JS-fouten).
- `wordpress/tools/test-news-parser.php`: metadata-uitlezing (JSON-LD in @graph, Open Graph, relatieve afbeeldingen, URL-normalisatie).
- Prototype: gecontroleerd met de Taste Skill-inspector op 1440, 768 en 390 pixels.

## Bewust nog niet gebouwd (zie projectbrief §19)

Leerlingaccounts, cijfers, inleverportaal, betaalde AI, statistiekdashboard, eigen videoplatform.
