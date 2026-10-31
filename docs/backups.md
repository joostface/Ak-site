# Back-ups en herstel

## Automatisch

De dienst `backup` maakt elke nacht (standaard 3:00) in `wordpress/backups/` een bestand
`aklokaal-JJJJ-MM-DD.tar.gz` met:

- `database.sql` — de volledige database
- `uploads.tar` — alle geüploade bestanden
- `code.tar` — het eigen thema en de eigen plugin

Bewaard: 14 dagen (`BACKUP_KEEP_DAYS` in `.env`). Nu meteen een back-up maken:

```bash
docker compose exec backup bash /backup/backup.sh now
```

## Buiten de thuisserver (verplicht)

Een back-up op dezelfde schijf beschermt niet tegen een kapotte schijf, diefstal of brand. Kies één van:

- **rclone** (gratis) naar een cloudopslag die je al hebt (Google Drive, OneDrive, Backblaze B2-gratislaag).
  Op de server: `rclone config`, daarna een dagelijkse cron-regel:
  `30 4 * * * rclone copy /opt/aklokaal/wordpress/backups remote:aklokaal-backups --max-age 48h`
- Een **NAS** (bijvoorbeeld Synology Hyper Backup) die de map `wordpress/backups` ophaalt.
- Een **externe schijf** die je wekelijks aansluit (minder automatisch).

Configuratie (`.env`) zit niet in de back-up omdat er wachtwoorden in staan: bewaar die in je wachtwoordmanager.

## Terugzetten (en dat ook echt testen)

```bash
cd /opt/aklokaal/wordpress
./backup/restore.sh backups/aklokaal-2026-10-31.tar.gz
```

Test dit minstens één keer per jaar op een andere machine: clone de repository, zet `.env` neer,
`docker compose up -d`, voer de WordPress-installatie uit en draai daarna `restore.sh`. Werkt de site
met al het materiaal? Dan is je back-up goed.
