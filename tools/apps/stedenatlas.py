import sys, re, json, os
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
L = open(src, encoding='utf-8').read().split('\n')

# ---------- d3 (ongewijzigd) ----------
vendor = '\n'.join(L[71:76])
assert vendor.startswith('<script>// https://d3js.org/d3-array/')
vendor = vendor[len('<script>'):]
open(out + '/d3-geo.min.js', 'w', encoding='utf-8').write(vendor.rstrip() + '\n')

# ---------- database ----------
db = L[76]; i = db.index('{'); j = db.rindex('</script>')
data = json.loads(db[i:j])
open(out + '/stedenatlas-data.js', 'w', encoding='utf-8').write('/* Stedenatlas: landen, de vijf grootste plaatsen, kaarten en bronnen. */\nwindow.AK_STEDENATLAS_DB=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------- licenties ----------
whole = '\n'.join(L)
lic = whole[whole.index('<script type="text/plain" id="licenses">') + len('<script type="text/plain" id="licenses">'):]
lic = lic[:lic.index('</script>')]
open(out + '/LICENSES.txt', 'w', encoding='utf-8').write(lic.strip() + '\n')

# ---------- markup ----------
body = '\n'.join(L[65:71])
body = body[body.index('<header class="mast">'):]
body = body.replace('<noscript>Schakel JavaScript in om het spel te spelen.</noscript>', '')
IDS = sorted(set(re.findall(r'\bid="([a-z-]+)"', body)) | {'map', 'map-pins', 'chart-space', 'typeform', 'guess', 'next', 'peek', 'peek-reading'}, key=len, reverse=True)
def pid(s):
    s = re.sub(r'\b(id|for|aria-labelledby)="([a-z-]+)"', lambda m: m.group(1) + '="sa-' + m.group(2) + '"' if m.group(2) in IDS else m.group(0), s)
    return s
body = pid(body)
open(out + '/markup.html', 'w', encoding='utf-8').write(body.strip())

# ---------- app ----------
app = '\n'.join(L[77:576])
start = app.index("<script>const DB=JSON.parse(document.getElementById('database').textContent);") if "<script>const DB" in app else None
app = whole[whole.index("<script>const DB=JSON.parse(document.getElementById('database').textContent);"):]
app = app[len('<script>'):app.index('</script><script type="text/plain" id="licenses">')]
def r(old, new, n=1):
    global app
    c = app.count(old); assert c == n, (old, c); app = app.replace(old, new)
r("const DB=JSON.parse(document.getElementById('database').textContent);", "const ROOT=document.getElementById('sa-root');if(!ROOT||!window.AK_STEDENATLAS_DB||!window.d3)return;\nconst DB=window.AK_STEDENATLAS_DB;")
r("const el=id=>document.getElementById(id);", "const el=id=>document.getElementById('sa-'+id);\n// Toetsen en klikken alleen binnen het spel afhandelen, niet elders op de pagina.\nconst inScope=t=>t===document.body||ROOT.contains(t);")
app = pid(app)
r("document.getElementById('map')", "el('map')", 2)
r("e.target.id!=='typeform'", "e.target.id!=='sa-typeform'")
r("e.target.id==='next'", "e.target.id==='sa-next'")
r("e.target.id!=='map'", "e.target.id!=='sa-map'", 2)
r("closest('#peek')", "closest('#sa-peek')", 3)
r("document.body.dataset.screen=view", "ROOT.dataset.screen=view")
r("document.body.dataset.screen='setup'", "ROOT.dataset.screen='setup'")
r("document.querySelector('[data-act=\"'+a+'\"][data-value=\"'+v+'\"]')", "ROOT.querySelector('[data-act=\"'+a+'\"][data-value=\"'+v+'\"]')")
# de pagina niet laten springen: alleen het speelveld naar boven
r("function moveTop(){window.scrollTo(0,0);el('main').focus({preventScroll:true})}", "function moveTop(){el('main').scrollTop=0;el('main').focus({preventScroll:true})}")
r("const button=e.target.closest('[data-act]');if(!button||button.disabled)return;", "const button=e.target.closest('[data-act]');if(!button||button.disabled||!ROOT.contains(button))return;")
r("document.addEventListener('keydown',e=>{\n if(el('dialog').open", "document.addEventListener('keydown',e=>{\n if(!inScope(e.target))return;\n if(el('dialog').open")
r("document.addEventListener('keydown',e=>{if(view==='game'&&", "document.addEventListener('keydown',e=>{if(inScope(e.target)&&view==='game'&&")
# volledig scherm: alleen het spel, zonder de kop van de site
r("if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw Error()", "if(document.fullscreenElement)await document.exitFullscreen();else if(ROOT.requestFullscreen)await ROOT.requestFullscreen();else throw Error()")
r("De atlas vult het beschikbare venster. Je browser kan hier de adresbalk niet verbergen. Open het gedownloade bestand rechtstreeks in je browser voor de beschikbare schermopties.", "Je browser ondersteunt hier geen volledig scherm. Draai je telefoon of tablet een kwartslag voor meer ruimte.")
r("De lettertypen zijn DM Sans en DM Serif Display (SIL Open Font License). De licentieteksten staan in dit bestand.", "De lettertypen zijn die van de website: Source Serif 4 en Young Serif (SIL Open Font License). De licentie van D3 staat in LICENSES.txt bij het spel.")
# lettertype op de kaart: dat van de site
app = app.replace('"Atlas Sans",sans-serif', '"Source Serif 4",Georgia,serif')
# zee en labels op de kaart in de groentinten van de site (land en stippen blijven gelijk)
for a, b in [("'#10383c'", "'#15271f'"), ("'#1c4b50'", "'#1b372e'"), ("'#1a464a'", "'#1b3a30'"), ("'#123d40'", "'#16302a'"), ("'#12393de6'", "'#16302ae6'"), ("'#123a3d'", "'#16302a'"), ("'rgba(16,56,60,0)'", "'rgba(21,39,31,0)'"), ("'rgba(13,47,50,.68)'", "'rgba(17,32,26,.68)'"), ("'#376d70'", "'#2f5a4c'"), ("'#28575d'", "'#244a3e'"), ("'#1d454a'", "'#1c3b31'")]:
    app = app.replace(a, b)
left = re.findall(r"""(?:'|")#(map|peek|guess|typeform|next|dialog|main)(?:'|")""", app)
assert not left, left
open(out + '/stedenatlas.js', 'w', encoding='utf-8').write(
    "/*\n * Stedenatlas, ingebouwd in de site. Spel, kaarten en gegevens zijn gelijk aan het origineel (index.html);\n"
    " * id's hebben het voorvoegsel sa-, de data staat in stedenatlas-data.js en d3 in d3-geo.min.js.\n */\n(function(){\n'use strict';\n" + app.strip() + "\n})();\n")

# ---------- stijl binnen .sa ----------
css = '\n'.join(L[2:65])
css = css[css.index('<style>') + 7:css.rindex('</style>')]
css = re.sub(r'@font-face\{[^}]*\}', '', css)
KF = re.findall(r'@keyframes\s+([\w-]+)', css)
def split_sel(h):
    parts, depth, cur = [], 0, ''
    for ch in h:
        if ch == '(': depth += 1
        elif ch == ')': depth -= 1
        if ch == ',' and depth == 0: parts.append(cur); cur = ''
        else: cur += ch
    parts.append(cur); return parts
def pre_sel(sel):
    sel = sel.strip()
    for i in IDS:
        sel = re.sub(r'#' + re.escape(i) + r'(?![\w-])', '#sa-' + i, sel)
    if sel in (':root', 'html', 'body'): return '.sa'
    if sel.startswith('body'): return '.sa' + sel[4:]
    return '.sa ' + sel
def walk(s):
    o, i = [], 0
    while i < len(s):
        if s[i].isspace(): o.append(s[i]); i += 1; continue
        if s.startswith('/*', i):
            j = s.index('*/', i) + 2; o.append(s[i:j]); i = j; continue
        br = s.index('{', i); head = s[i:br].strip(); depth, j = 1, br + 1
        while depth:
            if s[j] == '{': depth += 1
            elif s[j] == '}': depth -= 1
            j += 1
        inner = s[br + 1:j - 1]
        if head.startswith('@keyframes'): o.append('@keyframes sa-' + head.split()[1] + '{' + inner + '}')
        elif head.startswith('@media'): o.append(head + '{' + walk(inner) + '}')
        else: o.append(','.join(pre_sel(x) for x in split_sel(head)) + '{' + inner + '}')
        i = j
    return ''.join(o)
css = walk(css)
for k in KF:
    css = re.sub(r'(animation(?:-name)?\s*:[^;}]*?)(?<![\w-])' + re.escape(k) + r'(?![\w-])', lambda m: m.group(1) + 'sa-' + k, css)
# eigen tekst-, papier- en lettertypekleuren van het origineel vervallen: die komen uit het thema
css = re.sub(r'(?<=[{;])--(paper|white|ink|quiet|line|pale|serif|sans):[^;}]+;?', '', css, count=8)
assert '--ink:#' not in css and '--serif:' not in css, 'tokens'
open(out + '/basis.css', 'w', encoding='utf-8').write(css)
print('ids', IDS); print('keyframes', KF); print('landen', len(data['countries']))
