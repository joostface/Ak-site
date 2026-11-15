/*
 * Stedenatlas, ingebouwd in de site. Spel, kaarten en gegevens zijn gelijk aan het origineel (index.html);
 * id's hebben het voorvoegsel sa-, de data staat in stedenatlas-data.js en d3 in d3-geo.min.js.
 */
(function(){
'use strict';
const ROOT=document.getElementById('sa-root');if(!ROOT||!window.AK_STEDENATLAS_DB||!window.d3)return;
const DB=window.AK_STEDENATLAS_DB;
const ids=Object.keys(DB.countries),allCities=ids.flatMap(id=>DB.countries[id].cities.map((c,i)=>({id,i})));
const el=id=>document.getElementById('sa-'+id);
// Toetsen en klikken alleen binnen het spel afhandelen, niet elders op de pagina.
const inScope=t=>t===document.body||ROOT.contains(t);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(body)=>'<svg class="sym" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const arrow=icon('<path d="M4 12h15m-5-5 5 5-5 5"/>'),listIcon=icon('<path d="M9 6h10M9 12h10M9 18h10"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),typeIcon=icon('<path d="m3 18 5-12 5 12m-8-4h6m4-1c2-3 5-2 5 0v5m0-4c-7-3-7 6 0 3"/>');
const focusIcon=icon('<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>');
const frameIcon=icon('<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>');
const byName=(a,b)=>a.localeCompare(b,'nl');
const norm=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ß/g,'ss').replace(/ø/g,'o').replace(/ł/g,'l').replace(/đ|ð/g,'d').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/[^\p{L}\p{N}]/gu,'');
function storeRead(key,fallback){try{return JSON.parse(localStorage.getItem('stedenatlas-v1-'+key))??fallback}catch{return fallback}}
let canSave=true;
function storeSet(key,val){try{localStorage.setItem('stedenatlas-v1-'+key,JSON.stringify(val))}catch{canSave=false}}
const initial={continent:'',region:'',land:'',mode:'choice',length:10,order:'country',lands:'all'};
let settings={...initial,...storeRead('menu',{})}, records=storeRead('progress',{}), view='setup',game=null, confirmedAction=null;
if(!records||typeof records!=='object'||Array.isArray(records))records={};
const continents=['Europa','Afrika','Azië','Noord-Amerika','Zuid-Amerika','Oceanië'];
function continentIds(){return ids.filter(id=>!settings.continent||DB.countries[id].continent===settings.continent)}
function regionIds(){return continentIds().filter(id=>!settings.region||DB.countries[id].region===settings.region)}
function poolIds(){return regionIds().filter(id=>!settings.land||id===settings.land)}
function validateMenu(){if(!continents.includes(settings.continent)&&settings.continent!=='')settings.continent='Europa';if(!continentIds().some(id=>DB.countries[id].region===settings.region))settings.region='';if(!regionIds().includes(settings.land))settings.land='';if(!['choice','write'].includes(settings.mode))settings.mode='choice';if(![5,10,20,'all'].includes(settings.length))settings.length=10;if(!['country','mixed'].includes(settings.order))settings.order='country';if(![1,3,5,'all'].includes(settings.lands))settings.lands='all'}
function calcLength(n){return Math.min(n,settings.length==='all'?n:settings.length)}
function cityKey(q){return q.id+'|'+norm(DB.countries[q.id].cities[q.i].name)}
function countText(n,one,many){return n+' '+(n===1?one:many)}
function titleArea(){return settings.land?DB.countries[settings.land].name:settings.region||settings.continent||'De hele wereld'}
function nav(){ROOT.dataset.screen=view;for(const [id,active] of [['nav-play',view!=='progress'],['nav-progress',view==='progress']]){if(active)el(id).setAttribute('aria-current','page');else el(id).removeAttribute('aria-current')}}
function moveTop(){el('main').scrollTop=0;el('main').focus({preventScroll:true})}
function intro(title,description){return '<div class="intro"><h1>'+title+'</h1>'+(description?'<p>'+description+'</p>':'')+'</div>'}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function priority(q){const r=records[cityKey(q)];return !r?.good?0:1}
function planRound(retry=null){
 const allowed=poolIds();
 if(retry&&settings.order==='mixed')return shuffle(retry);
 const byCountry=id=>DB.countries[id].cities.map((c,i)=>({id,i}));
 if(settings.order==='mixed'){
  const available=allowed.flatMap(byCountry);
  return shuffle(available).sort((a,b)=>priority(a)-priority(b)).slice(0,calcLength(available.length));
 }
 const targetIds=retry?[...new Set(retry.map(q=>q.id))]:allowed;
 const finished=id=>byCountry(id).every(q=>records[cityKey(q)]?.good)?1:0;
 const route=[...targetIds].sort((a,b)=>finished(a)-finished(b)||byName(DB.countries[a].name,DB.countries[b].name));
 const countryCount=retry||settings.lands==='all'?route.length:Math.min(route.length,settings.lands);
 return route.slice(0,countryCount).flatMap(id=>shuffle(retry?retry.filter(q=>q.id===id):byCountry(id)));
}
function newRound(retry=null){
 const questions=planRound(retry);if(!questions.length)return;
 const route=[...new Set(questions.map(q=>q.id))];
 game={questions,route,index:0,answers:[],answered:false,chosen:null,input:'',mode:settings.mode,order:settings.order};
 view='game';nav();newQuestion();
}
function newQuestion(){
 releasePeek();game.peeked=false;game.answered=false;game.chosen=null;game.input='';
 const q=game.questions[game.index],c=DB.countries[q.id];game.options=shuffle(c.cities.map((_,i)=>i));prepareFlat(q.id,q.i);
 showQuestion();moveTop();
}
function regionCrumb(c){return esc(c.continent)+(c.region===c.continent?'':' <span aria-hidden="true">/</span> '+esc(c.region))}
function boardHtml(c){
 return '<div class="play-plot"><canvas id="sa-map" tabindex="0" role="img" aria-label="Kaart van '+esc(c.name)+'. Zoek de plaats bij de oranje stip."></canvas>'+compass+
 '<div class="map-controls"><button data-act="zoomout" title="Uitzoomen" aria-label="Uitzoomen">−</button><button data-act="zoomin" title="Inzoomen" aria-label="Inzoomen">+</button><button data-act="detail" title="Detail van de stip" aria-label="Bekijk de omgeving van de stip">'+focusIcon+'</button><button data-act="resetmap" title="Hele land" aria-label="Terug naar de overzichtskaart">'+frameIcon+'</button></div></div>';
}
function showQuestion(){
 const q=game.questions[game.index],c=DB.countries[q.id], city=c.cities[q.i];
 const mode=game.mode, ans=game.answers[game.index],isSingle=c.cities.length===1;
 const score=game.answers.filter(a=>a.good).length, amount=game.questions.length;
 const choices='<div class="choices">'+game.options.map((j,pos)=>{const isCorrect=game.answered&&j===q.i,isWrong=game.answered&&j===game.chosen&&j!==q.i;return '<button class="choice '+(isCorrect?'right':isWrong?'wrong':'')+'" data-act="choice" data-value="'+j+'" '+(game.answered?'disabled':'')+'><span class="letter">'+String.fromCharCode(65+pos)+'</span>'+esc(c.cities[j].name)+(isCorrect||isWrong?'<span class="choice-mark" aria-label="'+(isCorrect?'juist':'onjuist')+'">'+(isCorrect?'✓':'×')+'</span>':'')+'</button>'}).join('')+'</div>';
 const typing='<form class="typing" id="sa-typeform"><label for="sa-guess">Jouw antwoord</label><input id="sa-guess" required maxlength="120" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="Typ de naam van de plaats"><button class="primary wide" type="submit">Controleer antwoord '+arrow+'</button></form>';
 const prompt=c.unitPrompt||'Welke stad is dit?';
 const grouped=game.order==='country',next=game.questions[game.index+1];
 const routeCount=game.route.length,countryNumber=game.route.indexOf(q.id)+1;
 const countryQs=grouped?game.questions.filter(x=>x.id===q.id):[];
 const localNumber=grouped?countryQs.findIndex(x=>x.i===q.i)+1:0;
 const nextName=!next?'Bekijk je resultaat':grouped&&next.id!==q.id?'Door naar '+DB.countries[next.id].name:'Volgende plaats';
 const tally=grouped?'Land '+countryNumber+' van '+routeCount+' &nbsp;·&nbsp; Plaats '+localNumber+' van '+countryQs.length:'Vraag '+(game.index+1)+' van '+amount;
 const feedback=game.answered?'<div class="feedback-wrap"><div class="score-box '+(ans.good?'':'missed')+'" role="status"><strong>'+esc(ans.good?'Goed! '+city.name:'De stip is '+city.name+'.')+'</strong><span>'+(ans.good?'':ans.input?'Jij antwoordde '+esc(ans.input)+'. ':'Overgeslagen. ')+(isSingle?'Dit is een stadstaat.':'Nummer '+(q.i+1)+' in de ranglijst.')+'</span></div><button id="sa-next" class="primary wide" data-act="next">'+esc(nextName)+arrow+'</button><button class="rank-link" data-act="rank">Ranglijst van '+esc(c.name)+'</button></div>':'';
 const peekButton='<button type="button" id="sa-peek" class="peek" aria-label="Spieken, ingedrukt houden" aria-pressed="false" title="Houd ingedrukt of houd de S-toets vast">'+eyeIcon+'<span>Spieken <small>houd vast</small></span></button>';
 el('main').innerHTML='<section class="play-screen"><div class="play-header"><div><div class="atlas-trail">'+regionCrumb(c)+'</div><h1>'+esc(c.name)+'</h1></div><div class="run-meter"><span>'+tally+'</span><div class="run-segments" aria-hidden="true">'+(grouped?countryQs.map((x,i)=>'<i class="'+(i<localNumber-1||i===localNumber-1&&game.answered?'done':i===localNumber-1?'current':'')+'"></i>').join(''):'<i class="mixed-meter" style="--through:'+(100*game.answers.length/amount)+'%"></i>')+'</div></div></div>'+
 '<div class="play-field">'+boardHtml(c)+'<aside class="play-console"><div class="console-title"><div class="play-mode">'+(grouped?'Land voor land':'Door elkaar')+'</div><h2>'+esc(prompt)+'</h2></div>'+
 (game.answered?feedback:((mode==='choice'?choices:typing)+'<button class="skip-answer" data-act="skip">Ik weet het niet</button>'))+
 '<div class="peek-row">'+peekButton+'<span class="peek-description">Bekijk alle namen op de kaart.</span></div><span id="sa-peek-reading" class="sr-only" aria-live="polite"></span>'+
 (c.note?'<button data-act="land-note" class="note-link">Over deze ranglijst</button>':'')+'</aside></div></section>';
 observeMap();
}
function submitAnswer(input,index=null){
 if(!game||game.answered||peek)return;const q=game.questions[game.index],c=DB.countries[q.id],city=c.cities[q.i];
 const answer=input.trim();if(index===null&&input!==''&&!answer)return;
 const good=index!==null?index===q.i:!!answer&&[city.name,...city.aliases].some(s=>norm(s)===norm(answer));
 game.answered=true;game.chosen=index;game.input=answer;game.answers.push({...q,good,input:answer,peeked:game.peeked});
 const key=cityKey(q);records[key]={good,attempts:(records[key]?.attempts||0)+1};storeSet('progress',records);
 showQuestion();el('next').focus({preventScroll:true});
}
function advance(){if(!game?.answered)return;if(++game.index>=game.questions.length)showResult();else newQuestion()}
function showResult(){
 view='result';flat=null;mapObserver?.disconnect();nav();const {answers}=game,score=answers.filter(a=>a.good).length, misses=answers.length-score;
 el('main').innerHTML='<section class="entrance">'+intro('Ronde voltooid.',esc(titleArea())+' · '+(game.mode==='write'?'Zelf typen':'Meerkeuze'))+'<div class="result-top"><div class="score-banner"><div class="score-big">'+score+'/'+answers.length+'</div><p>'+(!misses?'Alle plaatsen goed herkend.':countText(misses,'plaats om nog eens te oefenen.','plaatsen om nog eens te oefenen.'))+'</p></div><div class="result-actions">'+(misses?'<button class="primary wide" data-act="retry">Oefen de gemiste plaatsen '+arrow+'</button>':'')+'<button class="'+(misses?'secondary':'primary')+' wide" data-act="start">Nieuwe ronde '+arrow+'</button><button class="secondary wide" data-act="home">Ander speelgebied '+arrow+'</button></div></div><div class="box"><h2>Jouw antwoorden</h2><ul class="review-list">'+answers.map(a=>{const c=DB.countries[a.id],city=c.cities[a.i];return '<li><span class="state-icon '+(a.good?'':'missed')+'">'+(a.good?'✓':'×')+'</span><div class="review-name"><b>'+esc(city.name)+'</b><small>'+(a.good?(a.peeked?'Goed met spiekhulp':'Goed herkend'):a.input?'Jouw antwoord: '+esc(a.input):'Overgeslagen')+'</small></div><span class="result-land">'+esc(c.name)+'</span></li>'}).join('')+'</ul></div></section>';moveTop();
}
function showProgress(){
 view='progress';flat=null;game=null;mapObserver?.disconnect();nav();
 const known=allCities.filter(q=>records[cityKey(q)]?.good).length;
 const seen=allCities.filter(q=>records[cityKey(q)]).length;
 el('main').innerHTML='<section class="entrance">'+intro('Jouw voortgang.','Een plaats telt als herkend als je laatste antwoord goed was.')+
 '<div class="result-top"><div class="score-banner"><div class="score-big">'+known+'</div><p>van de '+allCities.length+' plaatsen herkend<br><small>'+seen+' plaatsen geoefend</small></p></div><div class="result-actions"><button class="primary wide" data-act="home">Stel een ronde samen '+arrow+'</button></div></div><div class="box"><h2>Per werelddeel</h2><ul class="stage-list">'+continents.map(co=>{const rows=allCities.filter(q=>DB.countries[q.id].continent===co),n=rows.filter(q=>records[cityKey(q)]?.good).length;return '<li><span>'+esc(co)+'</span><span class="stage-num">'+n+' / '+rows.length+'</span><span class="mini-track"><i style="width:'+(n*100/rows.length)+'%"></i></span><button data-act="area" data-value="'+esc(co)+'" aria-label="Oefen '+esc(co)+'">Oefen</button></li>'}).join('')+'</ul><p class="session-note">'+(canSave?'Je voortgang wordt bewaard in deze browser, zolang de browser lokale opslag toestaat.':'Deze browser bewaart de voortgang alleen zolang het spel open blijft.')+'</p></div></section>';moveTop();
}
function dialog(title,body){releasePeek();el('dialog-title').textContent=title;el('dialog-body').innerHTML='<div class="dialog-copy">'+body+'</div>';if(!el('dialog').open)el('dialog').showModal()}
function link(url,label){return '<a target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+esc(label)+'</a>'}
function countrySource(c){
 const s=c.source;if(!s)return '';return '<p class="tiny">Bron: '+link(s.url,s.source)+(s.year?' · '+esc(s.year):'')+(s.unit?' · '+esc(s.unit):'')+'.</p>';
}
function doNavigate(fn){
 if(view==='game'){confirmedAction=fn;dialog('Je ronde verlaten?','<p>De gegeven antwoorden tellen mee voor je voortgang. Je kunt de huidige ronde verder spelen of teruggaan naar het menu.</p><div class="actions"><button class="primary" data-act="close">Verder spelen</button><button class="secondary" data-act="leave">Ronde verlaten</button></div>');return}fn();
}
function helpDialog(){dialog('Zo speel je Stedenatlas','<ol><li>Tik in de atlas op een werelddeel, regio of land. Met de knop rechtsonder kun je het hele gekozen gebied oefenen.</li><li>Bij <b>Land voor land</b> krijg je alle vijf plaatsen van hetzelfde land achter elkaar. Sommige stadstaten hebben één plaats. Kies <b>Door elkaar</b> voor een gemengde ronde.</li><li>Zoek de oranje stip en kies of typ de naam. Met het vizier vergroot je de omgeving van de stip. Hoofdletters, spaties en accenten mag je weglaten.</li><li>Houd <b>Spieken</b> of de <b>S-toets</b> ingedrukt om de plaatsnamen te zien. Laat los om verder te oefenen. Spieken geeft geen strafpunten.</li></ol><p>Met de toetsen A–E of 1–5 kies je een antwoord. Na de feedback ga je met Enter verder.</p><button class="secondary" data-act="sources">Kaartgegevens en bronnen</button>')}
function sourceDialog(){
 dialog('Kaartgegevens en bronnen','<p>Je kunt '+ids.length+' landen en gebieden oefenen: de 193 VN-lidstaten, Palestina, Vaticaanstad, Kosovo en Taiwan. Elk gebied staat in één werelddeel en één regio. Zo vind je Rusland bij Europa en Turkije bij Azië.</p><h3>Wat telt als stad?</h3><p>De lijsten volgen het aantal inwoners volgens de beschikbare landelijke telling of bron. De afbakening en het peiljaar verschillen per land. Soms telt een gemeente of stedelijk gebied mee. Bij kleine eilandstaten oefen je ook dorpen of districten. Monaco, Singapore en Vaticaanstad hebben elk één vraag.</p><p>De bevolkingsgegevens komen onder andere van '+link('https://www.citypopulation.de/','City Population (Thomas Brinkhoff)')+', het '+link('https://unstats.un.org/unsd/demographic-social/products/dyb/','Demographic Yearbook van de VN')+' en '+link('https://www.geonames.org/','GeoNames')+'. De plaatsnamen, naamvarianten en coördinaten zijn onder meer afgeleid van GeoNames ('+link('https://creativecommons.org/licenses/by/4.0/','CC BY 4.0')+'). De ranglijst na elke vraag vermeldt de bron voor dat land.</p><details><summary>Bronnen van de kaarten</summary>'+DB.mapCredit+'</details><details><summary>Techniek en lettertypen</summary><p>De wereldbol gebruikt D3 Geo en D3 Array (Mike Bostock e.a., ISC). De lettertypen zijn die van de website: Source Serif 4 en Young Serif (SIL Open Font License). De licentie van D3 staat in LICENSES.txt bij het spel.</p></details>');
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-act]');if(!button||button.disabled||!ROOT.contains(button))return;const a=button.dataset.act,v=button.dataset.value;
 if(a==='close'){el('dialog').close();confirmedAction=null;return}
 if(a==='leave'){const fn=confirmedAction;confirmedAction=null;el('dialog').close();fn?.();return}
 if(a==='help'){helpDialog();return}if(a==='sources'){sourceDialog();return}
 if(a==='home'){doNavigate(resetAtlas);return}if(a==='progress'){doNavigate(showProgress);return}
 if(a==='full'){toggleFullscreen();return}
 if(a==='area'){stage='world';trail=[];view='setup';selectStage(v);return}
 if(a==='back'){goBack();return}
 if(a==='scope'){if(stage==='world')settings.continent='';if(stage!=='countries')settings.region='';settings.land='';pushStage('rules');return}
 if(a==='list'){atlasList();return}
 if(a==='list-pick'){el('dialog').close();selectStage(v);return}
 if(a==='pick'){selectStage(v);return}
 if(['mode','length','order','lands'].includes(a)){
  settings[a]=['length','lands'].includes(a)&&v!=='all'?Number(v):v;
  showSetup();ROOT.querySelector('[data-act="'+a+'"][data-value="'+v+'"]')?.focus({preventScroll:true});return
 }
 if(a==='land-note'){const c=DB.countries[game.questions[game.index].id];dialog('Over '+c.name,'<p>'+esc(c.note)+'</p>'+countrySource(c));return}
 if(a==='start'){newRound();return}if(a==='retry'){newRound(game.answers.filter(x=>!x.good).map(({id,i})=>({id,i})));return}
 if(a==='choice'){const q=game.questions[game.index];submitAnswer(DB.countries[q.id].cities[Number(v)].name,Number(v));return}
 if(a==='skip'){submitAnswer('');return}if(a==='next'){advance();return}
 if(a==='rank'){const q=game.questions[game.index],c=DB.countries[q.id];dialog('Ranglijst van '+c.name,'<ol class="rankings">'+c.cities.map((x,i)=>'<li class="'+(i===q.i?'target':'')+'">'+esc(x.name)+'</li>').join('')+'</ol>'+(c.note?'<p>'+esc(c.note)+'</p>':'')+countrySource(c));return}
 if(['zoomin','zoomout','detail','resetmap'].includes(a))adjustFlat(a);
});
document.addEventListener('submit',e=>{if(e.target.id!=='sa-typeform')return;e.preventDefault();const t=el('guess').value.trim();if(t)submitAnswer(t);else el('guess').focus()});
document.addEventListener('keydown',e=>{
 if(!inScope(e.target))return;
 if(el('dialog').open||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
 if(view!=='game'||peek||isPeekKey(e)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(game.answered&&e.key==='Enter'&&(!e.target.closest('button')||e.target.id==='sa-next')){e.preventDefault();advance();return}
 if(game.answered||game.mode!=='choice')return;const k=e.key.toLowerCase();const idx=/^[1-5]$/.test(k)?Number(k)-1:/^[a-e]$/.test(k)?k.charCodeAt(0)-97:-1;
 if(idx>=0&&idx<game.options.length){e.preventDefault();const j=game.options[idx],q=game.questions[game.index];submitAnswer(DB.countries[q.id].cities[j].name,j)}
});
el('dialog').addEventListener('click',e=>{if(e.target!==el('dialog'))return;const b=el('dialog').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)el('dialog').close()});

const rad=Math.PI/180;
const wrapLon=x=>((x+540)%360+360)%360-180;
const mercY=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-84,Math.min(84,lat))*rad/2))/rad;
const bbox=pts=>pts.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
function sphereCenter(points){
 let x=0,y=0,z=0; for(const [lon,lat] of points){x+=Math.cos(lat*rad)*Math.cos(lon*rad);y+=Math.cos(lat*rad)*Math.sin(lon*rad);z+=Math.sin(lat*rad)}
 return [Math.atan2(y,x)/rad,Math.atan2(z,Math.hypot(x,y))/rad];
}
const compass='<div class="compass" aria-hidden="true"><svg viewBox="0 0 30 46"><text x="15" y="9" text-anchor="middle" fill="#e2dfc8" font-size="9" font-family="sans-serif">N</text><path d="M15 13 21 35 15 31Z" fill="#f2ddaa"/><path d="M15 13 9 35 15 31Z" fill="#94ada4"/><path d="M3 29h24" stroke="#90a69c" stroke-width=".8"/></svg></div>';
const globeFeatures=Object.entries(DB.maps.world).map(([id,rings])=>[id,{type:'MultiPolygon',coordinates:rings.map(r=>[r])}]);
const gridSphere=d3.geoGraticule().step([15,15])();
let globeRotation=[15,46], globeSelection=[], flat=null, mapObserver=null, scheduled=false;
function paintSoon(){if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;paintMap()})}}
function observeMap(){mapObserver?.disconnect();const c=el('map');if(!c)return;mapObserver=new ResizeObserver(paintSoon);mapObserver.observe(c);paintSoon()}
function paintMap(){
 const canvas=el('map');if(!canvas)return;
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 const dpr=Math.min(2,window.devicePixelRatio||1),bw=Math.round(w*dpr),bh=Math.round(h*dpr);
 if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh}
 const ctx=canvas.getContext('2d');ctx.setTransform(bw/w,0,0,bh/h,0,0);ctx.clearRect(0,0,w,h);
 if(view==='setup'){if(stage==='rules')drawGlobe(ctx,w,h);else drawPicker(ctx,w,h)}else if(view==='game'&&flat)drawFlat(ctx,w,h);
}
function disc(ctx,x,y,r,fill,line,width=1){
 ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);if(fill){ctx.fillStyle=fill;ctx.fill()}if(line){ctx.strokeStyle=line;ctx.lineWidth=width;ctx.stroke()}
}
function drawGlobe(ctx,w,h){
 const compact=w<700, r=compact?Math.min(w*.7,h*.58):Math.min(w*.335,h*.455), cx=w*(compact?.82:.682),cy=h*(compact?.32:.49);
 ctx.fillStyle='#15271f';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#345256';ctx.lineWidth=.65;ctx.beginPath();
 for(let x=18;x<w-8;x+=32){ctx.moveTo(x,0);ctx.lineTo(x,3);ctx.moveTo(x,h-3);ctx.lineTo(x,h)}
 for(let y=15;y<h;y+=32){ctx.moveTo(0,y);ctx.lineTo(3,y);ctx.moveTo(w-3,y);ctx.lineTo(w,y)}ctx.stroke();
 for(const [x,y] of [[.14,.29],[.22,.69],[.9,.73],[.85,.19]]){ctx.beginPath();ctx.moveTo(w*x-3,h*y);ctx.lineTo(w*x+3,h*y);ctx.moveTo(w*x,h*y-3);ctx.lineTo(w*x,h*y+3);ctx.stroke()}
 const pr=d3.geoOrthographic().rotate([-globeRotation[0],-globeRotation[1]]).translate([cx,cy]).scale(r).precision(.7);
 const path=d3.geoPath(pr,ctx),chosen=new Set(globeSelection);
 ctx.setLineDash([1,4]);disc(ctx,cx,cy,r+7,null,'#738e86',.7);ctx.setLineDash([]);
 const grd=ctx.createRadialGradient(cx-r*.25,cy-r*.4,0,cx,cy,r);grd.addColorStop(0,'#2f5a4c');grd.addColorStop(.78,'#244a3e');grd.addColorStop(1,'#1c3b31');disc(ctx,cx,cy,r,grd,'#8ea69a',.7);
 for(const [id,geo] of globeFeatures){
  ctx.beginPath();path(geo);ctx.fillStyle=chosen.has(id)?'#efd197':'#94a99a';ctx.fill();ctx.lineWidth=.55;ctx.strokeStyle=chosen.has(id)?'#847b58':'#4c736e';ctx.stroke();
 }
 ctx.beginPath();path(gridSphere);ctx.strokeStyle='rgba(206,223,202,.32)';ctx.lineWidth=.56;ctx.stroke();
 const occupied=[], candidates=chosen.size===1?DB.countries[globeSelection[0]].cities:globeSelection.map(id=>DB.countries[id].cities[0]);
 for(const city of candidates){
  const lonlat=[city.lon,city.lat];if(d3.geoDistance(globeRotation,lonlat)>1.36)continue;
  const [x,y]=pr(lonlat);if(occupied.some(([a,b])=>Math.hypot(x-a,y-b)<(compact?12:15)))continue;
  occupied.push([x,y]);disc(ctx,x,y,compact?2.4:3.2,'#c5562f','#fff0bb',.85);if(occupied.length>=28)break;
 }
 const shade=ctx.createLinearGradient(0,h*.65,0,h);shade.addColorStop(0,'rgba(21,39,31,0)');shade.addColorStop(1,'rgba(17,32,26,.68)');ctx.fillStyle=shade;ctx.fillRect(0,h*.65,w,h*.35);
}
const continentViews={'Europa':[13,46],'Afrika':[17,5],'Azië':[91,32],'Noord-Amerika':[-89,29],'Zuid-Amerika':[-63,-15],'Oceanië':[155,-16],'De hele wereld':[8,28]};
function globeHome(){
 const ids=poolIds();globeSelection=ids;
 if(!settings.land&&!settings.region)globeRotation=[...(continentViews[settings.continent]||continentViews['De hele wereld'])];
 else globeRotation=sphereCenter(ids.map(id=>{const c=DB.countries[id].cities[0];return [c.lon,c.lat]}));
 paintSoon();
}
function localRing(ring,anchor){
 let last=anchor;const pts=ring.map(([lon,lat])=>{const u=last+wrapLon(lon-last);last=u;return [u,mercY(lat)]});
 const b=bbox(pts),shift=360*Math.round((anchor-(b[0]+b[2])/2)/360);
 if(shift)for(const p of pts)p[0]+=shift;
 return {p:pts,b:[b[0]+shift,b[1],b[2]+shift,b[3]]};
}
function padded(b,margin){return [b[0]-margin,b[1]-margin,b[2]+margin,b[3]+margin]}
function boundsUnion(a,b){return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])]}
function gapToBox(p,b){return Math.hypot(Math.max(b[0]-p[0],0,p[0]-b[2]),Math.max(b[1]-p[1],0,p[1]-b[3]))}
const fixedBounds={US:[-125,24.3,-66.6,49.6],FR:[-5.2,41.2,9.7,51.2],NL:[3.32,50.73,7.25,53.57],NO:[4.3,57.8,31.2,71.2],PT:[-9.58,36.93,-6.12,42.16],ES:[-9.35,35.95,4.34,43.92],GB:[-8.22,49.85,1.8,58.8],DK:[8,54.48,15.2,57.78],NZ:[166,-47.4,178.8,-34.2],RU:[27.4,41,186,73.4],CN:[73.5,18,134.9,53.6],IT:[6.5,35.3,18.7,47.1],AU:[112.8,-43.8,153.7,-10.5],JP:[128.9,30,146,45.6],GR:[19.3,34.8,29.7,41.8]};
const rawBoundsCache=new WeakMap();
function nearbyRings(rings,anchor,extent){
 const result=[];
 for(const ring of rings){
  let raw=rawBoundsCache.get(ring);
  if(!raw){raw=bbox(ring);raw[1]=mercY(raw[1]);raw[3]=mercY(raw[3]);rawBoundsCache.set(ring,raw)}
  if(raw[1]>extent[3]||raw[3]<extent[1])continue;
  const shift=360*Math.round((anchor-(raw[0]+raw[2])/2)/360);
  if(raw[2]-raw[0]<180&&(raw[0]+shift>extent[2]||raw[2]+shift<extent[0]))continue;
  const local=localRing(ring,anchor);if(intersects(local.b,extent))result.push(local);
 }
 return result;
}
function prepareFlat(id,target){
 const c=DB.countries[id],anchor=sphereCenter(c.cities.map(x=>[x.lon,x.lat]))[0];
 const selected=(DB.maps.detail[id]||[]).map(r=>localRing(r,anchor)), holes=(DB.maps.detailHoles[id]||[]).map(r=>localRing(r,anchor));
 const pts=c.cities.map(x=>[anchor+wrapLon(x.lon-anchor),mercY(x.lat)]), cityB=bbox(pts);
 let b=[...cityB], fixed=fixedBounds[id];
 if(fixed){const left=anchor+wrapLon(fixed[0]-anchor);b=boundsUnion(b,[left,mercY(fixed[1]),left+fixed[2]-fixed[0],mercY(fixed[3])]);}
 else{
  const span=Math.max(cityB[2]-cityB[0],cityB[3]-cityB[1],.012);
  for(const p of pts){
   let near=selected.filter(r=>gapToBox(p,r.b)<Math.max(span*.08,.012));
   if(!near.length&&selected.length)near=[selected.reduce((a,v)=>gapToBox(p,a.b)<gapToBox(p,v.b)?a:v)];
   for(const ring of near)b=boundsUnion(b,ring.b);
  }
  const span2=Math.max(b[2]-b[0],b[3]-b[1],.012);
  for(const ring of selected)if(intersects(ring.b,padded(b,0))||intersects(ring.b,padded(cityB,span2*.1)))b=boundsUnion(b,ring.b);
 }
 const visibleBounds=padded(b,Math.max(b[2]-b[0],b[3]-b[1],.01)*1.7);
 const back=[];
 for(const [cid,rings] of Object.entries(DB.maps.detail)){
  if(cid===id)continue;
  const pr=nearbyRings(rings,anchor,visibleBounds);
  if(pr.length)back.push([...pr,...nearbyRings(DB.maps.detailHoles[cid]||[],anchor,visibleBounds)]);
 }
 const lakes=nearbyRings(DB.lakes,anchor,visibleBounds);
 flat={id,anchor,selected,holes,lakes,pts,b,back,target,zoom:1,panX:0,panY:0,detail:false,scale:1};
}
function drawFlat(ctx,w,h){
 const f=peek?{...flat,b:bbox(flat.pts),zoom:1,detail:false,panX:0,panY:0}:flat;
 if(peek&&f.pts.length===1)f.b=flat.b;
 const b=f.b,tx=f.pts[f.target], base=Math.min((w*(peek?.66:.78))/Math.max(.001,b[2]-b[0]),(h*(peek?.65:.76))/Math.max(.001,b[3]-b[1]));
 const k=base*f.zoom, cx=f.detail?tx[0]:(b[2]+b[0])/2,cy=f.detail?tx[1]:(b[3]+b[1])/2;
 const x0=w/2-cx*k+f.panX,y0=h/2+cy*k+f.panY;f.scale=k;f.base=base;
 const project=p=>[x0+p[0]*k,y0-p[1]*k],vp=[-x0/k,(y0-h)/k,(w-x0)/k,y0/k];
 ctx.fillStyle='#1b372e';ctx.fillRect(0,0,w,h);
 function pass(rings,fill,stroke,width){
  ctx.beginPath();for(const r of rings){if(!intersects(vp,r.b))continue;let last=null;for(const p of r.p){const q=project(p);if(!last)ctx.moveTo(...q);else if(Math.abs(q[0]-last[0])+Math.abs(q[1]-last[1])>.45)ctx.lineTo(...q);else continue;last=q}ctx.closePath()}
  ctx.fillStyle=fill;ctx.fill('evenodd');ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
 }
 for(const rings of f.back)pass(rings,'#708e82','#416861',.8);
 pass([...f.selected,...f.holes],'#ecd09c','#f7e8bd',1.05);
 pass(f.lakes,'#1b372e','#93a99a',.45);
 const steps=[.0002,.0005,.001,.002,.005,.01,.02,.05,.1,.2,.5,1,2,5,10,15,30,60],step=steps.find(v=>v*k>42)||60;
 ctx.lineWidth=.65;ctx.strokeStyle='rgba(164,188,172,.29)';ctx.beginPath();
 for(let l=Math.ceil(vp[0]/step)*step;l<vp[2];l+=step){ctx.moveTo(x0+l*k,0);ctx.lineTo(x0+l*k,h)}
 const inv=y=>Math.atan(Math.sinh(y*rad))/rad;
 for(let lat=Math.ceil(inv(vp[1])/step)*step;lat<=Math.min(84,inv(vp[3]));lat+=step){const y=y0-mercY(lat)*k;ctx.moveTo(0,y);ctx.lineTo(w,y)}ctx.stroke();
 const pixels=f.pts.map(project);
 for(let i=0;i<pixels.length;i++){if(i===f.target)continue;const [x,y]=pixels[i];disc(ctx,x,y,3.6,'#3f6b62','#f8e9bc',1.1)}
 const [x,y]=pixels[f.target];disc(ctx,x,y,14,'rgba(183,65,35,.16)','#bd4c2d',1.2);disc(ctx,x,y,7.3,'#c9522d','#fff5d1',2.2);
 if(peek){drawNames(ctx,pixels,w,h,f)}else if(game?.answered){
  const name=DB.countries[f.id].cities[f.target].name;ctx.font='600 14px "Source Serif 4",Georgia,serif';const tw=ctx.measureText(name).width+15;
  const labX=Math.min(Math.max(x-tw/2,4),w-tw-4),labY=y>64?y-42:y+18;
  ctx.fillStyle='#16302a';ctx.fillRect(labX,labY,tw,22);ctx.fillStyle='#fff3d5';ctx.textBaseline='middle';ctx.fillText(name,labX+7,labY+11);
 }
 const lat=inv(cy), kmPerPx=111.195*Math.cos(lat*rad)/k;
 const possible=[.005,.01,.02,.05,.1,.2,.5,1,2,5,10,20,50,100,200,500,1000,2000,5000],dist=possible.filter(d=>d/kmPerPx<=w*.16).pop();
 if(dist){const span=dist/kmPerPx;ctx.fillStyle='#16302ae6';ctx.fillRect(9,h-32,span+18,25);ctx.strokeStyle='#f2e5c2';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(16,h-16);ctx.lineTo(16,h-13);ctx.lineTo(16+span,h-13);ctx.lineTo(16+span,h-16);ctx.stroke();ctx.fillStyle='#f2e5c2';ctx.font='10px "Source Serif 4",Georgia,serif';ctx.textBaseline='bottom';ctx.fillText(dist<1?Math.round(dist*1000)+' m':dist+' km',16,h-16)}
}
function adjustFlat(action){
 if(!flat)return;const f=flat,p=f.pts[f.target];if(action==='resetmap'){f.detail=false;f.zoom=1}
 if(action==='detail'){const distances=f.pts.filter((_,i)=>i!==f.target).map(q=>Math.hypot(q[0]-p[0],q[1]-p[1]));const closest=Math.min(...distances);f.detail=true;f.zoom=Number.isFinite(closest)&&closest>0?Math.max(2,Math.min(10000,90/(closest*(f.base||1)))):3}
 if(action==='zoomin'||action==='zoomout'){f.detail=true;f.zoom=Math.min(10000,Math.max(1,f.zoom*(action==='zoomin'?2:.5)));if(f.zoom===1)f.detail=false}
 f.panX=0;f.panY=0;paintSoon();
}
let drag=null;
document.addEventListener('pointerdown',e=>{if(e.target.id!=='sa-map'||view!=='game'||peek)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,lon:globeRotation[0],lat:globeRotation[1],px:flat?.panX||0,py:flat?.panY||0};e.target.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(view==='game'&&flat){flat.panX=drag.px+dx;flat.panY=drag.py+dy}paintSoon()});
for(const evt of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(evt,()=>drag=null);

function drawNames(ctx,pixels,w,h,f){
 const cities=DB.countries[f.id].cities;
 const font=w<480?12:14;ctx.font='600 '+font+'px "Source Serif 4",Georgia,serif';
 const names=cities.map((c,i)=>(i+1)+'. '+c.name);
 const boxes=labelLayout(pixels.map(([x,y],i)=>({x,y:y-22,w:Math.min(w-12,Math.ceil(ctx.measureText(names[i]).width)+14),h:23})),w,h,6);
 for(let i=0;i<boxes.length;i++){
  const r=boxes[i],[x,y]=pixels[i];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(r.x,r.y);ctx.strokeStyle='#faf0cf';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#28483e';ctx.lineWidth=1.3;ctx.stroke();
  disc(ctx,x,y,4,i===f.target?'#d76037':'#274f48','#fff0c7',1);
 }
 boxes.forEach((r,i)=>{
  const left=r.x-r.w/2,top=r.y-r.h/2;ctx.fillStyle=i===f.target?'#913f26':'#16302a';ctx.fillRect(left,top,r.w,r.h);
  ctx.strokeStyle='#d8c697';ctx.lineWidth=1;ctx.strokeRect(left,top,r.w,r.h);
  ctx.fillStyle='#fff5d9';ctx.textBaseline='middle';ctx.fillText(names[i],left+7,r.y+.5,r.w-12);
 });
}

const eyeIcon=icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>');
const backIcon=icon('<path d="m13 5-7 7 7 7"/>');
const routeIcon=icon('<circle cx="5" cy="17" r="2.4"/><circle cx="18.5" cy="6.5" r="2.4"/><path d="M4 12V9a3 3 0 0 1 3-3h3m4 10-1 2h-3m2-7 2-2"/>');
const mixIcon=icon('<path d="M3 6h3c4 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-3 3-4 5-4h2m-4-4 4 4-4 4"/>');
const navViews=['world','regions','countries','rules'];
let stage='world', trail=[], geoFrame=null, hot='', peek=false, activePeekPointer=null;
const continentPins={'Noord-Amerika':[-100,39],'Zuid-Amerika':[-61,-16],'Europa':[18,55],'Afrika':[18,5],'Azië':[90,39],'Oceanië':[137,-25]};
const regionPins={'Noord-Europa':[12,60],'Zuid-Europa':[15,41],'Oost-Europa':[34,52],'West-Europa':[6,48.8],
'Noord-Afrika':[11,28],'West-Afrika':[-4,10],'Centraal-Afrika':[18,0],'Oost-Afrika':[38,-2],'Zuidelijk Afrika':[25,-26],
'Centraal-Azië':[66,43],'Oost-Azië':[116,37],'West-Azië':[45,31],'Zuid-Azië':[78,24],'Zuidoost-Azië':[106,13],
'Cariben':[-70,18],'Midden-Amerika':[-87,14],'Noordelijk Noord-Amerika':[-104,41],
'Melanesië':[161,-11],'Micronesië':[156,8],'Polynesië':[-175,-14],'Australië en Nieuw-Zeeland':[139,-25]};
const atlasColors=['#d6ba78','#ca977b','#97ad83','#acbfae','#b5a887','#85acab'];
const regionNames=()=>[...new Set(continentIds().map(id=>DB.countries[id].region))].sort(byName);
const sortedCountries=()=>regionIds().sort((a,b)=>byName(DB.countries[a].name,DB.countries[b].name));
function selectStage(key){
 if(stage==='world'){settings.continent=key;settings.region='';settings.land='';pushStage(regionNames().length===1?'countries':'regions')}
 else if(stage==='regions'){settings.region=key;settings.land='';pushStage('countries')}
 else if(stage==='countries'){settings.land=key;pushStage('rules')}
}
function pushStage(next){
 trail.push({stage,continent:settings.continent,region:settings.region,land:settings.land});stage=next;showSetup(true);
}
function goBack(){
 if(!trail.length){resetAtlas();return}
 const previous=trail.pop();stage=previous.stage;
 if(stage==='world'){settings.continent='';settings.region='';settings.land=''}
 else if(stage==='regions'){settings.continent=previous.continent;settings.region='';settings.land=''}
 else if(stage==='countries'){settings.continent=previous.continent;settings.region=previous.region;settings.land=''}
 showSetup(true);
}
function resetAtlas(){stage='world';trail=[];settings.continent='';settings.region='';settings.land='';showSetup(true)}
function atlasOptions(){
 if(stage==='world')return continents.map((key,i)=>({key,name:key,point:continentPins[key],color:atlasColors[i]}));
 if(stage==='regions')return regionNames().map((key,i)=>({key,name:key,point:regionPins[key]||continentPins[settings.continent],color:atlasColors[i%6]}));
 return sortedCountries().map((id,i)=>{const c=DB.countries[id];return {key:id,name:c.name,point:[c.cities[0].lon,c.cities[0].lat],color:atlasColors[i%6]}});
}
function scopeLabel(){return stage==='world'?'Wereld':stage==='regions'?settings.continent:settings.region||settings.continent||'Wereld'}
function atlasList(){
 const opts=atlasOptions();dialog('Kies '+({world:'een werelddeel',regions:'een regio',countries:'een land'}[stage]||'een gebied'),'<div class="pick-list">'+opts.map(o=>'<button data-act="list-pick" data-value="'+esc(o.key)+'">'+esc(o.name)+arrow+'</button>').join('')+'</div>');
}
function optButtons(action,items,value){
 return items.map(([key,t,ico])=>'<button type="button" class="option-chip" aria-pressed="'+(String(value)===String(key))+'" data-act="'+action+'" data-value="'+esc(key)+'">'+(ico||'')+esc(t)+'</button>').join('');
}
function rulesPanel(){
 const area=poolIds(),n=area.length,available=area.reduce((s,id)=>s+DB.countries[id].cities.length,0),byCountry=settings.order==='country';
 const count=byCountry?n:available;const presets=byCountry?[1,3,5]:[5,10,20];
 const limit=byCountry?settings.lands:settings.length;
 const counts=presets.filter(i=>i<count).map(i=>[i,String(i)]).concat([['all',count>1?'Alle '+count:'1']]);
 const effective=limit==='all'||limit>=count?'all':limit;
 return '<div class="rules-card"><div class="scope-line">'+esc(titleArea())+' · '+countText(n,'land','landen')+'</div><h1>Hoe wil je oefenen?</h1>'+
 '<fieldset><legend>Volgorde</legend><div class="pref-grid">'+optButtons('order',[['country','Land voor land',routeIcon],['mixed','Door elkaar',mixIcon]],settings.order)+'</div><p class="pref-note">'+(byCountry?'Oefen alle plaatsen van één land voordat je doorgaat.':'Oefen steden uit je speelgebied in willekeurige volgorde.')+'</p></fieldset>'+
 '<fieldset><legend>Antwoorden</legend><div class="pref-grid">'+optButtons('mode',[['choice','Meerkeuze',listIcon],['write','Zelf typen',typeIcon]],settings.mode)+'</div></fieldset>'+
 (count>1?'<fieldset><legend>'+(byCountry?'Aantal landen':'Aantal vragen')+'</legend><div class="pref-grid amount">'+optButtons(byCountry?'lands':'length',counts,effective)+'</div></fieldset>':'')+
 '<button class="primary wide" data-act="start">Start het spel '+arrow+'</button></div>';
}
function showSetup(enter=false){
 view='setup';flat=null;game=null;hot='';validateMenu();nav();
 ROOT.dataset.screen='setup';
 const rules=stage==='rules',scope=scopeLabel(),areaButton=stage==='world'?'Oefen de hele wereld':stage==='regions'?'Oefen heel '+scope:'Oefen alle landen';
 const path=['Wereld',settings.continent,settings.region,settings.land?DB.countries[settings.land].name:''].filter(Boolean);
 const stageTitle={world:'Kies een werelddeel.',regions:'Kies een regio.',countries:'Kies een land.'}[stage];
 const introText=stage==='world'?'Tik op de kaart om de vijf grootste steden van elk land te oefenen.':stage==='regions'?'Kies een regio op de kaart of oefen het hele werelddeel.':'Kies een land op de kaart of speel ze allemaal achter elkaar.';
 el('main').innerHTML='<section class="map-screen '+(rules?'setup-rules':'atlas-picker')+'">'+
 (rules?'<div class="globe-back"><canvas id="sa-map" aria-hidden="true"></canvas></div>':'')+
 '<div class="atlas-heading"><div class="atlas-trail">'+(stage!=='world'?'<button data-act="back" class="back-step">'+backIcon+' Terug</button><span class="trail-separator"></span>':'')+esc(rules?path.slice(0,-1).join('  /  ')||'Wereld':stage==='world'?'Wereldatlas':path.join('  /  '))+'</div>'+
 (rules?'':'<h1>'+stageTitle+'</h1><p>'+introText+'</p>')+'</div>'+
 (rules?rulesPanel():'<div id="sa-chart-space" class="chart-space"><canvas id="sa-map" role="img" aria-label="Aanwijsbare kaart van '+esc(scope)+'"></canvas><div id="sa-map-pins" class="map-pins" style="visibility:hidden"></div></div><div class="atlas-bottom"><button class="list-picker" data-act="list">'+listIcon+' Kies uit lijst</button><button class="all-scope" data-act="scope">'+esc(areaButton)+' '+arrow+'</button></div>')+'</section>';
 if(rules)globeHome();else createPicker();
 observeMap();storeSet('menu',settings);
 if(enter)el('main').focus({preventScroll:true});
}
function createPicker(){
 const opts=atlasOptions(), lookup=new Map(opts.map(o=>[o.key,o]));
 const member=id=>{const c=DB.countries[id];if(!c)return '';if(stage==='world')return c.continent;if(c.continent!==settings.continent)return '';if(stage==='regions')return c.region;return (!settings.region||c.region===settings.region)?id:''};
 geoFrame={opts,lookup,member,projection:null,hit:[],width:0,height:0};
 el('map-pins').innerHTML=opts.map(o=>'<button class="map-pin" data-act="pick" data-value="'+esc(o.key)+'" style="--pin:'+o.color+'" aria-label="'+esc(o.name)+'"><i></i>'+esc(o.name)+'</button>').join('');
}
function scopeProjection(w,h,opts){
 if(stage==='world'){
  const pr=d3.geoNaturalEarth1().rotate([.02,0]).translate([0,0]).scale(1),raw=d3.geoPath(pr).bounds({type:'Sphere'});
  const scale=Math.min((w-16)/(raw[1][0]-raw[0][0]),(h-20)/(raw[1][1]-raw[0][1]));
  return pr.scale(scale).translate([w/2,h/2+scale*.04]);
 }
 const members=stage==='regions'?continentIds():regionIds();
 const points=members.flatMap(id=>DB.countries[id].cities.map(c=>[c.lon,c.lat])).concat(opts.map(o=>o.point));
 const center=sphereCenter(points),pr=d3.geoMercator().rotate([-center[0],0]).translate([0,0]).scale(1);
 const [left,top,right,bottom]=bbox(points.map(pr));const k=Math.min(w*.83/Math.max(.06,right-left),h*.73/Math.max(.06,bottom-top));
 return pr.scale(k).translate([w/2-k*(left+right)/2,h/2-k*(top+bottom)/2]).clipExtent([[0,0],[w,h]]);
}
function labelLayout(anchors,w,h,pad=6){
 const boxes=[];
 const ordered=anchors.map((a,i)=>({...a,index:i})).sort((a,b)=>a.y-b.y);
 for(const a of ordered){
  let best=null;
  const centerX=Math.max(3+a.w/2,Math.min(w-3-a.w/2,a.x)),centerY=Math.max(a.h/2+2,Math.min(h-a.h/2-2,a.y));
  const rings=Math.ceil(Math.hypot(w,h)/12);
  for(let r=0;r<=rings;r++){
   const steps=r===0?1:12;for(let j=0;j<steps;j++){
    const ang=j*Math.PI*2/steps, x=centerX+r*12*Math.cos(ang),y=centerY+r*12*Math.sin(ang);
    if(x<a.w/2+2||x>w-a.w/2-2||y<a.h/2+2||y>h-a.h/2-2)continue;
    if(boxes.some(b=>Math.abs(b.x-x)<(a.w+b.w)/2+pad&&Math.abs(b.y-y)<(a.h+b.h)/2+pad))continue;
    const cost=Math.hypot(x-a.x,y-a.y)+Math.abs(y-a.y)*.03;
    if(!best||cost<best.cost)best={x,y,cost};
   }if(best)break;
  }
  boxes.push({...a,x:best?.x??centerX,y:best?.y??centerY,hidden:!best});
 }
 return boxes.sort((a,b)=>a.index-b.index);
}
function drawPicker(ctx,w,h){
 const f=geoFrame;if(!f)return;
 if(f.width!==w||f.height!==h||!f.projection){
  f.width=w;f.height=h;
  const portrait=stage==='world'&&w<680&&h>w*.95;
  if(portrait){
   const r=Math.min(w*.415,(h-14)*.24);
   f.views=[{center:[-92,15],x:w*.455,y:h*.252},{center:[71,15],x:w*.545,y:h*.749}].map(v=>({...v,r,pr:d3.geoOrthographic().rotate([-v.center[0],-v.center[1]]).scale(r).translate([v.x,v.y]).precision(.55)}));
  }else{f.views=[{pr:scopeProjection(w,h,f.opts)}]}
  f.projection=f.views[0].pr;const buttons=Array.from(el('map-pins').children);
  for(const button of buttons)button.hidden=false;
  const anchors=f.opts.map((o,i)=>{
   const pane=f.views.length===1?f.views[0]:f.views.reduce((a,b)=>d3.geoDistance(a.center,o.point)<d3.geoDistance(b.center,o.point)?a:b);
   const [x,y]=pane.pr(o.point);return {x,y,w:Math.min(w-6,buttons[i].offsetWidth||85),h:buttons[i].offsetHeight||32};
  });
  f.positions=labelLayout(anchors,w,h);f.anchors=anchors;f.positions.forEach((pos,i)=>{const btn=buttons[i];btn.hidden=pos.hidden;btn.style.left=pos.x+'px';btn.style.top=pos.y+'px'});
  el('map-pins').style.visibility='visible';
 }
 ctx.fillStyle='#15271f';ctx.fillRect(0,0,w,h);
 for(const pane of f.views){
 const path=d3.geoPath(pane.pr,ctx);
 if(pane.r){ctx.setLineDash([1,4]);disc(ctx,pane.x,pane.y,pane.r+5,null,'#739084',.75);ctx.setLineDash([])}
 if(stage==='world'){ctx.beginPath();path({type:'Sphere'});ctx.fillStyle='#1b3a30';ctx.fill();ctx.strokeStyle='#66817a';ctx.lineWidth=.8;ctx.stroke()}
 for(const [id,geo] of globeFeatures){
  const key=f.member(id),o=f.lookup.get(key);
  ctx.beginPath();path(geo);ctx.fillStyle=o?(key===hot?'#f4ca83':o.color):'#45675f';ctx.fill();
  ctx.strokeStyle=o?'#54685b':'#36564f';ctx.lineWidth=stage==='world'?.45:.75;ctx.stroke();
 }
 ctx.beginPath();path(gridSphere);ctx.lineWidth=.65;ctx.strokeStyle='#b6c9aa36';ctx.stroke();
 }
 f.positions.forEach((pos,i)=>{if(pos.hidden)return;const a=f.anchors[i];if(Math.hypot(pos.x-a.x,pos.y-a.y)>13){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(pos.x,pos.y);ctx.strokeStyle='#183e3b';ctx.lineWidth=2.5;ctx.stroke();ctx.strokeStyle='#e8dbbb';ctx.lineWidth=1;ctx.stroke();disc(ctx,a.x,a.y,2.7,'#f8d397','#244c46',.9)}});
}
function hitAtlas(x,y){
 const f=geoFrame;if(view!=='setup'||stage==='rules'||!f?.projection)return '';
 const pane=f.views.find(v=>!v.r||Math.hypot(x-v.x,y-v.y)<=v.r);if(!pane)return '';
 const loc=pane.pr.invert([x,y]);if(!loc||!loc.every(Number.isFinite)||Math.abs(loc[1])>90)return '';
 const back=pane.pr(loc);if(Math.hypot(back[0]-x,back[1]-y)>2)return '';
 for(const [id,geo] of globeFeatures){const key=f.member(id);if(key&&d3.geoContains(geo,loc))return key}
 return '';
}
document.addEventListener('click',e=>{
 if(e.target.id!=='sa-map'||stage==='rules'||view!=='setup')return;
 const r=e.target.getBoundingClientRect(),key=hitAtlas(e.clientX-r.left,e.clientY-r.top);if(key)selectStage(key);
});
document.addEventListener('pointerover',e=>{const pin=e.target.closest('.map-pin');if(pin){hot=pin.dataset.value;paintSoon()}});
document.addEventListener('pointerout',e=>{if(e.target.closest('.map-pin')){hot='';paintSoon()}});
function setPeek(on){
 if(on&&(view!=='game'||!flat||el('dialog').open))return;
 if(peek===on)return;peek=on;const button=el('peek');
 if(button){button.setAttribute('aria-pressed',String(on));button.classList.toggle('active',on)}
 const status=el('peek-reading');
 if(status)status.textContent=on?DB.countries[flat.id].cities.map((c,i)=>(i+1)+'. '+c.name).join(', '):'';
 if(on)game.peeked=true;paintSoon();
}
function releasePeek(){activePeekPointer=null;setPeek(false)}
document.addEventListener('pointerdown',e=>{
 const btn=e.target.closest('#sa-peek');if(!btn||e.button!==0||activePeekPointer!==null)return;
 e.preventDefault();activePeekPointer=e.pointerId;btn.setPointerCapture(e.pointerId);setPeek(true);
});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(ev,e=>{if(e.pointerId===activePeekPointer)releasePeek()});
window.addEventListener('blur',releasePeek);document.addEventListener('visibilitychange',()=>{if(document.hidden)releasePeek()});
document.addEventListener('contextmenu',e=>{if(e.target.closest('#sa-peek'))e.preventDefault()});
function isPeekKey(e){const typing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName);return !typing&&(e.code==='KeyS'||(e.target.closest('#sa-peek')&&['Space','Enter'].includes(e.code)))}
document.addEventListener('keydown',e=>{if(inScope(e.target)&&view==='game'&&!el('dialog').open&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&isPeekKey(e)){e.preventDefault();setPeek(true)}});
document.addEventListener('keyup',e=>{if(peek&&['KeyS','Space','Enter'].includes(e.code)){e.preventDefault();releasePeek()}});
function updateScreenButton(){
 const b=el('full');if(!b)return;const name=document.fullscreenElement?'Verlaat volledig scherm':'Volledig scherm';
 b.setAttribute('aria-label',name);b.title=name;b.setAttribute('aria-pressed',String(!!document.fullscreenElement));
}
async function toggleFullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(ROOT.requestFullscreen)await ROOT.requestFullscreen();else throw Error()}
 catch{dialog('Volledig scherm','<p>Je browser ondersteunt hier geen volledig scherm. Draai je telefoon of tablet een kwartslag voor meer ruimte.</p>')}
}
document.addEventListener('fullscreenchange',()=>{updateScreenButton();paintSoon()});

if(document.fonts)document.fonts.ready.then(()=>{if(geoFrame)geoFrame.width=0;paintSoon()});

resetAtlas();updateScreenButton();
})();
