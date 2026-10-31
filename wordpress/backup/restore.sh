#!/bin/bash
# Zet een back-up terug. Gebruik (op de thuisserver, in de map wordpress/):
#   ./backup/restore.sh backups/aklokaal-2026-10-31.tar.gz
# Let op: overschrijft de huidige database en uploads.
set -euo pipefail
FILE="${1:?geef het back-upbestand op}"
TMP=$(mktemp -d)
tar -C "$TMP" -xzf "$FILE"
echo "Database terugzetten…"
docker compose exec -T db sh -c 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' < "$TMP/database.sql"
echo "Uploads terugzetten…"
docker compose cp "$TMP/uploads.tar" wordpress:/tmp/uploads.tar
docker compose exec -T wordpress sh -c 'tar -C /var/www/html -xf /tmp/uploads.tar && chown -R www-data:www-data /var/www/html/wp-content/uploads && rm /tmp/uploads.tar'
rm -rf "$TMP"
echo "Klaar. Controleer de website."
