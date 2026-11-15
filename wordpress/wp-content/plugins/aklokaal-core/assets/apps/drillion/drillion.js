/*
 * Drillion, ingebouwd in de site. Spelregels, vragen, punten en de boorwereld zijn gelijk aan het
 * origineel (index.html); alleen de id's (dr-…) zijn uniek gemaakt en de afbeeldingen en vragen staan
 * in aparte bestanden (img/, drillion-vragen.js). Stijl: drillion.css.
 */
(function(){
'use strict';
var ROOT=document.getElementById('dr-root');if(!ROOT||!window.AK_DRILLION_VRAGEN)return;
// Afbeeldingen staan als losse bestanden naast het spel (map img/).
var ASSETS={};["/ammoniet.png", "/groeve.webp", "/grot.png", "/kristal.png", "/expedition/rig.png", "/expedition/rock-0.webp", "/expedition/rock-1.webp", "/expedition/rock-2.webp", "/expedition/rock-3.webp", "/expedition/rock-4.webp", "/expedition/rock-5.webp", "/expedition/rock-6.webp", "/expedition/rock-7.webp"].forEach(function(k){ASSETS[k]=ROOT.getAttribute('data-img')+k.split('/').pop()});
var QUESTIONS=window.AK_DRILLION_VRAGEN;
var QMAP=new Map(QUESTIONS.map(function(q){return [q.id,q]}));
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var nl=function(n){return Math.round(n).toLocaleString('nl-NL')};
var ROUNDS=7, SECONDS=30, UNIT=8;

/* ---------- tiers ---------- */
var TIERS=[
  {p:10,key:'noob',name:'Noob',emoji:'⬜'},
  {p:20,key:'basic',name:'Basic',emoji:'🟩'},
  {p:30,key:'slim',name:'Slim',emoji:'🟦'},
  {p:60,key:'zeldzaam',name:'Zeldzaam',emoji:'🟪'},
  {p:85,key:'legendarisch',name:'Legendarisch',emoji:'🟧'},
  {p:100,key:'epic',name:'Epic',emoji:'🟨'}
];
var MIS={p:0,key:'mis',name:'Mis',emoji:'🟥'};
function tierOf(points){var t=MIS;for(var i=0;i<TIERS.length;i++)if(points>=TIERS[i].p)t=TIERS[i];return t}
function tierIndex(points){var n=-1;for(var i=0;i<TIERS.length;i++)if(points>=TIERS[i].p)n=i;return n}
var RANKS=[[600,'epic','Epic boormeester'],[450,'legendarisch','Legendarische boorder'],[300,'zeldzaam','Zeldzaam talent'],[200,'slim','Slimme boorder'],[100,'basic','Basic boorder'],[0,'noob','Noob met een schep']];
function rankOf(total){for(var i=0;i<RANKS.length;i++)if(total>=RANKS[i][0])return RANKS[i];return RANKS[RANKS.length-1]}
var FINDS=[
  {id:'ammoniet',title:'Ammoniet',depth:65,text:'De spiraalvormige schelp van een uitgestorven zeedier. In dit gesteente zat ooit een stukje zeebodem.'},
  {id:'kristal',title:'Kristalkamer',depth:200,text:'In een holte groeiden mineralen uit tot kristallen. De vlakke zijden laten zien hoe regelmatig de bouwstenen zijn gerangschikt.'},
  {id:'grot',title:'Kalksteengrot',depth:365,text:'Licht zuur grondwater lost kalksteen langzaam op. Kleine spleten groeien zo uit tot gangen en zalen.'}
];
function layerName(d){return d<1?'Aan de oppervlakte':d<65?'Bovengrond':d<200?'Fossielbank':d<365?'Kristalader':d<550?'Grottenstelsel':'Diepe aarde'}

/* ---------- matching ---------- */
function norm(s){return String(s).toLocaleLowerCase('nl').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().replace(/^(de|het|een)\s+/,'').replace(/ĳ/g,'ij').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'')}
var GLOBAL=new Set();
QUESTIONS.forEach(function(q){q.answers.forEach(function(a){
  a.keys=[a.name].concat(a.aliases||[]).map(norm).filter(Boolean);
  a.keys.forEach(function(k){GLOBAL.add(k)});
})});
function exact(q,text){var n=norm(text);if(!n)return null;for(var i=0;i<q.answers.length;i++)if(q.answers[i].keys.indexOf(n)>=0)return q.answers[i];return null}
// Damerau-Levenshtein (optimal string alignment)
function distance(a,b){
  var m=a.length,n=b.length,i,j;if(!m)return n;if(!n)return m;
  var p2=null,p1=new Array(n+1),cur;
  for(j=0;j<=n;j++)p1[j]=j;
  for(i=1;i<=m;i++){
    cur=new Array(n+1);cur[0]=i;
    for(j=1;j<=n;j++){
      var c=a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1;
      cur[j]=Math.min(p1[j]+1,cur[j-1]+1,p1[j-1]+c);
      if(p2&&i>1&&j>1&&a.charCodeAt(i-1)===b.charCodeAt(j-2)&&a.charCodeAt(i-2)===b.charCodeAt(j-1))cur[j]=Math.min(cur[j],p2[j-2]+1);
    }
    p2=p1;p1=cur;
  }
  return p1[n];
}
// Returns the answer the player most likely meant, or null. Never suggests when the typed
// text is itself a correct answer to another question (Irak is not a typo of Iran).
function suggest(q,text,skip){
  var n=norm(text);if(n.length<4||GLOBAL.has(n))return null;
  var best=null,bd=99;
  q.answers.forEach(function(a){
    if(skip&&skip.indexOf(a.name)>=0)return;
    a.keys.forEach(function(k){
      if(Math.abs(k.length-n.length)>3)return;
      var L=Math.min(k.length,n.length),lim=L<=5?1:L<=9?2:3,d=distance(n,k);
      if(d>lim)return;
      if(L<=5&&k.length===n.length){ // short words: only swapped letters, not a different letter
        var diff=0;for(var i=0;i<k.length;i++)if(k[i]!==n[i])diff++;
        if(diff!==2)return;
      }
      if(d<bd){bd=d;best=a}
    });
  });
  if(best)return best;
  if(n.length>=5){ // clearly unfinished: "bandar seri" for Bandar Seri Begawan
    var hits=q.answers.filter(function(a){return !(skip&&skip.indexOf(a.name)>=0)&&a.keys.some(function(k){return k.indexOf(n)===0&&n.length>=k.length*.5})});
    if(hits.length===1)return hits[0];
  }
  return null;
}

/* ---------- storage ---------- */
function load(k,d){try{var v=localStorage.getItem('drillion2.'+k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem('drillion2.'+k,JSON.stringify(v))}catch(e){}}
var record=load('record',0),muted=load('muted',false),run=load('run',null);
if(!run||!run.qs||run.qs.length!==ROUNDS||run.phase==='end'||!run.qs.every(function(id){return QMAP.has(id)}))run=null;
var lastRun=load('last',null);
if(lastRun&&!(lastRun.qs&&lastRun.qs.every(function(id){return QMAP.has(id)})))lastRun=null;

/* ---------- picking seven questions ---------- */
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function groupOf(id){return id.indexOf('letter-')===0?'letter':id.indexOf('breed-kennis-')===0?'kennis':id.indexOf('breed-nl-')===0||id.indexOf('vast-nl-')===0?'nl':id.indexOf('breed-atlas-')===0||id.indexOf('vast-atlas-')===0?'atlas':id.indexOf('nieuw-')===0?'nieuw':'breed'}
function pickRun(){
  var recent=load('recent',[]),seen=new Set(recent);
  var pool=shuffle(QUESTIONS.filter(function(q){return !seen.has(q.id)})).concat(shuffle(QUESTIONS.filter(function(q){return seen.has(q.id)})));
  var cap={letter:1,kennis:2,nl:2,atlas:2,nieuw:2,breed:2},used={},cats=new Set(),out=[];
  [true,false].forEach(function(strict){
    pool.forEach(function(q){
      if(out.length>=ROUNDS||out.indexOf(q)>=0)return;
      var g=groupOf(q.id);
      if(strict&&(cats.has(q.category)||(used[g]||0)>=cap[g]))return;
      cats.add(q.category);used[g]=(used[g]||0)+1;out.push(q);
    });
  });
  out=shuffle(out);
  save('recent',recent.concat(out.map(function(q){return q.id})).slice(-210));
  return out.map(function(q){return q.id});
}

/* ---------- sound ---------- */
var A={ctx:null,out:null,noiseBuf:null,
  on:function(){
    if(muted)return false;
    try{
      if(!this.ctx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return false;this.ctx=new C();this.out=this.ctx.createGain();this.out.gain.value=.55;this.out.connect(this.ctx.destination)}
      if(this.ctx.state==='suspended')this.ctx.resume();
      return true;
    }catch(e){return false}
  },
  tone:function(freq,dur,type,vol,delay,slideTo){
    if(!this.on())return;
    var c=this.ctx,t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();
    o.type=type||'square';o.frequency.setValueAtTime(freq,t);
    if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol||.08,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(this.out);o.start(t);o.stop(t+dur+.03);
  },
  noise:function(){
    if(!this.noiseBuf){var c=this.ctx,b=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noiseBuf=b}
    return this.noiseBuf;
  },
  // Engine rumble plus a tone that keeps climbing for as long as the drill keeps going.
  drill:function(){
    if(!this.on())return {set:function(){},stop:function(){}};
    var c=this.ctx,t=c.currentTime,self=this;
    var eng=c.createOscillator(),ef=c.createBiquadFilter(),eg=c.createGain();
    eng.type='sawtooth';eng.frequency.value=52;ef.type='lowpass';ef.frequency.value=320;eg.gain.setValueAtTime(.0001,t);eg.gain.exponentialRampToValueAtTime(.11,t+.08);
    eng.connect(ef);ef.connect(eg);eg.connect(this.out);eng.start();
    var ns=c.createBufferSource(),nf=c.createBiquadFilter(),ng=c.createGain();
    ns.buffer=this.noise();ns.loop=true;nf.type='bandpass';nf.frequency.value=700;nf.Q.value=.8;ng.gain.setValueAtTime(.0001,t);ng.gain.exponentialRampToValueAtTime(.05,t+.1);
    ns.connect(nf);nf.connect(ng);ng.connect(this.out);ns.start();
    var rise=c.createOscillator(),rg=c.createGain();
    rise.type='triangle';rise.frequency.value=196;rg.gain.setValueAtTime(.0001,t);rg.gain.exponentialRampToValueAtTime(.07,t+.1);
    rise.connect(rg);rg.connect(this.out);rise.start();
    var lastStep=-1;
    return {
      set:function(points){
        var now=c.currentTime;
        rise.frequency.setTargetAtTime(196*Math.pow(2,points/34),now,.03);
        eng.frequency.setTargetAtTime(52+points*.55,now,.05);
        nf.frequency.setTargetAtTime(700+points*22,now,.05);
        var step=Math.floor(points/2.5);
        if(step!==lastStep){lastStep=step;self.tone(392*Math.pow(2,step/14),.05,'square',.035)}
      },
      stop:function(){
        var now=c.currentTime;
        [eg,ng,rg].forEach(function(g){g.gain.cancelScheduledValues(now);g.gain.setTargetAtTime(.0001,now,.04)});
        setTimeout(function(){try{eng.stop();ns.stop();rise.stop()}catch(e){}},300);
      }
    };
  },
  ding:function(i){var f=523.25*Math.pow(2,i*2/12);this.tone(f,.16,'square',.07);this.tone(f*1.5,.22,'square',.06,.07)},
  finish:function(i){
    var base=392*Math.pow(2,i*2/12),notes=[1,1.26,1.5,2,2.52,3,4].slice(0,i+2),self=this;
    notes.forEach(function(m,k){self.tone(base*m,.2,'square',.07,k*.075)});
    if(i===5)for(var k=0;k<10;k++)self.tone(1568*Math.pow(2,(k%5)*3/12),.09,'triangle',.05,.6+k*.06);
  },
  miss:function(){this.tone(196,.22,'sawtooth',.09,0,98);this.tone(130,.3,'sawtooth',.09,.16,65)},
  tick:function(){this.tone(1046,.035,'square',.035)},
  tap:function(){this.tone(660,.05,'square',.04)}
};
function buzz(p){try{if(!muted&&navigator.vibrate)navigator.vibrate(p)}catch(e){}}

/* ---------- world ---------- */
var view,game,depthEl,layerEl,vignette,depth=0;
function buildWorld(){
  var h='<div class="surface-panorama"></div>';
  for(var i=0;i<8;i++)h+='<div class="rock-section" style="top:calc(var(--unit) * '+(960*i)+');background-image:url(&quot;'+ASSETS['/expedition/rock-'+i+'.webp']+'&quot;)"></div>';
  for(i=0;i<38;i++)h+='<div class="depth-tick" style="top:calc(var(--unit) * '+(25*i*UNIT)+')"><span>'+(25*i)+' m</span></div>';
  FINDS.forEach(function(f){h+='<div class="buried-find find-'+f.id+'" style="top:calc(var(--unit) * '+(f.depth*UNIT)+')"><img src="'+ASSETS['/'+f.id+'.png']+'" alt=""><span>'+f.title+'<small>'+f.depth+' m</small></span></div>'});
  h+='<div id="dr-lines"></div><div class="excavated-shaft"><div></div></div><div class="rig-carrier"><div class="pill" id="dr-pill"></div><div class="rig-body"><img class="whole-rig" src="'+ASSETS['/expedition/rig.png']+'" alt="" draggable="false"><i class="headlight left"></i><i class="headlight right"></i><i class="auger-glint"></i><div class="rock-spray">';
  for(i=0;i<12;i++)h+='<i style="--dx:'+((i%2?1:-1)*(10+i*11%27))+';--dy:'+(9+i*13%27)+';--delay:'+(-(i*.049))+'s"></i>';
  h+='</div></div></div>';
  $('#dr-cam').innerHTML=h;
}
function setDepth(d,moving,prog){
  depth=d;var a=d*UNIT,o=17*(1-Math.exp(-d/6))+(moving?14*Math.sin(Math.PI*(prog||0)):0);
  view.style.setProperty('--travel',a);view.style.setProperty('--camera',Math.max(0,a-o));
  view.classList.toggle('moving',!!moving);
  vignette.style.opacity=Math.min(.65,d/22);
  depthEl.textContent=String(Math.round(d)).padStart(4,'0')+' m';layerEl.textContent=layerName(d);
}
function total(r){return r?r.results.reduce(function(s,x){return s+x.points},0):0}
function fx(tierKey,big){
  var f=$('#dr-flash');f.dataset.tier=tierKey;f.style.setProperty('--fo',big?.5:.18);f.classList.remove('go');void f.offsetWidth;f.classList.add('go');
  if(big){
    game.classList.remove('shake');void game.offsetWidth;game.classList.add('shake');
    var s=$('#dr-sparks');s.dataset.tier=tierKey;var h='';
    for(var i=0;i<26;i++){var ang=Math.PI*2*i/26+Math.random()*.3,r=90+Math.random()*190;h+='<i style="--sx:'+Math.round(Math.cos(ang)*r)+'px;--sy:'+Math.round(Math.sin(ang)*r-40)+'px;animation-delay:'+(Math.random()*.12).toFixed(2)+'s"></i>'}
    s.innerHTML=h;setTimeout(function(){s.innerHTML=''},1200);
  }
}

/* ---------- screens ---------- */
function qOpen(){return !$('#dr-qform').classList.contains('parked')}
function clearAuto(){}
var sheet,timerId=0,remaining=0,busy=false,skipNames=[],lastTick=99;
var ICON={
  sound:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 8h2v8h-2zM19 5h2v14h-2z"/></svg>',
  mute:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 9h2v2h-2zM17 11h2v2h-2zM19 13h2v2h-2zM19 9h2v2h-2zM15 13h2v2h-2z"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 5h3v3H5zM8 8h3v3H8zM11 11h2v2h-2zM13 13h3v3h-3zM16 16h3v3h-3zM16 5h3v3h-3zM13 8h3v3h-3zM8 13h3v3H8zM5 16h3v3H5z"/></svg>'
};
function strataList(){return '<ol>'+TIERS.map(function(t){return '<li data-tier="'+t.key+'">'+t.name+'<span>'+t.p+' m</span></li>'}).join('')+'</ol>'}
function soundBtn(){return '<button class="icon-btn" data-act="sound" aria-label="'+(muted?'Geluid aanzetten':'Geluid uitzetten')+'">'+(muted?ICON.mute:ICON.sound)+'</button>'}
function refreshSound(){ROOT.querySelectorAll('[data-act=sound]').forEach(function(b){b.outerHTML=soundBtn()})}

function showHome(){
  clearInterval(timerId);
  $('#dr-game').hidden=true;var home=$('#dr-home');home.hidden=false;document.body.style.overflow='';
  var resume=run&&run.phase!=='end';
  var found=FINDS.filter(function(f){return record>=f.depth}).length;
  home.innerHTML=
  '<div class="home-pic"><img src="'+ASSETS['/groeve.webp']+'" alt="Gele boorinstallatie op een heuvel, met daaronder de aardlagen in doorsnede.">'+soundBtn()+'</div>'+
  '<div class="home-body">'+
    '<div class="home-lead"><h1>Drillion</h1>'+
      '<p>Zeven aardrijkskundevragen, elk met tientallen goede antwoorden. Hoe zeldzamer jouw antwoord, hoe dieper je boort.</p>'+
      '<div class="home-actions">'+
        (resume?'<button class="btn big" data-act="resume">Verder boren</button><button class="link" data-act="start">Nieuwe expeditie</button>'
               :'<button class="btn big" data-act="start">Start drilling</button>')+
      '</div>'+
      '<p class="home-record">'+(record>0?'Jouw record: <b>'+nl(record)+' m</b> van de 700.':'Maximaal 700 meter. Nog geen record geboord.')+'</p>'+
    '</div>'+
    '<section class="strata"><h2>Van Noob tot Epic</h2><p>Elk antwoord heeft een vaste waarde. Eén punt is één meter boren, en elke vraag heeft precies één Epic-antwoord.</p>'+strataList()+'</section>'+
    '<section class="finds"><h2>Vondsten onderweg</h2><p>'+found+' van de 3 gevonden. Ze liggen op vaste diepte te wachten.</p><div class="find-row">'+
      FINDS.map(function(f){var ok=record>=f.depth;return '<div class="find'+(ok?'':' locked')+'"><img src="'+ASSETS['/'+f.id+'.png']+'" alt=""><b>'+(ok?f.title:'Onbekend')+'</b><span>'+f.depth+' m</span></div>'}).join('')+
    '</div></section>'+
    '<div class="home-foot"><button class="link" data-act="help">Spelregels</button>'+(lastRun?'<button class="link" data-act="last">Antwoorden vorige expeditie</button>':'')+'</div>'+
  '</div>';
}
function showGame(){
  $('#dr-home').hidden=true;game.hidden=false;document.body.style.overflow='hidden';
  measure();fitViewport();setDepth(total(run),false,0);renderSteps();
}
function renderSteps(){
  var h='';for(var i=0;i<ROUNDS;i++){var r=run.results[i];h+=r?'<i data-tier="'+tierOf(r.points).key+'"></i>':'<i'+(i===run.index&&run.phase!=='end'?' class="now"':'')+'></i>'}
  $('#dr-steps').innerHTML=h;$('#dr-steps').setAttribute('aria-label','Vraag '+Math.min(ROUNDS,run.index+1)+' van '+ROUNDS);
}
function setSheet(html,tier,bottom,form){sheet.hidden=false;$('#dr-stop').innerHTML=html;$('#dr-sbot').innerHTML=bottom||'';$('#dr-qform').classList.toggle('parked',!form);if(tier)sheet.dataset.tier=tier;else delete sheet.dataset.tier;sheet.scrollTop=0}

function startRun(){
  A.on();A.tap();
  run={qs:pickRun(),results:[],index:0,phase:'question'};save('run',run);
  showGame();showQuestion();
}
function resumeRun(){
  A.on();A.tap();showGame();
  if(run.phase==='result'){run.index=Math.min(ROUNDS-1,run.results.length-1);showResult(run.results[run.index],true)}
  else{run.results=run.results.slice(0,run.index);showQuestion()}
}
function currentQ(){return QMAP.get(run.qs[run.index])}

var FLAVOR={noob:'Het antwoord dat iedereen als eerste roept.',basic:'Gangbaar, maar niet het eerste wat iedereen zegt.',slim:'Daar moest je even voor nadenken.',zeldzaam:'Echt ongewoon. Mooie vondst.',legendarisch:'Hier komen maar weinig spelers op.',epic:'Het allerzeldzaamste antwoord van de hele lijst.'};
var countId=0,suggested=null;
function showQuestion(){
  var q=currentQ();run.phase='question';save('run',run);busy=false;renderSteps();
  suggested=null;skipNames=[];remaining=SECONDS*1000;
  $('#dr-pill').textContent='';delete $('#dr-pill').dataset.tier;$('#dr-lines').innerHTML='';
  setSheet(
    '<div class="q-top"><span>Vraag '+(run.index+1)+' van '+ROUNDS+'</span><span class="q-time" id="dr-time">'+SECONDS+'</span></div>'+
    '<div class="timebar" id="dr-timebar"><i id="dr-bar"></i></div>'+
    '<h2 class="q-prompt">'+esc(q.prompt)+'</h2>'+
    '<p class="q-hint">'+(q.hint?esc(q.hint)+' ':'')+q.answers.length+' goede antwoorden.</p>'+
    '<p class="q-suggest" id="dr-qsug" hidden></p>',null,
    '<div class="q-under"><span id="dr-qnote">De klok start over 3</span><button type="button" class="link" data-press="skip">Overslaan</button></div>',true);
  var input=$('#dr-ans');input.value='';
  try{input.focus({preventScroll:true})}catch(e){}
  pauseTimer();
  var n=3,note=$('#dr-qnote');
  var tick=function(){
    if(!run||run.phase!=='question'||busy)return;
    if(n>0){note.textContent='De klok start over '+n;n--;countId=setTimeout(tick,1000)}
    else startTimer();
  };
  tick();
}
function startTimer(){
  clearInterval(timerId);clearTimeout(countId);var end=Date.now()+remaining;lastTick=99;
  var note=$('#dr-qnote');if(note)note.textContent='Zeldzaam boort dieper.';
  var paint=function(){
    remaining=Math.max(0,end-Date.now());
    var s=Math.ceil(remaining/1000),t=$('#dr-time'),bar=$('#dr-bar');
    if(!t)return;
    t.textContent=s;bar.style.transform='scaleX('+(remaining/(SECONDS*1000)).toFixed(3)+')';
    var urgent=s<=5;t.classList.toggle('urgent',urgent);$('#dr-timebar').classList.toggle('urgent',urgent);
    if(urgent&&s<lastTick&&s>0){lastTick=s;A.tick()}
    if(remaining<=0){clearInterval(timerId);submit('timeout')}
  };
  paint();timerId=setInterval(paint,100);
}
function pauseTimer(){clearInterval(timerId);clearTimeout(countId)}

function submit(reason){
  if(busy||!run||run.phase!=='question')return;
  var q=currentQ(),input=$('#dr-ans'),text=input.value.trim();
  if(reason==='answer'&&!text){try{input.focus({preventScroll:true})}catch(e){}return}
  A.on();
  if(reason==='answer'){
    var hit=exact(q,text);
    if(hit)return award(hit,text,'answer');
    var guess=suggest(q,text,skipNames);
    if(guess){
      suggested={typed:text,name:guess.name};input.value=guess.name;
      var box=$('#dr-qsug');box.innerHTML='‘'+esc(text)+'’ → <b>'+esc(guess.name)+'</b><span>Druk nog eens op Boor, of pas het aan.</span>';box.hidden=false;
      A.tap();buzz(15);return;
    }
    return award(null,text,'answer');
  }
  if(reason==='timeout'){var late=text&&exact(q,text);return award(late||null,text,late?'answer':'timeout')}
  award(null,'','pass');
}

function award(a,typed,reason){
  if(busy)return;busy=true;pauseTimer();
  var input=$('#dr-ans');input.value='';try{input.blur()}catch(e){}
  var points=a?a.points:0,from=total(run);
  var result={name:a?a.name:typed,points:points,correct:!!a,reason:reason};
  sheet.hidden=true;$('#dr-qform').classList.add('parked');
  var pill=$('#dr-pill');
  var done=function(){
    run.results.push(result);run.phase='result';save('run',run);
    var t=total(run);if(t>record){record=t;save('record',record)}
    showResult(result,false,from);
  };
  if(!a){
    pill.textContent=reason==='answer'?typed:reason==='timeout'?'Tijd voorbij':'Overgeslagen';pill.dataset.tier='mis';
    A.miss();buzz(120);game.classList.remove('shake');void game.offsetWidth;game.classList.add('shake');fx('mis',false);
    return setTimeout(done,1100);
  }
  pill.textContent=a.name;delete pill.dataset.tier;
  $('#dr-lines').innerHTML=TIERS.map(function(t){return '<div class="tier-line" data-tier="'+t.key+'" style="top:calc(var(--unit) * '+((from+t.p)*UNIT)+')"><span>'+t.name+' · '+t.p+' m</span></div>'}).join('');
  var lines=$('#dr-lines').children,shown=-1,snd=A.drill();
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dur=reduced?Math.min(1200,300+points*9):1300+points*37,t0=performance.now();
  var frame=function(now){
    var p=Math.min(1,(now-t0)/dur),e=1-(1-p)*(1-p),got=points*e;
    setDepth(from+got,!reduced&&p<1,p);snd.set(got);
    var ti=tierIndex(got+.001);
    if(ti>shown){
      for(var k=shown+1;k<=ti;k++)lines[k].classList.add('passed');
      shown=ti;pill.dataset.tier=TIERS[ti].key;
      pill.classList.remove('pop');void pill.offsetWidth;pill.classList.add('pop');
      if(p<1){A.ding(ti);buzz(18);fx(TIERS[ti].key,false)}
    }
    if(p<1)return requestAnimationFrame(frame);
    snd.stop();setDepth(from+points,false,0);
    var fi=tierIndex(points);A.finish(fi);buzz(fi>=4?[40,40,40,40,120]:40);fx(TIERS[fi].key,fi>=3);
    setTimeout(done,fi>=4?900:500);
  };
  requestAnimationFrame(frame);
}

function showResult(r,resumed,from){
  var q=currentQ(),t=tierOf(r.points),tot=total(run),last=run.index===ROUNDS-1;
  if(from===undefined)from=tot-r.points;
  renderSteps();
  var epic=q.answers.filter(function(a){return a.points===100})[0];
  var text=r.correct?'<b>'+esc(r.name)+'</b>. '+FLAVOR[t.key]
    :r.reason==='answer'?'‘'+esc(r.name)+'’ staat niet in de antwoordlijst. De boor blijft staan.'
    :r.reason==='timeout'?'De tijd is om. De boor blijft staan.':'Overgeslagen. De boor blijft staan.';
  var unlock=FINDS.filter(function(f){return r.points>0&&tot>=f.depth&&from<f.depth}).map(function(f){
    return '<div class="unlock"><img src="'+ASSETS['/'+f.id+'.png']+'" alt=""><span><b>'+f.title+' gevonden</b>op '+f.depth+' meter diepte.</span></div>'}).join('');
  setSheet(
    '<div class="res-head" role="status"><b>'+t.name+'</b><span>+'+r.points+' m</span></div>'+
    '<p class="res-text">'+text+'</p>'+
    (r.points<100&&epic?'<p class="res-epic">Het Epic-antwoord was <b>'+esc(epic.name)+'</b>.</p>':'')+
    unlock+
    '<div class="res-actions"><button class="btn" data-act="next" id="dr-next">'+(last?'Bekijk je expeditie':'Volgende vraag')+' ▼</button>'+
    '<button class="link" data-act="answers" data-i="'+run.index+'">Alle '+q.answers.length+' antwoorden bekijken</button></div>',t.key);
  busy=false;
}
function next(){
  if(!run||run.phase!=='result')return;A.tap();
  if(run.index>=ROUNDS-1)return showEnd();
  run.index++;showQuestion();
}
function showEnd(){
  clearAuto();try{$('#dr-ans').blur()}catch(e){}
  run.phase='end';lastRun=run;save('last',run);save('run',null);renderSteps();
  var tot=total(run),rk=rankOf(tot),good=run.results.filter(function(r){return r.correct}).length,isRecord=tot>0&&tot>=record;
  setSheet(
    '<p class="end-total" role="status">'+nl(tot)+'<small>m</small></p>'+
    '<p class="end-rank">'+(isRecord?'Nieuw record. ':'')+'Jouw rang: <b>'+rk[2]+'</b>. '+good+' van de '+ROUNDS+' goed'+(record>tot?', record '+nl(record)+' m':'')+'.</p>'+
    '<div class="chips" aria-label="Score per vraag">'+run.results.map(function(r,i){return '<button data-tier="'+tierOf(r.points).key+'" data-act="answers" data-i="'+i+'" aria-label="Vraag '+(i+1)+': '+tierOf(r.points).name+', '+r.points+' meter">'+r.points+'</button>'}).join('')+'</div>'+
    '<div class="end-actions"><button class="btn" data-act="start" id="dr-again">Nog een keer boren</button><button class="btn ghost" data-act="share">Deel je score</button><button class="btn ghost" data-act="home">Naar het begin</button></div>',rk[1]);
  if(tot>=300)A.finish(Math.min(5,tierIndex(tot/7*1.2)+1));
}
function share(btn){
  var tot=total(lastRun),text='Drillion: '+nl(tot)+' m geboord\n'+lastRun.results.map(function(r){return tierOf(r.points).emoji}).join('')+'\n'+rankOf(tot)[2];
  var ok=function(){btn.textContent='Gekopieerd';setTimeout(function(){btn.textContent='Deel je score'},1600)};
  if(navigator.share)navigator.share({text:text}).catch(function(){});
  else if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(ok,function(){});
}

/* ---------- dialogs ---------- */
var dlg,dlgKind='',resumeAfter=false;
function openDialog(kind,html){
  dlgKind=kind;
  clearAuto();if(run&&run.phase==='question'&&!game.hidden&&qOpen()){pauseTimer();resumeAfter=true}
  $('#dr-dlg-body').innerHTML=html;if(!dlg.open)dlg.showModal();dlg.scrollTop=0;
}
function closeDialog(){
  if(dlg.open)dlg.close();
  if(resumeAfter){resumeAfter=false;if(run&&run.phase==='question'&&qOpen()){startTimer();try{$('#dr-ans').focus({preventScroll:true})}catch(e){}}}
}
function dlgTop(title){return '<div class="dlg-top"><h2>'+title+'</h2><button class="icon-btn" data-act="close" aria-label="Sluiten">'+ICON.close+'</button></div>'}
function helpDialog(){
  openDialog('help',dlgTop('Zo werkt Drillion')+
  '<ol class="rules"><li><b>Typ één antwoord.</b> Je krijgt zeven vragen en '+SECONDS+' seconden per vraag. Elke vraag heeft minstens twaalf goede antwoorden.</li>'+
  '<li><b>Zeldzaam boort dieper.</b> Een voor de hand liggend antwoord is Noob en levert 10 meter op. Het ene antwoord waar bijna niemand op komt is Epic: 100 meter.</li>'+
  '<li><b>Tikfout?</b> Dan vraagt de boor: bedoelde je…? De tijd staat stil tot je kiest.</li>'+
  '<li><b>Fout, te laat of overgeslagen</b> is 0 meter. Na elke vraag kun je alle antwoorden bekijken.</li></ol>'+
  '<div class="strata">'+strataList()+'</div>'+
  '<button class="btn" data-act="close">Begrepen</button>');
}
function pauseDialog(){
  openDialog('pause',dlgTop('Even pauze')+'<p>De boor en de tijd staan stil. Stop je nu, dan vervalt deze expeditie.</p>'+
  '<button class="btn" data-act="close">Verder boren</button><button class="btn ghost" data-act="quit">Expeditie stoppen</button>');
}
var bookRun=null,bookIndex=0;
function answersDialog(r,i){
  bookRun=r;bookIndex=i;
  var q=QMAP.get(r.qs[i]),res=r.results[i],t=tierOf(res.points);
  var rounds=r.results.length>1?'<div class="rounds">'+r.results.map(function(x,k){return '<button data-act="book" data-i="'+k+'" data-tier="'+tierOf(x.points).key+'" aria-pressed="'+(k===i)+'" aria-label="Vraag '+(k+1)+'">'+(k+1)+'</button>'}).join('')+'</div>':'';
  openDialog('answers',dlgTop('Antwoordlijst')+rounds+
    '<h3>'+esc(q.prompt)+'</h3>'+
    '<p class="yours" data-tier="'+t.key+'">'+(res.correct?'Jouw antwoord: <b>'+esc(res.name)+'</b>, '+t.name+', '+res.points+' m.':res.reason==='answer'?'Jouw antwoord ‘'+esc(res.name)+'’ stond er niet tussen.':res.reason==='timeout'?'Je was te laat.':'Je sloeg deze vraag over.')+'</p>'+
    '<input class="search" id="dr-search" type="search" placeholder="Zoek in '+q.answers.length+' antwoorden" aria-label="Zoek een antwoord">'+
    '<div id="dr-tiers"></div>'+
    (q.source?'<a class="src" href="'+esc(q.source)+'" target="_blank" rel="noreferrer">Bron bij deze vraag</a>':''));
  var paint=function(){
    var f=norm($('#dr-search').value),h='';
    TIERS.slice().reverse().forEach(function(tt){
      var list=q.answers.filter(function(a){return a.points===tt.p&&(!f||a.keys.some(function(k){return k.indexOf(f)>=0}))}).sort(function(a,b){return a.name.localeCompare(b.name,'nl')});
      if(list.length)h+='<section class="tier-block" data-tier="'+tt.key+'"><h4>'+tt.name+'<span>'+tt.p+' m</span></h4><ul>'+list.map(function(a){return '<li'+(res.correct&&a.name===res.name?' class="mine"':'')+'>'+esc(a.name)+'</li>'}).join('')+'</ul></section>';
    });
    $('#dr-tiers').innerHTML=h||'<p>Geen antwoord gevonden.</p>';
  };
  $('#dr-search').oninput=paint;paint();
}

/* ---------- events ---------- */
function measure(){}
// Layout follows CSS (100dvh and a max-height query). This only helps browsers where the
// keyboard lies on top of the page instead of resizing it (iOS Safari).
function fitViewport(){
  var vv=window.visualViewport;if(!vv||game.hidden)return;
  var covered=vv.height<window.innerHeight-80;
  game.style.height=covered?vv.height+'px':'';game.style.top=covered?vv.offsetTop+'px':'';
  game.classList.toggle('kb',covered);
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b||!ROOT.contains(b))return;
  var act=b.dataset.act;
  if(act==='start'){if(dlg.open)dlg.close();clearAuto();startRun()}
  else if(act==='resume')resumeRun();
  else if(act==='next')next();
  else if(act==='home'){run=null;showHome()}
  else if(act==='share')share(b);
  else if(act==='help')helpDialog();
  else if(act==='pause'){if(run&&run.phase==='end'){run=null;showHome()}else if(!busy)pauseDialog()}
  else if(act==='quit'){resumeAfter=false;clearAuto();dlg.close();run=null;save('run',null);showHome()}
  else if(act==='close')closeDialog();
  else if(act==='answers')answersDialog(run&&run.results.length?run:lastRun,+b.dataset.i);
  else if(act==='last')answersDialog(lastRun,0);
  else if(act==='book')answersDialog(bookRun,+b.dataset.i);
  else if(act==='sound'){muted=!muted;save('muted',muted);refreshSound();if(!muted){A.on();A.tap()}}
});
document.addEventListener('submit',function(e){if(e.target.id!=='dr-qform')return;e.preventDefault();if(qOpen())submit('answer');else if($('#dr-yes'))$('#dr-yes').click();else if(run&&run.phase==='result'&&!busy)next()});
// Buttons next to the text field act on the first touch: by the time a normal click arrives the
// keyboard may already be closing and the button has moved away from under the finger.
function press(k){if(k==='dive')submit('answer');else if(k==='skip')submit('pass')}
document.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-press]');if(!b||!ROOT.contains(b)||e.button>0)return;e.preventDefault();press(b.dataset.press)});
document.addEventListener('touchstart',function(e){if(e.target.closest&&e.target.closest('[data-press]')&&ROOT.contains(e.target))e.preventDefault()},{passive:false});
document.addEventListener('click',function(e){var b=e.target.closest('[data-press]');if(b&&ROOT.contains(b)&&e.detail===0)press(b.dataset.press)});

function init(){
  game=$('#dr-game');view=$('#dr-view');sheet=$('#dr-sheet');dlg=$('#dr-dlg');depthEl=$('#dr-depth');layerEl=$('#dr-layer');vignette=$('#dr-vignette');
  buildWorld();
  refreshSound();
  $('#dr-ans').addEventListener('input',function(){if(suggested&&this.value!==suggested.name){skipNames.push(suggested.name);suggested=null;$('#dr-qsug').hidden=true}});
  sheet.addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()}); // tapping a button must not close the keyboard
  dlg.addEventListener('cancel',function(e){e.preventDefault();closeDialog()});
  dlg.addEventListener('click',function(e){if(e.target===dlg)closeDialog()});
  window.addEventListener('resize',function(){measure();fitViewport()});
  if(window.visualViewport){visualViewport.addEventListener('resize',fitViewport);visualViewport.addEventListener('scroll',fitViewport)}
  document.addEventListener('visibilitychange',function(){if(document.hidden&&run&&run.phase==='question'&&!busy&&!dlg.open&&qOpen())pauseDialog()});
  showHome();
}
init();
})();
