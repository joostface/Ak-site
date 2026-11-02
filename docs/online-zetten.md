# Online zetten zonder thuisserver

Je huurt gewone WordPress-hosting. De hostingpartij regelt de server, beveiligingsupdates van de
server, HTTPS en back-ups. Jij uploadt drie zipbestanden en richt WordPress in.

**Kosten:** een domeinnaam (ongeveer €10–15 per jaar) plus hosting (meestal een paar euro per maand).
Een volledig gratis optie met eigen plugins bestaat niet: het gratis WordPress.com staat geen eigen
plugins of thema's toe.

**Benodigde tijd:** reken op een middag voor stap 1 tot en met 6.

---

## Stap 0 — Eerst kijken (15 minuten, kost niets)

1. Ga naar https://github.com/joostface/Ak-site, kies de branch `claude/bouwplan-aardrijkskunde-website-sjbs41`,
   klik op **Code → Download ZIP** en pak het bestand uit.
2. Open `prototype/index.html` en `prototype/hoofdstuk.html` in je browser.
3. Beslis: bevalt de vormgeving en de opbouw? Wil je iets anders, zeg het nu. Dat is het goedkoopste moment.

## Je hebt al een domein: thejoast.org

Je hoeft geen domein te kopen. Gebruik subdomeinen, zodat `kaarten.thejoast.org` blijft werken zoals nu:

| Adres | Wat |
| --- | --- |
| `aardrijkskunde.thejoast.org` (of een korter adres als `ak.thejoast.org`) | De WordPress-site |
| `apps.thejoast.org` | De interactieve toepassingen |
| `kaarten.thejoast.org` | Blijft zoals het is |

Wil je de site liever op `thejoast.org` zelf? Dat kan, als daar nu niets anders staat.

Zoek eerst uit **waar de DNS van thejoast.org beheerd wordt**: bij de partij waar je het domein kocht, of bij
Cloudflare. Daar maak je straks de verwijzingen naar de nieuwe hosting aan. Raak de bestaande regel voor
`kaarten` niet aan.

## Stap 1 — Hosting kiezen

Kies een **WordPress-hostingpakket** bij een Nederlandse of Europese aanbieder. Let bij het vergelijken op:

| Eis | Waarom |
| --- | --- |
| PHP 8.1 of hoger | Plugin en thema vragen dat |
| Uploadlimiet van minstens 64 MB, liefst meer | PowerPoints met veel afbeeldingen zijn groot |
| Gratis SSL (Let's Encrypt) | HTTPS |
| Dagelijkse back-ups die je zelf kunt terugzetten | Herstel zonder gedoe |
| Subdomeinen mogelijk | Voor de interactieve toepassingen (`apps.thejoast.org`) |
| Opslag van minstens 10 GB | Lesmateriaal groeit |
| Servers in de EU | Privacy (AVG) |

Kies het kleinste pakket dat hieraan voldoet. Je domein heb je al: kies bij het bestellen **"eigen domein
gebruiken"** of **"domein van elders"** (dus niet verhuizen en niet opnieuw registreren).

**Het subdomein koppelen:**
1. Voeg in het hostingpaneel `aardrijkskunde.thejoast.org` toe als domein of website.
   De host laat dan zien welk DNS-record nodig is: meestal een **A-record** met een IP-adres, of een **CNAME**.
2. Maak bij je DNS-beheerder precies dat record aan, met als naam `aardrijkskunde`.
   Doe hetzelfde voor `apps`.
3. Wacht een kwartier tot een paar uur. Zet daarna in het hostingpaneel **SSL** aan voor beide adressen.

*Staat je DNS bij Cloudflare?* Zet bij de nieuwe records de oranje wolk tijdelijk uit (grijs, "DNS only"),
zodat de host een SSL-certificaat kan aanvragen. Wil je daarna Cloudflare ertussen, zet de wolk weer oranje
en kies bij *SSL/TLS* de stand **Full (strict)**.

## Stap 2 — WordPress installeren

1. In het klantenpaneel van je host: **WordPress installeren** op `aardrijkskunde.thejoast.org` (vaak één klik).
   - Taal: **Nederlands**.
   - Gebruikersnaam: **niet** "admin". Kies een sterk wachtwoord en bewaar het in een wachtwoordmanager.
2. Zet in het paneel **SSL/HTTPS aan** en (als dat kan) "HTTP altijd doorsturen naar HTTPS".
3. Log in op `https://aardrijkskunde.thejoast.org/wp-admin`.

## Stap 3 — Plugin en thema uploaden

De zipbestanden staan in de map `dist/` van de download uit stap 0.

1. **Plugins → Nieuwe plugin → Plugin uploaden** → `aklokaal-core-plugin.zip` → **Nu installeren** → **Activeren**.
2. **Weergave → Thema's → Nieuw thema → Thema uploaden** → `aklokaal-thema.zip` → **Installeren** → **Activeren**.
3. **Instellingen → Permalinks** → kies **Berichtnaam** → **Wijzigingen opslaan**. Doe dit echt:
   zonder deze stap geven de hoofdstukpagina's een foutmelding.
4. Verwijder overbodige standaardplugins en -thema's (zoals "Hello Dolly" en oude Twenty-thema's, behalve één als reserve).

In het menu links staat nu **Lesmateriaal**.

## Stap 4 — Interactieve toepassingen online zetten

De toepassingen (topografie, landen, wereldkaart) staan los van WordPress op een eigen subdomein.

1. Zorg dat `apps.thejoast.org` in het hostingpaneel een eigen map heeft (zie stap 1). Zet SSL ook daarvoor aan.
2. Open de **bestandsbeheerder** (of FTP), ga naar de map van dat subdomein en upload `aklokaal-apps.zip`.
   Pak het daar uit. Controleer daarna `https://apps.thejoast.org/topografie-nederland/` in je browser.
3. In WordPress: **Lesmateriaal → Interactief → Nieuw**. Vul titel, korte samenvatting en het adres in
   (bijvoorbeeld `https://apps.thejoast.org/topografie-nederland/`), kies een uitgelichte afbeelding en publiceer.
   Doe hetzelfde voor `landen-van-de-wereld/`.
4. **Lesmateriaal → Kaarten → Nieuw**:
   - "Wereldkaart met lagen": soort *Interactief*, adres `https://apps.thejoast.org/wereldkaart/`.
   - "Digitale kaarten": soort *Interactief*, adres `https://kaarten.thejoast.org/`. Controleer of die kaart in het venster verschijnt.
     Verschijnt hij niet, dan blokkeert de server van kaarten.thejoast.org het insluiten. Sta dan insluiten toe
     vanaf `https://aardrijkskunde.thejoast.org` (header `Content-Security-Policy: frame-ancestors 'self' https://aardrijkskunde.thejoast.org`).

## Stap 5 — Beveiligen (20 minuten)

1. **Plugins → Nieuwe plugin**: installeer **Two Factor** (gratis, van WordPress.org-bijdragers).
   Zet bij **Gebruikers → Profiel** een authenticator-app aan als tweede stap bij het inloggen.
2. Zet in het hostingpaneel automatische updates van WordPress aan (als dat kan).
3. Back-ups:
   - Controleer dat de host dagelijks back-ups maakt.
   - Wil je een kopie buiten de host: installeer **UpdraftPlus** (gratis) en koppel je Google Drive of OneDrive.
4. **Instellingen → Algemeen**: zet "Iedereen kan zich registreren" **uit**.

## Stap 6 — Inrichten

1. **Weergave → Customizer → Aardrijkskundelokaal**: pas de teksten op de homepage aan en kies de standaardweergave.
   **Headerafbeelding** = de grote kaart op de homepage. Kies een eigen kaart of foto; nu staat er een getekende voorbeeldkaart.
2. **Pagina's → Nieuw**: maak een pagina met de slug `over`, voor "Over deze website".
3. **Lesmateriaal → Structuur**: maak je eerste hoofdstuk. Het begint als concept, en is pas zichtbaar als je op *Concept* klikt.
4. Open dat hoofdstuk op de website en sleep er een PowerPoint op. Klaar is je eerste materiaal.
5. **Instellingen → Lezen**: vink "Zoekmachines ontmoedigen" **uit** zodra de site gevonden mag worden.

Hoe je daarna dagelijks werkt, staat in [beheer.md](beheer.md).

## Stap 7 — Controleren vóór je het aan leerlingen geeft

- [ ] De site werkt op je telefoon, op een laptop en op het digibord, in licht en donker.
- [ ] Een hoofdstuklink met `#paragraaf-…` opent bij de goede paragraaf.
- [ ] Een nieuwslink plakken haalt titel en uitgever op.
- [ ] De toepassingen werken in hun venster.
- [ ] Uitgelogd zie je geen concepten.
- [ ] Je hebt één keer een back-up teruggezet, bijvoorbeeld op een testkopie (veel hosts bieden een "staging"-omgeving).

## Wat werkt anders dan op een thuisserver

- **Geen automatische PDF-voorvertoning van PowerPoints.** Die vraagt een conversiedienst die op gewone hosting
  niet draait. Leerlingen kunnen de PowerPoint gewoon downloaden. Wil je toch een voorvertoning: sla de
  presentatie in PowerPoint op als PDF en kies die bij het materiaal onder *PDF-voorvertoning*.
- **Geen Docker, Portainer of Cloudflare Tunnel nodig.** De bestanden `wordpress/docker-compose.yml` en `docs/installatie.md`
  kun je negeren. Ze blijven bruikbaar als je later toch zelf wilt hosten.

## Later iets laten aanpassen

Je vraagt Claude of Codex om de wijziging, en die maakt nieuwe zips (`tools/maak-zips.sh`). Upload de nieuwe
plugin- of themazip opnieuw: WordPress vraagt of je de bestaande versie wilt vervangen, kies **Vervangen**.
Je inhoud blijft staan, want die zit in de database, niet in de zip.
