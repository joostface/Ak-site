# Vindbaar in Google

De site is indexeerbaar: er staat geen `noindex`, `robots.txt` laat alles toe en er is een sitemap op
`https://aardrijkskundelokaal.nl/wp-sitemap.xml`. Het thema geeft elke pagina een beschrijving, deelgegevens
(Open Graph) en gestructureerde data. Zoekresultaten en foutpagina's worden niet geïndexeerd.

## Eenmalig doen

1. **Opruimen**: verwijder het standaardbericht *Hello world!* (Berichten) en de *Sample Page* (Pagina's).
2. **Sitenaam**: Instellingen → Algemeen. Kies één schrijfwijze, bijvoorbeeld *Aardrijkskundelokaal*
   (zoals het logo). Deze naam staat achter elke paginatitel in Google.
3. **Google Search Console** (gratis): ga naar search.google.com/search-console → *Property toevoegen* →
   *Domein* `aardrijkskundelokaal.nl`. Google geeft een TXT-record; zet dat in het DNS bij Vimexx
   (DirectAdmin → DNS-beheer) en klik op *Verifiëren*. Daarna: *Sitemaps* → `wp-sitemap.xml` → *Indienen*.
4. Optioneel hetzelfde bij **Bing Webmaster Tools** (kan de gegevens uit Search Console overnemen).

Nieuwe pagina's verschijnen meestal binnen enkele dagen tot weken in Google.

## Wat helpt

- Een **korte samenvatting** bij hoofdstukken, kaarten en eigen berichten: die wordt de tekst onder de titel in Google.
- Een **uitgelichte afbeelding**: die verschijnt als iemand de link deelt in WhatsApp, Teams of Magister.
- Duidelijke titels voor materiaal ("Werkblad 3.2 rivieren" in plaats van "scan001").
