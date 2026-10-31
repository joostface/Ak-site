#!/usr/bin/env sh
# Kopieert het designsysteem van het prototype naar het WordPress-thema.
# Het prototype (prototype/assets) is de bron van CSS, gedrag en lettertypen;
# pas daar aan, bekijk het resultaat in de browser en draai dan dit script.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
THEME="$ROOT/wordpress/wp-content/themes/aklokaal/assets"
cp "$ROOT"/prototype/assets/css/tokens.css "$ROOT"/prototype/assets/css/site.css "$THEME/css/"
cp "$ROOT"/prototype/assets/js/app.js "$THEME/js/"
cp "$ROOT"/prototype/assets/fonts/*.woff2 "$THEME/fonts/"
echo "Thema-assets bijgewerkt."
