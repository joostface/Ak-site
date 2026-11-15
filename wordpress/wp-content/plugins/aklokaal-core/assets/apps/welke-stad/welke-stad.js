/*
 * Welke stad? – satellietspel, ingebouwd in de site.
 * Spelregels en werking zijn gelijk aan het origineel; alleen de namen (ws-…) zijn uniek gemaakt
 * zodat ze niet botsen met de rest van de pagina. Data: welke-stad-data.js.
 */
(function(){
"use strict";
const $=id=>document.getElementById("ws-"+id);
const ROOT=$("app"); if(!ROOT||!window.AK_WELKESTAD_DATA) return;
const DATA=window.AK_WELKESTAD_DATA;
const CC=DATA.cc;
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’'`.,\-]/g," ").replace(/\s+/g," ").trim().toLowerCase();
const CITIES=DATA.rows.split("\n").map(r=>{const p=r.split("|");const disp=p[1]||p[0];
  return {en:p[0],name:disp,cc:p[2],lat:+p[3],lon:+p[4],pop:+p[5]*1000,cap:p[6]==="1",n1:norm(disp),n2:p[1]?norm(p[0]):"",
    country:(CC[p[2]]||[p[2],""])[0],cont:(CC[p[2]]||["",""])[1]}});
const TARGETS=DATA.tg;
const ROUNDS=5, ZMIN=[17,15,13,10,5], ZMAX=18, PANLIM=420;
const TILE=(z,x,y)=>"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/"+z+"/"+y+"/"+x;

/* ---------- opslag ---------- */
const store={get(k,d){try{const v=localStorage.getItem("welkestad:"+k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem("welkestad:"+k,JSON.stringify(v))}catch(e){}}};
let settings=store.get("settings",{unit:"km",confetti:true});

/* ---------- welke stad is de volgende? ---------- */
const pad=n=>String(n).padStart(2,"0");
// Een geschudde stapel van alle steden: elk potje de volgende. Pas als je ze allemaal gehad hebt,
// wordt opnieuw geschud (en dan nooit met dezelfde stad als het laatste potje voorop).
function nextTarget(last){
  let bag=store.get("bag",null);
  if(!Array.isArray(bag)) bag=[];
  bag=bag.filter(t=>TARGETS.includes(t));
  if(!bag.length){ bag=TARGETS.slice();
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
    if(bag.length>1&&bag[bag.length-1]===last){[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]]} }
  const t=bag.pop(); store.set("bag",bag); return t;
}

/* ---------- spelstatus ---------- */
let G=null; // {target, guesses[], time, done, won, hints}
// fresh: altijd een nieuwe stad; anders een potje dat nog bezig was (na herladen) afmaken.
function newGame(fresh){
  let g=fresh?null:store.get("current",null);
  if(g&&(g.done||!TARGETS.includes(g.target)||!Array.isArray(g.guesses))) g=null;
  if(!g) g={target:nextTarget(G?G.target:-1),guesses:[],time:0,done:false,won:false,hints:0};
  G=g; save(); paused=false; setPaused(false); closePanels(); hideSug(); $("q").value="";
  $("hints").style.display="none"; $("bHints").classList.remove("on");
  updateUI(); resetView(false);
  if(G.done) showResult(G.guesses.length-1,false);
}
function save(){ if(G) store.set("current",G) }
const T=()=>CITIES[G.target];
const round=()=>Math.min(G.guesses.length,ROUNDS-1);
function updateUI(){
  $("q").disabled=G.done; $("q").placeholder=G.done?"klaar: kies Volgende stad":"typ de stad...";
  $("doneBar").classList.toggle("on",G.done);
  renderTimer();
}

/* ---------- timer ---------- */
let paused=false, lastTick=performance.now();
function renderTimer(){const t=Math.floor(G.time);$("timer").textContent=pad(Math.floor(t/60))+":"+pad(t%60)}
setInterval(()=>{const now=performance.now(),dt=(now-lastTick)/1000;lastTick=now;
  if(G&&!G.done&&!paused&&!document.hidden&&dt<5){const b=Math.floor(G.time);G.time+=dt;if(Math.floor(G.time)!==b){renderTimer();if(Math.floor(G.time)%5===0)save()}}
},250);
function setPaused(p){ if(G.done&&p) return; paused=p; $("pauseOv").style.display=p?"flex":"none";
  $("pauseIc").setAttribute("d",p?"M10 8l6 4-6 4z":"M10 8.5v7M14 8.5v7"); }
$("bPause").onclick=()=>setPaused(!paused); $("bResume").onclick=()=>setPaused(false);

/* ---------- afstand ---------- */
function haversine(a,b){const R=6371,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,".");
const distTxt=km=>settings.unit==="mi"?fmt(km*0.621371)+" mijl weg":fmt(km)+" km weg";

/* ---------- kaart ---------- */
const map=$("map"); let Z=17, cx=.5, cy=.5, layer=null, tiles=new Map(), origin={x:0,y:0}, tOk=0, tErr=0;
const lon2x=lon=>(lon+180)/360;
const lat2y=lat=>{const s=Math.sin(lat*Math.PI/180);return .5-Math.log((1+s)/(1-s))/(4*Math.PI)};
const W=z=>256*Math.pow(2,z);
function vp(){return {w:map.clientWidth,h:map.clientHeight}}
function clampCenter(){
  const t=T(), tx=lon2x(t.lon), ty=lat2y(t.lat), lim=PANLIM/W(ZMIN[round()]);
  let dx=cx-tx; if(dx>.5)dx-=1; if(dx<-.5)dx+=1;
  dx=Math.max(-lim,Math.min(lim,dx)); cx=((tx+dx)%1+1)%1;
  cy=Math.max(ty-lim,Math.min(ty+lim,cy)); cy=Math.max(0.02,Math.min(.98,cy));
}
function newLayer(){const l=document.createElement("div");l.className="layer";map.insertBefore(l,$("mk"));layer=l;tiles=new Map();
  const v=vp();origin={x:Math.round(cx*W(Z)-v.w/2),y:Math.round(cy*W(Z)-v.h/2)}}
function render(){
  if(!layer) newLayer();
  const v=vp(), w=W(Z), left=cx*w-v.w/2, top=cy*w-v.h/2, n=Math.pow(2,Z);
  layer.style.transform="translate("+(origin.x-left)+"px,"+(origin.y-top)+"px)";
  const x0=Math.floor(left/256)-1,x1=Math.floor((left+v.w)/256)+1,y0=Math.max(0,Math.floor(top/256)-1),y1=Math.min(n-1,Math.floor((top+v.h)/256)+1);
  const keep=new Set();
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const k=x+"_"+y;keep.add(k);
    if(!tiles.has(k)){const im=new Image();im.draggable=false;im.alt="";im.style.left=(x*256-origin.x)+"px";im.style.top=(y*256-origin.y)+"px";
      im.style.opacity="0";im.style.transition="opacity .2s";
      im.onload=()=>{tOk++;im.style.opacity="1";$("tileWarn").style.display="none"};
      im.onerror=()=>{tErr++;im.remove();if(!tOk&&tErr>3)$("tileWarn").style.display="block"};
      im.src=TILE(Z,((x%n)+n)%n,y);layer.appendChild(im);tiles.set(k,im)}}
  for(const [k,im] of tiles) if(!keep.has(k)){im.remove();tiles.delete(k)}
  // marker: alleen zichtbaar als je ver bent uitgezoomd
  const mk=$("mk"),t=T(); let mx=lon2x(t.lon)-cx; if(mx>.5)mx-=1; if(mx<-.5)mx+=1;
  if(Z<=10||G.done){mk.style.display="block";mk.style.left=(v.w/2+mx*w)+"px";mk.style.top=(v.h/2+(lat2y(t.lat)-cy)*w)+"px"}else mk.style.display="none";
}
function setZoom(z,fx,fy){
  const zmin=G.done?3:ZMIN[round()]; z=Math.max(zmin,Math.min(ZMAX,z)); if(z===Z){render();return}
  const v=vp(); fx=fx==null?v.w/2:fx; fy=fy==null?v.h/2:fy;
  const s=Math.pow(2,z-Z), old=layer;
  // houd het punt onder de vinger/cursor op zijn plek
  const px=cx*W(Z)+(fx-v.w/2), py=cy*W(Z)+(fy-v.h/2);
  if(old){const left=cx*W(Z)-v.w/2, top=cy*W(Z)-v.h/2, tx=origin.x-left, ty=origin.y-top;
    old.style.transition="transform .25s ease-out, opacity .3s .35s";
    old.style.transform="translate("+(fx-s*(fx-tx))+"px,"+(fy-s*(fy-ty))+"px) scale("+s+")";
    old.style.opacity="0"; setTimeout(()=>old.remove(),700)}
  cx=(px*s-(fx-v.w/2))/W(z); cy=(py*s-(fy-v.h/2))/W(z); Z=z; layer=null; clampCenter(); newLayer(); render();
}
let anim=null;
function panBy(dx,dy,animate){
  if(!animate){cx+=dx/W(Z);cy+=dy/W(Z);clampCenter();render();return}
  cancelAnimationFrame(anim); const t0=performance.now(); let done=0;
  const step=now=>{const p=Math.min(1,(now-t0)/220), e=1-Math.pow(1-p,3), d=e-done; done=e;
    cx+=dx*d/W(Z); cy+=dy*d/W(Z); clampCenter(); render(); if(p<1) anim=requestAnimationFrame(step)};
  anim=requestAnimationFrame(step);
}
function resetView(){ const t=T(); cx=lon2x(t.lon); cy=lat2y(t.lat); Z=ZMIN[round()];
  map.querySelectorAll(".layer").forEach(l=>l.remove()); layer=null; tOk=0; tErr=0; render(); }
$("pU").onclick=()=>panBy(0,-130,true); $("pD").onclick=()=>panBy(0,130,true);
$("pL").onclick=()=>panBy(-130,0,true); $("pR").onclick=()=>panBy(130,0,true);
$("cP").onclick=()=>setZoom(Z+1); $("cM").onclick=()=>setZoom(Z-1); $("cC").onclick=()=>resetView();
// slepen + knijpen
const ptrs=new Map(); let pinch0=0;
map.addEventListener("pointerdown",e=>{map.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});map.classList.add("drag");
  if(ptrs.size===2){const p=[...ptrs.values()];pinch0=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
map.addEventListener("pointermove",e=>{const p=ptrs.get(e.pointerId);if(!p)return;
  if(ptrs.size===1){panBy(p.x-e.clientX,p.y-e.clientY,false)}
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2&&pinch0){const q=[...ptrs.values()],d=Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y),r=map.getBoundingClientRect();
    const mx=(q[0].x+q[1].x)/2-r.left,my=(q[0].y+q[1].y)/2-r.top;
    if(d/pinch0>1.5){setZoom(Z+1,mx,my);pinch0=d}else if(d/pinch0<0.67){setZoom(Z-1,mx,my);pinch0=d}}});
const pup=e=>{ptrs.delete(e.pointerId);pinch0=0;if(!ptrs.size)map.classList.remove("drag")};
map.addEventListener("pointerup",pup);map.addEventListener("pointercancel",pup);
let wheelAcc=0;
map.addEventListener("wheel",e=>{e.preventDefault();wheelAcc+=e.deltaY;if(Math.abs(wheelAcc)>60){const r=map.getBoundingClientRect();setZoom(Z+(wheelAcc<0?1:-1),e.clientX-r.left,e.clientY-r.top);wheelAcc=0}},{passive:false});
window.addEventListener("resize",()=>{if(G)render()});

/* ---------- zoeken ---------- */
let selIdx=-1, shown=[];
function search(q){
  const n=norm(q); if(!n) return [];
  const a=[],b=[],c=[];
  for(let i=0;i<CITIES.length;i++){const ct=CITIES[i];
    const p1=ct.n1.indexOf(n), p2=ct.n2?ct.n2.indexOf(n):-1; if(p1<0&&p2<0) continue;
    if(p1===0||p2===0) a.push(i);
    else if((p1>0&&ct.n1[p1-1]===" ")||(p2>0&&ct.n2[p2-1]===" ")) b.push(i);
    else c.push(i);
    if(a.length>=8) break; // lijst is op inwonertal gesorteerd
  }
  return a.concat(b,c).slice(0,8);
}
const esc=s=>s.replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
function hilite(name,q){
  const n=norm(q), low=name.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const raw=q.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
  if(low.length!==name.length) return esc(name);
  let p=low.indexOf(raw), len=raw.length; if(p<0){p=low.indexOf(n);len=n.length} if(p<0) return esc(name);
  return esc(name.slice(0,p))+"<mark>"+esc(name.slice(p,p+len))+"</mark>"+esc(name.slice(p+len));
}
function showSug(){
  const q=$("q").value; if(!q.trim()||G.done){hideSug();return}
  shown=search(q); if(!shown.includes(selIdx)) selIdx=-1;
  $("sug").style.display="flex";
  $("sugEmpty").style.display=shown.length?"none":"grid"; $("sugList").style.display=shown.length?"block":"none";
  $("sugList").innerHTML=shown.map(i=>{const c=CITIES[i];return '<button class="si'+(i===selIdx?" sel":"")+'" data-i="'+i+'"><b>'+hilite(c.name,q)+"</b><small>"+esc(c.country)+"</small></button>"}).join("");
  $("sugBtns").style.display=selIdx>=0?"flex":"none";
}
function hideSug(){ $("sug").style.display="none"; selIdx=-1 }
$("q").addEventListener("input",()=>{selIdx=-1;showSug()});
$("q").addEventListener("focus",()=>{$("hints").style.display="none";$("bHints").classList.remove("on");showSug()});
$("q").addEventListener("keydown",e=>{
  if(e.key==="Enter"){e.preventDefault(); if(selIdx<0&&shown.length){selIdx=shown[0];showSug()} else if(selIdx>=0) doGuess(selIdx)}
  else if(e.key==="Escape"){$("q").value="";hideSug();$("q").blur()}
  else if((e.key==="ArrowDown"||e.key==="ArrowUp")&&shown.length){e.preventDefault();let p=shown.indexOf(selIdx);p=e.key==="ArrowDown"?Math.min(shown.length-1,p+1):Math.max(0,p-1);selIdx=shown[p];showSug()}
});
$("sugList").addEventListener("click",e=>{const b=e.target.closest(".si");if(!b)return;const i=+b.dataset.i;selIdx=selIdx===i?-1:i;$("q").blur();showSug()});
$("bClear").onclick=()=>{$("q").value="";hideSug()};
$("bSel").onclick=()=>{if(selIdx>=0)doGuess(selIdx)};

/* ---------- raden ---------- */
function doGuess(i){
  if(G.done) return;
  if(G.guesses.includes(i)){toast("Deze stad heb je al geprobeerd");return}
  G.guesses.push(i); const won=i===G.target;
  if(won||G.guesses.length>=ROUNDS){G.done=true;G.won=won;recordStats()}
  save(); $("q").value=""; $("q").blur(); hideSug(); updateUI();
  showResult(G.guesses.length-1,true);
}
function recordStats(){
  // Reeks = aantal potjes achter elkaar geraden.
  const s=store.get("stats",{played:0,won:0,streak:0,max:0,dist:[0,0,0,0,0]});
  s.played++; if(G.won){s.won++;s.dist[G.guesses.length-1]++;s.streak++;s.max=Math.max(s.max,s.streak)} else s.streak=0;
  store.set("stats",s);
}
const CHECK="M10 15.300l3.300 3.200 6.700-7", CROSS="M11 11l8 8M19 11l-8 8";
let resTimer=[], resAnim=null, resIdx=-1;
function showResult(gi,animate){
  resTimer.forEach(clearTimeout); resTimer=[]; cancelAnimationFrame(resAnim); resIdx=gi;
  const g=CITIES[G.guesses[gi]], t=T(), km=haversine(g,t), last=gi===G.guesses.length-1, fin=G.done&&last;
  $("rCity").textContent=g.name; $("rRound").textContent="Ronde "+(gi+1)+" / "+ROUNDS;
  const pc=$("rCont"), pl=$("rCtry"); pc.className="pill"; pl.className="pill";
  pc.firstElementChild.textContent=g.cont; pl.firstElementChild.textContent=g.country;
  pc.querySelector("path").setAttribute("d",g.cont===t.cont?CHECK:CROSS); pl.querySelector("path").setAttribute("d",g.cc===t.cc?CHECK:CROSS);
  $("rBtn").style.visibility="hidden"; $("rFinal").style.display="none";
  $("rBtn").textContent=fin?"Volgende stad":(last?"Volgende Ronde":"Sluiten");
  const fill=$("rFill"), dist=$("rDist"), target=Math.min(1,km/10000);
  const reveal=()=>{pc.classList.add(g.cont===t.cont?"ok":"no");};
  const reveal2=()=>{pl.classList.add(g.cc===t.cc?"ok":"no");};
  const end=()=>{$("rBtn").style.visibility="visible";
    if(fin){$("rFinal").style.display="block";$("rLabel").textContent=G.won?"":"Helaas! De stad was";$("rLabel").style.display=G.won?"none":"block";
      $("rAns").textContent=t.name+(G.won?"":" ("+t.country+")");
      $("rNext").style.display="block";
      if(G.won&&animate&&settings.confetti) confetti()}};
  $("pRes").style.display="flex";
  if(!animate){fill.style.width=(target*100)+"%";dist.textContent=distTxt(km);reveal();reveal2();end();return}
  const from=km>9000?20000:10000, t0=performance.now(), dur=1700;
  const step=now=>{const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3), v=from+(km-from)*e;
    fill.style.width=(Math.min(1,v/10000)*100)+"%"; dist.textContent=distTxt(p<1?v:km);
    if(p<1) resAnim=requestAnimationFrame(step)};
  fill.style.width="100%"; dist.textContent=distTxt(from); resAnim=requestAnimationFrame(step);
  resTimer.push(setTimeout(reveal,dur+250),setTimeout(reveal2,dur+650),setTimeout(end,dur+1050));
}
$("rBtn").onclick=()=>{ if(G.done&&resIdx===G.guesses.length-1){newGame(true)} else closeResult() };
$("bResStats").onclick=openStats;
$("bNext").onclick=()=>newGame(true);
function closeResult(){ const wasLast=resIdx===G.guesses.length-1; $("pRes").style.display="none"; resTimer.forEach(clearTimeout);
  if(wasLast){ resetView(); } }
$("bShowRes").onclick=()=>showResult(G.guesses.length-1,false);

/* ---------- panelen ---------- */
function closePanels(){ROOT.querySelectorAll(".panel").forEach(p=>p.style.display="none")}
ROOT.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{const p=b.closest(".panel"); if(p.id==="ws-pRes") closeResult(); else p.style.display="none"});
function openGen(title,html){ $("gTitle").textContent=title; $("gBody").innerHTML=html; $("pGen").style.display="flex"; }
$("bAtt").onclick=()=>{
  let h=""; const t=T();
  for(let i=0;i<ROUNDS;i++){ if(i<G.guesses.length){const g=CITIES[G.guesses[i]],km=haversine(g,t);
      h+='<div class="att" data-g="'+i+'"><b>'+esc(g.name)+"</b><div>"+distTxt(km)+'</div><div><span class="wtag '+(g.cont===t.cont?"ok":"no")+'">'+esc(g.cont)+'</span><span class="wtag '+(g.cc===t.cc?"ok":"no")+'">'+esc(g.country)+"</span></div><i>"+(i+1)+"</i></div>"}
    else h+='<div class="att"><i>'+(i+1)+"</i></div>"}
  $("attBody").innerHTML=h; $("pAtt").style.display="flex"; };
$("attBody").addEventListener("click",e=>{const a=e.target.closest("[data-g]");if(a){$("pAtt").style.display="none";showResult(+a.dataset.g,false)}});

/* hints */
function hintList(){const t=T(); const pop=t.pop>=1e6?(Math.round(t.pop/1e5)/10+"").replace(".",",")+" miljoen":fmt(Math.round(t.pop/1e4)*1e4);
  return [["Halfrond",(t.lat>=0?"Noordelijk":"Zuidelijk")+" halfrond, "+(t.lon>=0?"oostelijk":"westelijk")+" van Greenwich"],
          ["Inwoners","Ongeveer "+pop+" inwoners"+(t.cap?" – en het is een hoofdstad":" – geen hoofdstad")],
          ["Eerste letter","De naam begint met de letter "+t.name[0].toUpperCase()]]}
function renderHints(){const hs=hintList(); $("hintRows").innerHTML=hs.map((h,i)=>'<div class="hr"><span>'+(i<G.hints?"<b>"+h[0]+":</b> "+esc(h[1]):"Hint "+(i+1)+": "+h[0])+"</span>"+(i===G.hints&&!G.done?'<button data-h="'+i+'">Toon</button>':"")+"</div>").join("")}
$("bHints").onclick=()=>{const el=$("hints"),on=el.style.display!=="block"; hideSug(); el.style.display=on?"block":"none"; $("bHints").classList.toggle("on",on); if(on)renderHints()};
$("hintRows").addEventListener("click",e=>{if(e.target.dataset.h!=null){G.hints++;save();renderHints()}});

/* uitleg */
$("bInfo").onclick=()=>openGen("Hoe werkt het?",
  "<p>Je ziet een satellietbeeld van een stad ergens op aarde. Raad in <b>5 rondes</b> welke stad het is.</p><ul>"+
  "<li>Typ een stad, kies hem in de lijst en druk op <b>Selecteer</b>.</li>"+
  "<li>Na elke gok zie je hoe ver je ernaast zit en of <b>werelddeel</b> en <b>land</b> kloppen (groen = goed, rood = fout).</li>"+
  "<li>Elke ronde mag je verder uitzoomen. In de laatste rondes zie je een oranje stip op de plek van de stad.</li>"+
  "<li>Verschuif het beeld met de pijlen of door te slepen, zoom met + en −, en ga met het richtkruis terug naar het midden.</li>"+
  "<li>Na elke stad volgt direct een nieuwe. Je speelt zo lang je wil, en je krijgt pas een stad opnieuw als je ze allemaal gehad hebt.</li>"+
  "<li>Kom je er niet uit? Met de knop <b>Nieuwe stad</b> rechtsboven geef je op en krijg je een andere.</li></ul>");
/* statistieken */
function openStats(){
  const s=store.get("stats",{played:0,won:0,streak:0,max:0,dist:[0,0,0,0,0]}), mx=Math.max(1,...s.dist);
  let h='<div class="grid4"><div><b>'+s.played+"</b><span>Gespeeld</span></div><div><b>"+(s.played?Math.round(100*s.won/s.played):0)+"</b><span>% gewonnen</span></div><div><b>"+s.streak+"</b><span>Huidige reeks</span></div><div><b>"+s.max+"</b><span>Langste reeks</span></div></div><p><b>Geraden in ronde</b></p>";
  s.dist.forEach((n,i)=>{h+='<div class="dr"><em>Ronde '+(i+1)+'</em><div class="'+(G.done&&G.won&&G.guesses.length===i+1?"hl":"")+'" style="width:'+Math.max(8,70*n/mx)+'%">'+n+"</div></div>"});
  if(G.done){h+='<p style="margin-top:22px"><button class="btn" id="ws-bShare">Kopieer resultaat</button></p><p><button class="btn sec" id="ws-bPrac">Volgende stad</button></p>'}
  openGen("Statistieken",h);
  const b=$("bShare"); if(b) b.onclick=()=>{const t=T();
    const txt="Welke stad? "+T().name+" – "+(G.won?G.guesses.length:"X")+"/"+ROUNDS+"\n"+G.guesses.map(i=>{const g=CITIES[i];return i===G.target?"🟩🟩 ✓":(g.cont===t.cont?"🟩":"🟥")+(g.cc===t.cc?"🟩":"🟥")+" "+fmt(haversine(g,t))+" km"}).join("\n");
    try{navigator.clipboard.writeText(txt).then(()=>toast("Gekopieerd"),()=>toast("Kopiëren lukte niet"))}catch(e){toast("Kopiëren lukte niet")}};
  const p=$("bPrac"); if(p) p.onclick=()=>newGame(true);
}
$("bStats").onclick=openStats;
/* instellingen */
function openSettings(){
  openGen("Instellingen",'<div class="row"><span>Afstand in</span><div class="seg" id="ws-sUnit"><button data-v="km">km</button><button data-v="mi">mijl</button></div></div>'+
   '<div class="row"><span>Confetti bij winst</span><div class="seg" id="ws-sConf"><button data-v="1">aan</button><button data-v="0">uit</button></div></div>'+
   '<p style="color:#666;font-size:14px">Je voortgang en statistieken worden alleen in deze browser bewaard.</p>');
  const mark=()=>{document.querySelectorAll("#ws-sUnit button").forEach(b=>b.classList.toggle("on",b.dataset.v===settings.unit));
    document.querySelectorAll("#ws-sConf button").forEach(b=>b.classList.toggle("on",(b.dataset.v==="1")===!!settings.confetti))}; mark();
  $("sUnit").onclick=e=>{if(e.target.dataset.v){settings.unit=e.target.dataset.v;store.set("settings",settings);mark()}};
  $("sConf").onclick=e=>{if(e.target.dataset.v){settings.confetti=e.target.dataset.v==="1";store.set("settings",settings);mark()}};
}
$("bSet").onclick=openSettings;
/* nieuwe stad (opgeven of overslaan) */
$("bCal").onclick=()=>{
  if(G.done||!G.guesses.length){newGame(true);return}
  openGen("Nieuwe stad?",'<p>Je hebt al '+G.guesses.length+' van de '+ROUNDS+' pogingen gedaan. Als je nu een nieuwe stad kiest, telt deze als niet geraden en zie je het antwoord.</p>'+
    '<p style="margin-top:22px"><button class="btn" id="ws-bGiveUp">Opgeven en antwoord zien</button></p><p><button class="btn sec" data-x-gen>Verder met deze stad</button></p>');
  $("bGiveUp").onclick=()=>{$("pGen").style.display="none";G.done=true;G.won=false;recordStats();save();updateUI();showResult(G.guesses.length-1,false)};
  $("gBody").querySelector("[data-x-gen]").onclick=()=>{$("pGen").style.display="none"};
};

/* ---------- toast & confetti ---------- */
let toastT; function toast(m){const t=$("toast");t.textContent=m;t.style.opacity="1";clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity="0",1800)}
function confetti(){
  const c=$("confetti"),r=c.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);c.width=r.width*dpr;c.height=r.height*dpr;
  const x=c.getContext("2d");x.scale(dpr,dpr);
  const col=["#e6194b","#3cb44b","#4363d8","#f58231","#911eb4","#f032e6","#ffe119","#46c8f0","#7a4a3a","#00a878","#ff4081"];
  const ps=[];for(let i=0;i<170;i++)ps.push({x:Math.random()*r.width,y:-20-Math.random()*r.height*.9,vx:(Math.random()-.5)*2.4,vy:2+Math.random()*3.500,
    w:4+Math.random()*10,h:3+Math.random()*12,rot:Math.random()*6.28,vr:(Math.random()-.5)*.3,c:col[i%col.length],round:Math.random()<.25,ph:Math.random()*6.28});
  const t0=performance.now();
  (function f(now){const el=now-t0;x.clearRect(0,0,r.width,r.height);let alive=false;
    for(const p of ps){p.x+=p.vx+Math.sin(el/300+p.ph)*.8;p.y+=p.vy;p.rot+=p.vr;if(p.y<r.height+30)alive=true;
      x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.fillStyle=p.c;
      if(p.round){x.beginPath();x.ellipse(0,0,p.w*.7,p.w*.7*Math.abs(Math.cos(el/250+p.ph))+1,0,0,6.29);x.fill()}
      else x.fillRect(-p.w/2,-p.h/2*Math.cos(el/200+p.ph),p.w,p.h*Math.cos(el/200+p.ph));
      x.restore()}
    if(alive&&el<9000)requestAnimationFrame(f);else x.clearRect(0,0,r.width,r.height)})(t0);
}

/* ---------- start ---------- */
newGame(false);
if(!store.get("seen",false)){store.set("seen",true);$("bInfo").onclick()}
})();
