#!/bin/bash
# Dagelijkse back-up: database (SQL) + uploads + eigen thema en plugin.
# Resultaat: ./backups/aklokaal-JJJJ-MM-DD.tar.gz ; oudere dan KEEP_DAYS worden opgeruimd.
# Zet minstens één kopie buiten de thuisserver, zie docs/backups.md (rclone, Synology, externe schijf).
set -euo pipefail

run_backup() {
  local day dir
  day=$(date +%F)
  dir=$(mktemp -d)
  echo "[backup] $(date -Is) start"
  mariadb-dump --host="$DB_HOST" --user="$DB_USER" --password="$DB_PASSWORD" \
    --single-transaction --routines --default-character-set=utf8mb4 "$DB_NAME" > "$dir/database.sql"
  tar -C /site -cf "$dir/uploads.tar" wp-content/uploads 2>/dev/null || true
  tar -C /repo -cf "$dir/code.tar" theme plugin
  tar -C "$dir" -czf "/backups/aklokaal-$day.tar.gz" .
  rm -rf "$dir"
  find /backups -name 'aklokaal-*.tar.gz' -mtime +"${KEEP_DAYS:-14}" -delete
  echo "[backup] $(date -Is) klaar: /backups/aklokaal-$day.tar.gz"
}

if [ "${1:-}" = "now" ]; then run_backup; exit 0; fi

# Eenvoudige planner zonder cron: elke dag om BACKUP_HOUR uur.
while true; do
  now=$(date +%s)
  next=$(date -d "today ${BACKUP_HOUR:-3}:00" +%s)
  [ "$next" -le "$now" ] && next=$(date -d "tomorrow ${BACKUP_HOUR:-3}:00" +%s)
  sleep $((next - now))
  run_backup || echo "[backup] MISLUKT"
done
