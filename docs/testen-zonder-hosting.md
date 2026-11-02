# Testen zonder hosting

Drie manieren, van makkelijk naar technisch. Alle drie gratis.

## 1. Alleen kijken: het prototype (2 minuten)

Download de repository als zip (GitHub → **Code → Download ZIP**, branch `claude/bouwplan-aardrijkskunde-website-sjbs41`),
pak hem uit en open `prototype/index.html` in je browser. Je ziet de vormgeving, het hoofdstuk met het meelopende
paragrafenmenu en de lichte en donkere modus. Beheren en uploaden kan hier nog niet.

## 2. De echte WordPress-site op je laptop met WordPress Studio (± 15 minuten, aanrader)

[WordPress Studio](https://developer.wordpress.com/studio/) is een gratis programma (Mac en Windows) dat een
complete WordPress-site op je laptop draait. Geen Docker, geen opdrachtregel.

1. Installeer **WordPress Studio** en open het.
2. **Add site** → geef hem een naam, bijvoorbeeld *Aardrijkskundelokaal* → **Add site**. Wacht tot hij draait.
3. Klik op **WP Admin**. Je bent meteen ingelogd.
4. Stel de taal in op Nederlands: **Settings → General → Site Language → Nederlands** → opslaan.
5. Upload uit de map `dist/` van de download:
   - **Plugins → Nieuwe plugin → Plugin uploaden** → `aklokaal-core-plugin.zip` → installeren → **Activeren**.
   - **Weergave → Thema's → Nieuw thema → Thema uploaden** → `aklokaal-thema.zip` → installeren → **Activeren**.
   - **Plugins → Nieuwe plugin → Plugin uploaden** → `aklokaal-demo-plugin.zip` → installeren → **Activeren**.
6. **Lesmateriaal → Demo-inhoud → Demo-inhoud plaatsen**. Even geduld (er worden kaarten geüpload).
7. Klik op **Bekijk de website**. Probeer:
   - het hoofdstuk *3 vwo → Energie*: scrollen, het paragrafenmenu, de link-knop bij een paragraaf;
   - **+ Toevoegen** rechtsboven: sleep een PowerPoint van je computer op de hoofdstukpagina;
   - **Lesmateriaal → Structuur** in het beheer: slepen, hernoemen, een hoofdstuk maken;
   - **Lesmateriaal → Nieuws importeren**: plak een link van een nieuwsartikel;
   - licht en donker, en de site op smal venster (zoals een telefoon).
8. Klaar met kijken? **Lesmateriaal → Demo-inhoud → Opruimen** haalt alle voorbeeldinhoud weer weg.

**Wat (nog) niet werkt in deze test:** de interactieve toepassingen en kaarten in de demo verwijzen naar
`https://apps.thejoast.org`. Die verschijnen pas als je de toepassingen op Cloudflare Pages hebt gezet
(zie [online-zetten.md](online-zetten.md), stap 4). De rest werkt volledig.

**Tip:** Studio kan een site later rechtstreeks overzetten, en je kunt een back-up exporteren. Wat je hier
inricht, ben je dus niet kwijt. Je kunt ook gewoon opnieuw beginnen op de echte hosting.

## 3. Met Docker (voor wie dat al gebruikt)

Zie de README: `cd wordpress && cp .env.example .env` (wachtwoorden invullen) en
`ADMIN_USER=… ADMIN_PASS=… ADMIN_EMAIL=… ./tools/install-local.sh`. Dit draait alles inclusief de toepassingen
en is ook wat de automatische tests gebruiken.
