import sys, re, json, base64, os
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out + '/img', exist_ok=True)
t = open(src, encoding='utf-8').read()

# ---------- afbeeldingen ----------
a = t.index('<script type="application/json" id="drillion-assets">'); a2 = t.index('>', a) + 1; b = t.index('</script>', a2)
assets = json.loads(t[a2:b])
for k, v in assets.items():
    head, data = v.split(',', 1)
    open(out + '/img/' + k.split('/')[-1], 'wb').write(base64.b64decode(data))
css = t[t.index('<style>') + 7:t.index('</style></head><body>')]
m = re.search(r'\.surface-panorama \{[^}]*url\("data:image/webp;base64,([A-Za-z0-9+/=]+)"\)', css)
open(out + '/img/oppervlak.webp', 'wb').write(base64.b64decode(m.group(1)))
css = css.replace(m.group(0), m.group(0).split('url(')[0] + 'url("img/oppervlak.webp")')

# ---------- vragen ----------
q = t.index('<script type="application/json" id="drillion-questions">'); q2 = t.index('>', q) + 1; qb = t.index('</script>', q2)
vragen = json.loads(t[q2:qb])
open(out + '/drillion-vragen.js', 'w', encoding='utf-8').write('/* Drillion: 300 vragen met antwoorden en punten. */\nwindow.AK_DRILLION_VRAGEN=' + json.dumps(vragen, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------- markup ----------
body = t[t.index('<body>') + 6:t.index('<script type="application/json" id="drillion-assets">')]
IDS = sorted(set(re.findall(r'id="([a-z-]+)"', body)) | {'again', 'bar', 'lines', 'next', 'pill', 'qnote', 'qsug', 'search', 'tiers', 'time', 'timebar', 'yes'}, key=len, reverse=True)
body = re.sub(r'\bid="([a-z-]+)"', lambda mm: 'id="dr-' + mm.group(1) + '"', body)
open(out + '/markup.html', 'w', encoding='utf-8').write(body)

# ---------- spelcode ----------
js = t[qb + 9:]; js = js[js.index('<script>') + 8:js.rindex('</script>')]
def r(old, new, n=1):
    global js
    c = js.count(old); assert c == n, (old, c); js = js.replace(old, new)
r("var ASSETS=JSON.parse(document.getElementById('drillion-assets').textContent);\nvar QUESTIONS=JSON.parse(document.getElementById('drillion-questions').textContent);",
  "var ROOT=document.getElementById('dr-root');if(!ROOT||!window.AK_DRILLION_VRAGEN)return;\n"
  "// Afbeeldingen staan als losse bestanden naast het spel (map img/).\n"
  "var ASSETS={};" + json.dumps(list(assets.keys())) + ".forEach(function(k){ASSETS[k]=ROOT.getAttribute('data-img')+k.split('/').pop()});\n"
  "var QUESTIONS=window.AK_DRILLION_VRAGEN;")
for i in IDS:
    js = js.replace("'#" + i + "'", "'#dr-" + i + "'")
    js = js.replace('id="' + i + '"', 'id="dr-' + i + '"')
r("e.target.id!=='qform'", "e.target.id!=='dr-qform'")
r("document.querySelectorAll('[data-act=sound]')", "ROOT.querySelectorAll('[data-act=sound]')")
r("var b=e.target.closest('[data-act]');if(!b)return;", "var b=e.target.closest('[data-act]');if(!b||!ROOT.contains(b))return;")
r("var b=e.target.closest('[data-press]');if(!b||e.button>0)return;", "var b=e.target.closest('[data-press]');if(!b||!ROOT.contains(b)||e.button>0)return;")
r("if(e.target.closest('[data-press]'))e.preventDefault()", "if(e.target.closest&&e.target.closest('[data-press]')&&ROOT.contains(e.target))e.preventDefault()")
r("var b=e.target.closest('[data-press]');if(b&&e.detail===0)", "var b=e.target.closest('[data-press]');if(b&&ROOT.contains(b)&&e.detail===0)")
# het spel ligt als laag over de pagina: niet naar boven springen
r("document.body.style.overflow='hidden';window.scrollTo(0,0);", "document.body.style.overflow='hidden';")
left = [i for i in IDS if re.search(r"'#" + re.escape(i) + r"\b", js)]
assert not left, left
open(out + '/drillion.js', 'w', encoding='utf-8').write(
    "/*\n * Drillion, ingebouwd in de site. Spelregels, vragen, punten en de boorwereld zijn gelijk aan het\n"
    " * origineel (index.html); alleen de id's (dr-…) zijn uniek gemaakt en de afbeeldingen en vragen staan\n"
    " * in aparte bestanden (img/, drillion-vragen.js). Stijl: drillion.css.\n */\n" + js.strip() + "\n")

# ---------- stijl: alles binnen .dr ----------
css = re.sub(r'@font-face\{[^}]*\}', '', css)
KF = re.findall(r'@keyframes\s+([\w-]+)', css)
def pre_sel(sel):
    sel = sel.strip()
    if not sel: return sel
    for i in IDS:
        sel = re.sub(r'#' + re.escape(i) + r'(?![\w-])', '#dr-' + i, sel)
    if sel in (':root', 'html', 'body'): return '.dr'
    if sel.startswith('*'): return '.dr ' + sel
    return '.dr ' + sel
def walk(s):
    o, i = [], 0
    while i < len(s):
        if s[i].isspace(): o.append(s[i]); i += 1; continue
        if s.startswith('/*', i):
            j = s.index('*/', i) + 2; o.append(s[i:j]); i = j; continue
        br = s.index('{', i); head = s[i:br].strip()
        depth, j = 1, br + 1
        while depth:
            if s[j] == '{': depth += 1
            elif s[j] == '}': depth -= 1
            j += 1
        inner = s[br + 1:j - 1]
        if head.startswith('@keyframes'):
            o.append('@keyframes dr-' + head.split()[1] + '{' + inner + '}')
        elif head.startswith('@media'):
            o.append(head + '{' + walk(inner) + '}')
        else:
            o.append(','.join(pre_sel(x) for x in head.split(',')) + '{' + inner + '}')
        i = j
    return ''.join(o)
css = walk(css)
for k in sorted(KF, key=len, reverse=True):
    css = re.sub(r'(animation(?:-name)?\s*:[^;}]*?)(?<![\w-])' + re.escape(k) + r'(?![\w-])', lambda mm: mm.group(1) + 'dr-' + k, css)
# kleuren van de site gebruiken: de eigen tekst- en accentkleur van het origineel vervallen
import re as _re
css = _re.sub(r'(?<=[{;\s])--(ink|accent|accent-ink):[^;]+;', '', css, count=3)
assert '--ink:#' not in css and '--accent:#' not in css
open(out + '/basis.css', 'w', encoding='utf-8').write(css)
print('ids', IDS); print('keyframes', KF); print('vragen', len(vragen), 'beelden', len(assets) + 1)
