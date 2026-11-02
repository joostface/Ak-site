# Online zetten bij Vimexx: aardrijkskundelokaal.nl

Domein en hosting staan allebei bij Vimexx. Cloudflare is voor deze site niet nodig.

| Adres | Wat |
| --- | --- |
| `https://aardrijkskundelokaal.nl` | De WordPress-site |
| `https://apps.aardrijkskundelokaal.nl` | De interactieve toepassingen (topografie, landen, wereldkaart) |
| `https://kaarten.thejoast.org` | Je bestaande kaarten; blijven waar ze zijn |

Benodigde bestanden: de map `dist/` uit de download van GitHub
(`aklokaal-core-plugin.zip`, `aklokaal-thema.zip`, `aklokaal-apps.zip`).

Eerst uitproberen op je laptop? Zie [testen-zonder-hosting.md](testen-zonder-hosting.md).

---

## Stap 1 — Domein koppelen en HTTPS

1. Log in bij **Vimexx** → klantenpaneel. Controleer dat `aardrijkskundelokaal.nl` aan je hostingpakket gekoppeld is.
   (Heb je domein en hosting los besteld: koppel het domein aan het pakket. Bij twijfel helpt de Vimexx-support.)
2. Open het **controlepaneel van je hosting** en zet **SSL / Let's Encrypt** aan voor `aardrijkskundelokaal.nl`
   en `www.aardrijkskundelokaal.nl`. Vink "HTTPS forceren" aan als die optie er is.
3. Zet bij de **PHP-instellingen**:
   - PHP-versie **8.1 of hoger** (8.3 is prima);
   - `upload_max_filesize` en `post_max_size` op **128M** (of zo hoog als het pakket toestaat);
   - `memory_limit` op **256M**.
   Kun je dit niet zelf instellen, vraag het dan aan de support.

Een nieuw domein kan een paar uur nodig hebben voordat het overal werkt. Wacht met stap 2 tot
`https://aardrijkskundelokaal.nl` een pagina toont (ook al is het nog een standaardpagina).

## Stap 2 — WordPress installeren

1. In het controlepaneel: de **WordPress-installer** (vaak "Softaculous" of "Apps" genoemd) → WordPress.
   - Domein: `https://aardrijkskundelokaal.nl` (zonder map erachter, dus niet `/wp`).
   - Taal: **Nederlands**.
   - Gebruikersnaam: **niet** "admin". Kies een sterk wachtwoord en bewaar het in een wachtwoordmanager.
   - E-mailadres: je eigen adres (voor wachtwoordherstel).
2. Log in op `https://aardrijkskundelokaal.nl/wp-admin`.

## Stap 3 — Plugin en thema

1. **Plugins → Nieuwe plugin → Plugin uploaden** → `aklokaal-core-plugin.zip` → **Nu installeren** → **Activeren**.
2. **Weergave → Thema's → Nieuw thema → Thema uploaden** → `aklokaal-thema.zip` → **Nu installeren** → **Activeren**.
   (Let op: het thema bij *Weergave*, niet bij *Plugins*.)
3. **Instellingen → Permalinks** → **Berichtnaam** → **Wijzigingen opslaan**. Dit is nodig voor de hoofdstukpagina's.
4. Ruim op: verwijder bij **Plugins** wat de installer extra heeft meegezet en je niet nodig hebt,
   en het voorbeeldbericht "Hallo wereld!" bij **Berichten**.

Controle: open **Lesmateriaal → Structuur**, maak een testhoofdstuk, publiceer het en open het op de website.
Werkt dat, dan staat alles goed.

## Stap 4 — Beveiligen (10 minuten)

1. **Instellingen → Algemeen**: "Iedereen kan zich registreren" **uit**.
2. **Instellingen → Reacties**: "Sta reacties toe op nieuwe berichten" **uit**.
3. **Plugins → Nieuwe plugin**: zoek **Two Factor**, installeer en activeer. Ga naar **Gebruikers → Profiel** en zet
   een authenticator-app aan (bijvoorbeeld Google Authenticator of Microsoft Authenticator).
4. **Back-ups**: controleer in het Vimexx-paneel dat er automatische back-ups zijn. Wil je een eigen kopie,
   installeer dan **UpdraftPlus** (gratis) en koppel je Google Drive of OneDrive.
5. **Gebruikers**: alleen jij. Een collega later toevoegen? Geef die de rol *Redacteur*.

## Stap 5 — Interactieve toepassingen op apps.aardrijkskundelokaal.nl

1. Maak in het controlepaneel een **subdomein** `apps` aan (dus `apps.aardrijkskundelokaal.nl`).
   Het paneel maakt daar een eigen map voor. Zet ook hiervoor **SSL** aan.
2. Open de **bestandsbeheerder**, ga naar de map van het subdomein (vaak `public_html` binnen de map van
   `apps.aardrijkskundelokaal.nl`), upload `aklokaal-apps.zip` en **pak hem daar uit**.
   Het bestand `.htaccess` dat erin zit, zorgt dat alleen jouw site de toepassingen mag insluiten.
3. Controleer in je browser: `https://apps.aardrijkskundelokaal.nl/topografie-nederland/`.
4. In WordPress:
   - **Lesmateriaal → Interactief → Nieuw**: "Topografie Nederland", adres `https://apps.aardrijkskundelokaal.nl/topografie-nederland/`,
     hoogte `720`, korte samenvatting, uitgelichte afbeelding → Publiceren.
     Doe hetzelfde voor `landen-van-de-wereld/` en `fossiel-of-hernieuwbaar/`.
   - **Lesmateriaal → Kaarten → Nieuw**: "Wereldkaart met lagen", soort *Interactief*, adres
     `https://apps.aardrijkskundelokaal.nl/wereldkaart/`.
   - **Lesmateriaal → Kaarten → Nieuw**: "Digitale kaarten", soort *Interactief*, adres `https://kaarten.thejoast.org/`.
     Verschijnt die niet in het venster, zie [interactief.md](interactief.md).

## Stap 6 — Inrichten

1. **Weergave → Customizer → Aardrijkskundelokaal**: teksten op de homepage. **Headerafbeelding**: de grote kaart.
2. **Pagina's → Nieuw**: "Over deze website", met als slug `over`.
3. **Lesmateriaal → Handleiding**: overzicht van alle dagelijkse handelingen.
4. **Instellingen → Lezen**: "Zoekmachines ontmoedigen" **uit** zodra de site gevonden mag worden.

## Stap 7 — Controleren vóór je het aan leerlingen geeft

- [ ] Telefoon, laptop en digibord; licht en donker.
- [ ] Een hoofdstuklink met `#paragraaf-…` opent bij de goede paragraaf.
- [ ] Een PowerPoint uploaden lukt (anders: uploadlimiet in stap 1 verhogen).
- [ ] Een nieuwslink plakken haalt titel en uitgever op.
- [ ] De toepassingen werken in hun venster.
- [ ] Uitgelogd zie je geen concepten en geen *+ Toevoegen*.

## Wat er anders werkt dan op een eigen server

- **Geen automatische PDF-voorvertoning van PowerPoints.** Leerlingen downloaden de PowerPoint gewoon.
  Wil je een voorvertoning: sla de presentatie op als PDF en kies die bij het materiaal onder *PDF-voorvertoning*.
- Docker, Portainer en Cloudflare Tunnel zijn niet nodig (`wordpress/docker-compose.yml` en `docs/installatie.md`
  kun je negeren).

## Later iets laten aanpassen

Vraag Claude of Codex om de wijziging; je krijgt nieuwe zips (`tools/maak-zips.sh`). Upload de nieuwe plugin- of
themazip opnieuw en kies **Vervangen**. Je inhoud blijft staan. Nieuwe toepassingen upload je in de map van
`apps.aardrijkskundelokaal.nl`.
