#!/usr/bin/env sh
# Maakt de uploadbestanden in dist/: plugin, thema, demo-inhoud en toepassingen.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/dist" && rm -f "$ROOT"/dist/*.zip
(cd "$ROOT/wordpress/wp-content/plugins" && zip -qr "$ROOT/dist/aklokaal-core-plugin.zip" aklokaal-core)
(cd "$ROOT/wordpress/wp-content/themes" && zip -qr "$ROOT/dist/aklokaal-thema.zip" aklokaal)
(cd "$ROOT/apps" && zip -qr "$ROOT/dist/aklokaal-apps.zip" . -x "_gedeeld/tools/*" -x "nginx.conf.template")
# Demo-plugin: de plugin + het demo-script + de voorbeeldkaarten
TMP="$(mktemp -d)" && mkdir -p "$TMP/aklokaal-demo"
cp "$ROOT/wordpress/wp-content/plugins/aklokaal-demo/aklokaal-demo.php" "$ROOT/wordpress/tools/demo-content.php" "$TMP/aklokaal-demo/"
cp -r "$ROOT/prototype/assets/img" "$TMP/aklokaal-demo/img"
(cd "$TMP" && zip -qr "$ROOT/dist/aklokaal-demo-plugin.zip" aklokaal-demo)
rm -rf "$TMP"
ls -la "$ROOT/dist"
