#!/usr/bin/env bash
# Zet een lokale test- of demo-installatie op: containers starten, WordPress installeren,
# thema + plugin activeren en demo-inhoud plaatsen.
#
#   cd wordpress
#   cp .env.example .env   # vul DB_PASSWORD en DB_ROOT_PASSWORD in, SITE_URL=http://localhost:8080
#   ADMIN_USER=docent ADMIN_PASS='een-sterk-wachtwoord' ADMIN_EMAIL=jij@example.nl ./tools/install-local.sh
#
# Voor de echte website: gebruik de gewone WordPress-installatie in de browser
# en draai alleen de demo-inhoud als je die wilt zien (zie docs/installatie.md).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ADMIN_USER:?zet ADMIN_USER}" "${ADMIN_PASS:?zet ADMIN_PASS}" "${ADMIN_EMAIL:?zet ADMIN_EMAIL}"
source .env
URL="${SITE_URL:-http://localhost:8080}"
LOCAL="http://127.0.0.1:${HTTP_PORT:-8080}"

docker compose up -d db wordpress
echo "Wachten op WordPress…"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$LOCAL/wp-admin/install.php" || true)
  [ "$code" = "200" ] && break
  sleep 2
done

curl -s -o /dev/null -X POST "$LOCAL/wp-admin/install.php?step=2" \
  --data-urlencode "weblog_title=Aardrijkskundelokaal" \
  --data-urlencode "user_name=$ADMIN_USER" \
  --data-urlencode "admin_password=$ADMIN_PASS" \
  --data-urlencode "admin_password2=$ADMIN_PASS" \
  --data-urlencode "pw_weak=1" \
  --data-urlencode "admin_email=$ADMIN_EMAIL" \
  --data-urlencode "blog_public=0"
echo "WordPress geïnstalleerd op $URL"

docker compose cp tools wordpress:/tmp/aklokaal-tools >/dev/null
docker compose cp ../prototype/assets/img wordpress:/tmp/aklokaal-tools/img >/dev/null
docker compose exec -T wordpress chown -R www-data /tmp/aklokaal-tools
docker compose exec -T -u www-data -e AKLOKAAL_APPS_URL="${APPS_URL:-http://localhost:${APPS_PORT:-8081}}" wordpress \
  php /tmp/aklokaal-tools/demo-content.php 2>&1 | grep -v Fontconfig
