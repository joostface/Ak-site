#!/usr/bin/env sh
# Maakt de uploadbestanden in dist/: plugin, thema en toepassingen.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/dist" && rm -f "$ROOT"/dist/*.zip
(cd "$ROOT/wordpress/wp-content/plugins" && zip -qr "$ROOT/dist/aklokaal-core-plugin.zip" aklokaal-core)
(cd "$ROOT/wordpress/wp-content/themes" && zip -qr "$ROOT/dist/aklokaal-thema.zip" aklokaal)
(cd "$ROOT/apps" && zip -qr "$ROOT/dist/aklokaal-apps.zip" . -x "_gedeeld/tools/*" -x "nginx.conf.template")
ls -la "$ROOT/dist"
