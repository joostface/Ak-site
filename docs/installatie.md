# Installatie op de thuisserver

Doel: WordPress in een eigen Docker-stack, publiek bereikbaar via HTTPS met Cloudflare Tunnel,
zonder poorten in de router open te zetten. Kosten: €0 per maand (alleen eventueel een domeinnaam).

## 1. Code op de server

```bash
sudo mkdir -p /opt && cd /opt
git clone https://github.com/joostface/ak-site.git aklokaal
cd aklokaal/wordpress
cp .env.example .env
nano .env
```

Vul in `.env` in:

- `SITE_URL` — het definitieve adres, bijvoorbeeld `https://aardrijkskunde.jouwdomein.nl`
- `DB_PASSWORD` en `DB_ROOT_PASSWORD` — lange willekeurige wachtwoorden (`openssl rand -base64 32`)
- `CLOUDFLARE_TUNNEL_TOKEN` — zie stap 4

## 2. Starten (Portainer of opdrachtregel)

**Opdrachtregel** (aanbevolen, omdat de stack mappen uit de repository gebruikt):

```bash
cd /opt/aklokaal/wordpress
docker compose --profile tunnel up -d                      # met Cloudflare Tunnel
docker compose --profile tunnel --profile conversie up -d  # plus PowerPoint → PDF
```

De stack verschijnt daarna in Portainer onder *Stacks* en kan daar bekeken, herstart en gevolgd worden.
Wil je hem helemaal vanuit Portainer beheren: *Stacks → Add stack → Repository*, met deze repository,
compose-pad `wordpress/docker-compose.yml`, en de waarden uit `.env` als *Environment variables*.

Alle diensten hebben `restart: unless-stopped`: na een stroomstoring of herstart van de server
starten ze vanzelf weer. Database, uploads en back-ups staan in volumes/mappen die blijven bestaan.

## 3. WordPress installeren

1. Open tijdelijk `http://<ip-van-server>:8080` vanaf de server zelf (de poort luistert alleen op 127.0.0.1;
   gebruik eventueel een SSH-tunnel: `ssh -L 8080:127.0.0.1:8080 server`).
2. Kies **Nederlands**, titel *Aardrijkskundelokaal*, een **eigen gebruikersnaam (niet "admin")** en een sterk wachtwoord.
3. *Plugins*: activeer **Aardrijkskundelokaal Core**. *Weergave → Thema's*: activeer **Aardrijkskundelokaal**.
4. *Instellingen → Permalinks*: kies **Berichtnaam** en sla op.
5. *Instellingen → Lezen*: zet "Zoekmachines ontmoedigen" uit zodra de site openbaar mag.
6. Optioneel demo-inhoud om te kijken (later in één keer op te ruimen):
   ```bash
   docker compose cp tools wordpress:/tmp/aklokaal-tools
   docker compose cp ../prototype/assets/img wordpress:/tmp/aklokaal-tools/img
   docker compose exec -u www-data wordpress php /tmp/aklokaal-tools/demo-content.php
   # opruimen:  ... demo-content.php opruimen
   ```

## 4. Cloudflare Tunnel (HTTPS zonder open poorten)

1. Zet je domein (gratis) bij Cloudflare.
2. *Zero Trust → Networks → Tunnels → Create a tunnel* (type Cloudflared). Kopieer het token naar `.env`.
3. *Public hostnames*:
   - `aardrijkskunde.jouwdomein.nl` → service `http://wordpress:80`
   - `apps.jouwdomein.nl` → service `http://apps:80` (interactieve toepassingen)
4. `docker compose --profile tunnel up -d`. Cloudflare regelt het HTTPS-certificaat.

## 5. Beheeromgeving extra afschermen (Cloudflare Access, gratis tot 50 gebruikers)

*Zero Trust → Access → Applications → Add → Self-hosted*:

- Domein `aardrijkskunde.jouwdomein.nl`, pad `wp-admin` — en een tweede regel voor pad `wp-login.php`.
- Policy: *Allow* — *Emails*: alleen jouw e-mailadres (inloggen met eenmalige code per mail).

Leerlingen merken hier niets van; alleen de beheerpagina's vragen eerst om die code. Dit is je
tweede factor. Wil je daarnaast 2FA in WordPress zelf, dan is de gratis plugin *Two Factor*
(van WordPress.org-bijdragers) een goede, kleine keuze.

**Let op:** `wp-json/aklokaal/v1/...` moet openbaar blijven voor de zoekfunctie. Schrijfacties daar
zijn al beschermd (login + nonce + rechten).

## 6. Beveiliging: wat er al is

- HTTPS via Cloudflare; WordPress herkent dat via `X-Forwarded-Proto`.
- Database alleen bereikbaar binnen de stack (geen poort naar buiten). WordPress-poort alleen op 127.0.0.1.
- Bestanden bewerken in wp-admin uitgeschakeld (`DISALLOW_FILE_EDIT`), XML-RPC uit,
  gebruikersnamen niet zichtbaar via de REST API of `?author=`.
- Uploads: alleen toegestane typen (PowerPoint, PDF, Word, afbeeldingen, zip), inhoud gecontroleerd
  (niet alleen de extensie), geen SVG, maximaal 200 MB.
- Alle wijzigingen via de API: login, `aklokaal_manage`-recht en nonce (CSRF-bescherming). Alle uitvoer ge-escaped.
- Interactieve toepassingen op een eigen subdomein in een sandbox-iframe; de toepassingsserver staat
  insluiten alleen toe vanaf de eigen site.
- Kleine WordPress-updates gaan automatisch. Grote updates: zie *Onderhoud* hieronder.

## 7. Back-ups

Draaien automatisch elke nacht om 3:00. Zie [backups.md](backups.md) — en zet zeker een kopie buiten de thuisserver.

## 8. Onderhoud

- Maandelijks: *Dashboard → Updates*; `docker compose pull && docker compose up -d` voor nieuwe images.
- Code bijwerken: `cd /opt/aklokaal && git pull` — thema en plugin zijn direct actief (ze worden alleen-lezen in de container gekoppeld).

## 9. Checklist vóór publicatie (fase 8)

- [ ] Eigen gebruikersnaam en sterk wachtwoord; Cloudflare Access op `wp-admin` en `wp-login.php`
- [ ] Taal Nederlands, permalinks op Berichtnaam, zoekmachines niet meer ontmoedigd
- [ ] Demo-inhoud opgeruimd
- [ ] Back-up gemaakt én teruggezet op een testmachine
- [ ] Externe back-up ingesteld
- [ ] Getest op telefoon, tablet, laptop en digibord (licht en donker)
- [ ] Alle nieuwsartikelen hebben uitgever en link; geen volledige artikelen of beschermde methodebestanden
- [ ] `tools/smoke-test.mjs` uitgevoerd tegen de testomgeving
