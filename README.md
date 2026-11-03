# Digitaal Aardrijkskundelokaal

Een openbare onderwijswebsite voor lesmateriaal, nieuws, kaarten en interactieve toepassingen.
WordPress.org als beheersysteem, met een eigen thema (vormgeving) en een eigen plugin (inhoud en beheer).
Draait op een thuisserver met Docker/Portainer, publiek via Cloudflare Tunnel. Geen betaalde plugins.

## Wat zit waar

| Map | Wat |
| --- | --- |
| `prototype/` | Fase 1: statisch, klikbaar prototype. Ook de **bron van het designsysteem** (`assets/css`, `assets/js`). Open `prototype/index.html` in de browser. |
| `wordpress/wp-content/plugins/aklokaal-core/` | De plugin: inhoudsmodel, plaatsingen, uploads, nieuwsimport, REST API, beheerschermen. Alle inhoud blijft bestaan als je van thema wisselt. |
| `wordpress/wp-content/themes/aklokaal/` | Het thema: alleen weergave. |
| `wordpress/docker-compose.yml` | De Docker-stack: WordPress, MariaDB, back-ups, toepassingen, optioneel PDF-conversie en Cloudflare Tunnel. |
| `apps/` | Interactieve toepassingen (eigen HTML/JS), los van WordPress op een eigen subdomein. |
| `dist/` | **Uploadbestanden**: plugin, thema, demo-inhoud en toepassingen als zip (opnieuw maken met `tools/maak-zips.sh`). |
| `tools/` | Hulpscripts: thema-assets bijwerken, zips maken, rooktest. |
| `docs/` | Documentatie. Begin bij [docs/installatie.md](docs/installatie.md). |

## Documentatie

- **[Eerst testen op je laptop, zonder hosting](docs/testen-zonder-hosting.md)**: begin hier
- **[Online zetten bij Vimexx (aardrijkskundelokaal.nl)](docs/online-zetten.md)**
- **[Wereldatlas: lagen toevoegen en beheren](docs/atlas.md)**

- [Installatie op een eigen (thuis)server met Docker](docs/installatie.md) (Docker, Portainer, Cloudflare Tunnel, beveiliging)
- [Dagelijks gebruik](docs/beheer.md): materiaal toevoegen, hoofdstukken, nieuws, bundels, kaarten
- [Architectuur en technische keuzes](docs/architectuur.md)
- [Back-ups en herstel](docs/backups.md)
- [Interactieve toepassingen en kaarten toevoegen](docs/interactief.md)
- [Verder bouwen met Codex](docs/codex.md)
- [Fasen en status](docs/fasen.md)

## Snel lokaal proberen

```bash
cd wordpress
cp .env.example .env        # vul DB_PASSWORD en DB_ROOT_PASSWORD in; SITE_URL=http://localhost:8080
ADMIN_USER=docent ADMIN_PASS='kies-een-wachtwoord' ADMIN_EMAIL=jij@example.nl ./tools/install-local.sh
# open http://localhost:8080  (beheer: http://localhost:8080/wp-admin)
```
